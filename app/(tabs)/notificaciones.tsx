import { useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { COLORS, SPACING, RADIUS, TAB_BAR_SPACE } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { NotificationType } from '@/lib/types'
import { Icon, type IconName } from '@/components/Icon'

// Cada tipo: ícono + color de acento (para el círculo tintado)
const NOTIFICATION_ICONS: Record<NotificationType, { icon: IconName; color: string }> = {
  booking_request:    { icon: 'bell',  color: COLORS.primary },
  booking_confirmed:  { icon: 'check', color: COLORS.success },
  booking_cancelled:  { icon: 'x',     color: COLORS.error },
  trip_cancelled:     { icon: 'ban',   color: COLORS.error },
  rate_reminder:      { icon: 'star',  color: COLORS.warning },
  payment_reminder:   { icon: 'coins', color: COLORS.primary },
}

function handleNotificationPress(type: NotificationType, data: Record<string, unknown>) {
  if (data.trip_id) {
    router.push(`/viaje/${data.trip_id}`)
  }
}

export default function NotificacionesScreen() {
  const { user } = useAuthStore()
  const { notifications, loading, fetch, markAllRead } = useNotificationsStore()

  useEffect(() => {
    if (user) fetch(user.id)
  }, [user])

  const onRefresh = useCallback(() => {
    if (user) fetch(user.id)
  }, [user])

  const handleMarkAllRead = async () => {
    if (user) await markAllRead(user.id)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markRead}>Marcar leídas</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Icon name="bellOff" size={38} color={COLORS.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Todo tranquilo</Text>
            <Text style={styles.emptyText}>Acá vas a ver cuando alguien solicite un viaje tuyo o te confirmen/rechacen una reserva.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={styles.notifCard}
                onPress={() => handleNotificationPress(n.type, n.data)}
                activeOpacity={0.75}
              >
                {(() => {
                  const meta = NOTIFICATION_ICONS[n.type] ?? { icon: 'bell' as IconName, color: COLORS.primary }
                  return (
                    <View style={[styles.notifIcon, { backgroundColor: meta.color + '1A' }]}>
                      <Icon name={meta.icon} size={20} color={meta.color} strokeWidth={1.9} />
                    </View>
                  )
                })()}
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifBody}>{n.body}</Text>
                  <Text style={styles.notifTime}>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </Text>
                </View>
                <View style={styles.unreadDot} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl + SPACING.md, paddingBottom: SPACING.md,
  },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1 },
  markRead:    { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  scroll: { flex: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptyText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  list: { gap: 1, paddingTop: SPACING.xs },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  notifContent: { flex: 1, gap: 3 },
  notifTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  notifBody:    { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  notifTime:    { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginTop: 6,
  },
})
