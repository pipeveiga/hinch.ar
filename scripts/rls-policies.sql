-- ============================================================
-- HINCH.AR — Row Level Security (RLS) Policies
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================

-- Cualquiera puede ver campos públicos de otros usuarios
CREATE POLICY "users_select_public" ON users
  FOR SELECT USING (true);

-- Solo el propio usuario puede ver/editar sus datos completos
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No se puede insertar desde el cliente (se crea via trigger en auth)
CREATE POLICY "users_insert_disabled" ON users
  FOR INSERT WITH CHECK (false);

-- No se puede borrar usuarios desde el cliente
CREATE POLICY "users_delete_disabled" ON users
  FOR DELETE USING (false);

-- ============================================================
-- EVENTS (solo lectura pública, carga manual via SQL)
-- ============================================================

CREATE POLICY "events_select_all" ON events
  FOR SELECT USING (is_active = true);

-- Solo service_role puede insertar/editar/borrar eventos
CREATE POLICY "events_insert_service_only" ON events
  FOR INSERT WITH CHECK (false);

CREATE POLICY "events_update_service_only" ON events
  FOR UPDATE USING (false);

CREATE POLICY "events_delete_service_only" ON events
  FOR DELETE USING (false);

-- ============================================================
-- TRIPS
-- ============================================================

-- Cualquiera autenticado puede ver viajes activos
CREATE POLICY "trips_select_active" ON trips
  FOR SELECT TO authenticated
  USING (status IN ('active', 'full', 'completed'));

-- Solo el conductor puede ver sus viajes cancelados
CREATE POLICY "trips_select_own_cancelled" ON trips
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- Solo usuarios autenticados pueden crear viajes
CREATE POLICY "trips_insert_own" ON trips
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

-- Solo el conductor puede editar su viaje
CREATE POLICY "trips_update_own" ON trips
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- No se borran viajes (se cancelan)
CREATE POLICY "trips_delete_disabled" ON trips
  FOR DELETE USING (false);

-- ============================================================
-- BOOKINGS
-- ============================================================

-- Conductor y pasajero pueden ver la reserva
CREATE POLICY "bookings_select_participant" ON bookings
  FOR SELECT TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = bookings.trip_id
        AND trips.driver_id = auth.uid()
    )
  );

-- Solo el pasajero autenticado puede crear una reserva para sí mismo
CREATE POLICY "bookings_insert_own" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (passenger_id = auth.uid());

-- Conductor puede confirmar/rechazar; pasajero puede cancelar la suya
CREATE POLICY "bookings_update_participant" ON bookings
  FOR UPDATE TO authenticated
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = bookings.trip_id
        AND trips.driver_id = auth.uid()
    )
  );

CREATE POLICY "bookings_delete_disabled" ON bookings
  FOR DELETE USING (false);

-- ============================================================
-- RATINGS
-- ============================================================

-- Las calificaciones son públicas
CREATE POLICY "ratings_select_all" ON ratings
  FOR SELECT TO authenticated USING (true);

-- Solo puede calificar quien participó en la reserva
CREATE POLICY "ratings_insert_participant" ON ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = ratings.booking_id
        AND bookings.status = 'completed'
        AND (
          bookings.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = bookings.trip_id
              AND trips.driver_id = auth.uid()
          )
        )
    )
  );

-- No se editan ni borran calificaciones
CREATE POLICY "ratings_update_disabled" ON ratings FOR UPDATE USING (false);
CREATE POLICY "ratings_delete_disabled" ON ratings FOR DELETE USING (false);

-- ============================================================
-- MESSAGES
-- ============================================================

-- Solo conductor y pasajero de esa reserva pueden leer mensajes
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
        AND (
          bookings.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = bookings.trip_id
              AND trips.driver_id = auth.uid()
          )
        )
    )
  );

-- Solo participantes pueden enviar mensajes, y solo desde su propio sender_id
CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
        AND (
          bookings.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = bookings.trip_id
              AND trips.driver_id = auth.uid()
          )
        )
    )
  );

-- Solo para marcar como leído (is_read)
CREATE POLICY "messages_update_read" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
        AND (
          bookings.passenger_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = bookings.trip_id
              AND trips.driver_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "messages_delete_disabled" ON messages FOR DELETE USING (false);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Solo el usuario puede ver sus propias notificaciones
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Solo el usuario puede marcar sus notificaciones como leídas
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Solo service_role puede insertar notificaciones
CREATE POLICY "notifications_insert_service_only" ON notifications
  FOR INSERT WITH CHECK (false);

CREATE POLICY "notifications_delete_disabled" ON notifications
  FOR DELETE USING (false);
