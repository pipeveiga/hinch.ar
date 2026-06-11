import { useEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { usersApi } from '@/lib/supabase'

const isExpoGo = Constants.appOwnership === 'expo'
const PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId as string | undefined

export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    // Registro habilitado SOLO en Android. En iOS 26 + SDK 54, una excepción
    // nativa (NSException) durante el registro del token corrompe el heap de
    // Hermes y mata la app antes de que el error llegue al try/catch de JS
    // (ver expo/expo#44606) — fue lo que crasheaba el login en TestFlight.
    // Re-evaluar iOS al migrar a SDK 55+.
    if (!userId || isExpoGo || Platform.OS !== 'android') return
    registerForPushNotifications(userId)
  }, [userId])
}

async function registerForPushNotifications(userId: string) {
  try {
    const Notifications = await import('expo-notifications')

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
