-- ============================================================
-- HINCH.AR — Push Notifications Setup
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna push_token a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. Función genérica para llamar a la Edge Function
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_title   TEXT,
  p_body    TEXT,
  p_data    JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  PERFORM net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := jsonb_build_object(
      'user_id', p_user_id,
      'title',   p_title,
      'body',    p_body,
      'data',    p_data
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS DE NOTIFICACIONES
-- ============================================================

-- 3. Cuando alguien reserva un viaje → notificar al conductor
CREATE OR REPLACE FUNCTION on_booking_created() RETURNS TRIGGER AS $$
DECLARE
  v_driver_id    UUID;
  v_passenger    TEXT;
  v_event_title  TEXT;
BEGIN
  SELECT t.driver_id, u.full_name, e.title
  INTO v_driver_id, v_passenger, v_event_title
  FROM trips t
  JOIN users u ON u.id = NEW.passenger_id
  JOIN events e ON e.id = t.event_id
  WHERE t.id = NEW.trip_id;

  PERFORM notify_user(
    v_driver_id,
    '¡Nueva reserva! 🚗',
    v_passenger || ' quiere sumarse a tu viaje para ' || v_event_title,
    jsonb_build_object('booking_id', NEW.id, 'screen', 'mis-viajes')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_created ON bookings;
CREATE TRIGGER trg_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION on_booking_created();

-- 4. Cuando el conductor confirma → notificar al pasajero
CREATE OR REPLACE FUNCTION on_booking_confirmed() RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT e.title INTO v_event_title
  FROM trips t
  JOIN events e ON e.id = t.event_id
  WHERE t.id = NEW.trip_id;

  IF NEW.status = 'confirmed' THEN
    PERFORM notify_user(
      NEW.passenger_id,
      '¡Reserva confirmada! ✅',
      'Tu lugar para ' || v_event_title || ' está confirmado. ¡A prepararse!',
      jsonb_build_object('booking_id', NEW.id, 'screen', 'mis-viajes')
    );
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    PERFORM notify_user(
      NEW.passenger_id,
      'Reserva cancelada ❌',
      'Tu reserva para ' || v_event_title || ' fue cancelada.',
      jsonb_build_object('booking_id', NEW.id, 'screen', 'mis-viajes')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status ON bookings;
CREATE TRIGGER trg_booking_status
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION on_booking_confirmed();

-- 5. Cuando el conductor cancela el viaje → notificar a todos los pasajeros
CREATE OR REPLACE FUNCTION on_trip_cancelled() RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
  v_passenger   RECORD;
BEGIN
  IF OLD.status = NEW.status OR NEW.status != 'cancelled' THEN RETURN NEW; END IF;

  SELECT e.title INTO v_event_title
  FROM events e WHERE e.id = NEW.event_id;

  FOR v_passenger IN
    SELECT passenger_id FROM bookings
    WHERE trip_id = NEW.id AND status NOT IN ('cancelled', 'completed')
  LOOP
    PERFORM notify_user(
      v_passenger.passenger_id,
      'Viaje cancelado ⚠️',
      'El conductor canceló el viaje para ' || v_event_title || '. Buscá otro viaje.',
      jsonb_build_object('event_id', NEW.event_id, 'screen', 'eventos')
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_trip_cancelled ON trips;
CREATE TRIGGER trg_trip_cancelled
  AFTER UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION on_trip_cancelled();

-- ============================================================
-- CONFIGURAR VARIABLES (reemplazar con tus valores reales)
-- ============================================================
-- ALTER DATABASE postgres SET app.supabase_url = 'https://TU-PROJECT.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'TU-SERVICE-ROLE-KEY';
