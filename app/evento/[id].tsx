import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { eventsApi } from '@/lib/supabase'
import { useTripsStore } from '@/stores/tripsStore'
import { useAuthStore } from '@/stores/authStore'
import {
  COLORS, SPACING, RADIUS,
  TRIP_TYPE_LABELS, TRIP_TYPE_COLORS,
  EVENT_TYPE_ICONS,
} from '@/lib/constants'
import type { Event, TripSearchFilters } from '@/lib/types'
import { TripCard } from '@/components/TripCard'
import { AdBanner } from '@/components/AdBanner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function EventoScreen() {
  const { id }         = useLocalSearchParams<{ id: string }>()
  const { user }       = useAuthStore()
  const [event, setEvent] = useState<Event | null>(null)
  const [eventLoading, setEventLoading] = useState(true)
  const [filters, setFilters] = useState<TripSearchFilters>({ only_with_seats: true })

  const {
    eventTrips, eventTripsLoading,
    loadEventTrips, clearEventTrips,
  } = useTripsStore()

  useEffect(() => {
    eventsApi.getById(id).then((e) => {
      setEvent(e)
      setEventLoading(false)
    })
    return () => clearEventTrips()
  }, [id])

  useEffect(() => {
    if (id) loadEventTrips(id, filters)
  }, [id, filters])

  const handlePublicar = () => {
    if (!user) {
      router.push('/(auth)/login')
      return
    }
    if (!user.has_car) {
      Alert.alert(
        'Registrá tu auto primero',
        'Para publicar un viaje necesitás tener un auto registrado en tu perfil.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir al perfil', onPress: () => router.push('/(tabs)/perfil') },
        ]
      )
      return
    }
    router.push({ pathname: '/viaje/nuevo', params: { eventId: id } })
  }

  if (eventLoading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const eventDate = new Date(event.event_date)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header custom con botón volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {/* Banner del evento */}
        <View style={styles.eventBanner}>
          <Text style={styles.eventType}>
            {EVENT_TYPE_ICONS[event.type]} {event.type === 'partido' ? 'Partido' : 'Recital'}
          </Text>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.subtitle && (
            <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
          )}
          <View style={styles.eventMeta}>
            <Text style={styles.eventMetaText}>
              📅 {format(eventDate, "EEEE d 'de' MMMM · HH:mm", { locale: es })}
            </Text>
            <Text style={styles.eventMetaText}>
              📍 {event.venue_name}, {event.venue_city}
            </Text>
          </View>
        </View>

        {/* Filtros de tramo */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Tramo:</Text>
          {(['todos', 'ida', 'vuelta', 'ida_y_vuelta'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filters.trip_type === type && {
                  backgroundColor: type === 'todos'
                    ? COLORS.primary
                    : TRIP_TYPE_COLORS[type as keyof typeof TRIP_TYPE_COLORS] + '20',
                  borderColor: type === 'todos'
                    ? COLORS.primary
                    : TRIP_TYPE_COLORS[type as keyof typeof TRIP_TYPE_COLORS],
                },
              ]}
              onPress={() => setFilters((f) => ({ ...f, trip_type: type }))}
            >
              <Text style={[
                styles.filterChipText,
                filters.trip_type === type && { color: type === 'todos' ? COLORS.white : TRIP_TYPE_COLORS[type as keyof typeof TRIP_TYPE_COLORS] },
              ]}>
                {type === 'todos' ? 'Todos' : TRIP_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Lista de viajes */}
        {eventTripsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={eventTrips}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <TripCard
                trip={item}
                onPress={() => router.push(`/viaje/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.list}
            ListHeaderComponent={eventTrips.length > 0 ? <AdBanner /> : null}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🚗</Text>
                <Text style={styles.emptyTitle}>No hay viajes todavía</Text>
                <Text style={styles.emptySubtext}>
                  Sé el primero en publicar un viaje para este evento
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB: Publicar viaje */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handlePublicar}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>🚗 Publicar viaje</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { paddingVertical: SPACING.xs, paddingRight: SPACING.md },
  backText: { color: COLORS.primary, fontSize: 17, fontWeight: '600' },
  eventBanner: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  eventType: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  eventTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 28 },
  eventSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  eventMeta: { gap: 4, marginTop: SPACING.xs },
  eventMetaText: { fontSize: 13, color: COLORS.textSecondary },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    flexWrap: 'wrap',
  },
  filterLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginRight: SPACING.xs },
  filterChip: {
    paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 },
  emptyState: { alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.xxl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: SPACING.xl, right: SPACING.lg, left: SPACING.lg,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
})
