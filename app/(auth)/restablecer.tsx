import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import { auth, supabase } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

const MIN_PASSWORD = 8

// Extrae tokens del link de recuperación, ya sea del hash (#access_token=...)
// o del query (?code=...) según el flujo que use el proyecto de Supabase.
function parseAuthParams(url: string | null) {
  if (!url) return { accessToken: null, refreshToken: null, code: null, type: null }
  const hashPart  = url.includes('#') ? url.slice(url.indexOf('#') + 1) : ''
  const queryPart = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : ''
  const params = new URLSearchParams(`${queryPart}&${hashPart}`)
  return {
    accessToken:  params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code:         params.get('code'),
    type:         params.get('type'),
  }
}

export default function RestablecerScreen() {
  const [ready,    setReady]    = useState(false)
  const [valid,    setValid]    = useState(false)
  const [pass,     setPass]     = useState('')
  const [pass2,    setPass2]    = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [done,     setDone]     = useState(false)

  // Al montar, establecemos la sesión a partir del link de recuperación.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const url = Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.href
          : await Linking.getInitialURL()

        const { accessToken, refreshToken, code } = parseAuthParams(url)

        if (accessToken && refreshToken) {
          const { error: err } = await auth.setSession(accessToken, refreshToken)
          if (err) throw err
        } else if (code) {
          const { error: err } = await auth.exchangeCodeForSession(code)
          if (err) throw err
        }

        // Validamos que efectivamente haya una sesión activa para poder cambiar la clave.
        const { data } = await supabase.auth.getSession()
        if (active) setValid(!!data.session)
      } catch {
        if (active) setValid(false)
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => { active = false }
  }, [])

  const handleSave = async () => {
    setError(null)
    if (pass.length < MIN_PASSWORD) {
      setError(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (pass !== pass2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSaving(true)
    try {
      const { error: err } = await auth.updatePassword(pass)
      if (err) throw err
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  const renderBody = () => {
    if (!ready) {
      return <Text style={styles.help}>Verificando el link...</Text>
    }
    if (done) {
      return (
        <>
          <Text style={styles.title}>¡Listo!</Text>
          <Text style={styles.help}>Tu contraseña se actualizó. Ya podés iniciar sesión.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.8}>
            <Text style={styles.btnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </>
      )
    }
    if (!valid) {
      return (
        <>
          <Text style={styles.title}>Link inválido o vencido</Text>
          <Text style={styles.help}>
            El link de recuperación no es válido o ya expiró. Pedí uno nuevo desde la pantalla de inicio de sesión.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/recuperar')} activeOpacity={0.8}>
            <Text style={styles.btnText}>Pedir otro link</Text>
          </TouchableOpacity>
        </>
      )
    }
    return (
      <>
        <Text style={styles.title}>Nueva contraseña</Text>
        <Text style={styles.help}>Elegí una contraseña de al menos {MIN_PASSWORD} caracteres.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={pass}
              onChangeText={setPass}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Repetir contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            value={pass2}
            onChangeText={setPass2}
            secureTextEntry={!showPass}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            textContentType="newPassword"
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{saving ? 'Guardando...' : 'Guardar contraseña'}</Text>
        </TouchableOpacity>
      </>
    )
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
          <View style={styles.form}>{renderBody()}</View>
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
  field:     { gap: SPACING.xs },
  label:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md,
  },
  inputFlex: { flex: 1, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 16 },
  eyeBtn:    { paddingHorizontal: SPACING.md },
  eyeIcon:   { fontSize: 18 },
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
  errorText: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
})
