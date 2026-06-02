import { useEffect } from 'react'
import Constants from 'expo-constants'
import { usersApi } from '@/lib/supabase'

const isExpoGo = Constants.appOwnership === 'expo'
const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined

export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId || isExpoGo) return
    registerForPushNotifications(userId)
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

    // Va por updateProfile() para pasar por el whitelist canónico.
    await usersApi.updateProfile(userId, { push_token: token })
  } catch (e) {
    console.warn('[PushNotifications] Error al registrar token:', e)
  }
}
