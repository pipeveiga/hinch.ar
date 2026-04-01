import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/stores/authStore'
import { COLORS } from '@/lib/constants'

export default function RootLayout() {
  const { initialize, isHydrated } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (!isHydrated) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerShown:        false,
          contentStyle:       { backgroundColor: COLORS.background },
          animation:          'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)"  options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)"  options={{ animation: 'fade' }} />
        <Stack.Screen name="evento/[id]" />
        <Stack.Screen name="viaje/[id]" />
        <Stack.Screen name="viaje/nuevo" />
        <Stack.Screen name="calificar/[bookingId]" />
      </Stack>
    </GestureHandlerRootView>
  )
}
