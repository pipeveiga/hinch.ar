import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { usersApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { UserAvatar } from '@/components/UserAvatar'
import { VerificationBadge } from '@/components/VerificationBadge'

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function MenuItem({ icon, label, onPress, danger }: {
  icon: string; label: string; onPress: () => void; danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function PerfilScreen() {
  const { user, setUser, signOut } = useAuthStore()
  const [autoModal, setAutoModal]         = useState(false)
  const [editModal, setEditModal]         = useState(false)
  const [deleteModal, setDeleteModal]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saving, setSaving]               = useState(false)
  const [editSaving, setEditSaving]       = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: user?.full_name ?? '',
    bio:       user?.bio       ?? '',
    phone:     user?.phone     ?? '',
  })
  const [carForm, setCarForm] = useState({
    car_brand: user?.car_brand ?? '',
    car_model: user?.car_model ?? '',
    car_year:  user?.car_year?.toString() ?? '',
    car_color: user?.car_color ?? '',
    car_plate: user?.car_plate ?? '',
  })

  const handlePickAvatar = async () => {
    if (Platform.OS === 'web') {
      // En web usar file input nativo
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0]
        if (!file) return
        setAvatarLoading(true)
        try {
          const uri = URL.createObjectURL(file)
          const url = await usersApi.uploadAvatar(user!.id, uri)
          await usersApi.updateProfile(user!.id, { avatar_url: url })
          setUser({ ...user!, avatar_url: url })
        } catch (err: any) {
          Alert.alert('Error', err?.message ?? 'No se pudo subir la foto.')
        } finally {
          setAvatarLoading(false)
        }
      }
      input.click()
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled) return
    setAvatarLoading(true)
    try {
      const uri = result.assets[0].uri
      const url = await usersApi.uploadAvatar(user!.id, uri)
      await usersApi.updateProfile(user!.id, { avatar_url: url })
      setUser({ ...user!, avatar_url: url })
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo subir la foto.')
    } finally {
      setAvatarLoading(false)
    }
  }

  if (!user) return null

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'ELIMINAR') return
    setDeleteLoading(true)
    try {
      await usersApi.updateProfile(user.id, { is_active: false } as any)
      await signOut()
      router.replace('/(auth)/login')
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la cuenta. Escribinos a hola@hinch.ar')
    } finally {
      setDeleteLoading(false)
      setDeleteModal(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => {
        signOut()
        router.replace('/(auth)/login')
      }},
    ])
  }

  const handleSaveEdit = async () => {
    if (!editForm.full_name.trim()) { Alert.alert('El nombre no puede estar vacío'); return }
    setEditSaving(true)
    try {
      await usersApi.updateProfile(user.id, {
        full_name: editForm.full_name.trim(),
        bio:       editForm.bio.trim()   || undefined,
        phone:     editForm.phone.trim() || undefined,
      })
      setUser({ ...user, full_name: editForm.full_name.trim(), bio: editForm.bio.trim(), phone: editForm.phone.trim() })
      setEditModal(false)
    } catch {
      Alert.alert('Error', 'No se pudo guardar el perfil')
    } finally {
      setEditSaving(false)
    }
  }

  const handleSaveAuto = async () => {
    if (!carForm.car_brand.trim()) { Alert.alert('Falta la marca del auto'); return }
    if (!carForm.car_model.trim()) { Alert.alert('Falta el modelo'); return }
    if (!carForm.car_year.trim())  { Alert.alert('Falta el año'); return }
    if (!carForm.car_color.trim()) { Alert.alert('Falta el color'); return }

    setSaving(true)
    try {
      await usersApi.updateProfile(user.id, {
        has_car:   true,
        car_brand: carForm.car_brand.trim(),
        car_model: carForm.car_model.trim(),
        car_year:  parseInt(carForm.car_year),
        car_color: carForm.car_color.trim(),
        car_plate: carForm.car_plate.trim() || undefined,
      })
      setUser({
        ...user,
        has_car:   true,
        car_brand: carForm.car_brand.trim(),
        car_model: carForm.car_model.trim(),
        car_year:  parseInt(carForm.car_year),
        car_color: carForm.car_color.trim(),
        car_plate: carForm.car_plate.trim() || undefined,
      })
      setAutoModal(false)
      Alert.alert('¡Auto registrado! 🚗', 'Ya podés publicar viajes.')
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el auto')
    } finally {
      setSaving(false)
    }
  }

  const driverRating   = user.avg_rating_as_driver.toFixed(1)
  const passengerRating = user.avg_rating_as_passenger.toFixed(1)

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header del perfil */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.avatarWrapper}>
            <UserAvatar uri={user.avatar_url} name={user.full_name} size={80} />
            {avatarLoading
              ? <View style={styles.avatarOverlay}><ActivityIndicator color="#fff" /></View>
              : <View style={styles.avatarOverlay}><Text style={styles.avatarCam}>📷</Text></View>
            }
          </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.full_name}</Text>
            <VerificationBadge verified={user.is_verified} />
          </View>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          <View style={styles.stats}>
            {user.total_trips_as_driver > 0 && (
              <StatBox value={`⭐ ${driverRating}`} label="Como conductor" />
            )}
            {user.total_trips_as_passenger > 0 && (
              <StatBox value={`⭐ ${passengerRating}`} label="Como pasajero" />
            )}
            <StatBox value={user.total_trips_as_driver + user.total_trips_as_passenger} label="Viajes totales" />
          </View>
        </View>

        {/* Auto */}
        {user.has_car && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mi auto</Text>
            <TouchableOpacity
              style={styles.carCard}
              onPress={() => setAutoModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.carEmoji}>🚗</Text>
              <View style={styles.carInfo}>
                <Text style={styles.carName}>
                  {user.car_brand} {user.car_model} {user.car_year}
                </Text>
                <Text style={styles.carDetail}>
                  {user.car_color} · {user.car_plate ?? 'Sin patente'}
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menú */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="✏️"
              label="Editar perfil"
              onPress={() => {
                setEditForm({ full_name: user.full_name, bio: user.bio ?? '', phone: user.phone ?? '' })
                setEditModal(true)
              }}
            />
            {!user.has_car && (
              <MenuItem
                icon="🚗"
                label="Registrar mi auto"
                onPress={() => setAutoModal(true)}
              />
            )}
            <MenuItem
              icon="🪪"
              label={
                user.is_verified ? '✅ Identidad verificada'
                : user.verification_status === 'pending' ? '⏳ Verificación pendiente'
                : 'Verificar identidad'
              }
              onPress={() => {
                if (user.is_verified || user.verification_status === 'pending') return
                router.push('/verificacion')
              }}
            />
            <MenuItem
              icon="❓"
              label="Ayuda y soporte"
              onPress={() => Alert.alert('Soporte', 'Escribinos a hola@hinch.ar')}
            />
          </View>
        </View>

        <View style={[styles.section, { marginBottom: SPACING.xxl }]}>
          <View style={styles.menuCard}>
            <MenuItem icon="🚪" label="Cerrar sesión" onPress={handleSignOut} danger />
          </View>
        </View>

        <Text style={styles.version}>hinch.ar v0.1.0</Text>
      </ScrollView>

      {/* Modal editar perfil */}
      <Modal visible={editModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            {[
              { key: 'full_name', label: 'Nombre completo', placeholder: 'Tu nombre' },
              { key: 'phone',     label: 'Teléfono',        placeholder: '+54 9 11 1234-5678' },
              { key: 'bio',       label: 'Bio',             placeholder: 'Contales algo sobre vos...' },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.modalField}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput
                  style={[styles.modalInput, key === 'bio' && { height: 80 }]}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={editForm[key as keyof typeof editForm]}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, [key]: v }))}
                  multiline={key === 'bio'}
                  keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                />
              </View>
            ))}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, editSaving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.saveBtnText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteAccountBtn}
              onPress={() => { setEditModal(false); setTimeout(() => { setDeleteConfirm(''); setDeleteModal(true) }, 300) }}
            >
              <Text style={styles.deleteAccountText}>Eliminar cuenta</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal eliminar cuenta */}
      <Modal visible={deleteModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>⚠️ Eliminar cuenta</Text>
            <Text style={styles.deleteWarning}>
              Esta acción es permanente. Se eliminarán todos tus datos, viajes y reservas. No se puede deshacer.
            </Text>
            <Text style={styles.deleteInstruction}>
              Para confirmar, escribí <Text style={styles.deleteWord}>ELIMINAR</Text> en el campo de abajo:
            </Text>
            <TextInput
              style={[styles.modalInput, styles.deleteInput]}
              placeholder="ELIMINAR"
              placeholderTextColor={COLORS.textMuted}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, (deleteConfirm !== 'ELIMINAR' || deleteLoading) && styles.deleteBtnDisabled]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirm !== 'ELIMINAR' || deleteLoading}
              >
                {deleteLoading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.deleteBtnText}>Eliminar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal registro de auto */}
      <Modal visible={autoModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {user.has_car ? 'Editar auto' : 'Registrar auto'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Necesitás un auto registrado para publicar viajes
            </Text>

            {[
              { key: 'car_brand', label: 'Marca', placeholder: 'Ej: Volkswagen' },
              { key: 'car_model', label: 'Modelo', placeholder: 'Ej: Gol Trend' },
              { key: 'car_year',  label: 'Año',    placeholder: 'Ej: 2019', numeric: true },
              { key: 'car_color', label: 'Color',  placeholder: 'Ej: Blanco' },
              { key: 'car_plate', label: 'Patente (opcional)', placeholder: 'Ej: AB 123 CD' },
            ].map(({ key, label, placeholder, numeric }) => (
              <View key={key} style={styles.modalField}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={carForm[key as keyof typeof carForm]}
                  onChangeText={(v) => setCarForm((f) => ({ ...f, [key]: v }))}
                  keyboardType={numeric ? 'numeric' : 'default'}
                />
              </View>
            ))}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAutoModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveAuto}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.saveBtnText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  avatarWrapper: { position: 'relative' },
  avatarOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCam: { fontSize: 13 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: SPACING.xxl + SPACING.md,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  bio: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  statBox: {
    alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm,
  },
  carCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  carEmoji: { fontSize: 28 },
  carInfo: { flex: 1 },
  carName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  carDetail: { fontSize: 13, color: COLORS.textSecondary },
  menuCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, gap: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuIcon: { fontSize: 18, width: 28 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  menuLabelDanger: { color: COLORS.error },
  menuChevron: { fontSize: 18, color: COLORS.textMuted },
  version: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 12, marginBottom: SPACING.xl,
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: -SPACING.xs },
  modalField: { gap: SPACING.xs },
  modalLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.textPrimary, fontSize: 15,
  },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: {
    flex: 1, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 2, padding: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  deleteWarning: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 20,
    backgroundColor: COLORS.errorBg, padding: SPACING.md, borderRadius: RADIUS.md,
  },
  deleteInstruction: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  deleteWord: { fontWeight: '800', color: COLORS.error },
  deleteInput: { borderColor: COLORS.error },
  deleteBtn: {
    flex: 2, padding: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.error, alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  deleteAccountText: { color: COLORS.error, fontSize: 13, fontWeight: '500' },
})
