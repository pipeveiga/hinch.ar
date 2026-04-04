-- =============================================================================
-- HINCH.AR — Migration 002: Chat por reserva
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

CREATE TABLE public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 1000),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Índice para cargar mensajes de una reserva ordenados
CREATE INDEX messages_booking_idx ON public.messages (booking_id, created_at);

-- RLS: solo los dos participantes del viaje pueden leer/escribir
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Política: puede ver/enviar mensajes si es el pasajero de la reserva
-- o el conductor del viaje asociado a la reserva
CREATE POLICY "Chat participants only" ON public.messages
  FOR ALL USING (
    auth.uid() = sender_id
    OR auth.uid() IN (
      SELECT b.passenger_id FROM public.bookings b WHERE b.id = booking_id
      UNION
      SELECT t.driver_id FROM public.trips t
        JOIN public.bookings b ON b.trip_id = t.id WHERE b.id = booking_id
    )
  );

-- Habilitar realtime para la tabla messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
