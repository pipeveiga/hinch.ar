import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COLORS, SPACING, EVENT_TYPE_ICONS } from '@/lib/constants'
import type { Event } from '@/lib/types'

const ACCENT: Record<string, string> = {
  partido: COLORS.primary,
  recital: COLORS.accent,
  otro:    COLORS.textMuted,
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
  const accent     = ACCENT[event.type] ?? COLORS.primary

  return (
    <TouchableOpacity
      style={[styles.card, Platform.OS === 'web' && ({ cursor: 'pointer' } as object)]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.competition}>
            {EVENT_TYPE_ICONS[event.type]}  {event.subtitle ?? event.competition ?? ''}
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
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
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
    backgroundColor: COLORS.accent + '1A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 23,
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
    color: COLORS.primaryLight,
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
    backgroundColor: COLORS.success + '1A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.success + '44',
  },
  tripsText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    lineHeight: 26,
  },
})
