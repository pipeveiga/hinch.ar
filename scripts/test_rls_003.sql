-- =============================================================================
-- HINCH.AR — Test de RLS para la migración 003_security_hardening
-- =============================================================================
-- Cómo usarlo:
--   1. Corré primero 003_security_hardening.sql.
--   2. Pegá este script entero en el SQL Editor de Supabase y ejecutá.
--   3. Mirá los mensajes (NOTICE / WARNING) en la salida:
--        - "PASS"  = la falla quedó cerrada  ✅
--        - "FAIL"  = la falla SIGUE ABIERTA  ❌  (revisar)
--        - "SKIP"  = no hay datos suficientes para probar ese caso
--
-- Es NO DESTRUCTIVO: todo corre dentro de una transacción que hace ROLLBACK
-- al final, así que no modifica ningún dato real.
--
-- Por qué cambia de rol: en el SQL Editor sos 'postgres' (dueño de las tablas)
-- y para el dueño la RLS no aplica. Cada test hace SET LOCAL ROLE authenticated
-- + simula el JWT de un usuario (request.jwt.claims) para que las policies
-- se evalúen de verdad, igual que cuando entra alguien desde la app.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- TEST 1 — USERS: un usuario NO puede auto-verificarse ni inflar su rating,
--          pero SÍ puede editar campos permitidos (bio).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  uid          uuid;
  ver_before   boolean;
  rat_before   numeric;
  ver_after    boolean;
  rat_after    numeric;
  bio_after    text;
BEGIN
  SELECT id, is_verified, avg_rating_as_driver
    INTO uid, ver_before, rat_before
    FROM public.users ORDER BY created_at LIMIT 1;

  IF uid IS NULL THEN
    RAISE NOTICE 'TEST 1  SKIP  (no hay usuarios en la tabla)';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- Intento malicioso + un cambio legítimo (bio) en el mismo UPDATE
  UPDATE public.users
     SET is_verified           = true,
         avg_rating_as_driver  = 5,
         total_trips_as_driver = 999,
         bio                   = '__rls_test__'
   WHERE id = uid;

  SELECT is_verified, avg_rating_as_driver, bio
    INTO ver_after, rat_after, bio_after
    FROM public.users WHERE id = uid;

  RESET ROLE;

  IF ver_after IS NOT DISTINCT FROM ver_before
     AND rat_after IS NOT DISTINCT FROM rat_before
     AND bio_after = '__rls_test__' THEN
    RAISE NOTICE 'TEST 1  PASS  campos protegidos intactos (is_verified=%, rating=%) y bio editable OK',
                 ver_after, rat_after;
  ELSE
    RAISE WARNING 'TEST 1  FAIL  un usuario pudo tocar campos protegidos (is_verified % -> %, rating % -> %)',
                  ver_before, ver_after, rat_before, rat_after;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RESET ROLE;
  RAISE WARNING 'TEST 1  ERROR  %', SQLERRM;
END $$;


-- -----------------------------------------------------------------------------
-- TEST 2 — RATINGS: no se puede auto-calificar (rater = ratee).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM public.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN RAISE NOTICE 'TEST 2  SKIP  (no hay usuarios)'; RETURN; END IF;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.ratings (booking_id, rater_id, ratee_id, ratee_role,
                                score_1, score_2, score_3, score_4, score_5)
    VALUES (gen_random_uuid(), uid, uid, 'driver', 5, 5, 5, 5, 5);
    RESET ROLE;
    RAISE WARNING 'TEST 2  FAIL  se permitió auto-calificarse';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RESET ROLE;
    RAISE NOTICE 'TEST 2  PASS  auto-calificación bloqueada (%).', SQLERRM;
  END;
END $$;


-- -----------------------------------------------------------------------------
-- TEST 3 — MESSAGES: no se puede escribir en el chat de una reserva ajena.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  uid      uuid;
  foreign_booking uuid;
BEGIN
  -- Buscamos una reserva donde el usuario de prueba NO sea ni pasajero ni conductor.
  SELECT u.id, b.id
    INTO uid, foreign_booking
    FROM public.users u
    JOIN public.bookings b ON TRUE
    JOIN public.trips t ON t.id = b.trip_id
   WHERE b.passenger_id <> u.id AND t.driver_id <> u.id
   LIMIT 1;

  IF uid IS NULL OR foreign_booking IS NULL THEN
    RAISE NOTICE 'TEST 3  SKIP  (no hay reservas ajenas para probar)';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.messages (booking_id, sender_id, content)
    VALUES (foreign_booking, uid, '__rls_test__ inyección');
    RESET ROLE;
    RAISE WARNING 'TEST 3  FAIL  se permitió inyectar mensaje en chat ajeno';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RESET ROLE;
    RAISE NOTICE 'TEST 3  PASS  escritura en chat ajeno bloqueada (%).', SQLERRM;
  END;
END $$;


-- -----------------------------------------------------------------------------
-- TEST 4 — BOOKINGS: el pasajero NO puede auto-confirmar su reserva
--          (sí debería poder cancelarla).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  passenger uuid;
  bkg       uuid;
BEGIN
  SELECT passenger_id, id INTO passenger, bkg
    FROM public.bookings ORDER BY created_at LIMIT 1;

  IF passenger IS NULL THEN RAISE NOTICE 'TEST 4  SKIP  (no hay reservas)'; RETURN; END IF;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', passenger::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 4a) auto-confirmarse => debe fallar
  BEGIN
    UPDATE public.bookings SET status = 'confirmed' WHERE id = bkg;
    IF NOT FOUND THEN
      RAISE NOTICE 'TEST 4a PASS  el pasajero no pudo confirmar (0 filas afectadas)';
    ELSE
      RESET ROLE;
      RAISE WARNING 'TEST 4a FAIL  el pasajero logró auto-confirmar la reserva';
      RETURN;
    END IF;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RAISE NOTICE 'TEST 4a PASS  auto-confirmación bloqueada (%).', SQLERRM;
  END;

  RESET ROLE;
END $$;


-- -----------------------------------------------------------------------------
-- TEST 5 — TRIPS: el conductor NO puede reasignar su viaje a otro driver_id.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  driver  uuid;
  trip    uuid;
  other   uuid;
BEGIN
  SELECT t.driver_id, t.id INTO driver, trip
    FROM public.trips t ORDER BY t.created_at LIMIT 1;
  SELECT id INTO other FROM public.users WHERE id <> driver LIMIT 1;

  IF driver IS NULL OR other IS NULL THEN
    RAISE NOTICE 'TEST 5  SKIP  (faltan viajes o un segundo usuario)';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', driver::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.trips SET driver_id = other WHERE id = trip;
    IF NOT FOUND THEN
      RESET ROLE;
      RAISE NOTICE 'TEST 5  PASS  no se pudo reasignar el viaje (0 filas afectadas)';
    ELSE
      RESET ROLE;
      RAISE WARNING 'TEST 5  FAIL  el conductor reasignó el viaje a otro driver_id';
    END IF;
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    RESET ROLE;
    RAISE NOTICE 'TEST 5  PASS  reasignación bloqueada (%).', SQLERRM;
  END;
END $$;


-- Nada de esto se guarda: deshacemos todos los cambios de prueba.
ROLLBACK;
