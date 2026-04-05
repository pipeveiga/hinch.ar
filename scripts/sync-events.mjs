// =============================================================================
// HINCH.AR — Sincronizador de eventos
// Carga partidos de fútbol (API-Football) y recitales (Ticketmaster)
// en Supabase, 4 semanas hacia adelante.
// =============================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_KEY
const APIFOOTBALL_KEY   = process.env.APIFOOTBALL_KEY
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
// API-FOOTBALL — Ligas argentinas
// =============================================================================

const LIGAS = [
  { id: 128, name: 'Liga Profesional Argentina' },
  { id: 130, name: 'Copa Argentina' },
  { id: 131, name: 'Copa de la Liga' },
  { id: 13,  name: 'Copa Libertadores' },
  { id: 14,  name: 'Copa Sudamericana' },
]

const ESTADIOS = {
  'Estadio Alberto J. Armando':        { address: 'Brandsen 805', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Monumental':                { address: 'Av. Figueroa Alcorta 7597', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Pedro Bidegain':            { address: 'Av. Perito Moreno 5301', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Tomás Adolfo Ducó':        { address: 'Av. Amancio Alcorta 2884', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Estadio Ciudad de La Plata':        { address: 'Calle 25 y 527', city: 'La Plata', province: 'Buenos Aires' },
  'Estadio Mario Alberto Kempes':      { address: 'Av. Cárcano s/n', city: 'Córdoba', province: 'Córdoba' },
  'Estadio Marcelo Bielsa':            { address: 'Av. Carlos Pellegrini 2890', city: 'Rosario', province: 'Santa Fe' },
}

async function syncFootball() {
  if (!APIFOOTBALL_KEY) {
    console.log('⚠️  Sin APIFOOTBALL_KEY, saltando fútbol')
    return 0
  }

  const { from, to } = getDateRange()
  const season = new Date().getFullYear()
  let total = 0

  for (const liga of LIGAS) {
    console.log(`⚽ Sincronizando ${liga.name}...`)

    const url = `https://v3.football.api-sports.io/fixtures?league=${liga.id}&season=${season}&from=${from}&to=${to}&status=NS`
    const res  = await fetch(url, {
      headers: {
        'x-apisports-key': APIFOOTBALL_KEY,
      }
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(`  Error ${res.status} en ${liga.name}:`, JSON.stringify(data))
      continue
    }

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error(`  API error en ${liga.name}:`, JSON.stringify(data.errors))
      continue
    }

    const fixtures = data.response ?? []
    console.log(`  → ${fixtures.length} partidos encontrados (quota: ${JSON.stringify(data.paging)})`)

    for (const f of fixtures) {
      const fixture  = f.fixture
      const teams    = f.teams
      const leagueData = f.league
      const venue    = fixture.venue

      const homeTeam = teams.home.name
      const awayTeam = teams.away.name
      const title    = `${homeTeam} vs ${awayTeam}`
      const venueInfo = ESTADIOS[venue?.name] ?? {
        address:  venue?.name ?? 'Estadio',
        city:     venue?.city ?? 'Argentina',
        province: 'Argentina',
      }

      const event = {
        type:           'partido',
        title,
        subtitle:       leagueData.name,
        venue_name:     venue?.name ?? 'Estadio',
        venue_address:  venueInfo.address,
        venue_city:     venueInfo.city,
        venue_province: venueInfo.province,
        event_date:     fixture.date,
        image_url:      teams.home.logo,
        home_team:      homeTeam,
        away_team:      awayTeam,
        competition:    liga.name,
        tags:           ['fútbol', liga.name.toLowerCase()],
        is_active:      true,
        is_featured:    liga.id === 128 || liga.id === 13,
        // usamos fixture.id como clave para upsert
        external_id:    `apifootball_${fixture.id}`,
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
// TICKETMASTER — Movistar Arena Buenos Aires
// =============================================================================

async function syncConcerts() {
  if (!TICKETMASTER_KEY) {
    console.log('⚠️  Sin TICKETMASTER_KEY, saltando recitales')
    return 0
  }

  console.log('🎸 Sincronizando recitales (Ticketmaster)...')

  const { from, to } = getDateRange()
  const url = `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${TICKETMASTER_KEY}` +
    `&keyword=movistar+arena` +
    `&countryCode=AR` +
    `&classificationName=Music` +
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
  if (events.length === 0) console.log('  Debug TM response:', JSON.stringify(data).slice(0, 300))

  let total = 0
  for (const e of events) {
    const venue   = e._embedded?.venues?.[0]
    const image   = e.images?.find(i => i.ratio === '16_9' && i.width > 500)?.url
                 ?? e.images?.[0]?.url
    const artist  = e.name
    const date    = e.dates?.start?.dateTime ?? `${e.dates?.start?.localDate}T21:00:00Z`

    const event = {
      type:           'recital',
      title:          artist,
      subtitle:       'Movistar Arena',
      venue_name:     'Movistar Arena',
      venue_address:  'Av. Coronel Díaz 1252',
      venue_city:     'Buenos Aires',
      venue_province: 'Buenos Aires',
      event_date:     date,
      image_url:      image ?? null,
      artist,
      tags:           ['recital', 'música', 'movistar arena'],
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
