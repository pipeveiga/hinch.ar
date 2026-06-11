import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, router } from 'expo-router'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

export default function NotFoundScreen() {
  const goHome = () => router.replace('/')

  return (
    <>
      <Stack.Screen options={{
        headerShown: true,
        headerTitle: '',
        headerBackTitle: '',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
      }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🧭</Text>
          <Text style={styles.code}>404</Text>
          <Text style={styles.title}>Esta pantalla no existe</Text>
          <Text style={styles.subtitle}>
            La página que buscás no está disponible o fue movida. Volvé al inicio para seguir buscando viajes.
          </Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={goHome} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Ir al inicio</Text>
          </TouchableOpacity>

          {router.canGoBack() && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.secondaryBtnText}>Volver atrás</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  code: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -2,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    maxWidth: 320,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
})
