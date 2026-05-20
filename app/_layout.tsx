import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Platform } from 'react-native'
import { useAuthStore } from '@/stores/authStore'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { COLORS } from '@/lib/constants'
import LoadingScreen from '@/components/LoadingScreen'

// GestureHandlerRootView no existe en web
const GestureWrapper = Platform.OS !== 'web'
  ? require('react-native-gesture-handler').GestureHandlerRootView
  : View

export default function RootLayout() {
  const { initialize, isHydrated, user } = useAuthStore()
  usePushNotifications(user?.id)

  useEffect(() => {
    initialize()
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
