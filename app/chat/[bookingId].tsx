import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useChatsStore } from '@/stores/chatsStore'
import { messagesApi, bookingsApi } from '@/lib/supabase'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import type { Message, Booking } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const { user } = useAuthStore()

  const [messages, setMessages] = useState<Message[]>([])
  const [booking, setBooking] = useState<Booking | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const markBookingRead = useChatsStore((s) => s.markBookingRead)

  const flatListRef = useRef<FlatList>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Nombre e ID del otro participante
  const isPassenger = user?.id === booking?.passenger_id
  const otherName = booking
    ? isPassenger
      ? booking.trip?.driver?.full_name ?? 'Conductor'
      : booking.passenger?.full_name ?? 'Pasajero'
    : '...'
  const otherId = booking
    ? isPassenger
      ? (booking.trip as any)?.driver_id ?? booking.trip?.driver?.id
      : booking.passenger_id
    : null

  useEffect(() => {
    if (!bookingId || !user) return
    load()
    return () => { channelRef.current?.unsubscribe() }
  }, [bookingId, user])

  const load = async () => {
    setLoading(true)
    try {
      const [msgs, bk] = await Promise.all([
        messagesApi.getMessages(bookingId),
        bookingsApi.getById(bookingId),
      ])
      setMessages(msgs)
      setBooking(bk)
      await messagesApi.markRead(bookingId, user!.id)
      markBookingRead(bookingId)

      // Suscripción real-time
      channelRef.current = messagesApi.subscribeToMessages(bookingId, (m) => {
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m])
        if (m.sender_id !== user!.id) {
          messagesApi.markRead(bookingId, user!.id)
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || !user || sending) return
    setSending(true)
    setText('')
    try {
      await messagesApi.send(bookingId, user.id, trimmed, otherId ?? undefined, user.full_name)
      // el real-time subscription agrega el mensaje, evitando duplicados
    } finally {
      setSending(false)
    }
  }, [text, user, sending, bookingId])

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {item.content}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
          {new Date(item.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => otherId && router.push(`/usuario/${otherId}`)}
          activeOpacity={otherId ? 0.7 : 1}
        >
          <Text style={styles.headerName} numberOfLines={1}>{otherName} {otherId ? '›' : ''}</Text>
          {booking?.trip?.event?.title ? (
            <Text style={styles.headerSub} numberOfLines={1}>{booking.trip.event.title}</Text>
          ) : null}
        </TouchableOpacity>
        <View style={{ width: 70 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={[...messages].reverse()}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.list}
            inverted
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>Mandá el primer mensaje</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribí un mensaje..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={1000}
            returnKeyType="default"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            {sending
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Text style={styles.sendIcon}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:    { width: 70 },
  backText:   { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  headerSub:  { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 60 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  bubble: {
    maxWidth: '80%', borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  bubbleMe:   { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: COLORS.card, borderBottomLeftRadius: 4 },

  bubbleText:     { fontSize: 15, lineHeight: 20 },
  bubbleTextMe:   { color: COLORS.textPrimary },
  bubbleTextThem: { color: COLORS.textPrimary },

  bubbleTime:     { fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  bubbleTimeMe:   { color: 'rgba(255,255,255,0.55)' },
  bubbleTimeThem: { color: COLORS.textMuted },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    color: COLORS.textPrimary, fontSize: 15, maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
})
