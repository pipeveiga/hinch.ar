-- =============================================================================
-- HINCH.AR — Test de RLS para la migración 003_security_hardening
-- =============================================================================
-- Cómo usarlo:
--   1. Corré primero 003_security_hardening.sql.
--   2. Pegá este script entero en el SQL Editor de Supabase y ejecutá.
--   3. El resultado sale como TABLA en la solapa "Results": una fila por test
--      con la columna "Resultado" en PASS / FAIL / SKIP.
--        - PASS = la falla quedó cerrada  ✅
--        - FAIL = la falla SIGUE ABIERTA  ❌
--        - SKIP = no hay datos suficientes para probar ese caso
--
-- (Se usa una tabla de resultados porque el SQL Editor de Supabase no muestra
--  los mensajes de RAISE NOTICE.) Es NO DESTRUCTIVO: cada test hace su cambio
-- dentro de una subtransacción que se deshace, así que no toca datos reales.
--
-- Cada test simula un usuario logueado (SET LOCAL ROLE authenticated +
-- request.jwt.claims) porque en el SQL Editor sos 'postgres', rol para el cual
-- la RLS no aplica.
-- =============================================================================

DROP TABLE IF EXISTS _rls_results;
CREATE TEMP TABLE _rls_results (n int, prueba text, resultado text);

-- TEST 1 — users: no auto-verificarse ni inflar rating (bio sí editable)
DO $$
DECLARE uid uuid; ver_b boolean; rat_b numeric; ver_a boolean; rat_a numeric; bio_a text; v text;
BEGIN
  SELECT id, is_verified, avg_rating_as_driver INTO uid, ver_b, rat_b
    FROM public.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN INSERT INTO _rls_results VALUES (1,'users: no auto-verificarse','SKIP (sin usuarios)'); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',uid::text,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.users SET is_verified=true, avg_rating_as_driver=5, total_trips_as_driver=999, bio='__rls_test__' WHERE id=uid;
    SELECT is_verified, avg_rating_as_driver, bio INTO ver_a, rat_a, bio_a FROM public.users WHERE id=uid;
    RAISE EXCEPTION 'undo';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  IF ver_a IS NOT DISTINCT FROM ver_b AND rat_a IS NOT DISTINCT FROM rat_b AND bio_a='__rls_test__'
    THEN v:='PASS'; ELSE v:='FAIL'; END IF;
  INSERT INTO _rls_results VALUES (1,'users: no auto-verificarse ni inflar rating', v);
END $$;

-- TEST 2 — ratings: no auto-calificarse
DO $$
DECLARE uid uuid; blocked boolean := true;
BEGIN
  SELECT id INTO uid FROM public.users ORDER BY created_at LIMIT 1;
  IF uid IS NULL THEN INSERT INTO _rls_results VALUES (2,'ratings: no auto-calificarse','SKIP (sin usuarios)'); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',uid::text,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.ratings (booking_id, rater_id, ratee_id, ratee_role, score_1,score_2,score_3,score_4,score_5)
    VALUES (gen_random_uuid(), uid, uid, 'driver', 5,5,5,5,5);
    blocked := false; RAISE EXCEPTION 'undo';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  INSERT INTO _rls_results VALUES (2,'ratings: no auto-calificarse', CASE WHEN blocked THEN 'PASS' ELSE 'FAIL' END);
END $$;

-- TEST 3 — messages: no escribir en chat ajeno
DO $$
DECLARE uid uuid; fb uuid; blocked boolean := true;
BEGIN
  SELECT u.id, b.id INTO uid, fb
    FROM public.users u JOIN public.bookings b ON TRUE JOIN public.trips t ON t.id=b.trip_id
   WHERE b.passenger_id<>u.id AND t.driver_id<>u.id LIMIT 1;
  IF uid IS NULL OR fb IS NULL THEN INSERT INTO _rls_results VALUES (3,'messages: no inyectar en chat ajeno','SKIP (sin reservas ajenas)'); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',uid::text,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO public.messages (booking_id, sender_id, content) VALUES (fb, uid, '__rls_test__');
    blocked := false; RAISE EXCEPTION 'undo';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  INSERT INTO _rls_results VALUES (3,'messages: no inyectar en chat ajeno', CASE WHEN blocked THEN 'PASS' ELSE 'FAIL' END);
END $$;

-- TEST 4 — bookings: el pasajero no puede auto-confirmar
DO $$
DECLARE p uuid; bkg uuid; blocked boolean := true;
BEGIN
  SELECT passenger_id, id INTO p, bkg FROM public.bookings ORDER BY created_at LIMIT 1;
  IF p IS NULL THEN INSERT INTO _rls_results VALUES (4,'bookings: pasajero no auto-confirma','SKIP (sin reservas)'); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',p::text,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.bookings SET status='confirmed' WHERE id=bkg;
    IF FOUND THEN blocked := false; END IF;
    RAISE EXCEPTION 'undo';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  INSERT INTO _rls_results VALUES (4,'bookings: pasajero no auto-confirma', CASE WHEN blocked THEN 'PASS' ELSE 'FAIL' END);
END $$;

-- TEST 5 — trips: no reasignar el viaje a otro driver
DO $$
DECLARE d uuid; trip uuid; other uuid; blocked boolean := true;
BEGIN
  SELECT t.driver_id, t.id INTO d, trip FROM public.trips t ORDER BY t.created_at LIMIT 1;
  SELECT id INTO other FROM public.users WHERE id<>d LIMIT 1;
  IF d IS NULL OR other IS NULL THEN INSERT INTO _rls_results VALUES (5,'trips: no reasignar driver_id','SKIP (faltan datos)'); RETURN; END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',d::text,'role','authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.trips SET driver_id=other WHERE id=trip;
    IF FOUND THEN blocked := false; END IF;
    RAISE EXCEPTION 'undo';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RESET ROLE;
  INSERT INTO _rls_results VALUES (5,'trips: no reasignar driver_id', CASE WHEN blocked THEN 'PASS' ELSE 'FAIL' END);
END $$;

SELECT n AS "#", prueba AS "Prueba", resultado AS "Resultado" FROM _rls_results ORDER BY n;
