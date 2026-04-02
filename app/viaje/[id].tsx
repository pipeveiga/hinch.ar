import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useTripsStore } from '@/stores/tripsStore'
import { useAuthStore } from '@/stores/authStore'
import { bookingsApi } from '@/lib/supabase'
import {
  COLORS, SPACING, RADIUS,
  TRIP_TYPE_LABELS, TRIP_TYPE_COLORS,
  BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS,
} from '@/lib/constants'
import type { TripType, NewBookingForm, Booking } from '@/lib/types'
import { UserAvatar } from '@/components/UserAvatar'
import { VerificationBadge } from '@/components/VerificationBadge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ViajeDetailScreen() {
  const { id }         = useLocalSearchParams<{ id: string }>()
  const { user }       = useAuthStore()
  const { selectedTrip, selectedTripLoading, loadTrip, bookTrip, confirmBooking, cancelBooking, cancelTrip } = useTripsStore()
  const [modalVisible, setModalVisible]       = useState(false)
  const [editModal, setEditModal]             = useState(false)
  const [bookings, setBookings]               = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [actionLoading, setActionLoading]     = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    price_outbound: '',
    price_return:   '',
    seats_total:    '',
    notes:          '',
  })
  const [editSaving, setEditSaving] = useState(false)
  const [booking, setBooking] = useState<NewBookingForm>({
    segment:           'ida',
    seats_booked:      1,
    payment_method:    'transferencia',
    passenger_message: '',
    pickup_point:      '',
  })
  const [booking_loading, setBookingLoading] = useState(false)

  useEffect(() => {
    loadTrip(id)
  }, [id])

  const trip   = selectedTrip
  const driver = trip?.driver
  const event  = trip?.event
  const isOwn  = user?.id === trip?.driver_id

  useEffect(() => {
    if (!trip || !isOwn) return
    setBookingsLoading(true)
    bookingsApi.getByTrip(trip.id)
      .then(setBookings)
      .finally(() => setBookingsLoading(false))
  }, [trip?.id, isOwn])

  const handleConfirm = async (bookingId: string) => {
    if (!user) return
    setActionLoading(bookingId)
    try {
      await confirmBooking(bookingId, user.id)
      setBookings((bs) => bs.map((b) => b.id === bookingId ? { ...b, status: 'confirmed' } : b))
    } catch {
      Alert.alert('Error', 'No se pudo confirmar la reserva')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelTrip = () => {
    Alert.alert(
      'Cancelar viaje',
      'Si cancelás, todos los pasajeros confirmados serán notificados. ¿Seguro?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
          if (!user || !trip) return
          try {
            await cancelTrip(trip.id, user.id)
            Alert.alert('Viaje cancelado', 'Tu viaje fue cancelado correctamente.')
            router.back()
          } catch {
            Alert.alert('Error', 'No se pudo cancelar el viaje')
          }
        }},
      ]
    )
  }

  const openEdit = () => {
    if (!trip) return
    setEditForm({
      price_outbound: trip.price_outbound?.toString() ?? '',
      price_return:   trip.price_return?.toString()   ?? '',
      seats_total:    trip.seats_total.toString(),
      notes:          trip.notes ?? '',
    })
    setEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!trip || !user) return
    setEditSaving(true)
    try {
      const { tripsApi } = await import('@/lib/supabase')
      await tripsApi.update(trip.id, user.id, {
        price_outbound: editForm.price_outbound ? parseFloat(editForm.price_outbound) : undefined,
        price_return:   editForm.price_return   ? parseFloat(editForm.price_return)   : undefined,
        seats_total:    editForm.seats_total    ? parseInt(editForm.seats_total)      : trip.seats_total,
        notes:          editForm.notes,
      })
      setEditModal(false)
      loadTrip(id)
      Alert.alert('¡Listo!', 'Viaje actualizado correctamente.')
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el viaje')
    } finally {
      setEditSaving(false)
    }
  }

  const handleReject = async (bookingId: string) => {
    Alert.alert('Rechazar solicitud', '¿Seguro que querés rechazar este pasajero?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: async () => {
        if (!user) return
        setActionLoading(bookingId)
        try {
          await cancelBooking(bookingId, user.id)
          setBookings((bs) => bs.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
        } catch {
          Alert.alert('Error', 'No se pudo rechazar la reserva')
        } finally {
          setActionLoading(null)
        }
      }},
    ])
  }

  const computeTotal = (): number => {
    if (!trip) return 0
    let total = 0
    if (booking.segment === 'ida' || booking.segment === 'ida_y_vuelta') {
      total += (trip.price_outbound ?? 0) * booking.seats_booked
    }
    if (booking.segment === 'vuelta' || booking.segment === 'ida_y_vuelta') {
      total += (trip.price_return ?? 0) * booking.seats_booked
    }
    return total
  }

  const handleBooking = async () => {
    if (!user) { router.push('/(auth)/login'); return }
    if (isOwn) { Alert.alert('No podés reservar tu propio viaje'); return }

    const total = computeTotal()
    if (total === 0) { Alert.alert('Error', 'El monto no puede ser $0'); return }

    setBookingLoading(true)
    try {
      await bookTrip(user.id, id, booking, total)
      setModalVisible(false)
      Alert.alert(
        '¡Solicitud enviada! 🎉',
        'Le avisamos al conductor. Esperá su confirmación.',
        [{ text: 'OK', onPress: () => router.push('/(tabs)/mis-viajes') }]
      )
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo reservar')
    } finally {
      setBookingLoading(false)
    }
  }

  if (selectedTripLoading || !trip) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const total = computeTotal()

  const availableSegments: TripType[] = trip.trip_type === 'ida_y_vuelta'
    ? ['ida', 'vuelta', 'ida_y_vuelta']
    : [trip.trip_type]

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:     true,
          headerTitle:     'Detalle del viaje',
          headerStyle:     { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
          headerRight: isOwn && trip?.status === 'active' ? () => (
            <TouchableOpacity onPress={openEdit} style={{ marginRight: 8 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 15 }}>Editar</Text>
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Evento */}
        {event && (
          <View style={styles.eventBadge}>
            <Text style={styles.eventBadgeText}>⚽ {event.title}</Text>
            <Text style={styles.eventBadgeSub}>
              {format(new Date(event.event_date), "d MMM · HH:mm", { locale: es })} · {event.venue_city}
            </Text>
          </View>
        )}

        {/* Tramo badge */}
        <View style={styles.tramoBadge}>
          <View style={[
            styles.tramoChip,
            { backgroundColor: TRIP_TYPE_COLORS[trip.trip_type] + '20', borderColor: TRIP_TYPE_COLORS[trip.trip_type] }
          ]}>
            <Text style={[styles.tramoChipText, { color: TRIP_TYPE_COLORS[trip.trip_type] }]}>
              {TRIP_TYPE_LABELS[trip.trip_type]}
            </Text>
          </View>
          <View style={[styles.tramoChip, { backgroundColor: trip.seats_available > 0 ? COLORS.successBg : COLORS.errorBg }]}>
            <Text style={styles.tramoChipText}>
              {trip.seats_available > 0
                ? `${trip.seats_available} lugar${trip.seats_available !== 1 ? 'es' : ''}`
                : 'Sin lugares'}
            </Text>
          </View>
        </View>

        {/* Ruta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruta</Text>
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={styles.routeDot} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Origen</Text>
                <Text style={styles.routeAddress}>{trip.origin_address}</Text>
                <Text style={styles.routeCity}>{trip.origin_city}</Text>
                {trip.departure_time && (
                  <Text style={styles.routeTime}>
                    ⏰ Salida: {format(new Date(trip.departure_time), "HH:mm")}
                  </Text>
                )}
              </View>
            </View>

            {trip.waypoints.length > 0 && (
              <>
                <View style={styles.routeLine} />
                {trip.waypoints.map((wp, i) => (
                  <View key={i} style={styles.routeRow}>
                    <View style={[styles.routeDot, styles.routeDotWaypoint]} />
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeLabel}>Parada {i + 1}</Text>
                      <Text style={styles.routeAddress}>{wp.address}, {wp.city}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, styles.routeDotDest]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Destino</Text>
                <Text style={styles.routeAddress}>{event?.venue_name}</Text>
                <Text style={styles.routeCity}>{event?.venue_city}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Precios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precio por asiento</Text>
          <View style={styles.pricesCard}>
            {trip.price_outbound != null && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>→ Ida</Text>
                <Text style={styles.priceValue}>
                  ${trip.price_outbound.toLocaleString('es-AR')}
                </Text>
              </View>
            )}
            {trip.price_return != null && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>← Vuelta</Text>
                <Text style={styles.priceValue}>
                  ${trip.price_return.toLocaleString('es-AR')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Conductor */}
        {driver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conductor</Text>
            <TouchableOpacity
              style={styles.driverCard}
              onPress={() => {/* Futuro: perfil del conductor */}}
              activeOpacity={0.8}
            >
              <UserAvatar uri={driver.avatar_url} name={driver.full_name} size={52} />
              <View style={styles.driverInfo}>
                <View style={styles.driverNameRow}>
                  <Text style={styles.driverName}>{driver.full_name}</Text>
                  <VerificationBadge verified={driver.is_verified} compact />
                </View>
                {driver.total_trips_as_driver > 0 ? (
                  <Text style={styles.driverRating}>
                    ⭐ {driver.avg_rating_as_driver.toFixed(1)} · {driver.total_trips_as_driver} viaje{driver.total_trips_as_driver !== 1 ? 's' : ''}
                  </Text>
                ) : (
                  <Text style={styles.driverRating}>Conductor nuevo</Text>
                )}
              </View>
              <Text style={styles.driverChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Extras */}
        {(trip.accepts_luggage || trip.accepts_pets || trip.notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extras</Text>
            <View style={styles.extrasCard}>
              {trip.accepts_luggage && <Text style={styles.extra}>🧳 Acepta equipaje</Text>}
              {trip.accepts_pets    && <Text style={styles.extra}>🐾 Acepta mascotas</Text>}
              {trip.notes && (
                <View style={styles.notesRow}>
                  <Text style={styles.notesLabel}>Notas del conductor:</Text>
                  <Text style={styles.notesText}>{trip.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Solicitudes de pasajeros — solo visible para el conductor */}
        {isOwn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Solicitudes {bookings.filter(b => b.status === 'pending').length > 0
                ? `(${bookings.filter(b => b.status === 'pending').length} pendiente${bookings.filter(b => b.status === 'pending').length > 1 ? 's' : ''})`
                : ''}
            </Text>
            {bookingsLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : bookings.length === 0 ? (
              <View style={styles.emptyBookings}>
                <Text style={styles.emptyBookingsText}>Todavía no hay solicitudes</Text>
              </View>
            ) : (
              bookings.map((b) => (
                <View key={b.id} style={styles.passengerCard}>
                  <View style={styles.passengerRow}>
                    <UserAvatar uri={b.passenger?.avatar_url} name={b.passenger?.full_name ?? '?'} size={40} />
                    <View style={styles.passengerInfo}>
                      <Text style={styles.passengerName}>{b.passenger?.full_name}</Text>
                      <Text style={styles.passengerMeta}>
                        {TRIP_TYPE_LABELS[b.segment]} · {b.seats_booked} asiento{b.seats_booked > 1 ? 's' : ''} · {b.payment_method}
                      </Text>
                      {b.passenger_message ? (
                        <Text style={styles.passengerMsg}>"{b.passenger_message}"</Text>
                      ) : null}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: BOOKING_STATUS_COLORS[b.status] + '25' }]}>
                      <Text style={[styles.statusPillText, { color: BOOKING_STATUS_COLORS[b.status] }]}>
                        {BOOKING_STATUS_LABELS[b.status]}
                      </Text>
                    </View>
                  </View>

                  {b.status === 'pending' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleReject(b.id)}
                        disabled={actionLoading === b.id}
                      >
                        <Text style={styles.rejectBtnText}>✕ Rechazar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.acceptBtn, actionLoading === b.id && { opacity: 0.6 }]}
                        onPress={() => handleConfirm(b.id)}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id
                          ? <ActivityIndicator size="small" color={COLORS.white} />
                          : <Text style={styles.acceptBtnText}>✓ Aceptar</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Botón reservar */}
      {!isOwn && trip.status === 'active' && trip.seats_available > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.reservarBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.reservarBtnText}>Reservar lugar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de edición — solo conductor */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Editar viaje</Text>

            {(trip?.trip_type === 'ida' || trip?.trip_type === 'ida_y_vuelta') && (
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Precio ida (ARS)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.price_outbound}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, price_outbound: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Ej: 8000"
                />
              </View>
            )}

            {(trip?.trip_type === 'vuelta' || trip?.trip_type === 'ida_y_vuelta') && (
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Precio vuelta (ARS)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editForm.price_return}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, price_return: v }))}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Ej: 8000"
                />
              </View>
            )}

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Asientos totales</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.seats_total}
                onChangeText={(v) => setEditForm((f) => ({ ...f, seats_total: v }))}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Notas para pasajeros</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                value={editForm.notes}
                onChangeText={(v) => setEditForm((f) => ({ ...f, notes: v }))}
                multiline
                placeholderTextColor={COLORS.textMuted}
                placeholder="Contales algo..."
              />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelModalBtnText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, editSaving && styles.confirmBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.confirmBtnText}>Guardar cambios</Text>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => { setEditModal(false); setTimeout(handleCancelTrip, 300) }}
            >
              <Text style={styles.deleteBtnText}>🗑️ Eliminar viaje</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de reserva */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Confirmar reserva</Text>

            {/* Selector de tramo */}
            {availableSegments.length > 1 && (
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>¿Qué tramo?</Text>
                <View style={styles.segmentSelector}>
                  {availableSegments.map((seg) => (
                    <TouchableOpacity
                      key={seg}
                      style={[
                        styles.segmentBtn,
                        booking.segment === seg && {
                          backgroundColor: TRIP_TYPE_COLORS[seg] + '30',
                          borderColor: TRIP_TYPE_COLORS[seg],
                        }
                      ]}
                      onPress={() => setBooking((b) => ({ ...b, segment: seg }))}
                    >
                      <Text style={[
                        styles.segmentBtnText,
                        booking.segment === seg && { color: TRIP_TYPE_COLORS[seg], fontWeight: '700' }
                      ]}>
                        {TRIP_TYPE_LABELS[seg]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Asientos */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Asientos</Text>
              <View style={styles.seatsSelector}>
                {[1, 2, 3, 4].filter((n) => n <= trip.seats_available).map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.seatBtn, booking.seats_booked === n && styles.seatBtnActive]}
                    onPress={() => setBooking((b) => ({ ...b, seats_booked: n }))}
                  >
                    <Text style={[styles.seatBtnText, booking.seats_booked === n && styles.seatBtnTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Método de pago */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Forma de pago</Text>
              <View style={styles.paymentSelector}>
                {(['transferencia', 'efectivo'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.paymentBtn, booking.payment_method === m && styles.paymentBtnActive]}
                    onPress={() => setBooking((b) => ({ ...b, payment_method: m }))}
                  >
                    <Text style={[styles.paymentBtnText, booking.payment_method === m && styles.paymentBtnTextActive]}>
                      {m === 'transferencia' ? '💳 Transferencia' : '💵 Efectivo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Punto de encuentro */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Punto de encuentro (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej: Esquina de Corrientes y 9 de Julio"
                placeholderTextColor={COLORS.textMuted}
                value={booking.pickup_point}
                onChangeText={(t) => setBooking((b) => ({ ...b, pickup_point: t }))}
              />
            </View>

            {/* Mensaje */}
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Mensaje para el conductor</Text>
              <TextInput
                style={[styles.modalInput, { height: 70 }]}
                placeholder="Contale algo, presentate..."
                placeholderTextColor={COLORS.textMuted}
                value={booking.passenger_message}
                onChangeText={(t) => setBooking((b) => ({ ...b, passenger_message: t }))}
                multiline
              />
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalAmount}>
                ${total.toLocaleString('es-AR')}
              </Text>
            </View>

            <Text style={styles.paymentDisclaimer}>
              ⚠️ El pago se hace directamente con el conductor. hinch.ar no procesa dinero.
            </Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, booking_loading && styles.confirmBtnDisabled]}
                onPress={handleBooking}
                disabled={booking_loading}
              >
                <Text style={styles.confirmBtnText}>
                  {booking_loading ? 'Enviando...' : 'Confirmar reserva'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  eventBadge: {
    backgroundColor: COLORS.surface, padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  eventBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  eventBadgeSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  tramoBadge: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  tramoChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  tramoChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm,
  },
  routeCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  routeRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 4 },
  routeDotWaypoint: { backgroundColor: COLORS.accent },
  routeDotDest: { backgroundColor: COLORS.error },
  routeLine: { width: 2, height: 20, backgroundColor: COLORS.border, marginLeft: 4, marginVertical: 4 },
  routeInfo: { flex: 1, paddingBottom: SPACING.xs },
  routeLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  routeAddress: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  routeCity: { fontSize: 12, color: COLORS.textSecondary },
  routeTime: { fontSize: 12, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  pricesCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  priceLabel: { fontSize: 14, color: COLORS.textSecondary },
  priceValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  driverName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  driverRating: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  driverChevron: { fontSize: 20, color: COLORS.textMuted },
  extrasCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  extra: { fontSize: 14, color: COLORS.textPrimary },
  notesRow: { gap: 4 },
  notesLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  notesText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  reservarBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
  },
  reservarBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalField: { gap: SPACING.xs },
  modalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 14,
  },
  segmentSelector: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  segmentBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  segmentBtnText: { fontSize: 12, color: COLORS.textSecondary },
  seatsSelector: { flexDirection: 'row', gap: SPACING.sm },
  seatBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  seatBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  seatBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  seatBtnTextActive: { color: COLORS.white },
  paymentSelector: { flexDirection: 'row', gap: SPACING.sm },
  paymentBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  paymentBtnActive: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primary },
  paymentBtnText: { fontSize: 13, color: COLORS.textSecondary },
  paymentBtnTextActive: { color: COLORS.primaryLight, fontWeight: '700' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalAmount: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary },
  paymentDisclaimer: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  deleteBtn: {
    padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error,
    alignItems: 'center', marginTop: SPACING.xs,
  },
  deleteBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  emptyBookings: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  emptyBookingsText: { color: COLORS.textMuted, fontSize: 14 },
  passengerCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  passengerRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  passengerMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  passengerMsg: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 4 },
  statusPill: {
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: {
    flex: 1, padding: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error, alignItems: 'center',
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
  acceptBtn: {
    flex: 2, padding: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: COLORS.success ?? '#22c55e', alignItems: 'center',
  },
  acceptBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  cancelModalBtn: {
    flex: 1, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelModalBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: {
    flex: 2, padding: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
})
