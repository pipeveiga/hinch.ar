import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const { session, isHydrated }           = useAuthStore()
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then((val) => {
      setOnboardingDone(val === 'true')
    })
  }, [])

  if (!isHydrated || onboardingDone === null) return null
  if (session)           return <Redirect href="/(tabs)" />
  if (!onboardingDone)   return <Redirect href="/onboarding" />
  return <Redirect href="/(auth)/login" />
}
