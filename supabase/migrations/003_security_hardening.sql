-- =============================================================================
-- HINCH.AR — Migration 003: Endurecimiento de seguridad (RLS)
-- Ejecutar en Supabase SQL Editor. REVISAR Y TESTEAR antes de producción.
--
-- Contexto: las políticas originales (001/002) confiaban en que el cliente
-- "se portara bien". Pero la anon key es pública, así que cualquiera puede
-- pegarle directo a la API REST de Supabase y saltarse el cliente. Esta
-- migración mueve esas reglas al motor (RLS), que es donde valen.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. USERS — impedir que un usuario edite campos sensibles de su propio perfil
--    (is_verified, dni, ratings, stats). RLS por fila no puede limitar columnas,
--    así que usamos un trigger que, ante un UPDATE hecho por un usuario común
--    (rol authenticated/anon), restaura los campos protegidos a su valor previo.
--    Los triggers internos (recalculo de rating / asientos) corren como owner
--    (SECURITY DEFINER), por lo que SÍ pueden tocar esos campos.
-- -----------------------------------------------------------------------------

-- Que los triggers que actualizan stats corran como owner (bypassan la protección)
ALTER FUNCTION public.update_user_rating()  SECURITY DEFINER;
ALTER FUNCTION public.handle_booking_seats() SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.protect_user_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplicamos la protección a pedidos de usuarios comunes vía PostgREST.
  -- Los triggers SECURITY DEFINER corren como 'postgres' y quedan exentos.
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.is_verified              := OLD.is_verified;
    NEW.verified_at              := OLD.verified_at;
    NEW.dni                      := OLD.dni;
    NEW.avg_rating_as_driver     := OLD.avg_rating_as_driver;
    NEW.avg_rating_as_passenger  := OLD.avg_rating_as_passenger;
    NEW.total_trips_as_driver    := OLD.total_trips_as_driver;
    NEW.total_trips_as_passenger := OLD.total_trips_as_passenger;
    NEW.is_active                := OLD.is_active;
    NEW.id                       := OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_user_columns ON public.users;
CREATE TRIGGER protect_user_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_columns();


-- -----------------------------------------------------------------------------
-- 2. RATINGS — antes cualquiera podía insertar una calificación con cualquier
--    ratee_id (incluido uno mismo) y para cualquier reserva => inflar el propio
--    promedio. Ahora exigimos que quien califica haya sido parte de la reserva
--    y que el calificado sea la contraparte real.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Calificaciones: solo puedo calificar yo" ON public.ratings;
DROP POLICY IF EXISTS "Calificaciones: solo participantes del viaje" ON public.ratings;

CREATE POLICY "Calificaciones: solo participantes del viaje"
  ON public.ratings FOR INSERT WITH CHECK (
    auth.uid() = rater_id
    AND rater_id <> ratee_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.trips t ON t.id = b.trip_id
      WHERE b.id = booking_id
        AND (
          -- pasajero califica al conductor
          (b.passenger_id = auth.uid() AND t.driver_id = ratee_id AND ratee_role = 'driver')
          OR
          -- conductor califica al pasajero
          (t.driver_id = auth.uid() AND b.passenger_id = ratee_id AND ratee_role = 'passenger')
        )
    )
  );


-- -----------------------------------------------------------------------------
-- 3. MESSAGES — la política original tenía "auth.uid() = sender_id OR participante".
--    Esa rama OR dejaba que CUALQUIERA inyectara mensajes en CUALQUIER chat con
--    solo poner su propio id como sender. Separamos lectura y escritura y exigimos
--    ser participante de la reserva en ambos casos.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Chat participants only" ON public.messages;
DROP POLICY IF EXISTS "Chat: leer si participo" ON public.messages;
DROP POLICY IF EXISTS "Chat: enviar si participo" ON public.messages;

CREATE POLICY "Chat: leer si participo"
  ON public.messages FOR SELECT USING (
    auth.uid() IN (
      SELECT b.passenger_id FROM public.bookings b WHERE b.id = booking_id
      UNION
      SELECT t.driver_id FROM public.trips t
        JOIN public.bookings b ON b.trip_id = t.id WHERE b.id = booking_id
    )
  );

CREATE POLICY "Chat: enviar si participo"
  ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() IN (
      SELECT b.passenger_id FROM public.bookings b WHERE b.id = booking_id
      UNION
      SELECT t.driver_id FROM public.trips t
        JOIN public.bookings b ON b.trip_id = t.id WHERE b.id = booking_id
    )
  );


-- -----------------------------------------------------------------------------
-- 4. BOOKINGS — la política de UPDATE dejaba que el PASAJERO cambiara el estado
--    de su reserva a 'confirmed' (auto-confirmarse y robar asientos) o tocara
--    montos. Separamos: el pasajero solo puede CANCELAR; el conductor gestiona.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Reservas: conductor puede confirmar/cancelar" ON public.bookings;
-- Policy permisiva preexistente (no estaba en las migraciones del repo): tenía
-- WITH CHECK NULL => usaba el USING como check, dejando que el pasajero pusiera
-- su reserva en cualquier estado (incluido 'confirmed'). Hay que eliminarla.
DROP POLICY IF EXISTS "bookings_update_participant" ON public.bookings;
DROP POLICY IF EXISTS "Reservas: pasajero cancela" ON public.bookings;
DROP POLICY IF EXISTS "Reservas: conductor gestiona" ON public.bookings;

CREATE POLICY "Reservas: pasajero cancela"
  ON public.bookings FOR UPDATE
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid() AND status = 'cancelled');

CREATE POLICY "Reservas: conductor gestiona"
  ON public.bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.driver_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.driver_id = auth.uid()
  ));


-- -----------------------------------------------------------------------------
-- 5. TRIPS — agregar WITH CHECK para que el conductor no pueda reasignar el
--    viaje a otro driver_id en un UPDATE.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Viajes: solo el conductor puede editar" ON public.trips;
CREATE POLICY "Viajes: solo el conductor puede editar"
  ON public.trips FOR UPDATE
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);
