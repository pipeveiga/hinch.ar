import { useState, useEffect } from 'react'
import { Platform } from 'react-native'

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
        if (Platform.OS === 'web') {
          // Usar browser Geolocation API en web
          if (!('geolocation' in navigator)) { setLoading(false); return }
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                // Reverse geocode con API pública
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
                )
                const data = await res.json()
                const detected = data?.address?.city ?? data?.address?.town ?? data?.address?.village ?? null
                if (!cancelled) setCity(detected)
              } catch { /* silencioso */ }
              finally { if (!cancelled) setLoading(false) }
            },
            () => { if (!cancelled) setLoading(false) }
          )
          return
        }

        // Mobile: usar expo-location
        const Location = await import('expo-location')
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted' || cancelled) { setLoading(false); return }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const [place]  = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude, longitude: location.coords.longitude,
        })
        if (!cancelled && place) {
          setCity(place.city ?? place.subregion ?? place.region ?? null)
        }
      } catch { /* sin permiso o sin GPS */ }
      finally { if (!cancelled) setLoading(false) }
    }

    detect()
    return () => { cancelled = true }
  }, [])

  return { city, loading }
}
