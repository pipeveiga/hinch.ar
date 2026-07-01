-- =============================================================================
-- 006_events_admin.sql
--
-- Sistema de carga de eventos: mixto entre sync automático (script
-- scripts/sync-events.mjs corriendo desde GitHub Actions con service role
-- key) y edición manual desde un panel admin en la app.
--
-- Cambios de schema:
--   • events.external_id — clave estable del proveedor (thesportsdb, ticketmaster)
--     para poder hacer upsert idempotente. NULL = evento creado a mano.
--   • events.source — de dónde vino: 'manual' | 'thesportsdb' | 'ticketmaster'.
--   • users.is_admin — quién tiene acceso al panel /admin y puede escribir
--     en events.
--
-- Cambios de RLS/permisos:
--   • Se sustituyen las policies events_insert/update/delete_disabled de la 003
--     por versiones que permiten la operación cuando el caller es admin.
--   • GRANT INSERT/UPDATE/DELETE on events a authenticated. La RLS es la que
--     hace el filtro real por is_admin.
--   • Se extiende protect_user_columns para que nadie pueda auto-promoverse
--     a admin desde el cliente (solo el service role).
-- =============================================================================

-- 1) Columnas nuevas -----------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS source      TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'thesportsdb', 'ticketmaster'));

-- external_id único cuando está presente (permite múltiples NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS events_external_id_key
  ON public.events (external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;


-- 2) Extender protect_user_columns para bloquear auto-promoción --------------
-- La función original vive en la 003. Reescribimos agregando el check de is_admin.
CREATE OR REPLACE FUNCTION public.protect_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificación (is_verified, verified_at, verification_status): manejadas
  -- por el flujo de verificación del servidor.
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    RAISE EXCEPTION 'No se puede modificar el estado de verificación desde el cliente';
  END IF;

  -- Ratings y stats: solo se actualizan via triggers internos.
  IF NEW.avg_rating_as_driver     IS DISTINCT FROM OLD.avg_rating_as_driver
     OR NEW.total_trips_as_driver  IS DISTINCT FROM OLD.total_trips_as_driver
     OR NEW.avg_rating_as_passenger IS DISTINCT FROM OLD.avg_rating_as_passenger
     OR NEW.total_trips_as_passenger IS DISTINCT FROM OLD.total_trips_as_passenger THEN
    RAISE EXCEPTION 'Los ratings y estadísticas se recalculan automáticamente';
  END IF;

  -- DNI: solo el flujo de verificación puede escribir.
  IF NEW.dni_number    IS DISTINCT FROM OLD.dni_number
     OR NEW.dni_front_url IS DISTINCT FROM OLD.dni_front_url
     OR NEW.dni_back_url  IS DISTINCT FROM OLD.dni_back_url
     OR NEW.selfie_url    IS DISTINCT FROM OLD.selfie_url THEN
    RAISE EXCEPTION 'Los datos de DNI se manejan por el flujo de verificación';
  END IF;

  -- is_active: el usuario puede desactivar su cuenta pero no reactivarla solo
  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NEW.is_active = TRUE THEN
    RAISE EXCEPTION 'La reactivación de cuenta debe hacerla el equipo';
  END IF;

  -- is_admin: nadie se auto-promueve. Solo se cambia con service role.
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'No se puede modificar is_admin desde el cliente';
  END IF;

  RETURN NEW;
END;
$$;


-- 3) Grants de columna para is_admin ------------------------------------------
-- SELECT: el cliente necesita leerlo para decidir si mostrar la ruta /admin.
GRANT SELECT (is_admin) ON public.users TO anon, authenticated;
-- (UPDATE no se concede: el trigger lo rechaza igual, pero mejor defensa en profundidad.)


-- 4) Reemplazar policies de events --------------------------------------------
DROP POLICY IF EXISTS events_insert_disabled ON public.events;
DROP POLICY IF EXISTS events_update_disabled ON public.events;
DROP POLICY IF EXISTS events_delete_disabled ON public.events;

CREATE POLICY events_insert_admin ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY events_update_admin ON public.events
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY events_delete_admin ON public.events
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Grants de tabla: la RLS es la que filtra por rol.
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
