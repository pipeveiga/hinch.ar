-- =============================================================================
-- HINCH.AR — Migration 003: Endurecimiento de seguridad
--
-- Cubre los hallazgos de la auditoría:
--   C1/M2: protección a nivel DB de columnas sensibles en users
--   C3:    fix del policy de messages (OR → AND)
--   C4:    agregar verification_status / verification_submitted_at
--   M1:    cálculo server-side de total_amount en bookings
--   M3:    consolidación de RLS (una única fuente de verdad)
--   M4:    resta atómica de seats_available
--   B2:    rate limit básico en mensajes
--
-- Idempotente: se puede correr varias veces sin romper nada.
-- =============================================================================

-- =============================================================================
-- C4: Columnas de estado de verificación
-- =============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none'
    CHECK (verification_status IN ('none','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_token TEXT;


-- =============================================================================
-- C1 + M2: Trigger BEFORE UPDATE que protege columnas sensibles
--
-- La RLS valida la fila (auth.uid()=id) pero no qué columnas se editan.
-- Este trigger impide que un cliente autenticado modifique columnas
-- gestionadas por el servidor (verificación, ratings, stats, dni*).
--
-- service_role y triggers SECURITY DEFINER (current_user = postgres /
-- supabase_admin) saltan la protección.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.protect_user_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir cambios solo cuando vienen de service_role o de funciones
  -- internas (SECURITY DEFINER, donde current_user pasa a ser el dueño).
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Inmutables: id y created_at
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No se puede modificar el id del usuario' USING ERRCODE = '42501';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'No se puede modificar created_at' USING ERRCODE = '42501';
  END IF;

  -- Verificación: solo el server puede aprobar/rechazar
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    RAISE EXCEPTION 'Solo el equipo de hinch.ar puede verificar cuentas' USING ERRCODE = '42501';
  END IF;

  -- Ratings y stats: solo se actualizan via triggers internos
  IF NEW.avg_rating_as_driver     IS DISTINCT FROM OLD.avg_rating_as_driver
     OR NEW.total_trips_as_driver IS DISTINCT FROM OLD.total_trips_as_driver
     OR NEW.avg_rating_as_passenger IS DISTINCT FROM OLD.avg_rating_as_passenger
     OR NEW.total_trips_as_passenger IS DISTINCT FROM OLD.total_trips_as_passenger THEN
    RAISE EXCEPTION 'Las estadísticas se calculan automáticamente' USING ERRCODE = '42501';
  END IF;

  -- DNI y fotos de verificación: solo via service_role (admin) o no se tocan
  IF NEW.dni            IS DISTINCT FROM OLD.dni
     OR NEW.dni_front_url IS DISTINCT FROM OLD.dni_front_url
     OR NEW.dni_back_url  IS DISTINCT FROM OLD.dni_back_url
     OR NEW.selfie_url    IS DISTINCT FROM OLD.selfie_url THEN
    RAISE EXCEPTION 'Los datos de identidad no se editan directamente' USING ERRCODE = '42501';
  END IF;

  -- verification_status: el usuario solo puede pasar de none/rejected a pending
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (OLD.verification_status IN ('none','rejected') AND NEW.verification_status = 'pending') THEN
      RAISE EXCEPTION 'Transición de verification_status no permitida: % → %',
        OLD.verification_status, NEW.verification_status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- is_active: el usuario puede desactivar su cuenta pero no reactivarla solo
  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NEW.is_active = TRUE THEN
    RAISE EXCEPTION 'Para reactivar la cuenta contactá a hola@hinch.ar' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_protect_columns ON public.users;
CREATE TRIGGER users_protect_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_columns();


-- =============================================================================
-- Hacer SECURITY DEFINER los triggers internos que tocan columnas protegidas
-- =============================================================================
ALTER FUNCTION public.update_user_rating() SECURITY DEFINER;
ALTER FUNCTION public.handle_booking_seats() SECURITY DEFINER;


-- =============================================================================
-- M4: Resta atómica de seats_available — evita overbooking concurrente
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_booking_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Resta atómica: si no quedan asientos, falla la confirmación.
    UPDATE public.trips
    SET seats_available = seats_available - NEW.seats_booked
    WHERE id = NEW.trip_id
      AND seats_available >= NEW.seats_booked;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sin asientos disponibles en este viaje'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.trips
    SET status = 'full'
    WHERE id = NEW.trip_id AND seats_available = 0;

  ELSIF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE public.trips
    SET seats_available = seats_available + NEW.seats_booked,
        status = CASE WHEN status = 'full' THEN 'active' ELSE status END
    WHERE id = NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- M1: Cálculo server-side de total_amount en bookings
--
-- No hay pagos in-app, pero conviene que el monto que ve el conductor
-- coincida con el precio publicado del viaje (no es manipulable por el
-- pasajero).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.compute_booking_total()
RETURNS TRIGGER AS $$
DECLARE
  t public.trips%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.trips WHERE id = NEW.trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viaje no encontrado' USING ERRCODE = '23503';
  END IF;

  NEW.total_amount := NEW.seats_booked * CASE NEW.segment
    WHEN 'ida'          THEN COALESCE(t.price_outbound, 0)
    WHEN 'vuelta'       THEN COALESCE(t.price_return, 0)
    WHEN 'ida_y_vuelta' THEN COALESCE(t.price_outbound, 0) + COALESCE(t.price_return, 0)
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS bookings_compute_total ON public.bookings;
CREATE TRIGGER bookings_compute_total
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.compute_booking_total();


-- =============================================================================
-- B2: Rate limit básico en mensajes (máx 20 por minuto por sender)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Estás enviando mensajes demasiado rápido. Esperá un momento.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_rate_limit ON public.messages;
CREATE TRIGGER messages_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();


-- =============================================================================
-- M3 + C3: Consolidación de RLS (una única fuente de verdad)
--
-- Eliminamos todas las policies que pudieron quedar de 001_initial_schema.sql,
-- 002_chat.sql y scripts/rls-policies.sql, y las recreamos de forma canónica.
-- =============================================================================

-- USERS -----------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios: lectura pública de perfiles activos" ON public.users;
DROP POLICY IF EXISTS "Usuarios: solo yo puedo editar mi perfil"      ON public.users;
DROP POLICY IF EXISTS users_select_public                              ON public.users;
DROP POLICY IF EXISTS users_update_own                                 ON public.users;
DROP POLICY IF EXISTS users_insert_disabled                            ON public.users;
DROP POLICY IF EXISTS users_delete_disabled                            ON public.users;

CREATE POLICY users_select_active ON public.users
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY users_insert_disabled ON public.users
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY users_delete_disabled ON public.users
  FOR DELETE USING (FALSE);


-- EVENTS ----------------------------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Eventos: lectura pública de eventos activos" ON public.events;
DROP POLICY IF EXISTS events_select_all              ON public.events;
DROP POLICY IF EXISTS events_insert_service_only     ON public.events;
DROP POLICY IF EXISTS events_update_service_only     ON public.events;
DROP POLICY IF EXISTS events_delete_service_only     ON public.events;

CREATE POLICY events_select_active ON public.events
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY events_insert_disabled ON public.events
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY events_update_disabled ON public.events
  FOR UPDATE USING (FALSE);

CREATE POLICY events_delete_disabled ON public.events
  FOR DELETE USING (FALSE);


-- TRIPS -----------------------------------------------------------------------
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viajes: lectura pública de viajes activos"  ON public.trips;
DROP POLICY IF EXISTS "Viajes: solo el conductor puede crear"      ON public.trips;
DROP POLICY IF EXISTS "Viajes: solo el conductor puede editar"     ON public.trips;
DROP POLICY IF EXISTS trips_select_active         ON public.trips;
DROP POLICY IF EXISTS trips_select_own_cancelled  ON public.trips;
DROP POLICY IF EXISTS trips_insert_own            ON public.trips;
DROP POLICY IF EXISTS trips_update_own            ON public.trips;
DROP POLICY IF EXISTS trips_delete_disabled       ON public.trips;

-- El conductor siempre ve sus propios viajes (incluso cancelled).
-- El resto solo ve activos / llenos / completados.
CREATE POLICY trips_select_visible ON public.trips
  FOR SELECT TO authenticated
  USING (
    status IN ('active','full','completed')
    OR driver_id = auth.uid()
  );

CREATE POLICY trips_insert_own ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY trips_update_own ON public.trips
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY trips_delete_disabled ON public.trips
  FOR DELETE USING (FALSE);


-- BOOKINGS --------------------------------------------------------------------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reservas: conductor ve las reservas de sus viajes" ON public.bookings;
DROP POLICY IF EXISTS "Reservas: pasajeros pueden crear reservas"          ON public.bookings;
DROP POLICY IF EXISTS "Reservas: conductor puede confirmar/cancelar"       ON public.bookings;
DROP POLICY IF EXISTS bookings_select_participant ON public.bookings;
DROP POLICY IF EXISTS bookings_insert_own         ON public.bookings;
DROP POLICY IF EXISTS bookings_update_participant ON public.bookings;
DROP POLICY IF EXISTS bookings_delete_disabled    ON public.bookings;

CREATE POLICY bookings_select_participant ON public.bookings
  FOR SELECT TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = bookings.trip_id AND t.driver_id = auth.uid()
    )
  );

