// Panel de admin de eventos. Solo accesible para usuarios con users.is_admin = TRUE
// (validado tanto por RLS en el server como por chequeo local acá).
//
// Acciones:
//   • Ver todos los eventos (activos e inactivos), ordenados por fecha.
//   • Crear evento manual.
//   • Editar cualquier evento (incluidos los que llegaron por sync).
//   • Toggle is_featured (destacado en el home).
//   • "Borrar" (soft delete: is_active = false).
//
// Un evento editado desde acá queda con source = 'manual' aunque haya venido por
// sync originalmente — al no cambiar source explícitamente, sigue como estaba;
// pero el UPDATE del sync respeta cualquier fila con source='manual' así que si
// querés "congelarla" contra el bot, el flag ya está.
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native'
import { router, Stack } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '@/stores/authStore'
import { eventsApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS, EVENT_TYPE_LABELS } from '@/lib/constants'
import { Icon } from '@/components/Icon'
import { GradientButton } from '@/components/GradientButton'
import type { Event, EventType, NewEventForm } from '@/lib/types'

const EMPTY_FORM: NewEventForm = {
  type:           'partido',
  title:          '',
  subtitle:       '',
  venue_name:     '',
  venue_address: '',
  venue_city:     'Buenos Aires',
  venue_province: 'Buenos Aires',
  event_date:     '',
  image_url:      '',
  home_team:      '',
  away_team:      '',
  competition:    '',
  artist:         '',
  genre:          '',
  tags:           [],
  is_featured:    false,
}

function toForm(e: Event): NewEventForm {
  return {
    type:           e.type,
    title:          e.title,
    subtitle:       e.subtitle ?? '',
    venue_name:     e.venue_name,
    venue_address:  e.venue_address,
    venue_city:     e.venue_city,
    venue_province: e.venue_province,
    event_date:     e.event_date,
    image_url:      e.image_url ?? '',
    home_team:      e.home_team ?? '',
    away_team:      e.away_team ?? '',
    competition:    e.competition ?? '',
    artist:         e.artist ?? '',
    genre:          e.genre ?? '',
    tags:           e.tags ?? [],
    is_featured:    e.is_featured,
  }
}

