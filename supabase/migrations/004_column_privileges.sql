-- =============================================================================
-- HINCH.AR — Migration 004: Privilegios por columna en users (fix PII)
--
-- PROBLEMA QUE RESUELVE (hallazgo de auditoría, crítico):
--   La RLS de users es a nivel de FILA (users_select_active: is_active = TRUE),
--   no de columna. El filtro de campos públicos vivía solo en el cliente
--   (usersApi.getById en lib/supabase.ts). Por lo tanto, cualquiera con la
--   anon key (que es pública, va en el bundle) podía pedir desde la consola:
--       supabase.from('users').select('dni, selfie_url, phone, car_plate')
--   y la base devolvía el DNI, las fotos del DNI, la selfie, el teléfono y la
--   patente de TODOS los usuarios activos. Fuga de datos personales.
--
-- SOLUCIÓN:
--   Privilegios por columna (GRANT/REVOKE a nivel SQL). Aunque alguien pegue
--   directo a la API saltando el cliente, Postgres rechaza leer/escribir las
--   columnas sensibles. El dueño accede a su propia fila completa por una
--   función SECURITY DEFINER (get_my_profile), nunca a la de otros.
--
-- ORDEN: correr DESPUÉS de 003 (usa verification_status / push_token,
-- columnas que agrega la 003). Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LECTURA: revocar todo y conceder solo columnas públicas
-- -----------------------------------------------------------------------------
-- Quitamos el SELECT amplio que Supabase concede por defecto a anon/authenticated.
REVOKE SELECT ON public.users FROM anon, authenticated;

-- Solo columnas no sensibles. NO incluye: phone, dni, dni_front_url,
-- dni_back_url, selfie_url, car_plate, verified_at, verification_status,
-- verification_submitted_at, push_token, updated_at.
GRANT SELECT (
  id,
  full_name,
  avatar_url,
  bio,
  is_verified,
  avg_rating_as_driver,
  total_trips_as_driver,
  avg_rating_as_passenger,
  total_trips_as_passenger,
  has_car,
  car_brand,
  car_model,
  car_year,
  car_color,
  car_photo_url,
  created_at,
  is_active
) ON public.users TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. ESCRITURA: conceder UPDATE solo en las columnas que el usuario puede editar
--    (defensa en profundidad — el trigger protect_user_columns de la 003 sigue
--     validando además la semántica de cada transición)
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON public.users FROM anon, authenticated;

GRANT UPDATE (
  full_name,
  bio,
  phone,
  avatar_url,
  has_car,
  car_brand,
  car_model,
  car_year,
  car_color,
  car_plate,
  car_photo_url,
  push_token,
  is_active,
  verification_status,        -- transición none/rejected → pending (la valida el trigger)
  verification_submitted_at
) ON public.users TO authenticated;


-- -----------------------------------------------------------------------------
-- 3. El dueño lee su propia fila COMPLETA vía función SECURITY DEFINER.
--    Devuelve solo la fila de auth.uid(): nunca la de otro usuario.
--    Reemplaza al viejo `select('*')` de usersApi.getMe.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
