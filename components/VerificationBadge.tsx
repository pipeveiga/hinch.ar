import { View, Text, StyleSheet } from 'react-native'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

interface VerificationBadgeProps {
  verified: boolean
  compact?: boolean  // versión pequeña para usar dentro de listas
}

export function VerificationBadge({ verified, compact = false }: VerificationBadgeProps) {
  if (compact) {
    return (
      <Text style={verified ? styles.checkmark : styles.unverifiedCompact}>
        {verified ? '✓' : ''}
      </Text>
    )
  }

  return (
    <View style={[styles.badge, verified ? styles.badgeVerified : styles.badgeUnverified]}>
      <Text style={[styles.badgeText, verified ? styles.badgeTextVerified : styles.badgeTextUnverified]}>
        {verified ? '✓ Verificado' : 'Sin verificar'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeVerified: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  badgeUnverified: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextVerified: {
    color: COLORS.success,
  },
  badgeTextUnverified: {
    color: COLORS.textMuted,
  },
  checkmark: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '900',
  },
  unverifiedCompact: {
    fontSize: 12,
    color: 'transparent',
  },
})
