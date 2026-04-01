-- =============================================================================
-- HINCH.AR — Schema inicial de base de datos
-- Motor: PostgreSQL via Supabase
-- =============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- para búsqueda sin tildes

-- =============================================================================
-- TABLA: users (extiende auth.users de Supabase)
-- =============================================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Datos personales
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  bio             TEXT,

  -- Verificación de identidad
  dni             TEXT,
  dni_front_url   TEXT,
  dni_back_url    TEXT,
  selfie_url      TEXT,
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,

  -- Estadísticas como conductor
  avg_rating_as_driver    DECIMAL(3,2) NOT NULL DEFAULT 0,
  total_trips_as_driver   INT          NOT NULL DEFAULT 0,

  -- Estadísticas como pasajero
  avg_rating_as_passenger DECIMAL(3,2) NOT NULL DEFAULT 0,
  total_trips_as_passenger INT         NOT NULL DEFAULT 0,

  -- Datos del auto (solo si es conductor)
  has_car         BOOLEAN NOT NULL DEFAULT FALSE,
  car_brand       TEXT,
  car_model       TEXT,
  car_year        SMALLINT CHECK (car_year > 1990 AND car_year <= EXTRACT(YEAR FROM NOW()) + 1),
  car_color       TEXT,
  car_plate       TEXT,
  car_photo_url   TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9\s\-]{8,20}$')
);

-- Trigger para sincronizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: cuando se registra un usuario en auth.users, crear su perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- TABLA: events (partidos y recitales — administrados por el equipo)
-- =============================================================================
CREATE TABLE public.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  type            TEXT NOT NULL CHECK (type IN ('partido', 'recital', 'otro')),
  title           TEXT NOT NULL,        -- "Boca vs River – Fecha 15"
  subtitle        TEXT,                 -- "Copa de la Liga Profesional"

  -- Sede
  venue_name      TEXT NOT NULL,        -- "La Bombonera"
  venue_address   TEXT NOT NULL,
  venue_city      TEXT NOT NULL,
  venue_province  TEXT NOT NULL DEFAULT 'Buenos Aires',
  venue_lat       DECIMAL(10,8),
  venue_lng       DECIMAL(11,8),

  event_date      TIMESTAMPTZ NOT NULL,
  image_url       TEXT,
  banner_url      TEXT,

  -- Metadata de partido
  home_team       TEXT,
  away_team       TEXT,
  competition     TEXT,                 -- "Copa de la Liga", "Champions", etc.

  -- Metadata de recital
  artist          TEXT,
  genre           TEXT,

  tags            TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX events_date_idx ON public.events (event_date);
CREATE INDEX events_city_idx ON public.events (venue_city);
CREATE INDEX events_type_idx ON public.events (type);


