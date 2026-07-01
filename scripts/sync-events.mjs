// =============================================================================
// HINCH.AR — Sincronizador de eventos
//
// Corre desde GitHub Actions cada 6 horas (ver .github/workflows/sync-events.yml)
// y también se puede correr a mano con:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... TICKETMASTER_KEY=... \
//     node scripts/sync-events.mjs
//
// Fuentes:
//   • Fútbol Argentino Primera División → TheSportsDB (gratis, sin API key).
//   • Recitales CABA / GBA               → Ticketmaster Discovery API (free tier).
//
// Los eventos se hacen UPSERT por external_id (columna agregada en la
// migración 006). Un evento sincronizado nunca pisa uno editado a mano:
// si el mismo evento vino primero por sync y después se editó desde el
// admin, la próxima corrida no lo re-sobrescribe porque en el UPDATE de
// upsert distinguimos por source. Ver comentarios abajo.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Faltan variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// Rango de 60 días hacia adelante — cubre calendarios largos como Libertadores.
function getWindow() {
  const from = new Date()
  const to   = new Date()
  to.setDate(to.getDate() + 60)
  return { from, to }
}

// Upsert que respeta ediciones manuales:
//   - Si existe una fila con el mismo external_id y source='manual', NO se pisa
//     (el admin ya la tocó a mano).
//   - Si no existe, se inserta.
//   - Si existe y source ≠ 'manual', se actualiza (para reflejar cambios de
//     horario, sede, etc.).
async function upsertRespectingManual(event) {
  const { data: existing } = await supabase
    .from('events')
    .select('id, source')
    .eq('external_id', event.external_id)
    .maybeSingle()

  if (existing && existing.source === 'manual') return { skipped: true }

  if (existing) {
    const { error } = await supabase
      .from('events')
      .update(event)
      .eq('id', existing.id)
    return { updated: !error, error }
  }

  const { error } = await supabase.from('events').insert(event)
  return { inserted: !error, error }
}

// =============================================================================
// TheSportsDB — Fútbol Argentino Primera División
// =============================================================================

// API pública sin key. Docs: https://www.thesportsdb.com/free_json_api.html
// League ID 4406 = Argentina Primera División. Endpoints:
//   • eventsnextleague.php?id=... → próximos 15 partidos programados.
//   • eventsseason.php?id=...&s=... → temporada completa (no lo usamos porque
//     15 próximos ya cubre el rango de 60 días para la Liga Profesional).
const THESPORTSDB_KEY   = '3'                    // key pública de "free tier"
const THESPORTSDB_BASE  = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}`
const ARG_PRIMERA_ID    = '4406'

// Sedes conocidas → dirección aproximada. Cuando no matchea, usamos el nombre
// del estadio como address; la RLS no se rompe y el usuario ve algo razonable.
const SEDES = {
  'Monumental':        { address: 'Av. Figueroa Alcorta 7597', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Bombonera':         { address: 'Brandsen 805',              city: 'Buenos Aires', province: 'Buenos Aires' },
  'Bidegain':          { address: 'Av. Perito Moreno 5301',    city: 'Buenos Aires', province: 'Buenos Aires' },
  'Ducó':              { address: 'Av. Amancio Alcorta 2884',  city: 'Buenos Aires', province: 'Buenos Aires' },
  'Amalfitani':        { address: 'Av. Juan B. Justo 9200',    city: 'Buenos Aires', province: 'Buenos Aires' },
  'Libertadores':      { address: 'Av. Congreso 3901',         city: 'Buenos Aires', province: 'Buenos Aires' }, // Núñez / Comunicaciones
  'Cilindro':          { address: 'Av. Galicia 2070',          city: 'Avellaneda',   province: 'Buenos Aires' },
  'Libertadores de América': { address: 'Bochini 751',         city: 'Avellaneda',   province: 'Buenos Aires' },
  'Kempes':            { address: 'Av. Cárcano s/n',           city: 'Córdoba',      province: 'Córdoba'      },
  'Arroyito':          { address: 'Av. Torcuato de Alvear 1000', city: 'Rosario',    province: 'Santa Fe'     },
  'Marcelo Bielsa':    { address: 'Av. Carlos Pellegrini 2890', city: 'Rosario',     province: 'Santa Fe'     },
  'Ciudad de La Plata': { address: 'Av. 25 y 32',              city: 'La Plata',     province: 'Buenos Aires' },
  'Único':             { address: 'Diagonal 74 y 32',          city: 'La Plata',     province: 'Buenos Aires' },
}

function resolveVenue(venueName) {
  if (!venueName) return { address: 'Estadio', city: 'Buenos Aires', province: 'Buenos Aires' }
  for (const [key, val] of Object.entries(SEDES)) {
    if (venueName.toLowerCase().includes(key.toLowerCase())) return val
  }
  return { address: venueName, city: 'Buenos Aires', province: 'Buenos Aires' }
}

async function syncFootball() {
  console.log('⚽ Fútbol — TheSportsDB (Argentina Primera División)')
  const url = `${THESPORTSDB_BASE}/eventsnextleague.php?id=${ARG_PRIMERA_ID}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`  Error ${res.status} en TheSportsDB`)
    return { inserted: 0, updated: 0, skipped: 0 }
  }

  const data = await res.json()
  const events = data.events ?? []
  console.log(`  → ${events.length} partidos programados`)

  const { from, to } = getWindow()
  let inserted = 0, updated = 0, skipped = 0

  for (const e of events) {
    if (!e.strHomeTeam || !e.strAwayTeam) continue

    // TheSportsDB devuelve strTimestamp en UTC ISO. Cuando falta, combinamos
    // dateEvent + strTime (asumidos en UTC-3 Argentina).
    let eventDate = e.strTimestamp
    if (!eventDate && e.dateEvent) {
      const time = e.strTime && e.strTime !== '00:00:00' ? e.strTime : '21:00:00'
      eventDate = new Date(`${e.dateEvent}T${time}-03:00`).toISOString()
    }
    if (!eventDate) continue

    const d = new Date(eventDate)
    if (d < from || d > to) continue

    const venue = resolveVenue(e.strVenue)

    const event = {
      external_id:    `thesportsdb_${e.idEvent}`,
      source:         'thesportsdb',
      type:           'partido',
      title:          `${e.strHomeTeam} vs ${e.strAwayTeam}`,
      subtitle:       e.strLeague ?? 'Liga Profesional Argentina',
      venue_name:     e.strVenue ?? 'Estadio',
      venue_address:  venue.address,
      venue_city:     venue.city,
      venue_province: venue.province,
      event_date:     eventDate,
      image_url:      e.strThumb ?? e.strPoster ?? null,
      home_team:      e.strHomeTeam,
      away_team:      e.strAwayTeam,
      competition:    e.strLeague ?? 'Liga Profesional Argentina',
      tags:           ['fútbol', 'liga profesional'],
      is_active:      true,
      is_featured:    false,
    }

    const r = await upsertRespectingManual(event)
    if (r.inserted) inserted++
    else if (r.updated) updated++
    else if (r.skipped) skipped++
    else if (r.error) console.error(`  Error en ${event.title}:`, r.error.message)
  }

  return { inserted, updated, skipped }
}

