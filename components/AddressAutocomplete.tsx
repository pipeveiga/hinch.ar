import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY

export interface SelectedPlace {
  address: string
  city: string
  province: string
  lat: number
  lng: number
}

interface Prediction {
  description: string
  place_id: string
  structured_formatting?: {
    main_text: string
    secondary_text?: string
  }
}

interface Props {
  value: string
  onChangeText: (v: string) => void
  onSelect: (place: SelectedPlace) => void
  placeholder?: string
}

const DEBOUNCE_MS = 350

export function AddressAutocomplete({ value, onChangeText, onSelect, placeholder }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading]         = useState(false)
  const [showList, setShowList]       = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef<string>(generateSessionToken())
  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }

    const q = value.trim()
    if (q.length < 3) {
      setPredictions([])
      setShowList(false)
      return
    }

    if (!API_KEY) {
      setPredictions([])
      setShowList(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(q, sessionTokenRef.current)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  async function fetchPredictions(input: string, sessionToken: string) {
    setLoading(true)
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
      url.searchParams.set('input', input)
      url.searchParams.set('key', API_KEY!)
      url.searchParams.set('language', 'es')
      url.searchParams.set('components', 'country:ar')
      url.searchParams.set('sessiontoken', sessionToken)
      const res  = await fetch(url.toString())
      const data = await res.json()
      if (data.status === 'OK') {
        setPredictions(data.predictions ?? [])
        setShowList(true)
      } else {
        setPredictions([])
      }
    } catch {
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }

  async function handlePick(p: Prediction) {
    setShowList(false)
    setPredictions([])
    skipNextSearchRef.current = true
    onChangeText(p.description)

    if (!API_KEY) return
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
      url.searchParams.set('place_id', p.place_id)
      url.searchParams.set('key', API_KEY)
      url.searchParams.set('language', 'es')
      url.searchParams.set('fields', 'geometry,address_components,formatted_address')
      url.searchParams.set('sessiontoken', sessionTokenRef.current)
      const res  = await fetch(url.toString())
      const data = await res.json()
      if (data.status !== 'OK' || !data.result) return

      const r          = data.result
      const components = (r.address_components ?? []) as { long_name: string; types: string[] }[]
      const findComp = (...types: string[]) =>
        components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? ''

      const street = findComp('route')
      const number = findComp('street_number')
      const city   = findComp('locality', 'administrative_area_level_2', 'sublocality')
      const province = findComp('administrative_area_level_1')
      const addressLine = (street && number)
        ? `${street} ${number}`
        : (r.formatted_address ?? p.description)

      onSelect({
        address: addressLine,
        city,
        province: province || 'Buenos Aires',
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
      })

      // Nuevo session token para próximas búsquedas (bueno para billing de Google)
      sessionTokenRef.current = generateSessionToken()
    } catch {
      // si falla el details, igual deja el texto que tipeó
    }
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? 'Buscá tu dirección...'}
          placeholderTextColor={COLORS.textMuted}
          onFocus={() => predictions.length > 0 && setShowList(true)}
        />
        {loading && (
          <ActivityIndicator
            size="small" color={COLORS.textMuted}
            style={styles.loader}
          />
        )}
      </View>

      {!API_KEY && (
        <Text style={styles.warn}>
          Falta configurar EXPO_PUBLIC_GOOGLE_MAPS_KEY — escribí tu dirección manualmente.
        </Text>
      )}

      {showList && predictions.length > 0 && (
        <View style={styles.list}>
          {predictions.slice(0, 5).map((p) => (
            <TouchableOpacity
              key={p.place_id}
              style={styles.item}
              onPress={() => handlePick(p)}
              activeOpacity={0.7}
            >
              <Text style={styles.itemMain} numberOfLines={1}>
                {p.structured_formatting?.main_text ?? p.description}
              </Text>
              {p.structured_formatting?.secondary_text && (
                <Text style={styles.itemSecondary} numberOfLines={1}>
                  {p.structured_formatting.secondary_text}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

function generateSessionToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const styles = StyleSheet.create({
  inputRow: { position: 'relative' },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingRight: SPACING.xl,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  loader: {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    marginTop: -8,
  },
  warn: {
    fontSize: 11,
    color: COLORS.warning,
    marginTop: SPACING.xs,
  },
  list: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  item: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemMain: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemSecondary: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
})
