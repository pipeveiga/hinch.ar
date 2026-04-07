import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async (req) => {
  try {
    const { user_id, title, body, data } = await req.json()

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Obtener el push token del usuario
    const { data: user } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', user_id)
      .single()

    if (!user?.push_token) {
      return new Response(JSON.stringify({ ok: false, reason: 'sin token' }), { status: 200 })
    }

    // Mandar la notificación via Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to:    user.push_token,
        title,
        body,
        data:  data ?? {},
        sound: 'default',
      }),
    })

    const result = await response.json()
    return new Response(JSON.stringify({ ok: true, result }), { status: 200 })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
