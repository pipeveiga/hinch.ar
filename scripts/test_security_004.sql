-- =============================================================================
-- Test de la migración 004 — privilegios por columna en users
--
-- Cómo correrlo: pegalo en el SQL Editor de Supabase (o psql) DESPUÉS de
-- aplicar 003 y 004. Cada bloque dice qué resultado se espera.
-- =============================================================================

-- 1) Como 'authenticated' (lo que usa cualquier persona logueada desde el
--    cliente), las columnas sensibles NO deben poder leerse.
--    ESPERADO: ERROR  ->  permission denied for ... (dni)
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM dni FROM public.users LIMIT 1;
  RAISE EXCEPTION 'FALLO: se pudo leer users.dni como authenticated (NO debería)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: lectura de users.dni denegada para authenticated';
END $$;
RESET ROLE;

-- 2) Idem para anon (solo la anon key, sin login).
--    ESPERADO: permiso denegado en phone / selfie_url / car_plate.
SET ROLE anon;
DO $$
BEGIN
  PERFORM phone FROM public.users LIMIT 1;
  RAISE EXCEPTION 'FALLO: se pudo leer users.phone como anon (NO debería)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: lectura de users.phone denegada para anon';
END $$;
RESET ROLE;

-- 3) Las columnas públicas SÍ deben leerse sin problema.
--    ESPERADO: corre sin error.
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM id, full_name, avatar_url, is_verified, avg_rating_as_driver
  FROM public.users LIMIT 1;
  RAISE NOTICE 'OK: columnas públicas legibles para authenticated';
END $$;
RESET ROLE;

-- 4) Escritura a columnas protegidas denegada a nivel privilegio.
--    ESPERADO: permiso denegado al intentar UPDATE de is_verified.
SET ROLE authenticated;
DO $$
BEGIN
  UPDATE public.users SET is_verified = TRUE WHERE id = id;
  RAISE EXCEPTION 'FALLO: se pudo escribir is_verified como authenticated (NO debería)';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: UPDATE de is_verified denegado para authenticated';
END $$;
RESET ROLE;

-- =============================================================================
-- Resultado deseado: cuatro líneas "OK: ..." en los NOTICE y ningún "FALLO".
-- =============================================================================