-- =============================================================================
-- TABLA: trips (viajes publicados por conductores)
-- =============================================================================
CREATE TABLE public.trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  driver_id       UUID NOT NULL REFERENCES public.users(id),
  event_id        UUID NOT NULL REFERENCES public.events(id),

  -- Origen del viaje
  origin_address  TEXT NOT NULL,
  origin_city     TEXT NOT NULL,
  origin_province TEXT NOT NULL DEFAULT 'Buenos Aires',
  origin_lat      DECIMAL(10,8),
  origin_lng      DECIMAL(11,8),

  -- Tipo de tramo ofrecido
  trip_type       TEXT NOT NULL CHECK (trip_type IN ('ida', 'vuelta', 'ida_y_vuelta')),

  -- Capacidad
  seats_total     SMALLINT NOT NULL CHECK (seats_total BETWEEN 1 AND 7),
  seats_available SMALLINT NOT NULL CHECK (seats_available >= 0),

  -- Precios por asiento (en ARS)
  price_outbound  DECIMAL(10,2) CHECK (price_outbound >= 0),  -- precio ida
  price_return    DECIMAL(10,2) CHECK (price_return >= 0),    -- precio vuelta

  -- Horarios
  departure_time  TIMESTAMPTZ,          -- hora de salida ida
  return_time     TIMESTAMPTZ,          -- hora de salida vuelta (estimada)

  -- Extras
  notes           TEXT,
  accepts_luggage BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_pets    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Paradas intermedias [{"address": "...", "city": "...", "lat": ..., "lng": ...}]
  waypoints       JSONB NOT NULL DEFAULT '[]',

  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'full', 'cancelled', 'completed')),

  CONSTRAINT seats_availability CHECK (seats_available <= seats_total),
  CONSTRAINT price_required CHECK (
    (trip_type = 'ida'          AND price_outbound IS NOT NULL) OR
    (trip_type = 'vuelta'       AND price_return IS NOT NULL) OR
    (trip_type = 'ida_y_vuelta' AND price_outbound IS NOT NULL AND price_return IS NOT NULL)
  )
);

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX trips_event_idx    ON public.trips (event_id);
CREATE INDEX trips_driver_idx   ON public.trips (driver_id);
CREATE INDEX trips_status_idx   ON public.trips (status);
CREATE INDEX trips_city_idx     ON public.trips (origin_city);
CREATE INDEX trips_type_idx     ON public.trips (trip_type);


-- =============================================================================
-- TABLA: bookings (reservas de pasajeros)
-- =============================================================================
CREATE TABLE public.bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  trip_id             UUID NOT NULL REFERENCES public.trips(id),
  passenger_id        UUID NOT NULL REFERENCES public.users(id),

  -- Qué tramo reserva (debe ser compatible con trip.trip_type)
  segment             TEXT NOT NULL CHECK (segment IN ('ida', 'vuelta', 'ida_y_vuelta')),

  seats_booked        SMALLINT NOT NULL DEFAULT 1 CHECK (seats_booked >= 1),

  -- Monto total acordado
  total_amount        DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method      TEXT CHECK (payment_method IN ('transferencia', 'efectivo', 'pendiente')),
  payment_status      TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (payment_status IN ('pendiente', 'pagado', 'cancelado')),

  -- Flujo de la reserva
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),

  -- Mensaje inicial del pasajero al conductor
  passenger_message   TEXT,

  -- Punto de encuentro acordado
  pickup_point        TEXT,

  -- Flags de calificación post-evento
  driver_rated_passenger    BOOLEAN NOT NULL DEFAULT FALSE,
  passenger_rated_driver    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Un pasajero no puede reservar el mismo tramo dos veces en el mismo viaje
  UNIQUE (trip_id, passenger_id, segment)
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX bookings_trip_idx      ON public.bookings (trip_id);
CREATE INDEX bookings_passenger_idx ON public.bookings (passenger_id);
CREATE INDEX bookings_status_idx    ON public.bookings (status);

-- Trigger: cuando se confirma una reserva, descontar seats_available
CREATE OR REPLACE FUNCTION public.handle_booking_seats()
RETURNS TRIGGER AS $$
BEGIN
  -- Confirmación de reserva → restar asientos
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE public.trips
    SET seats_available = seats_available - NEW.seats_booked
    WHERE id = NEW.trip_id;

    -- Si no quedan asientos, marcar el viaje como lleno
    UPDATE public.trips
    SET status = 'full'
    WHERE id = NEW.trip_id AND seats_available = 0;

  -- Cancelación de reserva confirmada → devolver asientos
  ELSIF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE public.trips
    SET seats_available = seats_available + NEW.seats_booked,
        status = CASE WHEN status = 'full' THEN 'active' ELSE status END
    WHERE id = NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_status_change
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_seats();


