// =============================================================================
// HINCH.AR — Sincronizador de eventos
// Scrapea promiedos.com.ar para partidos argentinos + Ticketmaster para recitales
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const SUPABASE_URL     = process.env.SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY
const TICKETMASTER_KEY = process.env.TICKETMASTER_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

function getDateRange() {
  const from = new Date()
  const to   = new Date()
  to.setDate(to.getDate() + 28)
  return { from, to }
}

// Convierte "DD/MM/YYYY HH:MM" a ISO date string
function parseArgDate(dateStr, timeStr) {
  try {
    const [day, month, year] = dateStr.split('/')
    const [hour, min] = (timeStr ?? '00:00').split(':')
    // Argentina es UTC-3
    return new Date(`${year}-${month}-${day}T${hour}:${min}:00-03:00`).toISOString()
  } catch {
    return null
  }
}

// =============================================================================
// PROMIEDOS.COM.AR — Fixtures de ligas argentinas
// =============================================================================

const LIGAS_PROMIEDOS = [
  { slug: 'primera',  name: 'Liga Profesional Argentina', featured: true  },
  { slug: 'copaar',   name: 'Copa Argentina',             featured: false },
  { slug: 'libertad', name: 'Copa Libertadores',          featured: false },
  { slug: 'sudamer',  name: 'Copa Sudamericana',          featured: false },
]

const ESTADIOS = {
  'Monumental':       { address: 'Av. Figueroa Alcorta 7597', city: 'Buenos Aires', province: 'Buenos Aires' },
  'Bombonera':        { address: 'Brandsen 805',              city: 'Buenos Aires', province: 'Buenos Aires' },
  'Bidegain':         { address: 'Av. Perito Moreno 5301',    city: 'Buenos Aires', province: 'Buenos Aires' },
  'Ducó':             { address: 'Av. Amancio Alcorta 2884',  city: 'Buenos Aires', province: 'Buenos Aires' },
  'Amalfitani':       { address: 'Av. Juan B. Justo 9200',    city: 'Buenos Aires', province: 'Buenos Aires' },
  'Cilindro':         { address: 'Av. Galicia 2070',          city: 'Avellaneda',   province: 'Buenos Aires' },
  'Kempes':           { address: 'Av. Cárcano s/n',           city: 'Córdoba',      province: 'Córdoba'      },
  'Arroyito':         { address: 'Av. Torcuato de Alvear 1000', city: 'Rosario',    province: 'Santa Fe'     },
  'Bielsa':           { address: 'Av. Carlos Pellegrini 2890', city: 'Rosario',     province: 'Santa Fe'     },
  'Ciudad de La Plata': { address: 'Calle 25 y 527',          city: 'La Plata',     province: 'Buenos Aires' },
}

function resolveVenue(venueName) {
  if (!venueName) return { address: 'Estadio', city: 'Buenos Aires', province: 'Buenos Aires' }
  for (const [key, val] of Object.entries(ESTADIOS)) {
    if (venueName.includes(key)) return val
  }
  return { address: venueName, city: 'Buenos Aires', province: 'Buenos Aires' }
}