// =============================================================================
// Ticketmaster — Recitales CABA / GBA
// =============================================================================

async function syncConcerts() {
  if (!TICKETMASTER_KEY) {
    console.log('🎸 Recitales — TICKETMASTER_KEY no configurado, saltando')
    return { inserted: 0, updated: 0, skipped: 0 }
  }

  console.log('🎸 Recitales — Ticketmaster (CABA + GBA)')

  const { from, to } = getWindow()
  const fromStr = from.toISOString().split('.')[0] + 'Z'
  const toStr   = to.toISOString().split('.')[0]   + 'Z'

  // Búsqueda por countryCode + classification + rango.
  // Ticketmaster permite pasar múltiples ciudades separadas por coma en 'city'
  // pero cubrir "GBA" es más limpio filtrando por stateCode=B (provincia
  // Buenos Aires) sin city, y luego filtrando localmente venue_city.
  const url = `https://app.ticketmaster.com/discovery/v2/events.json`
    + `?apikey=${TICKETMASTER_KEY}`
    + `&countryCode=AR`
    + `&classificationName=Music`
    + `&startDateTime=${fromStr}`
    + `&endDateTime=${toStr}`
    + `&size=100`
    + `&sort=date,asc`

  const res  = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    console.error(`  Error ${res.status}:`, JSON.stringify(data).slice(0, 200))
    return { inserted: 0, updated: 0, skipped: 0 }
  }

  const events = data._embedded?.events ?? []
  console.log(`  → ${events.length} recitales encontrados`)

  let inserted = 0, updated = 0, skipped = 0

  for (const e of events) {
    const venue = e._embedded?.venues?.[0]
    const image = e.images?.find(i => i.ratio === '16_9' && i.width > 500)?.url ?? e.images?.[0]?.url
    const artist = e.name
    const eventDate = e.dates?.start?.dateTime ?? `${e.dates?.start?.localDate}T21:00:00-03:00`
    const venueName = venue?.name ?? 'Venue'
    const city      = venue?.city?.name ?? 'Buenos Aires'
    const stateCode = venue?.state?.stateCode ?? ''

    // Nos quedamos con CABA + GBA (Buenos Aires provincia).
    if (stateCode !== 'B' && stateCode !== 'C') continue

    const event = {
      external_id:    `ticketmaster_${e.id}`,
      source:         'ticketmaster',
      type:           'recital',
      title:          artist,
      subtitle:       venueName,
      venue_name:     venueName,
      venue_address:  venue?.address?.line1 ?? venueName,
      venue_city:     city,
      venue_province: stateCode === 'C' ? 'Buenos Aires' : 'Buenos Aires',
      event_date:     eventDate,
      image_url:      image ?? null,
      artist,
      tags:           ['recital', 'música'],
      is_active:      true,
      is_featured:    false,
    }

    const r = await upsertRespectingManual(event)
    if (r.inserted) inserted++
    else if (r.updated) updated++
    else if (r.skipped) skipped++
    else if (r.error) console.error(`  Error en ${artist}:`, r.error.message)
  }

  return { inserted, updated, skipped }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const { from, to } = getWindow()
  console.log('🚀 Sincronizando eventos para hinch.ar')
  console.log(`📅 Rango: ${from.toISOString().split('T')[0]} → ${to.toISOString().split('T')[0]}`)
  console.log('')

  const football = await syncFootball()
  const concerts = await syncConcerts()

  console.log('')
  console.log('✅ Resumen:')
  console.log(`   ⚽ Fútbol:    +${football.inserted} · ~${football.updated} · saltados ${football.skipped}`)
  console.log(`   🎸 Recitales: +${concerts.inserted} · ~${concerts.updated} · saltados ${concerts.skipped}`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
