import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
})

export function usePushNotifications(userId: string | undefined) {
  const notificationListener = useRef<Notifications.EventSubscription>()
  const responseListener     = useRef<Notifications.EventSubscription>()

  useEffect(() => {
    if (!userId) return

    registerForPushNotifications(userId)

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // notificación recibida con la app abierta — el store de notificaciones ya la maneja via realtime
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // usuario tocó la notificación — acá se podría navegar a la pantalla correspondiente
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [userId])
}

async function registerForPushNotifications(userId: string) {
  if (Platform.OS === 'web') return

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data
    if (!token) return

    // Guardar el token en Supabase para poder mandar notificaciones
    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId)
  } catch {
    // En Expo Go sin proyecto EAS esto puede fallar — ignorar
  }
}
