import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/constants'
import { Icon, type IconName } from '@/components/Icon'

interface Slide {
  key:      string
  icon:     IconName
  chips:    IconName[]
  title:    string
  subtitle: string
}

const SLIDES: Slide[] = [
  {
    key:      '1',
    icon:     'stadium',
    chips:    ['ball', 'music', 'ticket'],
    title:    'Llegá al partido\nsin complicaciones',
    subtitle: 'Encontrá gente que viaja al mismo evento y compartí los gastos. Simple, seguro y económico.',
  },
  {
    key:      '2',
    icon:     'car',
    chips:    ['pin', 'coins', 'people'],
    title:    'Publicá o reservá\nun lugar',
    subtitle: 'Si tenés auto, publicá tu viaje y sumá pasajeros. Si no, reservá un lugar en segundos.',
  },
  {
    key:      '3',
    icon:     'shield',
    chips:    ['id', 'star', 'chat'],
    title:    'Viajá con\ngente como vos',
    subtitle: 'Una comunidad de hinchas argentinos. Verificamos la identidad de cada usuario para que viajes tranquilo.',
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true')
    router.replace('/(auth)/login')
  }

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) setCurrentIndex(currentIndex + 1)
    else finish()
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
        {/* Ilustración: ícono principal en tile con gradiente + chips flotantes */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <LinearGradient
            colors={[COLORS.primaryLight, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroTile}
          >
            <Icon name={slide.icon} size={64} color={COLORS.white} strokeWidth={1.6} />
          </LinearGradient>

          {slide.chips.map((chip, i) => (
            <View
              key={chip}
              style={[
                styles.chip,
                i === 0 && styles.chipTopRight,
                i === 1 && styles.chipBottomLeft,
                i === 2 && styles.chipBottomRight,
              ]}
            >
              <Icon name={chip} size={20} color={COLORS.primary} strokeWidth={1.8} />
            </View>
          ))}
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Botón */}
      <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.btnWrap}>
        <LinearGradient
          colors={[COLORS.primaryLight, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>{isLast ? 'Empezar' : 'Siguiente'}</Text>
        </LinearGradient>
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
    paddingHorizontal: SPACING.lg,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.md,
  },
  skipText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    width: '100%',
  },

  // Ilustración
  hero: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  heroGlow: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.brandTint,
  },
  heroTile: {
    width: 116,
    height: 116,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  chip: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  chipTopRight:    { top: 8,  right: 10 },
  chipBottomLeft:  { bottom: 18, left: 4 },
  chipBottomRight: { bottom: 2,  right: 22 },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 360,
  },

  dots: { flexDirection: 'row', gap: 6, marginBottom: SPACING.xl },
  dot: { height: 8, borderRadius: 4 },
  dotActive:   { width: 24, backgroundColor: COLORS.primary },
  dotInactive: { width: 8,  backgroundColor: COLORS.borderLight },

  btnWrap: { width: '100%', marginBottom: SPACING.md },
  btn: {
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.button,
  },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },

  footer: { flexDirection: 'row' },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  footerLink: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '700' },
})
