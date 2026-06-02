import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ¿Comparten una reserva (uno pasajero, el otro conductor del viaje)?
async function shareBooking(admin: ReturnType<typeof createClient>, a: string, b: string) {
  const asPassenger = admin
    .from('bookings')
    .select('id, trips!inner(driver_id)', { head: true, count: 'exact' })
    .eq('passenger_id', a)
    .eq('trips.driver_id', b)
  const asDriver = admin
    .from('bookings')
    .select('id, trips!inner(driver_id)', { head: true, count: 'exact' })
    .eq('passenger_id', b)
    .eq('trips.driver_id', a)
  const [r1, r2] = await Promise.all([asPassenger, asDriver])
  return (r1.count ?? 0) > 0 || (r2.count ?? 0) > 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // 1. Autenticar a quien llama: tiene que ser un usuario real, no solo la anon key.
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401)

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await authClient.auth.getUser()
    if (!caller) return json({ error: 'No autorizado' }, 401)

    const { user_id, title, body, data } = await req.json()
    if (!user_id || !title || !body) return json({ error: 'Faltan parámetros' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 2. Autorizar: solo se puede notificar a uno mismo o a alguien con quien se comparte una reserva.
    if (caller.id !== user_id && !(await shareBooking(admin, caller.id, user_id))) {
      return json({ error: 'No autorizado para notificar a este usuario' }, 403)
    }

    // 3. Obtener el push token del destinatario
    const { data: user } = await admin
      .from('users')
      .select('push_token')
      .eq('id', user_id)
      .single()

    if (!user?.push_token) return json({ ok: false, reason: 'sin token' }, 200)

    // 4. Mandar la notificación via Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:    user.push_token,
        title,
        body,
        data:  data ?? {},
        sound: 'default',
      }),
    })

    const result = await response.json()
    return json({ ok: true, result }, 200)

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