async function scrapeFixtures(liga) {
  const url = `https://www.promiedos.com.ar/${liga.slug}`
  console.log(`  Scrapeando ${url}...`)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; hinch.ar-bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    }
  })

  if (!res.ok) {
    console.error(`  Error ${res.status} en ${liga.name}`)
    return []
  }

  const html = await res.text()
  const $    = cheerio.load(html)
  const { from, to } = getDateRange()
  const fixtures = []

  // Promiedos muestra los partidos en filas de tabla con clase "fixturelist" o similar
  // Cada fecha/jornada tiene un header y luego filas de partidos
  let currentDateStr = null

  $('table.fixturelist tr, table tr').each((_, row) => {
    const $row = $(row)

    // Fila de fecha (encabezado de jornada)
    const dateCell = $row.find('td.fecha, td.date, th.fecha')
    if (dateCell.length) {
      currentDateStr = dateCell.text().trim()
      return
    }

    // Fila de partido
    const cells = $row.find('td')
    if (cells.length < 3) return

    const texts = cells.map((_, c) => $(c).text().trim()).get()

    // Buscar patrón: equipo local - resultado/hora - equipo visitante
    // Promiedos: [hora] [local] [marcador o "-"] [visitante] [estadio]
    let homeTeam, awayTeam, timeStr, venueName

    // Intentar extraer equipos del contenido
    const teamCells = $row.find('td.equipo, td.local, td.visit, td[class*="team"], td[class*="home"], td[class*="away"]')
    if (teamCells.length >= 2) {
      homeTeam  = $(teamCells[0]).text().trim()
      awayTeam  = $(teamCells[1]).text().trim()
    }

    const timeCell  = $row.find('td.hora, td.time, td[class*="hour"]')
    timeStr = timeCell.length ? timeCell.text().trim() : null

    const venueCell = $row.find('td.estadio, td.venue, td[class*="stad"]')
    venueName = venueCell.length ? venueCell.text().trim() : null

    if (!homeTeam || !awayTeam || homeTeam === awayTeam) return

    // Parsear fecha
    const eventDate = currentDateStr ? parseArgDate(
      currentDateStr.replace(/[^0-9/]/g, '').slice(0, 10),
      timeStr
    ) : null

    if (!eventDate) return

    const d = new Date(eventDate)
    if (d < from || d > to) return

    const venueInfo = resolveVenue(venueName)

    fixtures.push({
      homeTeam, awayTeam, eventDate, venueName: venueName ?? 'Estadio', venueInfo
    })
  })

  return fixtures
}

async function discoverPromiedosUrls() {
  console.log('🔍 Descubriendo URLs de promiedos.com.ar...')
  const res = await fetch('https://www.promiedos.com.ar/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; hinch.ar-bot/1.0)' }
  })
  const html = await res.text()
  const $ = cheerio.load(html)
  const links = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const text = $(el).text().trim()
    if (href && !href.startsWith('http') && href.length > 1) {
      links.push(`${text}: ${href}`)
    }
  })
  console.log('Links internos encontrados:')
  links.slice(0, 30).forEach(l => console.log(' ', l))
}

async function syncFootball() {
  await discoverPromiedosUrls()

  const { from, to } = getDateRange()
  let total = 0

  for (const liga of LIGAS_PROMIEDOS) {
    console.log(`⚽ ${liga.name}...`)
    const fixtures = await scrapeFixtures(liga)
    console.log(`  → ${fixtures.length} partidos en rango`)

    for (const f of fixtures) {
      const title = `${f.homeTeam} vs ${f.awayTeam}`
      const event = {
        type:           'partido',
        title,
        subtitle:       liga.name,
        venue_name:     f.venueName,
        venue_address:  f.venueInfo.address,
        venue_city:     f.venueInfo.city,
        venue_province: f.venueInfo.province,
        event_date:     f.eventDate,
        image_url:      null,
        home_team:      f.homeTeam,
        away_team:      f.awayTeam,
        competition:    liga.name,
        tags:           ['fútbol', liga.name.toLowerCase()],
        is_active:      true,
        is_featured:    liga.featured,
        external_id:    `promiedos_${liga.slug}_${f.homeTeam}_${f.awayTeam}_${f.eventDate}`.replace(/\s+/g, '_'),
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
  const fromStr = from.toISOString().split('T')[0]
  const toStr   = to.toISOString().split('T')[0]

  const url = `https://app.ticketmaster.com/discovery/v2/events.json` +
    `?apikey=${TICKETMASTER_KEY}` +
    `&countryCode=AR` +
    `&classificationName=Music` +
    `&city=Buenos+Aires` +
    `&startDateTime=${fromStr}T00:00:00Z` +
    `&endDateTime=${toStr}T23:59:59Z` +
    `&size=50` +
    `&sort=date,asc`

  const res  = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    console.error(`  Error ${res.status} en Ticketmaster:`, JSON.stringify(data))
    return 0
  }

  const events = data._embedded?.events ?? []
  console.log(`  → ${events.length} recitales encontrados`)

  let total = 0
  for (const e of events) {
    const venue  = e._embedded?.venues?.[0]
    const image  = e.images?.find(i => i.ratio === '16_9' && i.width > 500)?.url ?? e.images?.[0]?.url
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
  const { from, to } = getDateRange()
  console.log(`📅 Rango: ${from.toISOString().split('T')[0]} → ${to.toISOString().split('T')[0]}`)
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
