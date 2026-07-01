import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, Switch,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useTripsStore } from '@/stores/tripsStore'
import { eventsApi } from '@/lib/supabase'
import {
  COLORS, SPACING, RADIUS,
  TRIP_TYPE_LABELS, TRIP_TYPE_COLORS,
  MAJOR_CITIES,
} from '@/lib/constants'
import type { TripType, NewTripForm, Event } from '@/lib/types'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { GradientButton } from '@/components/GradientButton'
import { Icon } from '@/components/Icon'

const EMPTY_FORM: NewTripForm = {
  event_id:        '',
  origin_address:  '',
  origin_city:     '',
  origin_province: 'Buenos Aires',
  origin_lat:      undefined,
  origin_lng:      undefined,
  trip_type:       'ida',
  seats_total:     3,
  price_outbound:  undefined,
  price_return:    undefined,
  departure_time:  undefined,
  return_time:     undefined,
  notes:           '',
  accepts_luggage: false,
  accepts_pets:    false,
  waypoints:       [],
}

export default function NuevoViajeScreen() {
  const { eventId }   = useLocalSearchParams<{ eventId?: string }>()
  const { user }      = useAuthStore()
  const { publishTrip } = useTripsStore()

  const [form, setForm]         = useState<NewTripForm>({ ...EMPTY_FORM, event_id: eventId ?? '' })
  const [event, setEvent]       = useState<Event | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (eventId) {
      eventsApi.getById(eventId).then(setEvent)
    }
  }, [eventId])

  const update = <K extends keyof NewTripForm>(key: K, value: NewTripForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validate = (): string | null => {
    if (!form.event_id)         return 'Seleccioná un evento'
    if (!form.origin_address.trim()) return 'Completá la dirección de origen'
    if (!form.origin_city.trim())    return 'Completá la ciudad de origen'
    if (form.seats_total < 1)        return 'Debe haber al menos 1 asiento disponible'
    if ((form.trip_type === 'ida' || form.trip_type === 'ida_y_vuelta') && !form.price_outbound) {
      return 'Completá el precio de ida'
    }
    if ((form.trip_type === 'vuelta' || form.trip_type === 'ida_y_vuelta') && !form.price_return) {
      return 'Completá el precio de vuelta'
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { Alert.alert('Faltan datos', err); return }
    if (!user) { router.push('/(auth)/login'); return }

    setSubmitting(true)
    try {
      const trip = await publishTrip(user.id, form)
      Alert.alert(
        '¡Viaje publicado! 🚗',
        'Tu viaje ya está visible para los pasajeros.',
        [{ text: 'Ver viaje', onPress: () => router.replace(`/viaje/${trip.id}`) }]
      )
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo publicar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:     true,
          headerTitle:     'Publicar viaje',
          headerStyle:     { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Evento seleccionado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evento</Text>
          {event ? (
            <View style={styles.eventCard}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <View style={styles.eventMetaRow}>
                <Icon name="pin" size={13} color={COLORS.textSecondary} strokeWidth={1.8} />
                <Text style={styles.eventMeta}>{event.venue_city}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectEventBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.selectEventText}>Seleccionar evento →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tipo de tramo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Qué tramo ofrecés?</Text>
          <View style={styles.tripTypeSelector}>
            {(['ida', 'vuelta', 'ida_y_vuelta'] as TripType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tripTypeBtn,
                  form.trip_type === t && {
                    backgroundColor: TRIP_TYPE_COLORS[t] + '20',
                    borderColor: TRIP_TYPE_COLORS[t],
                  }
                ]}
                onPress={() => update('trip_type', t)}
              >
                <Text style={[
                  styles.tripTypeBtnText,
                  form.trip_type === t && { color: TRIP_TYPE_COLORS[t], fontWeight: '700' }
                ]}>
                  {TRIP_TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Origen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Punto de partida</Text>
          <Field label="Dirección de origen">
            <AddressAutocomplete
              value={form.origin_address}
              onChangeText={(v) => {
                update('origin_address', v)
                // Si edita el texto a mano, invalidar las coords cargadas
                if (form.origin_lat !== undefined) {
                  update('origin_lat', undefined)
                  update('origin_lng', undefined)
                }
              }}
              onSelect={(p) => {
                setForm((f) => ({
                  ...f,
                  origin_address:  p.address,
                  origin_city:     p.city || f.origin_city,
                  origin_province: p.province || f.origin_province,
                  origin_lat:      p.lat,
                  origin_lng:      p.lng,
                }))
              }}
              placeholder="Ej: Av. Corrientes 1234"
            />
          </Field>
          <Field label="Ciudad">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.cityChips}>
                {MAJOR_CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.cityChip,
                      form.origin_city === city && styles.cityChipActive,
                    ]}
                    onPress={() => update('origin_city', city)}
                  >
                    <Text style={[
                      styles.cityChipText,
                      form.origin_city === city && styles.cityChipTextActive,
                    ]}>
                      {city}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TextInput
              style={[styles.input, { marginTop: SPACING.xs }]}
              placeholder="O escribí la ciudad..."
              placeholderTextColor={COLORS.textMuted}
              value={form.origin_city}
              onChangeText={(v) => update('origin_city', v)}
            />
          </Field>
        </View>

        {/* Asientos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asientos disponibles</Text>
          <View style={styles.seatsRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.seatBtn,
                  form.seats_total === n && styles.seatBtnActive,
                ]}
                onPress={() => update('seats_total', n)}
              >
                <Text style={[
                  styles.seatBtnText,
                  form.seats_total === n && styles.seatBtnTextActive,
                ]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Precios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precio por asiento</Text>
          {(form.trip_type === 'ida' || form.trip_type === 'ida_y_vuelta') && (
            <Field label="Ida (ARS)">
              <TextInput
                style={styles.input}
                placeholder="Ej: 5000"
                placeholderTextColor={COLORS.textMuted}
                value={form.price_outbound?.toString() ?? ''}
                onChangeText={(v) => update('price_outbound', v ? parseFloat(v) : undefined)}
                keyboardType="numeric"
              />
            </Field>
          )}
          {(form.trip_type === 'vuelta' || form.trip_type === 'ida_y_vuelta') && (
            <Field label="Vuelta (ARS)">
              <TextInput
                style={styles.input}
                placeholder="Ej: 5000"
                placeholderTextColor={COLORS.textMuted}
                value={form.price_return?.toString() ?? ''}
                onChangeText={(v) => update('price_return', v ? parseFloat(v) : undefined)}
                keyboardType="numeric"
              />
            </Field>
          )}
        </View>

        {/* Extras */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Extras</Text>
          <View style={styles.switchCard}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🧳 Acepta equipaje</Text>
              <Switch
                value={form.accepts_luggage}
                onValueChange={(v) => update('accepts_luggage', v)}
                trackColor={{ true: COLORS.primary, false: COLORS.border }}
                thumbColor={COLORS.white}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🐾 Acepta mascotas</Text>
              <Switch
                value={form.accepts_pets}
                onValueChange={(v) => update('accepts_pets', v)}
                trackColor={{ true: COLORS.primary, false: COLORS.border }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          <Field label="Notas para los pasajeros" style={{ marginTop: SPACING.md }}>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Contales algo: dónde encontrarte, si parás en el camino, etc."
              placeholderTextColor={COLORS.textMuted}
              value={form.notes}
              onChangeText={(v) => update('notes', v)}
              multiline
            />
          </Field>
        </View>

        {/* Submit */}
        <GradientButton
          label={submitting ? 'Publicando...' : 'Publicar viaje'}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitBtn}
        />

        <Text style={styles.disclaimer}>
          Al publicar, aceptás que el pago se acuerda directamente con los pasajeros.
          hinch.ar no procesa ni garantiza ningún pago.
        </Text>
      </ScrollView>
    </>
  )
}

function Field({ label, children, style }: {
  label: string; children: React.ReactNode; style?: object
}) {
  return (
    <View style={[{ gap: SPACING.xs }, style]}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  section: { gap: SPACING.md },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: COLORS.textPrimary,
  },
  eventCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  eventMeta: { fontSize: 13, color: COLORS.textSecondary },
  selectEventBtn: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center',
  },
  selectEventText: { color: COLORS.primaryLight, fontWeight: '600' },
  tripTypeSelector: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  tripTypeBtn: {
    flex: 1, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
    backgroundColor: COLORS.card, minWidth: 90,
  },
  tripTypeBtnText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 15,
  },
  cityChips: { flexDirection: 'row', gap: SPACING.xs, paddingVertical: 4 },
  cityChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  cityChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cityChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  cityChipTextActive: { color: COLORS.white, fontWeight: '700' },
  seatsRow: { flexDirection: 'row', gap: SPACING.sm },
  seatBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  seatBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  seatBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  seatBtnTextActive: { color: COLORS.white },
  switchCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  switchLabel: { fontSize: 15, color: COLORS.textPrimary },
  submitBtn: { marginTop: SPACING.md },
  disclaimer: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18,
  },
})
