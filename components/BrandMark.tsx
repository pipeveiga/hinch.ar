import { View, Text, Image, StyleSheet } from 'react-native'
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/constants'

// Logo de marca: tile con ícono + wordmark "hinch.ar". Se usa en las
// pantallas de auth (login, register, recuperar, restablecer) para que
// todas compartan el mismo header en vez de un emoji suelto.
export function BrandMark({ tagline = false }: { tagline?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tile}>
        <Image source={require('@/assets/icon.png')} style={styles.img} />
      </View>
      <Text style={styles.word}>
        hinch<Text style={styles.dot}>.</Text>ar
      </Text>
      {tagline && <Text style={styles.tagline}>Compartí el viaje, viví el partido.</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tile: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.floating,
  },
  img: { width: '100%', height: '100%' },
  word: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  dot: { color: COLORS.primary },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
})
