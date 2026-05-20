import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

// La función se invoca desde el cliente con el JWT del usuario que dispara
// la notificación (ej. un pasajero que reserva, o un conductor que confirma).
// Validamos:
//   1) Hay un JWT válido en el header Authorization.
//   2) El caller comparte un booking activo con el destinatario.
// Sin esto, cualquiera podría usar la función para spamear/phishear a otros.
serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Falta token' }, 401)
    }

    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente que respeta el JWT del invocador (para getUser).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return json({ error: 'Token inválido' }, 401)
    }

    const { user_id, title, body, data } = await req.json()
    if (!user_id || !title || !body) {
      return json({ error: 'Faltan parámetros' }, 400)
    }

    // Cliente admin para consultas que ignoran RLS (necesario para
    // chequear bookings desde la perspectiva de ambos usuarios).
    const admin = createClient(supabaseUrl, serviceKey)

    // Permitir auto-notificación (caso edge, ej. recordatorios locales),
    // pero exigir relación caller↔receiver para enviar a otros.
    if (user.id !== user_id) {
      const authorized = await callerCanNotify(admin, user.id, user_id)
      if (!authorized) {
        return json({ error: 'No autorizado para notificar a este usuario' }, 403)
      }
    }

    const { data: target } = await admin
      .from('users')
      .select('push_token')
      .eq('id', user_id)
      .single()

    if (!target?.push_token) {
      return json({ ok: false, reason: 'sin token' }, 200)
    }

    const expoResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to:    target.push_token,
        title,
        body,
        data:  data ?? {},
        sound: 'default',
      }),
    })

    const result = await expoResponse.json()
    return json({ ok: true, result }, 200)

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

// El caller puede notificar al receiver si comparten una booking no cancelada
// donde uno es pasajero y el otro conductor del trip.
async function callerCanNotify(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  receiverId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('bookings')
    .select('passenger_id, trip:trips!trip_id(driver_id)')
    .neq('status', 'cancelled')
    .or(`passenger_id.eq.${callerId},passenger_id.eq.${receiverId}`)
    .limit(50)

  if (error || !data) return false

  return data.some((b: { passenger_id: string; trip: { driver_id: string } | { driver_id: string }[] | null }) => {
    const trip = Array.isArray(b.trip) ? b.trip[0] : b.trip
    const driverId = trip?.driver_id
    if (!driverId) return false
    return (b.passenger_id === callerId && driverId === receiverId)
        || (b.passenger_id === receiverId && driverId === callerId)
  })
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
