import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Modal, Image, Pressable,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { usersApi, ratingsApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { UserAvatar } from '@/components/UserAvatar'
import { VerificationBadge } from '@/components/VerificationBadge'
import type { User, Rating } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function StarRow({ score, label }: { score: number; label: string }) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1,2,3,4,5].map((n) => (
          <Text key={n} style={{ fontSize: 12, opacity: n <= Math.round(score) ? 1 : 0.25 }}>⭐</Text>
        ))}
      </View>
      <Text style={styles.starScore}>{score.toFixed(1)}</Text>
    </View>
  )
}

export default function UsuarioPerfilScreen() {
  const { id }              = useLocalSearchParams<{ id: string }>()
  const [user, setUser]       = useState<User | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [loading, setLoading] = useState(true)
  const [photoModal, setPhotoModal] = useState(false)

  useEffect(() => {
    Promise.all([
      usersApi.getById(id),
      ratingsApi.getRatingsForUser(id),
    ]).then(([u, r]) => {
      setUser(u as User | null)
      setRatings(r)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Usuario no encontrado</Text>
      </View>
    )
  }

  const driverRatings    = ratings.filter((r) => r.ratee_role === 'driver')
  const passengerRatings = ratings.filter((r) => r.ratee_role === 'passenger')

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:     true,
          headerTitle:     user.full_name,
          headerStyle:     { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => user.avatar_url && setPhotoModal(true)} activeOpacity={0.85}>
            <UserAvatar uri={user.avatar_url} name={user.full_name} size={80} />
          </TouchableOpacity>

          {/* Modal foto en grande */}
          <Modal visible={photoModal} transparent animationType="fade">
            <Pressable style={styles.photoModalBg} onPress={() => setPhotoModal(false)}>
              <Image
                source={{ uri: user.avatar_url! }}
                style={styles.photoModalImg}
                resizeMode="contain"
              />
            </Pressable>
          </Modal>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.full_name}</Text>
            <VerificationBadge verified={user.is_verified} />
          </View>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          <Text style={styles.member}>
            Miembro desde {format(new Date(user.created_at), "MMMM yyyy", { locale: es })}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.total_trips_as_driver}</Text>
            <Text style={styles.statLabel}>Viajes como conductor</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.total_trips_as_passenger}</Text>
            <Text style={styles.statLabel}>Viajes como pasajero</Text>
          </View>
        </View>

        {/* Auto */}
        {user.has_car && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auto</Text>
            <View style={styles.card}>
              <Text style={styles.carEmoji}>🚗</Text>
              <View>
                <Text style={styles.carName}>
                  {user.car_brand} {user.car_model} {user.car_year}
                </Text>
                <Text style={styles.carDetail}>{user.car_color}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Calificaciones como conductor */}
        {user.total_trips_as_driver > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Como conductor · ⭐ {user.avg_rating_as_driver.toFixed(1)}
            </Text>
            <View style={styles.ratingsList}>
              {driverRatings.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingScore}>
                      {'⭐'.repeat(Math.round((r.score_1 + r.score_2 + r.score_3 + r.score_4 + r.score_5) / 5))}
                    </Text>
                    <Text style={styles.ratingDate}>
                      {format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                    </Text>
                  </View>
                  {r.comment && (
                    <Text style={styles.ratingComment}>"{r.comment}"</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Calificaciones como pasajero */}
        {user.total_trips_as_passenger > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Como pasajero · ⭐ {user.avg_rating_as_passenger.toFixed(1)}
            </Text>
            <View style={styles.ratingsList}>
              {passengerRatings.slice(0, 5).map((r) => (
                <View key={r.id} style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <Text style={styles.ratingScore}>
                      {'⭐'.repeat(Math.round((r.score_1 + r.score_2 + r.score_3 + r.score_4 + r.score_5) / 5))}
                    </Text>
                    <Text style={styles.ratingDate}>
                      {format(new Date(r.created_at), "d MMM yyyy", { locale: es })}
                    </Text>
                  </View>
                  {r.comment && (
                    <Text style={styles.ratingComment}>"{r.comment}"</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {ratings.length === 0 && (
          <View style={styles.noRatings}>
            <Text style={styles.noRatingsText}>Todavía no tiene calificaciones</Text>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  notFound:  { color: COLORS.textMuted, fontSize: 15 },

  photoModalBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoModalImg: {
    width: '90%', height: '70%', borderRadius: RADIUS.md,
  },
  header: {
    alignItems: 'center', gap: SPACING.xs,
    padding: SPACING.xl, paddingTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  name:    { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  bio:     { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  member:  { fontSize: 12, color: COLORS.textMuted },

  statsRow: {
    flexDirection: 'row', padding: SPACING.lg, gap: SPACING.md,
  },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },

  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  carEmoji:  { fontSize: 28 },
  carName:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  carDetail: { fontSize: 13, color: COLORS.textSecondary },

  ratingsList: { gap: SPACING.sm },
  ratingCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  ratingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingScore:  { fontSize: 13 },
  ratingDate:   { fontSize: 12, color: COLORS.textMuted },
  ratingComment: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 20 },

  starRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  starLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  stars:     { flexDirection: 'row', gap: 2 },
  starScore: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, width: 28 },

  noRatings: { padding: SPACING.xl, alignItems: 'center' },
  noRatingsText: { color: COLORS.textMuted, fontSize: 14 },
})
