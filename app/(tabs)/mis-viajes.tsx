import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useTripsStore } from '@/stores/tripsStore'
import { COLORS, SPACING, RADIUS, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, TRIP_TYPE_LABELS } from '@/lib/constants'
import { TripCard } from '@/components/TripCard'
import { AdBanner } from '@/components/AdBanner'
import type { Booking } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Tab = 'reservas' | 'publicados'

function BookingItem({ booking }: { booking: Booking }) {
  const event = booking.trip?.event
  const driver = booking.trip?.driver
  const needsRating =
    booking.status === 'completed' && !booking.passenger_rated_driver

  return (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => router.push(`/viaje/${booking.trip_id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.bookingRow}>
        <Text style={styles.bookingEvent} numberOfLines={1}>
          {event?.title ?? '—'}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: BOOKING_STATUS_COLORS[booking.status] + '20' }
        ]}>
          <Text style={[styles.statusText, { color: BOOKING_STATUS_COLORS[booking.status] }]}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.bookingMeta}>
        {driver?.full_name ?? '—'} · {TRIP_TYPE_LABELS[booking.segment]}
      </Text>

      {event?.event_date && (
        <Text style={styles.bookingDate}>
          {format(new Date(event.event_date), "d 'de' MMMM", { locale: es })}
          {' · '}{event.venue_city}
        </Text>
      )}

      <View style={styles.bookingFooter}>
        <Text style={styles.bookingAmount}>
          💵 ${booking.total_amount.toLocaleString('es-AR')}
        </Text>
        <View style={styles.bookingActions}>
          {booking.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={(e) => { e.stopPropagation?.(); router.push(`/chat/${booking.id}`) }}
              activeOpacity={0.8}
            >
              <Text style={styles.chatBtnText}>💬 Chat</Text>
            </TouchableOpacity>
          )}
          {needsRating && (
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={(e) => { e.stopPropagation?.(); router.push(`/calificar/${booking.id}`) }}
            >
              <Text style={styles.rateBtnText}>⭐ Calificar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function MisViajesScreen() {
  const [tab, setTab] = useState<Tab>('reservas')
  const { user }      = useAuthStore()
  const {
    myBookings, myBookingsLoading, loadMyBookings,
    myTrips,    myTripsLoading,    loadMyTrips,
  } = useTripsStore()

  useEffect(() => {
    if (!user) return
    if (tab === 'reservas') loadMyBookings(user.id)
    else                    loadMyTrips(user.id)
  }, [tab, user?.id])

  const isLoading = tab === 'reservas' ? myBookingsLoading : myTripsLoading

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis viajes</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['reservas', 'publicados'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'reservas' ? '🎟️ Reservas' : '🚗 Conductor'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : tab === 'reservas' ? (
        <FlatList
          data={myBookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <BookingItem booking={item} />}
          contentContainerStyle={styles.list}
          ListFooterComponent={myBookings.length > 0 ? <AdBanner /> : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyText}>Todavía no reservaste ningún viaje</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.exploreBtnText}>Ver eventos</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={myTrips}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              showEvent
              onPress={() => router.push(`/viaje/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ListFooterComponent={myTrips.length > 0 ? <AdBanner /> : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>Todavía no publicaste ningún viaje</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={styles.exploreBtnText}>Ver eventos y publicar</Text>
              </TouchableOpacity>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  tab: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  exploreBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  exploreBtnText: { color: COLORS.white, fontWeight: '700' },

  // Booking card
  bookingCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingEvent: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  bookingMeta: { fontSize: 13, color: COLORS.textSecondary },
  bookingDate: { fontSize: 12, color: COLORS.textMuted },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs },
  bookingAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  bookingActions: { flexDirection: 'row', gap: SPACING.sm },
  chatBtn: {
    backgroundColor: COLORS.primary + '20', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  chatBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryLight },
  rateBtn: {
    backgroundColor: COLORS.accent + '20', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  rateBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },
})
