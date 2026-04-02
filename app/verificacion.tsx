import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image, ScrollView,
} from 'react-native'
import { router, Stack } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '@/stores/authStore'
import { verificationApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

type PhotoKey = 'dni_front' | 'dni_back' | 'selfie'

interface PhotoStep {
  key:         PhotoKey
  title:       string
  description: string
  icon:        string
}

const STEPS: PhotoStep[] = [
  {
    key:         'dni_front',
    title:       'Frente del DNI',
    description: 'Sacá una foto clara del frente de tu DNI. Asegurate que se vean bien tu nombre y número.',
    icon:        '🪪',
  },
  {
    key:         'dni_back',
    title:       'Dorso del DNI',
    description: 'Ahora el dorso. Que se vea el código de barras y toda la info.',
    icon:        '🔄',
  },
  {
    key:         'selfie',
    title:       'Selfie con DNI',
    description: 'Sacate una selfie sosteniendo tu DNI al lado de tu cara. Tiene que verse tu cara y el DNI claramente.',
    icon:        '🤳',
  },
]

export default function VerificacionScreen() {
  const { user, setUser } = useAuthStore()
  const [photos, setPhotos]   = useState<Partial<Record<PhotoKey, string>>>({})
  const [loading, setLoading] = useState<PhotoKey | 'submit' | null>(null)

  const pickPhoto = async (key: PhotoKey) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar las fotos.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.8,
      allowsEditing: true,
      aspect:     key === 'selfie' ? [1, 1] : [3, 2],
    })

    if (!result.canceled && result.assets[0]) {
      setPhotos((p) => ({ ...p, [key]: result.assets[0].uri }))
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!photos.dni_front || !photos.dni_back || !photos.selfie) {
      Alert.alert('Faltan fotos', 'Necesitás subir las 3 fotos para continuar.')
      return
    }

    setLoading('submit')
    try {
      await verificationApi.uploadPhoto(user.id, 'dni_front', photos.dni_front)
      await verificationApi.uploadPhoto(user.id, 'dni_back',  photos.dni_back)
      await verificationApi.uploadPhoto(user.id, 'selfie',    photos.selfie)
      await verificationApi.submit(user.id)

      setUser({ ...user, verification_status: 'pending', verification_submitted_at: new Date().toISOString() })

      Alert.alert(
        '¡Solicitud enviada! 🎉',
        'Vamos a revisar tus fotos en las próximas 24hs. Te avisamos cuando esté aprobado.',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch {
      Alert.alert('Error', 'No se pudieron subir las fotos. Intentá de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  const allDone = photos.dni_front && photos.dni_back && photos.selfie

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:     true,
          headerTitle:     'Verificar identidad',
          headerStyle:     { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.introIcon}>🔒</Text>
          <Text style={styles.introTitle}>Verificación de identidad</Text>
          <Text style={styles.introText}>
            Para que todos estén seguros, verificamos tu identidad con tu DNI.
            Tus fotos se guardan de forma encriptada y solo las usamos para este proceso.
          </Text>
        </View>

        {/* Pasos */}
        {STEPS.map((step, i) => {
          const photo     = photos[step.key]
          const isLoading = loading === step.key

          return (
            <View key={step.key} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, photo && styles.stepNumberDone]}>
                  <Text style={styles.stepNumberText}>
                    {photo ? '✓' : i + 1}
                  </Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.icon} {step.title}</Text>
                  <Text style={styles.stepDesc}>{step.description}</Text>
                </View>
              </View>

              {photo ? (
                <View style={styles.photoPreview}>
                  <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => pickPhoto(step.key)}
                  >
                    <Text style={styles.retakeBtnText}>Sacar de nuevo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.cameraBtn, isLoading && { opacity: 0.6 }]}
                  onPress={() => pickPhoto(step.key)}
                  disabled={!!loading}
                >
                  {isLoading
                    ? <ActivityIndicator color={COLORS.primary} />
                    : <Text style={styles.cameraBtnText}>📷 Tomar foto</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          )
        })}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Al enviar, aceptás que hinch.ar procese tus datos personales con fines de verificación de identidad.
        </Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!allDone || loading === 'submit') && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!allDone || !!loading}
          activeOpacity={0.85}
        >
          {loading === 'submit'
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitBtnText}>
                {allDone ? '✓ Enviar verificación' : `Faltan ${3 - Object.keys(photos).length} foto${3 - Object.keys(photos).length !== 1 ? 's' : ''}`}
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },

  intro: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  introIcon:  { fontSize: 40 },
  introTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  introText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  stepCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.md,
  },
  stepHeader: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  stepNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  stepNumberDone:   { backgroundColor: COLORS.primary },
  stepNumberText:   { fontSize: 14, fontWeight: '800', color: COLORS.white },
  stepInfo:         { flex: 1, gap: 4 },
  stepTitle:        { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  stepDesc:         { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },

  cameraBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed',
    padding: SPACING.md, alignItems: 'center',
  },
  cameraBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },

  photoPreview:  { gap: SPACING.sm },
  photo: {
    width: '100%', height: 180, borderRadius: RADIUS.md,
  },
  retakeBtn: { alignItems: 'center', padding: SPACING.xs },
  retakeBtnText: { color: COLORS.textMuted, fontSize: 13, textDecorationLine: 'underline' },

  disclaimer: {
    fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 17,
  },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
})
