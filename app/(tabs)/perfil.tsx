import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
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
  const { user, signOut } = useAuthStore()

  if (!user) return null

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => {
        signOut()
        router.replace('/(auth)/login')
      }},
    ])
  }

  const driverRating   = user.avg_rating_as_driver.toFixed(1)
  const passengerRating = user.avg_rating_as_passenger.toFixed(1)

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header del perfil */}
      <View style={styles.profileHeader}>
        <UserAvatar uri={user.avatar_url} name={user.full_name} size={80} />

        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.full_name}</Text>
          <VerificationBadge verified={user.is_verified} />
        </View>

        {user.bio && (
          <Text style={styles.bio}>{user.bio}</Text>
        )}

        {/* Stats */}
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

      {/* Auto (si aplica) */}
      {user.has_car && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi auto</Text>
          <View style={styles.carCard}>
            <Text style={styles.carEmoji}>🚗</Text>
            <View style={styles.carInfo}>
              <Text style={styles.carName}>
                {user.car_brand} {user.car_model} {user.car_year}
              </Text>
              <Text style={styles.carDetail}>
                {user.car_color} · Patente: {user.car_plate ?? 'Sin cargar'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Menú */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="✏️"
            label="Editar perfil"
            onPress={() => Alert.alert('Próximamente', 'Esta función viene en la v0.2')}
          />
          {!user.has_car && (
            <MenuItem
              icon="🚗"
              label="Registrar mi auto"
              onPress={() => Alert.alert('Próximamente', 'Esta función viene en la v0.2')}
            />
          )}
          <MenuItem
            icon="🪪"
            label={user.is_verified ? '✅ Identidad verificada' : 'Verificar identidad'}
            onPress={() => {
              if (user.is_verified) return
              Alert.alert('Verificación', 'Te vamos a pedir foto del DNI y selfie para verificar tu identidad.')
            }}
          />
          <MenuItem
            icon="🔔"
            label="Notificaciones"
            onPress={() => Alert.alert('Próximamente', 'Esta función viene en la v0.2')}
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
          <MenuItem
            icon="🚪"
            label="Cerrar sesión"
            onPress={handleSignOut}
            danger
          />
        </View>
      </View>

      <Text style={styles.version}>hinch.ar v0.1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
})
