import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { COLORS, SPACING, RADIUS, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from '@/lib/constants'
import type { Event } from '@/lib/types'

interface EventCardProps {
  event:   Event
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  const date = new Date(event.event_date)

  const isPast = date < new Date()
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const dateLabel = isToday
    ? `HOY · ${format(date, 'HH:mm')}`
    : format(date, "EEE d MMM · HH:mm", { locale: es }).toUpperCase()

  return (
    <TouchableOpacity
      style={[styles.card, event.is_featured && styles.cardFeatured, isPast && styles.cardPast]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Tipo e ícono */}
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeEmoji}>{EVENT_TYPE_ICONS[event.type]}</Text>
          <Text style={styles.typeText}>{EVENT_TYPE_LABELS[event.type].toUpperCase()}</Text>
        </View>

        {event.is_featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>DESTACADO</Text>
          </View>
        )}
      </View>

      {/* Título */}
      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>

      {event.subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {event.subtitle}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.metaCol}>
          <Text style={[styles.dateText, isToday && styles.dateTextToday]}>
            📅 {dateLabel}
          </Text>
          <Text style={styles.venueText}>
            📍 {event.venue_name}, {event.venue_city}
          </Text>
        </View>

        <View style={styles.tripsCount}>
          <Text style={styles.tripsCountNum}>
            {(event.trips_count as unknown as { count: number }[])?.[0]?.count ?? 0}
          </Text>
          <Text style={styles.tripsCountLabel}>viajes</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  cardFeatured: {
    borderColor: COLORS.accent,
    borderWidth: 1.5,
  },
  cardPast: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeEmoji: { fontSize: 14 },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  featuredBadge: {
    backgroundColor: COLORS.accent + '25',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
  },
  metaCol: { flex: 1, gap: 2 },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dateTextToday: {
    color: COLORS.accent,
  },
  venueText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  tripsCount: {
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 52,
  },
  tripsCountNum: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryLight,
  },
  tripsCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
})
