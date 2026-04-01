import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { eventsApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS, EVENT_TYPE_ICONS } from '@/lib/constants'
import type { Event, EventType } from '@/lib/types'
import { EventCard } from '@/components/EventCard'

type Filter = 'todos' | EventType

export default function HomeScreen() {
  const [events,     setEvents]     = useState<Event[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter,     setFilter]     = useState<Filter>('todos')
  const [search,     setSearch]     = useState('')

  const load = useCallback(async () => {
    try {
      const data = await eventsApi.list({
        type: filter === 'todos' ? undefined : filter,
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

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.venue_city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚽ hinch.ar</Text>
        <Text style={styles.headerSubtitle}>¿A qué evento vas?</Text>
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

      {/* Filtros por tipo */}
      <View style={styles.filters}>
        {(['todos', 'partido', 'recital'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'todos'
                ? 'Todos'
                : `${EVENT_TYPE_ICONS[f as EventType]} ${f.charAt(0).toUpperCase() + f.slice(1)}s`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de eventos */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏟️</Text>
          <Text style={styles.emptyText}>No hay eventos próximos</Text>
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
  },
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
