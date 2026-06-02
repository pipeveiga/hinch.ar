import { Stack } from 'expo-router'
import { COLORS } from '@/lib/constants'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="recuperar" />
      <Stack.Screen name="restablecer" />
    </Stack>
  )
}
