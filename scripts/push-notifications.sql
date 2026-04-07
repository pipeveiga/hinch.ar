-- ============================================================
-- HINCH.AR — Push Notifications Setup
-- Solo ejecutar esto en Supabase SQL Editor
-- (Los triggers se manejan desde el código de la app)
-- ============================================================

-- Agregar columna push_token a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
