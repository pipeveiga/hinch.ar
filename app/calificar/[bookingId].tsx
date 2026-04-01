import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { bookingsApi, ratingsApi } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  COLORS, SPACING, RADIUS,
  RATING_CATEGORIES, RATING_CATEGORY_ICONS, RATING_SCORE_LABELS,
} from '@/lib/constants'
import type { Booking, RateeRole, RatingScores } from '@/lib/types'
import { UserAvatar } from '@/components/UserAvatar'

const DEFAULT_SCORES: RatingScores = {
  score_1: 5,
  score_2: 5,
  score_3: 5,
  score_4: 5,
  score_5: 5,
  comment: '',
}

function StarRow({
  icon, category, score, onChange,
}: {
  icon: string; category: string; score: number; onChange: (n: number) => void
}) {
  return (
    <View style={styles.starRow}>
      <View style={styles.starHeader}>
        <Text style={styles.starIcon}>{icon}</Text>
        <Text style={styles.starCategory}>{category}</Text>
      </View>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={8}>
            <Text style={[styles.star, n <= score && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.scoreLabel}>{RATING_SCORE_LABELS[score - 1]}</Text>
    </View>
  )
}

export default function CalificarScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const { user }      = useAuthStore()

  const [booking,   setBooking]   = useState<Booking | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [scores,    setScores]    = useState<RatingScores>(DEFAULT_SCORES)

  useEffect(() => {
    const myBookings = bookingsApi.getMyBookings(user?.id ?? '')
    myBookings.then((bookings) => {
      const b = bookings.find((b) => b.id === bookingId)
      setBooking(b ?? null)
      setLoading(false)
    })
  }, [bookingId])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!booking || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar la reserva</Text>
      </View>
    )
  }

  const trip   = booking.trip
  const driver = trip?.driver
  const event  = trip?.event

  // Determinar a quién calificamos
  const isCalificandoDriver = booking.passenger_id === user.id && !booking.passenger_rated_driver
  const rateeRole: RateeRole = isCalificandoDriver ? 'driver' : 'passenger'
  const rateeId = isCalificandoDriver ? trip?.driver_id ?? '' : booking.passenger_id
  const rateeName = isCalificandoDriver
    ? (driver?.full_name ?? 'Conductor')
    : 'Pasajero'
  const rateeAvatar = isCalificandoDriver ? driver?.avatar_url : undefined

  const categories = RATING_CATEGORIES[rateeRole]
  const icons      = RATING_CATEGORY_ICONS[rateeRole]

  const updateScore = (key: keyof RatingScores, value: number) =>
    setScores((s) => ({ ...s, [key]: value }))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await ratingsApi.submitRating(
        user.id,
        bookingId,
        rateeId,
        rateeRole,
        scores,
      )
      Alert.alert(
        '¡Gracias por calificar! ⭐',
        'Tu calificación ayuda a construir una comunidad más segura.',
        [{ text: 'Listo', onPress: () => router.replace('/(tabs)/mis-viajes') }]
      )
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo calificar')
    } finally {
      setSubmitting(false)
    }
  }

  const overallPreview = (
    (scores.score_1 + scores.score_2 + scores.score_3 + scores.score_4 + scores.score_5) / 5
  ).toFixed(1)

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:     true,
          headerTitle:     'Calificar',
          headerStyle:     { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Contexto del evento */}
        {event && (
          <View style={styles.eventContext}>
            <Text style={styles.eventContextTitle}>{event.title}</Text>
            <Text style={styles.eventContextSub}>{event.venue_city}</Text>
          </View>
        )}

        {/* A quién estamos calificando */}
        <View style={styles.rateeCard}>
          <UserAvatar uri={rateeAvatar} name={rateeName} size={64} />
          <View style={styles.rateeInfo}>
            <Text style={styles.rateeLabel}>
              Calificando {rateeRole === 'driver' ? 'al conductor' : 'al pasajero'}
            </Text>
            <Text style={styles.rateeName}>{rateeName}</Text>
            <Text style={styles.overallPreview}>Promedio actual: ⭐ {overallPreview}</Text>
          </View>
        </View>

        {/* Categorías */}
        <View style={styles.ratingsCard}>
          <Text style={styles.ratingsTitle}>
            {rateeRole === 'driver'
              ? '¿Cómo estuvo el conductor?'
              : '¿Cómo estuvo el pasajero?'}
          </Text>

          {categories.map((cat, i) => {
            const scoreKey = `score_${i + 1}` as keyof RatingScores
            return (
              <StarRow
                key={cat}
                icon={icons[i]}
                category={cat}
                score={scores[scoreKey] as number}
                onChange={(n) => updateScore(scoreKey, n)}
              />
            )
          })}
        </View>

        {/* Comentario */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            Comentario (opcional)
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Contá cómo fue el viaje..."
            placeholderTextColor={COLORS.textMuted}
            value={scores.comment}
            onChangeText={(t) => setScores((s) => ({ ...s, comment: t }))}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitBtnText}>⭐ Enviar calificación</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Las calificaciones son anónimas hasta que ambas partes hayan calificado.
        </Text>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.textSecondary },
  eventContext: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  eventContextTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  eventContextSub: { fontSize: 12, color: COLORS.textSecondary },
  rateeCard: {
    flexDirection: 'row', gap: SPACING.md, alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  rateeInfo: { flex: 1 },
  rateeLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: '700' },
  rateeName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  overallPreview: { fontSize: 13, color: COLORS.accent, fontWeight: '700', marginTop: 4 },
  ratingsCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
  },
  ratingsTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  starRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  starHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, width: 160 },
  starIcon: { fontSize: 16 },
  starCategory: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '500', flex: 1 },
  stars: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 22, color: COLORS.border },
  starActive: { color: COLORS.accent },
  scoreLabel: { fontSize: 11, color: COLORS.textMuted, width: 48, textAlign: 'right' },
  commentSection: { gap: SPACING.xs },
  commentLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  commentInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 14, height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: COLORS.textInverse, fontSize: 16, fontWeight: '900' },
  disclaimer: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
})
