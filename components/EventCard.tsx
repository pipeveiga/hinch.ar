import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COLORS, SPACING, RADIUS, SHADOWS, EVENT_TYPE_ICONS } from '@/lib/constants'
import type { Event } from '@/lib/types'
import { ScalePress } from './ScalePress'

interface EventCardProps {
  event:   Event
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  const date    = new Date(event.event_date)
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const tripsCount = (event.trips_count as unknown as { count: number }[])?.[0]?.count ?? 0

  return (
    <ScalePress style={styles.card} onPress={onPress}>
      {/* Bloque de fecha estilo calendario */}
      <View style={[styles.dateBlock, isToday && styles.dateBlockToday]}>
        {isToday ? (
          <>
            <Text style={styles.dateTodayLabel}>HOY</Text>
            <Text style={styles.dateTodayTime}>{format(date, 'HH:mm')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.dateDay}>{format(date, 'd')}</Text>
            <Text style={styles.dateMonth}>{format(date, 'MMM', { locale: es }).replace('.', '').toUpperCase()}</Text>
          </>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.competition} numberOfLines={1}>
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
          <Text style={styles.metaText}>
            {isToday ? `Hoy · ${format(date, 'HH:mm')}` : format(date, "EEE · HH:mm", { locale: es })}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={[styles.metaText, styles.venueText]} numberOfLines={1}>{event.venue_city}</Text>
          {tripsCount > 0 && (
            <View style={styles.tripsBadge}>
              <Text style={styles.tripsText}>🚗 {tripsCount} {tripsCount === 1 ? 'viaje' : 'viajes'}</Text>
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
  dateBlock: {
    width: 54,
    height: 58,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBlockToday: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.button,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  dateTodayLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  dateTodayTime: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.85,
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
    textTransform: 'capitalize',
  },
  dot: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  venueText: {
    color: COLORS.textSecondary,
    textTransform: 'none',
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
