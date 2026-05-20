import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS, SPACING } from '@/lib/constants'

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
  const { width } = useWindowDimensions()
  const [currentIndex, setCurrentIndex] = useState(0)

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true')
    router.replace('/(auth)/login')
  }

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      finish()
    }
  }

  const isLast = currentIndex === SLIDES.length - 1
  const slide  = SLIDES[currentIndex]

  return (
    <View style={styles.container}>
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.6}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      )}

      {/* Slide actual */}
      <View style={styles.slide}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { width: i === currentIndex ? 24 : 8, opacity: i === currentIndex ? 1 : 0.3 },
            ]}
          />
        ))}
      </View>

      {/* Botón */}
      <TouchableOpacity
        style={[styles.btn, { width: width - SPACING.lg * 2 }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>
          {isLast ? 'Empezar →' : 'Siguiente →'}
        </Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
        <TouchableOpacity onPress={finish}>
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
