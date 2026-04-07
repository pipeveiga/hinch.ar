import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Dimensions, Animated,
} from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS, SPACING } from '@/lib/constants'

const { width, height } = Dimensions.get('window')

const SLIDES = [
  {
    key:       '1',
    icon:      '🏟️',
    title:     'Llegá al partido\nsin complicaciones',
    subtitle:  'Encontrá gente que viaja al mismo evento y compartí los gastos. Simple, seguro y económico.',
  },
  {
    key:       '2',
    icon:      '🚗',
    title:     'Publicá o reservá\nun lugar',
    subtitle:  'Si tenés auto, publicá tu viaje y sumá pasajeros. Si no, reservá un lugar en segundos.',
  },
  {
    key:       '3',
    icon:      '🎽',
    title:     'Viajá con\ngente como vos',
    subtitle:  'Una comunidad de hinchas argentinos. Verificamos la identidad de cada usuario para que viajes tranquilo.',
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
    } else {
      await AsyncStorage.setItem('onboarding_done', 'true')
      router.replace('/(auth)/login')
    }
  }

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true')
    router.replace('/(auth)/login')
  }

  const isLast = currentIndex === SLIDES.length - 1

  return (
    <View style={styles.container}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.6}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          })
          const w = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          })
          return (
            <Animated.View key={i} style={[styles.dot, { opacity, width: w }]} />
          )
        })}
      </View>

      {/* Botón */}
      <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.btnText}>
          {isLast ? 'Empezar →' : 'Siguiente →'}
        </Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.footerLink}>Iniciá sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.md,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl + SPACING.lg,
    gap: SPACING.lg,
  },
  icon: {
    fontSize: 90,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    width: width - SPACING.lg * 2,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
  },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  footerLink: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
})