-- =============================================================================
-- TABLA: ratings (sistema de calificación 5x5 post-evento)
-- =============================================================================
CREATE TABLE public.ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  booking_id      UUID NOT NULL REFERENCES public.bookings(id),
  rater_id        UUID NOT NULL REFERENCES public.users(id),
  ratee_id        UUID NOT NULL REFERENCES public.users(id),

  -- Rol del CALIFICADO en esta reserva
  ratee_role      TEXT NOT NULL CHECK (ratee_role IN ('driver', 'passenger')),

  -- Categorías para CONDUCTOR (ratee_role = 'driver')
  --   1: Puntualidad   — ¿Llegó a tiempo al punto de encuentro?
  --   2: Seguridad     — ¿Manejo con cuidado?
  --   3: Estado del auto — ¿El auto estaba en buenas condiciones?
  --   4: Comunicación  — ¿Avisó cambios, estuvo disponible?
  --   5: Clima         — ¿Hizo el viaje agradable?

  -- Categorías para PASAJERO (ratee_role = 'passenger')
  --   1: Pago          — ¿Pagó correctamente?
  --   2: Puntualidad   — ¿Estuvo en el punto de encuentro a tiempo?
  --   3: Comportamiento — ¿Se portó bien en el auto?
  --   4: Comunicación  — ¿Avisó cambios, estuvo disponible?
  --   5: Identidad     — ¿Era quien decía ser?

  score_1         SMALLINT NOT NULL CHECK (score_1 BETWEEN 1 AND 5),
  score_2         SMALLINT NOT NULL CHECK (score_2 BETWEEN 1 AND 5),
  score_3         SMALLINT NOT NULL CHECK (score_3 BETWEEN 1 AND 5),
  score_4         SMALLINT NOT NULL CHECK (score_4 BETWEEN 1 AND 5),
  score_5         SMALLINT NOT NULL CHECK (score_5 BETWEEN 1 AND 5),

  -- Promedio calculado automáticamente
  overall_score   DECIMAL(3,2) GENERATED ALWAYS AS (
    (score_1 + score_2 + score_3 + score_4 + score_5) / 5.0
  ) STORED,

  comment         TEXT,

  -- Un usuario solo puede calificar una vez por reserva
  UNIQUE (booking_id, rater_id)
);

CREATE INDEX ratings_ratee_idx   ON public.ratings (ratee_id);
CREATE INDEX ratings_booking_idx ON public.ratings (booking_id);

-- Trigger: recalcular avg_rating del usuario calificado
CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ratee_role = 'driver' THEN
    UPDATE public.users
    SET avg_rating_as_driver = (
      SELECT COALESCE(AVG(overall_score), 0)
      FROM public.ratings
      WHERE ratee_id = NEW.ratee_id AND ratee_role = 'driver'
    ),
    total_trips_as_driver = (
      SELECT COUNT(DISTINCT b.id)
      FROM public.bookings b
      JOIN public.ratings r ON r.booking_id = b.id
      WHERE r.ratee_id = NEW.ratee_id AND r.ratee_role = 'driver'
        AND b.status = 'completed'
    )
    WHERE id = NEW.ratee_id;
  ELSE
    UPDATE public.users
    SET avg_rating_as_passenger = (
      SELECT COALESCE(AVG(overall_score), 0)
      FROM public.ratings
      WHERE ratee_id = NEW.ratee_id AND ratee_role = 'passenger'
    ),
    total_trips_as_passenger = (
      SELECT COUNT(DISTINCT b.id)
      FROM public.bookings b
      JOIN public.ratings r ON r.booking_id = b.id
      WHERE r.ratee_id = NEW.ratee_id AND r.ratee_role = 'passenger'
        AND b.status = 'completed'
    )
    WHERE id = NEW.ratee_id;
  END IF;

  -- Actualizar flag en booking
  IF NEW.ratee_role = 'driver' THEN
    UPDATE public.bookings
    SET passenger_rated_driver = TRUE
    WHERE id = NEW.booking_id;
  ELSE
    UPDATE public.bookings
    SET driver_rated_passenger = TRUE
    WHERE id = NEW.booking_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_created
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_rating();


