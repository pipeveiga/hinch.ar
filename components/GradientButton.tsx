import type { StyleProp, ViewStyle } from 'react-native'
import { Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ScalePress } from '@/components/ScalePress'
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/constants'

// CTA primario del proyecto: botón con degradé azul de marca + resorte al
// tocar. Unifica los botones principales (entrar, crear cuenta, reservar,
// publicar, enviar) con el mismo look premium de login/onboarding.
export function GradientButton({
  label, onPress, disabled = false, style,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <ScalePress onPress={onPress} disabled={disabled}>
      <LinearGradient
        colors={[COLORS.primaryLight, COLORS.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.btn, disabled && styles.disabled, style]}
      >
        <Text style={styles.text}>{label}</Text>
      </LinearGradient>
    </ScalePress>
  )
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.button,
  },
  disabled: { opacity: 0.6 },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
})
