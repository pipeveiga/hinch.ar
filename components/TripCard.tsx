import { View, Text, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  COLORS, SPACING, RADIUS, SHADOWS,
  TRIP_TYPE_LABELS, TRIP_TYPE_COLORS, TRIP_TYPE_ICONS,
} from '@/lib/constants'
import type { Trip } from '@/lib/types'
import { UserAvatar } from './UserAvatar'
import { VerificationBadge } from './VerificationBadge'
import { ScalePress } from './ScalePress'

interface TripCardProps {
  trip:       Trip
  onPress:    () => void
  showEvent?: boolean  // muestra el evento si venimos de "Mis viajes"
}

export function TripCard({ trip, onPress, showEvent = false }: TripCardProps) {
  const driver = trip.driver
  const event  = trip.event

  const isFull    = trip.status === 'full'
  const isCancelled = trip.status === 'cancelled'

  return (
    <ScalePress
      style={[
        styles.card,
        isFull      && styles.cardFull,
        isCancelled && styles.cardCancelled,
      ]}
      onPress={onPress}
      disabled={isCancelled}
    >
      {/* Si mostramos el evento (en mis viajes) */}
      {showEvent && event && (
        <Text style={styles.eventTitle} numberOfLines={1}>
          ⚽ {event.title}
        </Text>
      )}

      {/* Header: tramo + estado */}
      <View style={styles.header}>
        <View style={[
          styles.tramoBadge,
          { backgroundColor: TRIP_TYPE_COLORS[trip.trip_type] + '20', borderColor: TRIP_TYPE_COLORS[trip.trip_type] }
        ]}>
          <Text style={[styles.tramoText, { color: TRIP_TYPE_COLORS[trip.trip_type] }]}>
            {TRIP_TYPE_ICONS[trip.trip_type]} {TRIP_TYPE_LABELS[trip.trip_type]}
          </Text>
        </View>

        <View style={[
          styles.seatsBadge,
          isFull ? styles.seatsBadgeFull : styles.seatsBadgeAvail
        ]}>
          <Text style={[styles.seatsText, isFull && styles.seatsTextFull]}>
            {isFull
              ? 'Completo'
              : `${trip.seats_available} lugar${trip.seats_available !== 1 ? 'es' : ''}`}
          </Text>
        </View>
      </View>

      {/* Ruta */}
      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <View style={styles.originDot} />
          <View>
            <Text style={styles.routeCity}>{trip.origin_city}</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {trip.origin_address}
            </Text>
          </View>
        </View>

        <Text style={styles.routeArrow}>→</Text>

        <View style={styles.routePoint}>
          <View style={styles.destDot} />
          <View>
            <Text style={styles.routeCity}>{event?.venue_city ?? 'Destino'}</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {event?.venue_name ?? ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Precio */}
      <View style={styles.priceRow}>
        {trip.price_outbound != null && (
          <Text style={styles.price}>
            <Text style={styles.priceDirection}>Ida: </Text>
            <Text style={styles.priceAmount}>${trip.price_outbound.toLocaleString('es-AR')}</Text>
          </Text>
        )}
        {trip.price_return != null && trip.trip_type !== 'ida' && (
          <Text style={styles.price}>
            <Text style={styles.priceDirection}>Vuelta: </Text>
            <Text style={styles.priceAmount}>${trip.price_return.toLocaleString('es-AR')}</Text>
          </Text>
        )}
      </View>

      {/* Horario */}
      {trip.departure_time && (
        <Text style={styles.time}>
          ⏰ Salida: {format(new Date(trip.departure_time), "HH:mm · d MMM", { locale: es })}
        </Text>
      )}

      {/* Conductor */}
      {driver && (
        <View style={styles.driverRow}>
          <UserAvatar uri={driver.avatar_url} name={driver.full_name} size={30} />
          <Text style={styles.driverName}>{driver.full_name}</Text>
          <VerificationBadge verified={driver.is_verified} compact />
          {driver.total_trips_as_driver > 0 && (
            <Text style={styles.driverRating}>
              ⭐ {driver.avg_rating_as_driver.toFixed(1)}
            </Text>
          )}
        </View>
      )}

      {/* Extras */}
      {(trip.accepts_luggage || trip.accepts_pets) && (
        <View style={styles.extras}>
          {trip.accepts_luggage && <Text style={styles.extra}>🧳</Text>}
          {trip.accepts_pets    && <Text style={styles.extra}>🐾</Text>}
        </View>
      )}
    </ScalePress>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassEdge,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  cardFull: {
    opacity: 0.7,
  },
  cardCancelled: {
    opacity: 0.4,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tramoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tramoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seatsBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  seatsBadgeAvail: { backgroundColor: COLORS.successBg },
  seatsBadgeFull:  { backgroundColor: COLORS.errorBg },
  seatsText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  seatsTextFull: { color: COLORS.error },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  originDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
  },
  destDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error,
  },
  routeCity: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  routeAddress: { fontSize: 11, color: COLORS.textSecondary, maxWidth: 110 },
  routeArrow: { fontSize: 16, color: COLORS.textMuted },
  priceRow: { flexDirection: 'row', gap: SPACING.md },
  price: { fontSize: 14 },
  priceDirection: { color: COLORS.textSecondary },
  priceAmount: { fontWeight: '800', color: COLORS.textPrimary },
  time: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  driverName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  driverRating: { fontSize: 13, color: COLORS.accent, fontWeight: '700' },
  extras: { flexDirection: 'row', gap: SPACING.xs },
  extra: { fontSize: 16 },
})
