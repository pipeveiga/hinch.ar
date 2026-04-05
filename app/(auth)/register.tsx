import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native'
import { router, Link } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

export default function RegisterScreen() {
  const [step, setStep]         = useState<1 | 2>(1)
  const [fullName, setFullName] = useState('')
  const [phone,    setPhone]    = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const { signUp, isLoading }   = useAuthStore()

  const handleNext = () => {
    if (!fullName.trim()) {
      Alert.alert('Falta el nombre', 'Poné tu nombre completo para continuar.')
      return
    }
    setStep(2)
  }

  const handleRegister = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Completá el email y la contraseña.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Contraseña muy corta', 'Usá al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      Alert.alert('Las contraseñas no coinciden', 'Revisá que sean iguales.')
      return
    }
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim())
      router.replace('/(tabs)')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse'
      Alert.alert('Error', msg)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>⚽ hinch.ar</Text>
          <Text style={styles.tagline}>Compartí el viaje, viví el partido.</Text>
        </View>

        {/* Step indicator */}
        <View style={styles.steps}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, step >= s && styles.stepDotActive]}
            />
          ))}
        </View>

        {/* PASO 1: Nombre */}
        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.title}>¿Cómo te llamás?</Text>
            <Text style={styles.subtitle}>
              Tu nombre va a aparecer en tus viajes y reservas.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan Pérez"
                placeholderTextColor={COLORS.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Teléfono (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+54 9 11 1234-5678"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.btnText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PASO 2: Credenciales */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.title}>Creá tu cuenta</Text>
            <Text style={styles.subtitle}>
              Usá un email real — te lo vamos a pedir para verificar tu identidad.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="vos@ejemplo.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Repetir contraseña</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Igual que la anterior"
                  placeholderTextColor={COLORS.textMuted}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showConfirm}
                />
                <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backBtnText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Iniciá sesión</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.terms}>
          Al registrarte aceptás nuestros Términos de Uso y Política de Privacidad.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -1 },
  tagline: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs },
  steps: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginBottom: SPACING.xl },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  stepDotActive: { backgroundColor: COLORS.primary, width: 24 },
  form: { gap: SPACING.md },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  field: { gap: SPACING.xs },
  label: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  inputFlex: {
    flex: 1, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 16,
  },
  eyeBtn: { paddingHorizontal: SPACING.md },
  eyeIcon: { fontSize: 18 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 16,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  backBtn: { alignItems: 'center', padding: SPACING.sm },
  backBtnText: { color: COLORS.textSecondary, fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  footerLink: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
  terms: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: SPACING.md },
})
