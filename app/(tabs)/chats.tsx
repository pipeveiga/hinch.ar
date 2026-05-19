import { useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useChatsStore } from '@/stores/chatsStore'
import { bookingsApi } from '@/lib/supabase'
import { useState } from 'react'
import { COLORS, SPACING } from '@/lib/constants'
import type { Booking } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { UserAvatar } from '@/components/UserAvatar'

function ChatItem({ booking, userId, unread }: { booking: Booking; userId: string; unread: number }) {
  const isDriver    = booking.trip?.driver?.id === userId || booking.trip?.driver_id === userId
  const otherName   = isDriver
    ? (booking.passenger?.full_name ?? 'Pasajero')
    : (booking.trip?.driver?.full_name ?? 'Conductor')
  const otherAvatar = isDriver
    ? booking.passenger?.avatar_url
    : booking.trip?.driver?.avatar_url
  const eventTitle  = booking.trip?.event?.title ?? '—'
  const eventDate   = booking.trip?.event?.event_date
  const hasUnread   = unread > 0

  return (
    <TouchableOpacity
      style={[styles.item, hasUnread && styles.itemUnread]}
      onPress={() => router.push(`/chat/${booking.id}`)}
      activeOpacity={0.75}
    >
      <UserAvatar uri={otherAvatar} name={otherName} size={48} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>{otherName}</Text>
          {eventDate && (
            <Text style={[styles.date, hasUnread && styles.dateUnread]}>
              {format(new Date(eventDate), "d MMM", { locale: es })}
            </Text>
          )}
        </View>
        <Text style={[styles.event, hasUnread && styles.eventUnread]} numberOfLines={1}>{eventTitle}</Text>
        <Text style={styles.role}>{isDriver ? '🚗 Sos el conductor' : '🎟️ Reserva tuya'}</Text>
      </View>

      {hasUnread ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : (
        <Text style={styles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  )
}

export default function ChatsScreen() {
  const { user } = useAuthStore()
  const { unreadByBooking, fetch: fetchUnread, subscribe, unsubscribe } = useChatsStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const asPassenger = await bookingsApi.getMyBookings(user.id)
      const asDriver    = await bookingsApi.getDriverBookings(user.id)
      const all = [...asPassenger, ...asDriver].filter(
        (b, i, arr) => b.status === 'confirmed' && arr.findIndex(x => x.id === b.id) === i
      )
      setBookings(all)

      // cargar conteos de no leídos y suscribirse a nuevos mensajes
      const ids = all.map(b => b.id)
      await fetchUnread(user.id, ids)
      subscribe(user.id, ids)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
    return () => unsubscribe()
  }, [load])

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
          renderItem={({ item }) => (
            <ChatItem
              booking={item}
              userId={user!.id}
              unread={unreadByBooking[item.id] ?? 0}
            />
          )}
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
  itemUnread: {
    backgroundColor: '#1a1a2e',
  },
  info: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  nameUnread: { fontWeight: '800' },
  date: { fontSize: 11, color: COLORS.textMuted },
  dateUnread: { color: COLORS.primary, fontWeight: '700' },
  event: { fontSize: 13, color: COLORS.textSecondary },
  eventUnread: { color: COLORS.textPrimary, fontWeight: '600' },
  role:  { fontSize: 11, color: COLORS.textMuted },
  arrow: { fontSize: 20, color: COLORS.textMuted },
  separator: { height: 1, backgroundColor: COLORS.border },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptyText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
})
