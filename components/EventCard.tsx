import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COLORS, SPACING, RADIUS, SHADOWS, EVENT_TYPE_ICONS } from '@/lib/constants'
import type { Event } from '@/lib/types'
import { ScalePress } from './ScalePress'

const TILE_BG: Record<string, string> = {
  partido: COLORS.brandTint,
  recital: '#F3EAFF',
  otro:    COLORS.surface,
}

interface EventCardProps {
  event:   Event
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  const date      = new Date(event.event_date)
  const isToday   = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const dateLabel = isToday
    ? `Hoy · ${format(date, 'HH:mm')}`
    : format(date, "EEE d MMM · HH:mm", { locale: es })
  const tripsCount = (event.trips_count as unknown as { count: number }[])?.[0]?.count ?? 0

  return (
    <ScalePress style={styles.card} onPress={onPress}>
      <View style={[styles.iconTile, { backgroundColor: TILE_BG[event.type] ?? COLORS.surface }]}>
        <Text style={styles.iconEmoji}>{EVENT_TYPE_ICONS[event.type]}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.competition} numberOfLines={1}>
            {event.subtitle ?? event.competition ?? ''}
          </Text>
          {event.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>✦ Destacado</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.meta}>
          <Text style={[styles.metaText, isToday && styles.metaToday]}>{dateLabel}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.metaText, styles.venueText]} numberOfLines={1}>{event.venue_city}</Text>
          {tripsCount > 0 && (
            <View style={styles.tripsBadge}>
              <Text style={styles.tripsText}>{tripsCount} {tripsCount === 1 ? 'viaje' : 'viajes'}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </ScalePress>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassEdge,
    paddingLeft: SPACING.md,
    ...SHADOWS.card,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  body: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.md,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  competition: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  featuredBadge: {
    backgroundColor: COLORS.brandTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  metaToday: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  dot: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  venueText: {
    color: COLORS.textSecondary,
  },
  tripsBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tripsText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 24,
    color: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    lineHeight: 28,
    fontWeight: '400',
  },
})
