import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COLORS, SPACING, EVENT_TYPE_ICONS } from '@/lib/constants'
import type { Event } from '@/lib/types'

interface EventCardProps {
  event:   Event
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  const date    = new Date(event.event_date)
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const dateLabel = isToday
    ? `Hoy · ${format(date, 'HH:mm')}`
    : format(date, "EEE d MMM · HH:mm", { locale: es })

  const tripsCount = (event.trips_count as unknown as { count: number }[])?.[0]?.count ?? 0

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.6}>
      {/* Competición */}
      <View style={styles.topRow}>
        <Text style={styles.competition}>
          {EVENT_TYPE_ICONS[event.type]}  {event.subtitle ?? event.competition ?? ''}
        </Text>
        {event.is_featured && <View style={styles.featuredDot} />}
      </View>

      {/* Título */}
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

      {/* Meta */}
      <View style={styles.meta}>
        <Text style={[styles.date, isToday && styles.dateToday]}>{dateLabel}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.venue} numberOfLines={1}>{event.venue_city}</Text>
        {tripsCount > 0 && (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.trips}>{tripsCount} {tripsCount === 1 ? 'viaje' : 'viajes'}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md + 2,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  competition: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flex: 1,
  },
  featuredDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginLeft: SPACING.sm,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  date: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dateToday: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  dot: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  venue: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  trips: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
})
