import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Platform } from 'react-native'
import Constants from 'expo-constants'
import { useAuthStore } from '@/stores/authStore'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { COLORS } from '@/lib/constants'
import LoadingScreen from '@/components/LoadingScreen'

// GestureHandlerRootView no existe en web
const GestureWrapper = Platform.OS !== 'web'
  ? require('react-native-gesture-handler').GestureHandlerRootView
  : View

function initializeMobileAds() {
  if (Platform.OS === 'web') return
  if (Constants.appOwnership === 'expo') return // Expo Go no soporta el módulo nativo
  try {
    const ads = require('react-native-google-mobile-ads').default
    ads().initialize().catch((err: unknown) => {
      if (__DEV__) console.warn('AdMob initialize failed', err)
    })
  } catch {
    // SDK no disponible en este build
  }
}

export default function RootLayout() {
  const { initialize, isHydrated, user } = useAuthStore()
  usePushNotifications(user?.id)

  useEffect(() => {
    initialize()
    initializeMobileAds()
  }, [])

  if (!isHydrated) return <LoadingScreen />

  return (
    <GestureWrapper style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerShown:        false,
          contentStyle:       { backgroundColor: COLORS.background },
          animation:          'slide_from_right',
          headerBackTitle:    '',
        }}
      >
        <Stack.Screen name="(auth)"  options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)"  options={{ animation: 'fade', headerTitle: '', headerBackTitle: '' }} />
        <Stack.Screen name="evento/[id]"        options={{ headerBackTitle: '' }} />
        <Stack.Screen name="viaje/[id]"         options={{ headerBackTitle: '' }} />
        <Stack.Screen name="viaje/nuevo"        options={{ headerBackTitle: '' }} />
        <Stack.Screen name="calificar/[bookingId]" options={{ headerBackTitle: '' }} />
        <Stack.Screen name="terminos"    options={{ headerBackTitle: '' }} />
        <Stack.Screen name="privacidad"  options={{ headerBackTitle: '' }} />
        <Stack.Screen name="onboarding"  options={{ animation: 'fade' }} />
      </Stack>
    </GestureWrapper>
  )
}