-- =============================================================================
-- TABLA: notifications (notificaciones en-app)
-- =============================================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  -- 'booking_request' | 'booking_confirmed' | 'booking_cancelled'
  -- 'trip_cancelled' | 'rate_reminder' | 'payment_reminder'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, is_read);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;

-- USERS --
CREATE POLICY "Usuarios: lectura pública de perfiles activos"
  ON public.users FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Usuarios: solo yo puedo editar mi perfil"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- EVENTS --
CREATE POLICY "Eventos: lectura pública de eventos activos"
  ON public.events FOR SELECT USING (is_active = TRUE);

-- Solo admins pueden crear/editar eventos (via service_role)

-- TRIPS --
CREATE POLICY "Viajes: lectura pública de viajes activos"
  ON public.trips FOR SELECT USING (status IN ('active', 'full'));

CREATE POLICY "Viajes: solo el conductor puede crear"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Viajes: solo el conductor puede editar"
  ON public.trips FOR UPDATE USING (auth.uid() = driver_id);

-- BOOKINGS --
CREATE POLICY "Reservas: conductor ve las reservas de sus viajes"
  ON public.bookings FOR SELECT
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.driver_id = auth.uid()
    )
  );

CREATE POLICY "Reservas: pasajeros pueden crear reservas"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Reservas: conductor puede confirmar/cancelar"
  ON public.bookings FOR UPDATE
  USING (
    passenger_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.driver_id = auth.uid()
    )
  );

-- RATINGS --
CREATE POLICY "Calificaciones: lectura pública"
  ON public.ratings FOR SELECT USING (TRUE);

CREATE POLICY "Calificaciones: solo puedo calificar yo"
  ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- NOTIFICATIONS --
CREATE POLICY "Notificaciones: solo mis notificaciones"
  ON public.notifications FOR ALL USING (auth.uid() = user_id);


-- =============================================================================
-- DATOS INICIALES — Eventos de ejemplo
-- =============================================================================
INSERT INTO public.events (type, title, subtitle, venue_name, venue_address, venue_city, venue_province, event_date, home_team, away_team, competition, tags, is_featured)
VALUES
  ('partido', 'Boca Juniors vs River Plate', 'Superclásico — Copa de la Liga Profesional 2025',
   'Estadio Alberto J. Armando "La Bombonera"', 'Brandsen 805, La Boca', 'Buenos Aires', 'Buenos Aires',
   NOW() + INTERVAL '15 days', 'Boca Juniors', 'River Plate', 'Copa de la Liga Profesional',
   ARRAY['superclasico', 'boca', 'river', 'bombonera'], TRUE),

  ('partido', 'Racing Club vs Independiente', 'Clásico de Avellaneda — Fecha 8',
   'Estadio Juan Domingo Perón "El Cilindro"', 'Av. Galicia 2071, Avellaneda', 'Avellaneda', 'Buenos Aires',
   NOW() + INTERVAL '20 days', 'Racing Club', 'Independiente', 'Liga Profesional',
   ARRAY['clasico', 'racing', 'independiente', 'avellaneda'], FALSE),

  ('recital', 'Tan Biónica — Tour 2025', 'Estadio Vélez Sársfield',
   'Estadio José Amalfitani', 'Av. Juan B. Justo 9200, Villa del Parque', 'Buenos Aires', 'Buenos Aires',
   NOW() + INTERVAL '25 days', NULL, NULL, NULL,
   ARRAY['tanbionica', 'rock', 'pop', 'velez'], FALSE),

  ('partido', 'Rosario Central vs Newell''s Old Boys', 'Clásico Rosarino — Fecha 10',
   'Estadio Gigante de Arroyito', 'Av. Torcuato de Alvear 1262, Rosario', 'Rosario', 'Santa Fe',
   NOW() + INTERVAL '30 days', 'Rosario Central', 'Newell''s Old Boys', 'Liga Profesional',
   ARRAY['clasico', 'rosario', 'central', 'newells'], TRUE);
