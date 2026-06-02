import { useState, useEffect } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { COLORS } from '@/lib/constants'

interface UserAvatarProps {
  uri?:  string | null
  name:  string
  size?: number
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Paleta de colores para avatares sin foto (determinista según nombre)
const AVATAR_COLORS = [
  '#1D4ED8', '#7C3AED', '#DB2777', '#059669',
  '#D97706', '#DC2626', '#0891B2', '#65A30D',
]

function getAvatarColor(name: string): string {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export function UserAvatar({ uri, name, size = 40 }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)
  // Resetear error cuando cambia la URI
  useEffect(() => { setImgError(false) }, [uri])
  const initials = getInitials(name)
  const bgColor  = getAvatarColor(name)
  const fontSize = size * 0.36

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    )
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.card,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.white,
    fontWeight: '800',
  },
})
