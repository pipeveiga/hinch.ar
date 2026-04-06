-- ============================================================
-- Corregir venues Copa Sudamericana
-- Barracas Central → Estadio Florencio Sola (Banfield)
-- Riestra → Estadio Pedro Bidegain (San Lorenzo)
-- ============================================================

-- Barracas Central (juega de local en el estadio de Banfield)
UPDATE events
SET
  venue_name     = 'Estadio Florencio Sola',
  venue_address  = 'Av. Presidente Perón 2102',
  venue_city     = 'Banfield',
  venue_province = 'Buenos Aires'
WHERE external_id IN (
  'sudamer_f1_barracas_vasco',
  'sudamer_f3_barracas_audax',
  'sudamer_f4_barracas_olimpia'
);

-- Riestra (juega de local en el estadio de San Lorenzo)
UPDATE events
SET
  venue_name     = 'Estadio Pedro Bidegain',
  venue_address  = 'Av. Perito Moreno 5301',
  venue_city     = 'Buenos Aires',
  venue_province = 'Buenos Aires'
WHERE external_id IN (
  'sudamer_f1_riestra_palestino',
  'sudamer_f3_riestra_torque',
  'sudamer_f4_riestra_gremio'
);
