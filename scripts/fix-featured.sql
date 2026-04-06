-- ============================================================
-- Fijar is_featured: solo clásicos destacados
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Paso 1: quitar destacado a todos los partidos cargados
UPDATE events
SET is_featured = false
WHERE external_id LIKE 'lpa_%'
   OR external_id LIKE 'liber_%'
   OR external_id LIKE 'sudamer_%';

-- Paso 2: destacar solo los clásicos
UPDATE events
SET is_featured = true
WHERE external_id IN (
  'lpa_f14_lanus_banfield',     -- Clásico del Sur: Lanús vs Banfield
  'lpa_f15_river_boca',         -- Superclásico: River vs Boca
  'lpa_f15_sanlorenzo_velez'    -- Clásico porteño: San Lorenzo vs Vélez
);
