import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/stores/authStore'
import LoadingScreen from '@/components/LoadingScreen'

export default function Index() {
  const { session, isHydrated }           = useAuthStore()
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(val === 'true')
    })
  }, [])

  if (!isHydrated || onboardingDone === null) return <LoadingScreen />
  if (session)           return <Redirect href="/(tabs)" />
  if (!onboardingDone)   return <Redirect href="/onboarding" />
  return <Redirect href="/(auth)/login" />
}
