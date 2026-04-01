import { Tabs, Redirect } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useAuthStore } from '@/stores/authStore'
import { COLORS, SPACING } from '@/lib/constants'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  )
}

export default function TabsLayout() {
  const { session } = useAuthStore()
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
            <TabIcon emoji="🚗" label="Mis viajes" focused={focused} />
          ),
        }}
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
    height: 65,
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
})
