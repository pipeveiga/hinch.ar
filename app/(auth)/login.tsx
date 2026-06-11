import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Pressable, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router, Link } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/constants'
import { FadeInUp } from '@/components/FadeInUp'
import { ScalePress } from '@/components/ScalePress'

export default function LoginScreen() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [focused,     setFocused]     = useState<'email' | 'pass' | null>(null)
  const { signIn, isLoading }         = useAuthStore()

  const showError = (msg: string) => {
    if (Platform.OS === 'web') {
      setErrorMsg(msg)
    } else {
      Alert.alert('Error', msg)
    }
  }

  const handleLogin = async () => {
    setErrorMsg(null)
    if (!email.trim() || !password) {
      showError('Completá el email y la contraseña.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError('Ingresá un email válido.')
      return
    }
    try {
      await signIn(email.trim().toLowerCase(), password)
      router.replace('/(tabs)')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      showError(msg === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos. Revisá y volvé a intentar.'
        : msg
      )
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      {/* Fondo vivo: manchas de color suaves detrás de todo */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, styles.blobTop]} />
        <View style={[styles.blob, styles.blobBottom]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <FadeInUp delay={0}>
            <View style={styles.header}>
              <View style={styles.logoTile}>
                <Image source={require('@/assets/icon.png')} style={styles.logoImg} />
              </View>
              <Text style={styles.logo}>
                hinch<Text style={styles.logoDot}>.</Text>ar
              </Text>
              <Text style={styles.tagline}>Compartí el viaje, viví el partido.</Text>
            </View>
          </FadeInUp>

          {/* Form en tarjeta flotante */}
          <FadeInUp delay={90}>
            <View style={styles.formCard}>
              <Text style={styles.title}>Iniciar sesión</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, focused === 'email' && styles.inputFocused]}
                  placeholder="vos@ejemplo.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={[styles.inputRow, focused === 'pass' && styles.inputFocused]}>
                  <TextInput
                    style={styles.inputFlex}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    secureTextEntry={!showPass}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    textContentType="password"
                  />
                  <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </View>

              {errorMsg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <ScalePress onPress={handleLogin} disabled={isLoading}>
                <LinearGradient
                  colors={[COLORS.primaryLight, COLORS.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[styles.btn, isLoading && styles.btnDisabled]}
                >
                  <Text style={styles.btnText}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Text>
                </LinearGradient>
              </ScalePress>

              <Link href="/(auth)/recuperar" asChild>
                <TouchableOpacity style={styles.forgot}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </FadeInUp>

          {/* Footer */}
          <FadeInUp delay={180}>
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿No tenés cuenta? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Registrate</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </FadeInUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Manchas de color de fondo (versión nativa de los blobs de la landing)
  blob: {
    position: 'absolute',
    borderRadius: RADIUS.full,
    opacity: 0.55,
  },
  blobTop: {
    width: 420, height: 420,
    top: -160, left: -120,
    backgroundColor: COLORS.brandTint,
  },
  blobBottom: {
    width: 360, height: 360,
    bottom: -140, right: -120,
    backgroundColor: '#E8F6FF',
  },

  container: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoTile: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.floating,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  logoDot: {
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  // Tarjeta del formulario
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassEdge,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  field: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: 'transparent',
    borderRadius: RADIUS.md,
  },
  inputFocused: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.card,
  },
  inputFlex: {
    flex: 1, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 16,
  },
  eyeBtn: { paddingHorizontal: SPACING.md },
  eyeIcon: { fontSize: 18 },
  btn: {
    borderRadius: RADIUS.full,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.button,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  forgot: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  forgotText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
})
