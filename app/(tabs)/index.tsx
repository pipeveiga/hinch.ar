import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { eventsApi } from '@/lib/supabase'
import { COLORS, SPACING } from '@/lib/constants'
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

  const chips: { key: Filter; label: string }[] = [
    { key: 'todos',     label: 'Todos' },
    ...((!cityLoading && userCity) ? [{ key: 'mi_ciudad' as Filter, label: `📍 ${userCity}` }] : []),
    { key: 'partido',   label: '⚽ Partidos' },
    { key: 'recital',   label: '🎸 Recitales' },
  ]

  const ListHeader = (
    <View>
      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar evento o ciudad..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
      >
        {chips.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>hinch.ar</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/notificaciones')}
          activeOpacity={0.6}
          style={styles.bellBtn}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Lista con header integrado */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <>
          {ListHeader}
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🏟️</Text>
            <Text style={styles.emptyText}>
              {filter === 'mi_ciudad' ? `No hay eventos en ${userCity}` : 'No hay eventos próximos'}
            </Text>
            <Text style={styles.emptySubtext}>Volvé a revisar en los próximos días</Text>
          </View>
        </>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/evento/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
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
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.xs,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    padding: 0,
  },

  filters: {
    marginBottom: SPACING.md,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.lg,
  },
  separator: {
    height: SPACING.sm,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyIcon:    { fontSize: 48 },
  emptyText:    { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary },
})
