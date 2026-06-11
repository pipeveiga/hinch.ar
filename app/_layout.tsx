import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Platform, StyleSheet } from 'react-native'
import { useAuthStore } from '@/stores/authStore'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { COLORS } from '@/lib/constants'
import LoadingScreen from '@/components/LoadingScreen'

// GestureHandlerRootView no existe en web
const GestureWrapper = Platform.OS !== 'web'
  ? require('react-native-gesture-handler').GestureHandlerRootView
  : View

// En desktop web la app vive en una columna centrada tipo teléfono:
// las pantallas están diseñadas mobile-first y estiradas a 1900px se
// rompen (botones de borde a borde, texto flotando en la nada).
function WebShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>
  return (
    <View style={shellStyles.outer}>
      <View style={shellStyles.frame}>{children}</View>
    </View>
  )
}

export default function RootLayout() {
  const { initialize, isHydrated, user } = useAuthStore()
  usePushNotifications(user?.id)

  useEffect(() => {
    initialize()
  }, [])

  if (!isHydrated) return <LoadingScreen />

  return (
    <GestureWrapper style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <WebShell>
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
      </WebShell>
    </GestureWrapper>
  )
}

const shellStyles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EDF1F8',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.background,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 40,
  },
})

