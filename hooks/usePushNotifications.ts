import { useEffect } from 'react'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'

const isExpoGo = Constants.appOwnership === 'expo'
const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined

export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    // Temporalmente desactivado: en iOS 26 expo-notifications 0.32 crashea
    // al pedir el push token (excepcion Obj-C no atrapable desde JS).
    // Re-habilitar cuando haya version compatible con iOS 26.
    if (!userId || isExpoGo) return
    // registerForPushNotifications(userId)
  }, [userId])
}

async function registerForPushNotifications(userId: string) {
  try {
    const Notifications = await import('expo-notifications')
    const { Platform } = await import('react-native')

    if (Platform.OS === 'web') return

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
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

    // projectId es obligatorio en builds de producción con expo-notifications SDK 0.32+
    if (!PROJECT_ID) {
      console.warn('[PushNotifications] projectId no encontrado en Constants')
      return
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })
    const token = tokenData.data
    if (!token) return

    await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', userId)
  } catch (e) {
    console.warn('[PushNotifications] Error al registrar token:', e)
  }
}
