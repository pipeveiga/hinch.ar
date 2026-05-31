import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, Link } from 'expo-router'
import * as Linking from 'expo-linking'
import { auth } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

// A dónde vuelve el link del mail. En web usamos el origin actual; en nativo el scheme.
function buildRedirectTo() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/restablecer`
  }
  return Linking.createURL('/restablecer')
}

export default function RecuperarScreen() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Ingresá un email válido.')
      return
    }
    setLoading(true)
    try {
      const { error: err } = await auth.resetPassword(value, buildRedirectTo())
      if (err) throw err
      // Siempre mostramos éxito, exista o no la cuenta (no filtrar qué emails están registrados)
      setSent(true)
    } catch {
      // Mismo motivo: no revelamos detalles. Mostramos el estado de "enviado".
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>⚽ hinch.ar</Text>
          </View>

          {sent ? (
            <View style={styles.form}>
              <Text style={styles.title}>Revisá tu mail</Text>
              <Text style={styles.help}>
                Si <Text style={styles.bold}>{email.trim().toLowerCase()}</Text> tiene una cuenta,
                te mandamos un link para restablecer tu contraseña. Puede tardar unos minutos;
                fijate también en spam.
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.8}>
                <Text style={styles.btnText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.help}>
                Ingresá tu email y te mandamos un link para crear una contraseña nueva.
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
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar link'}</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>Volver a iniciar sesión</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, padding: SPACING.lg, justifyContent: 'center' },
  header:    { alignItems: 'center', marginBottom: SPACING.xxl },
  logo:      { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -1 },
  form:      { gap: SPACING.md },
  title:     { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  help:      { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  bold:      { fontWeight: '700', color: COLORS.textPrimary },
  field:     { gap: SPACING.xs },
  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: 16,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  errorBox: {
    backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.error,
    borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  errorText:  { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  footerLink: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '600' },
})
