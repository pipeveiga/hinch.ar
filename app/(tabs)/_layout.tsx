import { useEffect } from 'react'
import { Tabs, Redirect } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useChatsStore } from '@/stores/chatsStore'
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/constants'
import { Icon, type IconName } from '@/components/Icon'

function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Icon name={icon} size={22} color={focused ? COLORS.accent : COLORS.textMuted} strokeWidth={focused ? 2 : 1.7} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function ChatsTabIcon({ focused }: { focused: boolean }) {
  const totalUnread = useChatsStore((s) => s.totalUnread)
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <View>
        <Icon name="chat" size={22} color={focused ? COLORS.accent : COLORS.textMuted} strokeWidth={focused ? 2 : 1.7} />
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

// Fondo de vidrio de la tab bar: blur real donde está soportado
// (iOS / web / Android moderno) + velo translúcido como base
function GlassBackground() {
  return (
    <View style={styles.glassWrap}>
      <BlurView
        intensity={42}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassVeil} />
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
        tabBarStyle: [styles.tabBar, { bottom: insets.bottom + SPACING.md }],
        tabBarBackground: () => <GlassBackground />,
        tabBarActiveTintColor:   COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="stadium" label="Eventos" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="mis-viajes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="car" label="Viajes" focused={focused} />
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
            <TabIcon icon="user" label="Perfil" focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    height: 68,
    borderRadius: RADIUS.full,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    paddingTop: 6,
    paddingBottom: 0,
    ...SHADOWS.floating,
    // En pantallas anchas (web) la pill no ocupa todo el ancho
    ...(Platform.OS === 'web' ? { maxWidth: 480, marginHorizontal: 'auto' as const } : {}),
  },
  tabItem: {
    paddingVertical: 4,
  },
  glassWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.glassEdge,
  },
  glassVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.glass,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 72,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  tabIconFocused: {
    backgroundColor: COLORS.brandTint,
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
    fontSize: 9, fontWeight: '800', color: COLORS.white,
  },
})
