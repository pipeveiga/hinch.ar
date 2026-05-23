import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

export interface UserLocation {
  lat: number
  lng: number
}

interface UseUserLocationResult {
  location: UserLocation | null
  loading: boolean
  error: string | null
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function detect() {
      try {
        if (Platform.OS === 'web') {
          if (!('geolocation' in navigator)) {
            if (!cancelled) { setError('Geolocalización no disponible'); setLoading(false) }
            return
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!cancelled) {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                setLoading(false)
              }
            },
            (err) => {
              if (!cancelled) { setError(err.message); setLoading(false) }
            },
          )
          return
        }

        const Location = await import('expo-location')
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (cancelled) return
        if (status !== 'granted') {
          setError('Permiso de ubicación denegado')
          setLoading(false)
          return
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        if (!cancelled) {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al obtener ubicación')
          setLoading(false)
        }
      }
    }

    detect()
    return () => { cancelled = true }
  }, [])

  return { location, loading, error }
}
