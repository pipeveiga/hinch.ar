import { useState, useEffect } from 'react'
import * as Location from 'expo-location'

interface UserCity {
  city: string | null
  loading: boolean
}

export function useUserCity(): UserCity {
  const [city, setCity]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function detect() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted' || cancelled) {
          setLoading(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const [place] = await Location.reverseGeocodeAsync({
          latitude:  location.coords.latitude,
          longitude: location.coords.longitude,
        })

        if (!cancelled && place) {
          // Expo devuelve city o subregion dependiendo del país
          const detected = place.city ?? place.subregion ?? place.region ?? null
          setCity(detected)
        }
      } catch {
        // Sin permiso o sin GPS — silencioso
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    detect()
    return () => { cancelled = true }
  }, [])

  return { city, loading }
}
