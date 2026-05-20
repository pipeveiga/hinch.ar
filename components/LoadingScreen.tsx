import { View, Text, ActivityIndicator, ImageBackground, StyleSheet } from 'react-native'
import { COLORS, SPACING } from '@/lib/constants'

export default function LoadingScreen() {
  return (
    <ImageBackground
      source={require('@/assets/loading-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.brand}>hinch.ar</Text>
        <ActivityIndicator size="large" color={COLORS.white} style={styles.spinner} />
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: SPACING.xl,
  },
  spinner: {
    transform: [{ scale: 1.2 }],
  },
})
