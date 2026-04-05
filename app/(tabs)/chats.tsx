import { useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { bookingsApi } from '@/lib/supabase'
import { useState } from 'react'
import { COLORS, SPACING, RADIUS, BOOKING_STATUS_COLORS } from '@/lib/constants'
import type { Booking } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function ChatItem({ booking, userId }: { booking: Booking; userId: string }) {
  const isDriver   = booking.trip?.driver?.id === userId || booking.trip?.driver_id === userId
  const otherName  = isDriver
    ? (booking.passenger?.full_name ?? 'Pasajero')
    : (booking.trip?.driver?.full_name ?? 'Conductor')
  const eventTitle = booking.trip?.event?.title ?? '—'
  const eventDate  = booking.trip?.event?.event_date

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/chat/${booking.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{otherName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{otherName}</Text>
          {eventDate && (
            <Text style={styles.date}>
              {format(new Date(eventDate), "d MMM", { locale: es })}
            </Text>
          )}
        </View>
        <Text style={styles.event} numberOfLines={1}>{eventTitle}</Text>
        <Text style={styles.role}>{isDriver ? '🚗 Sos el conductor' : '🎟️ Reserva tuya'}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  )
}

export default function ChatsScreen() {
  const { user } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // reservas como pasajero confirmadas
      const asPassenger = await bookingsApi.getMyBookings(user.id)
      // reservas como conductor confirmadas
      const asDriver    = await bookingsApi.getDriverBookings(user.id)
      // unir, sin duplicados, solo confirmadas
      const all = [...asPassenger, ...asDriver].filter(
        (b, i, arr) => b.status === 'confirmed' && arr.findIndex(x => x.id === b.id) === i
      )
      setBookings(all)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <ChatItem booking={item} userId={user!.id} />}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Sin chats activos</Text>
              <Text style={styles.emptyText}>Los chats aparecen cuando el conductor confirma una reserva.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl + SPACING.md, paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.primaryLight },
  info: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  date: { fontSize: 11, color: COLORS.textMuted },
  event: { fontSize: 13, color: COLORS.textSecondary },
  role:  { fontSize: 11, color: COLORS.textMuted },
  arrow: { fontSize: 20, color: COLORS.textMuted },
  separator: { height: 1, backgroundColor: COLORS.border },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptyText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
})
