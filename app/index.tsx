import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

// Punto de entrada: redirigir según estado de sesión
export default function Index() {
  const { session, isHydrated } = useAuthStore()
  if (!isHydrated) return null
  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />
}
