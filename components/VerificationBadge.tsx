import { View, Text, StyleSheet } from 'react-native'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { Icon } from './Icon'

interface VerificationBadgeProps {
  verified: boolean
  compact?: boolean  // versión pequeña para usar dentro de listas
}

export function VerificationBadge({ verified, compact = false }: VerificationBadgeProps) {
  if (compact) {
    if (!verified) return null
    return (
      <View style={styles.checkCircle}>
        <Icon name="check" size={9} color={COLORS.white} strokeWidth={2.6} />
      </View>
    )
  }

  return (
    <View style={[styles.badge, verified ? styles.badgeVerified : styles.badgeUnverified]}>
      {verified && <Icon name="check" size={12} color={COLORS.success} strokeWidth={2.4} />}
      <Text style={[styles.badgeText, verified ? styles.badgeTextVerified : styles.badgeTextUnverified]}>
        {verified ? 'Verificado' : 'Sin verificar'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
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
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
