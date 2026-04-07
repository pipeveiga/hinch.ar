import { create } from 'zustand'
import { messagesApi } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ChatsState {
  unreadByBooking: Record<string, number>
  totalUnread: number
  channel: RealtimeChannel | null
  fetch: (userId: string, bookingIds: string[]) => Promise<void>
  markBookingRead: (bookingId: string) => void
  incrementBooking: (bookingId: string) => void
  subscribe: (userId: string, bookingIds: string[]) => void
  unsubscribe: () => void
}

export const useChatsStore = create<ChatsState>((set, get) => ({
  unreadByBooking: {},
  totalUnread: 0,
  channel: null,

  fetch: async (userId, bookingIds) => {
    const counts = await messagesApi.getUnreadCounts(userId, bookingIds)
    const total  = Object.values(counts).reduce((s, n) => s + n, 0)
    set({ unreadByBooking: counts, totalUnread: total })
  },

  markBookingRead: (bookingId) => {
    set((state) => {
      const prev   = state.unreadByBooking[bookingId] ?? 0
      const counts = { ...state.unreadByBooking, [bookingId]: 0 }
      return { unreadByBooking: counts, totalUnread: Math.max(0, state.totalUnread - prev) }
    })
  },

  incrementBooking: (bookingId) => {
    set((state) => {
      const counts = { ...state.unreadByBooking, [bookingId]: (state.unreadByBooking[bookingId] ?? 0) + 1 }
      return { unreadByBooking: counts, totalUnread: state.totalUnread + 1 }
    })
  },

  subscribe: (userId, bookingIds) => {
    if (get().channel || !bookingIds.length) return
    const channel = messagesApi.subscribeToUserMessages(bookingIds, userId, (bookingId) => {
      get().incrementBooking(bookingId)
    })
    set({ channel })
  },

  unsubscribe: () => {
    const { channel } = get()
    if (channel) {
      channel.unsubscribe()
      set({ channel: null })
    }
  },
}))