export default function AdminScreen() {
  const { user } = useAuthStore()
  const [events, setEvents]     = useState<Event[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Event | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm]         = useState<NewEventForm>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)

  const isAdmin = user?.is_admin === true

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await eventsApi.listAll()
      setEvents(list)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudieron cargar los eventos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    load()
  }, [isAdmin, load])

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Icon name="shield" size={48} color={COLORS.textMuted} strokeWidth={1.5} />
        <Text style={styles.deniedTitle}>Acceso restringido</Text>
        <Text style={styles.deniedBody}>Esta pantalla es solo para administradores.</Text>
        <TouchableOpacity style={styles.deniedBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.deniedBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, event_date: new Date().toISOString() })
    setCreating(true)
  }

  const openEdit = (e: Event) => {
    setEditing(e)
    setForm(toForm(e))
  }

  const closeModal = () => {
    setCreating(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const validate = (f: NewEventForm): string | null => {
    if (!f.title.trim()) return 'Falta el título'
    if (!f.venue_name.trim()) return 'Falta el nombre del venue/estadio'
    if (!f.venue_address.trim()) return 'Falta la dirección'
    if (!f.venue_city.trim()) return 'Falta la ciudad'
    if (!f.event_date) return 'Falta la fecha'
    if (isNaN(new Date(f.event_date).getTime())) return 'La fecha no tiene formato válido'
    return null
  }

  const handleSave = async () => {
    const err = validate(form)
    if (err) { Alert.alert('Revisá el formulario', err); return }

    setSaving(true)
    try {
      const patch: NewEventForm = {
        ...form,
        subtitle:      form.subtitle?.trim() || undefined,
        image_url:     form.image_url?.trim() || undefined,
        home_team:     form.home_team?.trim() || undefined,
        away_team:     form.away_team?.trim() || undefined,
        competition:   form.competition?.trim() || undefined,
        artist:        form.artist?.trim() || undefined,
        genre:         form.genre?.trim() || undefined,
      }
      if (editing) {
        await eventsApi.update(editing.id, patch)
      } else {
        await eventsApi.create(patch)
      }
      closeModal()
      await load()
    } catch (err2) {
      Alert.alert('Error al guardar', err2 instanceof Error ? err2.message : String(err2))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFeatured = async (e: Event) => {
    try {
      await eventsApi.toggleFeatured(e.id, !e.is_featured)
      setEvents((list) => list.map((x) => x.id === e.id ? { ...x, is_featured: !x.is_featured } : x))
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = (e: Event) => {
    Alert.alert(
      'Ocultar evento',
      `"${e.title}" no va a aparecer más en la app hasta que lo reactives desde el admin. ¿Seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar', style: 'destructive', onPress: async () => {
            try {
              await eventsApi.remove(e.id)
              await load()
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : String(err))
            }
          },
        },
      ],
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown:     true,
          headerTitle:     'Admin — Eventos',
          headerStyle:     { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
        }}
      />

      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.count}>
            {events.length} eventos · {events.filter((e) => e.is_active).length} activos
          </Text>
          <TouchableOpacity style={styles.newBtn} onPress={openCreate}>
            <Icon name="plus" size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.newBtnText}>Nuevo</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {events.map((e) => (
              <View
                key={e.id}
                style={[styles.card, !e.is_active && styles.cardInactive]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardType}>{EVENT_TYPE_LABELS[e.type]}</Text>
                  {e.source !== 'manual' && (
                    <Text style={styles.sourceTag}>· {e.source}</Text>
                  )}
                  {!e.is_active && <Text style={styles.inactiveTag}>· oculto</Text>}
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{e.title}</Text>
                <Text style={styles.cardMeta}>
                  {format(new Date(e.event_date), "EEE d LLL, HH:mm", { locale: es })}
                  {'  ·  '}{e.venue_city}
                </Text>
                <Text style={styles.cardVenue} numberOfLines={1}>{e.venue_name}</Text>

                <View style={styles.cardActions}>
                  <View style={styles.featuredRow}>
                    <Text style={styles.featuredLabel}>Destacado</Text>
                    <Switch
                      value={e.is_featured}
                      onValueChange={() => handleToggleFeatured(e)}
                      trackColor={{ true: COLORS.accent + '80', false: COLORS.border }}
                      thumbColor={e.is_featured ? COLORS.accent : COLORS.textMuted}
                    />
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(e)}>
                    <Icon name="edit" size={14} color={COLORS.primary} strokeWidth={1.9} />
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  {e.is_active && (
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(e)}>
                      <Icon name="x" size={14} color={COLORS.error} strokeWidth={1.9} />
                      <Text style={styles.delBtnText}>Ocultar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {events.length === 0 && (
              <Text style={styles.empty}>No hay eventos todavía. Creá el primero con "Nuevo".</Text>
            )}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={creating || editing !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modal}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editing ? 'Editar evento' : 'Nuevo evento'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            <FormRow label="Tipo">
              <View style={styles.typeSelector}>
                {(['partido', 'recital', 'otro'] as EventType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                    onPress={() => setForm((f) => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                      {EVENT_TYPE_LABELS[t]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormRow>

            <FormInput
              label="Título" required
              value={form.title}
              onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              placeholder="Boca vs River — Superclásico"
            />
            <FormInput
              label="Subtítulo (opcional)"
              value={form.subtitle ?? ''}
              onChangeText={(t) => setForm((f) => ({ ...f, subtitle: t }))}
              placeholder="Copa de la Liga — Fecha 12"
            />

            <FormInput
              label="Fecha y hora" required
              value={form.event_date}
              onChangeText={(t) => setForm((f) => ({ ...f, event_date: t }))}
              placeholder="2026-07-15T21:00:00-03:00"
              helper="Formato ISO. Ejemplo: 2026-07-15T21:00:00-03:00"
            />

            <FormInput
              label="Estadio / Venue" required
              value={form.venue_name}
              onChangeText={(t) => setForm((f) => ({ ...f, venue_name: t }))}
              placeholder="La Bombonera"
            />
            <FormInput
              label="Dirección" required
              value={form.venue_address}
              onChangeText={(t) => setForm((f) => ({ ...f, venue_address: t }))}
              placeholder="Brandsen 805"
            />
            <FormInput
              label="Ciudad" required
              value={form.venue_city}
              onChangeText={(t) => setForm((f) => ({ ...f, venue_city: t }))}
              placeholder="Buenos Aires"
            />
            <FormInput
              label="Provincia"
              value={form.venue_province}
              onChangeText={(t) => setForm((f) => ({ ...f, venue_province: t }))}
            />

            {form.type === 'partido' && (
              <>
                <FormInput
                  label="Local"
                  value={form.home_team ?? ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, home_team: t }))}
                  placeholder="Boca Juniors"
                />
                <FormInput
                  label="Visitante"
                  value={form.away_team ?? ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, away_team: t }))}
                  placeholder="River Plate"
                />
                <FormInput
                  label="Competencia"
                  value={form.competition ?? ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, competition: t }))}
                  placeholder="Liga Profesional"
                />
              </>
            )}

            {form.type === 'recital' && (
              <>
                <FormInput
                  label="Artista"
                  value={form.artist ?? ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, artist: t }))}
                  placeholder="Tan Biónica"
                />
                <FormInput
                  label="Género"
                  value={form.genre ?? ''}
                  onChangeText={(t) => setForm((f) => ({ ...f, genre: t }))}
                  placeholder="Rock"
                />
              </>
            )}

            <FormInput
              label="URL de la imagen (opcional)"
              value={form.image_url ?? ''}
              onChangeText={(t) => setForm((f) => ({ ...f, image_url: t }))}
              placeholder="https://..."
            />

            <FormRow label="Destacado">
              <Switch
                value={form.is_featured}
                onValueChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                trackColor={{ true: COLORS.accent + '80', false: COLORS.border }}
                thumbColor={form.is_featured ? COLORS.accent : COLORS.textMuted}
              />
            </FormRow>

            <GradientButton
              label={saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear evento')}
              onPress={handleSave}
              disabled={saving}
              style={{ marginTop: SPACING.md }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
    </View>
  )
}

function FormInput({
  label, value, onChangeText, placeholder, required, helper,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder?: string
  required?: boolean
  helper?: string
}) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>
        {label}{required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
      />
      {helper && <Text style={styles.formHelper}>{helper}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.md,
    backgroundColor: COLORS.background,
  },
  deniedTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  deniedBody:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  deniedBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  deniedBtnText: { color: '#FFFFFF', fontWeight: '700' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  count: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  list: { padding: SPACING.md, gap: SPACING.md },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  cardInactive: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardType: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  sourceTag: { fontSize: 11, color: COLORS.textMuted, marginLeft: 4 },
  inactiveTag: { fontSize: 11, color: COLORS.error, marginLeft: 4, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  cardMeta:  { fontSize: 12, color: COLORS.textSecondary },
  cardVenue: { fontSize: 12, color: COLORS.textMuted },
  cardActions: {
    marginTop: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 140 },
  featuredLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary + '18', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  delBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.error + '18', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  delBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  empty: {
    textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl,
  },

  modal: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  modalCancel: { fontSize: 14, color: COLORS.primary, fontWeight: '700', width: 60 },
  formContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  formRow: { gap: 6 },
  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: {
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: 14,
  },
  formHelper: { fontSize: 11, color: COLORS.textMuted },
  required: { color: COLORS.error },
  typeSelector: { flexDirection: 'row', gap: SPACING.sm },
  typeChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full, backgroundColor: COLORS.cardElevated,
    borderWidth: 1, borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText:  { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  typeChipTextActive: { color: '#FFFFFF' },
})