CREATE POLICY bookings_insert_own ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY bookings_update_participant ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = bookings.trip_id AND t.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    -- el conductor del viaje puede gestionar la reserva (confirmar/cancelar)
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = bookings.trip_id AND t.driver_id = auth.uid()
    )
    -- el pasajero SOLO puede cancelar su propia reserva (no auto-confirmarse)
    OR (passenger_id = auth.uid() AND status = 'cancelled')
  );

CREATE POLICY bookings_delete_disabled ON public.bookings
  FOR DELETE USING (FALSE);


-- RATINGS ---------------------------------------------------------------------
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Calificaciones: lectura pública"     ON public.ratings;
DROP POLICY IF EXISTS "Calificaciones: solo puedo calificar yo" ON public.ratings;
DROP POLICY IF EXISTS ratings_select_all          ON public.ratings;
DROP POLICY IF EXISTS ratings_insert_participant  ON public.ratings;
DROP POLICY IF EXISTS ratings_update_disabled     ON public.ratings;
DROP POLICY IF EXISTS ratings_delete_disabled     ON public.ratings;

CREATE POLICY ratings_select_all ON public.ratings
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY ratings_insert_participant ON public.ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = ratings.booking_id
        AND b.status = 'completed'
        AND (
          b.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = b.trip_id AND t.driver_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY ratings_update_disabled ON public.ratings FOR UPDATE USING (FALSE);
CREATE POLICY ratings_delete_disabled ON public.ratings FOR DELETE USING (FALSE);


-- MESSAGES (C3: OR → AND) -----------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants only"      ON public.messages;
DROP POLICY IF EXISTS messages_select_participant   ON public.messages;
DROP POLICY IF EXISTS messages_insert_participant   ON public.messages;
DROP POLICY IF EXISTS messages_update_read          ON public.messages;
DROP POLICY IF EXISTS messages_delete_disabled      ON public.messages;

CREATE POLICY messages_select_participant ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (
          b.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = b.trip_id AND t.driver_id = auth.uid()
          )
        )
    )
  );

-- Antes era OR — cualquiera con sender_id=auth.uid() podía insertar
-- en bookings ajenos. Ahora exige AND: ser sender Y participante.
CREATE POLICY messages_insert_participant ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (
          b.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = b.trip_id AND t.driver_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY messages_update_read ON public.messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (
          b.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.trips t
            WHERE t.id = b.trip_id AND t.driver_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY messages_delete_disabled ON public.messages FOR DELETE USING (FALSE);


-- NOTIFICATIONS ---------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notificaciones: solo mis notificaciones"   ON public.notifications;
DROP POLICY IF EXISTS notifications_select_own                    ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own                    ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_service_only           ON public.notifications;
DROP POLICY IF EXISTS notifications_delete_disabled               ON public.notifications;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY notifications_insert_disabled ON public.notifications
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY notifications_delete_disabled ON public.notifications
  FOR DELETE USING (FALSE);
