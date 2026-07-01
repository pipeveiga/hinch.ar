-- =============================================================================
-- 005_auto_complete_bookings.sql
--
-- Cierra el ciclo de vida de una reserva:
--   1. Marca las reservas 'confirmed' como 'completed' cuando pasaron
--      >= 6 horas del inicio del evento (los viajes ya deberían haber
--      terminado y ambas partes ya pueden calificarse).
--   2. Al hacerlo, inserta notificaciones in-app tipo 'rate_reminder'
--      para el pasajero y para el conductor de cada reserva marcada,
--      así ambos se enteran de que tienen que dejar una calificación.
--
-- Como el UPDATE sólo agarra bookings 'confirmed', una segunda pasada
-- no genera duplicados (el status ya no matchea).
--
-- Programada vía pg_cron cada hora. Si pg_cron no está habilitado en el
-- proyecto, la función queda creada igual y se puede correr manual con
--   SELECT public.mark_completed_bookings();
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_completed_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  completed_count INTEGER := 0;
BEGIN
  WITH updated AS (
    UPDATE public.bookings b
       SET status = 'completed'
      FROM public.trips t
      JOIN public.events e ON e.id = t.event_id
     WHERE b.trip_id      = t.id
       AND b.status       = 'confirmed'
       AND e.event_date <= NOW() - INTERVAL '6 hours'
    RETURNING b.id, b.trip_id, b.passenger_id
  ),
  ctx AS (
    SELECT u.id             AS booking_id,
           u.passenger_id,
           t.driver_id,
           e.title          AS event_title
      FROM updated u
      JOIN public.trips  t ON t.id = u.trip_id
      JOIN public.events e ON e.id = t.event_id
  ),
  notif_passenger AS (
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT passenger_id,
           'rate_reminder',
           '¿Cómo estuvo el viaje? ⭐',
           'Calificá al conductor del viaje a ' || event_title || '.',
           jsonb_build_object('booking_id', booking_id)
      FROM ctx
    RETURNING id
  ),
  notif_driver AS (
    INSERT INTO public.notifications (user_id, type, title, body, data)
    SELECT driver_id,
           'rate_reminder',
           '¿Cómo estuvieron los pasajeros? ⭐',
           'Calificá a los pasajeros del viaje a ' || event_title || '.',
           jsonb_build_object('booking_id', booking_id)
      FROM ctx
    RETURNING id
  )
  SELECT COUNT(*) INTO completed_count FROM ctx;

  RETURN completed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_completed_bookings() FROM PUBLIC;

-- ============================================================
-- Agenda cron.
-- Envolvemos en DO block para tolerar entornos sin pg_cron.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;

    -- Desagendar si ya existía (por reruns de la migración)
    PERFORM cron.unschedule(jobid)
       FROM cron.job
      WHERE jobname = 'mark-completed-bookings';

    PERFORM cron.schedule(
      'mark-completed-bookings',
      '0 * * * *',                                -- todas las horas en punto
      $cron$SELECT public.mark_completed_bookings();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Si no hay permisos para pg_cron (típico fuera de Supabase Cloud),
  -- ignoramos: la función existe y se puede agendar a mano.
  RAISE NOTICE 'pg_cron no configurado, agendar mark_completed_bookings manualmente';
END;
$$;
