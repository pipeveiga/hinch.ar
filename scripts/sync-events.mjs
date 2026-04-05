// =============================================================================
// HINCH.AR — Sincronizador de eventos
// Carga partidos de fútbol (football-data.org) y recitales (Ticketmaster)
// en Supabase, 4 semanas hacia adelante.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_KEY
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY   // football-data.org
const TICKETMASTER_KEY  = process.env.TICKETMASTER_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

// Rango de fechas: hoy + 4 semanas
function getDateRange() {
  const from = new Date()
  const to   = new Date()
  to.setDate(to.getDate() + 28)
  const fmt = (d) => d.toISOString().split('T')[0]
  return { from: fmt(from), to: fmt(to) }
}

// =============================================================================
// FOOTBALL-DATA.ORG — Ligas argentinas (plan gratuito)
// Competiciones: BSA = Primera División Argentina
// =============================================================================

const COMPETICIONES = [
  { code: 'BSA', name: 'Liga Profesional Argentina' },
]

const ESTADIOS = {
  'Estadio Alberto J. Armando "La Bombonera"': { address: 'Brandsen 805', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Monumental':                         { address: 'Av. Figueroa Alcorta 7597', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Pedro Bidegain':                     { address: 'Av. Perito Moreno 5301', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Tomás Adolfo Ducó':                 { address: 'Av. Amancio Alcorta 2884', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Ciudad de La Plata':                 { address: 'Calle 25 y 527', city: 'La Plata', province: 'Buenos Aires' },
  'Estadio Mario Alberto Kempes':               { address: 'Av. Cárcano s/n', city: 'Córdoba', province: 'Córdoba' },
  'Estadio Marcelo Bielsa':                     { address: 'Av. Carlos Pellegrini 2890', city: 'Rosario', province: 'Santa Fe' },
  'Estadio Juan Domingo Perón "El Cilindro"':  { address: 'Av. Galicia 2070', city: 'Avellaneda', province: 'Buenos Aires' },
  'Estadio José Amalfitani':                    { address: 'Av. Juan B. Justo 9200', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Gigante de Arroyito':                { address: 'Av. Torcuato de Alvear 1000', city: 'Rosario', province: 'Santa Fe' },
}

async function syncFootball() {
  if (!FOOTBALL_DATA_KEY) {
    console.log('⚠️  Sin FOOTBALL_DATA_KEY, saltando fútbol')
    return 0
  }

  const { from, to } = getDateRange()
  let total = 0

  for (const comp of COMPETICIONES) {
    console.log(`⚽ Sincronizando ${comp.name}...`)

    const url = `https://api.football-data.org/v4/competitions/${comp.code}/matches?dateFrom=${from}&dateTo=${to}&status=SCHEDULED`
    const res = await fetch(url, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(`  Error ${res.status} en ${comp.name}:`, JSON.stringify(data))
      continue
    }

    const matches = data.matches ?? []
    console.log(`  → ${matches.length} partidos encontrados`)

    for (const m of matches) {
      const homeTeam = m.homeTeam.name
      const awayTeam = m.awayTeam.name
      const title    = `${homeTeam} vs ${awayTeam}`
      const venueName = m.venue ?? 'Estadio'
      const venueInfo = ESTADIOS[venueName] ?? {
        address:  venueName,
        city:     'Buenos Aires',
        province: 'Buenos Aires',
      }

      const event = {
        type:           'partido',
        title,
        subtitle:       comp.name,
        venue_name:     venueName,
        venue_address:  venueInfo.address,
        venue_city:     venueInfo.city,
        venue_province: venueInfo.province,
        event_date:     m.utcDate,
        image_url:      m.homeTeam.crest ?? null,
        home_team:      homeTeam,
        away_team:      awayTeam,
        competition:    comp.name,
        tags:           ['fútbol', comp.name.toLowerCase()],
        is_active:      true,
        is_featured:    true,
        external_id:    `footballdata_${m.id}`,
      }

      const { error } = await supabase
        .from('events')
        .upsert(event, { onConflict: 'external_id', ignoreDuplicates: true })

      if (error) console.error(`  Error insertando ${title}:`, error.message)
      else total++
    }
  }

  return total
}

// =============================================================================
// TICKETMASTER — Buenos Aires, música
// =============================================================================

async function syncConcerts() {
  if (!TICKETMASTER_KEY) {
    console.log('⚠️  Sin TICKETMASTER_KEY, saltando recitales')
    return 0
  }

  console.log('🎸 Sincronizando recitales (Ticketmaster)...')

  const { from, to } = getDateRange()

  // Buscar por ciudad Buenos Aires, clasificación Music, sin keyword
  const url = `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${TICKETMASTER_KEY}` +
    `&countryCode=AR` +
    `&classificationName=Music` +
    `&city=Buenos+Aires` +
    `&startDateTime=${from}T00:00:00Z` +
    `&endDateTime=${to}T23:59:59Z` +
    `&size=50` +
    `&sort=date,asc`

  const res  = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    console.error(`  Error ${res.status} en Ticketmaster:`, JSON.stringify(data))
    return 0
  }

  if (data.errors) {
    console.error(`  Ticketmaster API error:`, JSON.stringify(data.errors))
    return 0
  }

  const events = data._embedded?.events ?? []
  console.log(`  → ${events.length} recitales encontrados`)
  if (events.length === 0) {
    console.log('  Debug TM:', JSON.stringify(data.page ?? data).slice(0, 200))
  }

  let total = 0
  for (const e of events) {
    const venue  = e._embedded?.venues?.[0]
    const image  = e.images?.find(i => i.ratio === '16_9' && i.width > 500)?.url
               ?? e.images?.[0]?.url
    const artist = e.name
    const date   = e.dates?.start?.dateTime ?? `${e.dates?.start?.localDate}T21:00:00Z`
    const venueName = venue?.name ?? 'Venue'

    const event = {
      type:           'recital',
      title:          artist,
      subtitle:       venueName,
      venue_name:     venueName,
      venue_address:  venue?.address?.line1 ?? '',
      venue_city:     venue?.city?.name ?? 'Buenos Aires',
      venue_province: 'Buenos Aires',
      event_date:     date,
      image_url:      image ?? null,
      artist,
      tags:           ['recital', 'música'],
      is_active:      true,
      is_featured:    false,
      external_id:    `ticketmaster_${e.id}`,
    }

    const { error } = await supabase
      .from('events')
      .upsert(event, { onConflict: 'external_id', ignoreDuplicates: true })

    if (error) console.error(`  Error insertando ${artist}:`, error.message)
    else total++
  }

  return total
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('🚀 Sincronizando eventos para hinch.ar...')
  console.log(`📅 Rango: ${getDateRange().from} → ${getDateRange().to}`)
  console.log('')

  const football = await syncFootball()
  const concerts = await syncConcerts()

  console.log('')
  console.log(`✅ Listo: ${football} partidos + ${concerts} recitales sincronizados`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
