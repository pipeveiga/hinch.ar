import { useEffect } from 'react'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'

// En Expo Go SDK 53+ expo-notifications tira error al importarse — no importar el módulo
const isExpoGo = Constants.appOwnership === 'expo'

export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId || isExpoGo) return
    registerForPushNotifications(userId)
  }, [userId])
}

async function registerForPushNotifications(userId: string) {
  try {
    // Import dinámico para evitar que el módulo se cargue en Expo Go
    const Notifications = await import('expo-notifications')
    const { Platform } = await import('react-native')

    if (Platform.OS === 'web') return

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const token = (await Notifications.getExpoPushTokenAsync()).data
    if (!token) return

    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId)
  } catch {
    // Falla silenciosamente en Expo Go o sin proyecto EAS configurado
  }
}
