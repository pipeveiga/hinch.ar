import { useEffect } from 'react'
import { Tabs, Redirect } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useChatsStore } from '@/stores/chatsStore'
import { COLORS, SPACING } from '@/lib/constants'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function NotifTabIcon({ focused }: { focused: boolean }) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount)
  return (
    <View style={styles.tabIcon}>
      <View>
        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>🔔</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>Alertas</Text>
    </View>
  )
}

function ChatsTabIcon({ focused }: { focused: boolean }) {
  const totalUnread = useChatsStore((s) => s.totalUnread)
  return (
    <View style={styles.tabIcon}>
      <View>
        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>💬</Text>
        {totalUnread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>Chats</Text>
    </View>
  )
}

export default function TabsLayout() {
  const { session, user } = useAuthStore()
  const { fetch, subscribe, unsubscribe } = useNotificationsStore()
  const { initialize: initChats, unsubscribe: unsubChats } = useChatsStore()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (user) {
      fetch(user.id)
      subscribe(user.id)
      initChats(user.id)
    }
    return () => {
      unsubscribe()
      unsubChats()
    }
  }, [user?.id])

  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }],
        tabBarActiveTintColor:   COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏟️" label="Eventos" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="mis-viajes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🚗" label="Viajes" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          tabBarIcon: ({ focused }) => <ChatsTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notificaciones"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Perfil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  tabIcon: {
    alignItems: 'center',
    gap: 2,
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9, fontWeight: '800', color: COLORS.textPrimary,
  },
})
