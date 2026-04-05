import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { eventsApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import type { Event, EventType } from '@/lib/types'
import { EventCard } from '@/components/EventCard'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useUserCity } from '@/hooks/useUserCity'

type Filter = 'todos' | EventType | 'mi_ciudad'

export default function HomeScreen() {
  const [events,     setEvents]     = useState<Event[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState<Filter>('todos')
  const [search,     setSearch]     = useState('')
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  const { city: userCity, loading: cityLoading } = useUserCity()

  const load = useCallback(async () => {
    try {
      const data = await eventsApi.list({
        type: filter === 'todos' || filter === 'mi_ciudad' ? undefined : filter,
      })
      setEvents(data)
    } catch (err) {
      console.error(err)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue_city.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'mi_ciudad' && userCity) {
      return e.venue_city.toLowerCase().includes(userCity.toLowerCase())
    }
    return true
  })

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⚽ hinch.ar</Text>
          <Text style={styles.headerSubtitle}>¿A qué evento vas?</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/(tabs)/notificaciones')}
          activeOpacity={0.7}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar evento o ciudad..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        {([
          { key: 'todos',     label: 'Todos' },
          { key: 'mi_ciudad', label: cityLoading ? '📍 ...' : `📍 ${userCity ?? 'Mi ciudad'}` },
          { key: 'partido',   label: '⚽ Partidos' },
          { key: 'recital',   label: '🎸 Recitales' },
        ] as { key: Filter; label: string }[]).map(({ key, label }) => {
          if (key === 'mi_ciudad' && !cityLoading && !userCity) return null
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, filter === key && styles.filterChipActive]}
              onPress={() => setFilter(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Lista de eventos */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏟️</Text>
          <Text style={styles.emptyText}>
            {filter === 'mi_ciudad'
              ? `No hay eventos en ${userCity}`
              : 'No hay eventos próximos'}
          </Text>
          <Text style={styles.emptySubtext}>Volvé a revisar en los próximos días</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => router.push(`/evento/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bellBtn: { position: 'relative', padding: SPACING.xs },
  bellIcon: { fontSize: 24 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  filters: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  list: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary },
})
