import { create } from 'zustand'
import { notificationsApi } from '@/lib/supabase'
import type { AppNotification } from '@/lib/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationsState {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  channel: RealtimeChannel | null
  // actions
  fetch: (userId: string) => Promise<void>
  subscribe: (userId: string) => void
  unsubscribe: () => void
  markAllRead: (userId: string) => Promise<void>
  addNotification: (n: AppNotification) => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  channel: null,

  fetch: async (userId: string) => {
    set({ loading: true })
    try {
      const data = await notificationsApi.getUnread(userId)
      set({ notifications: data, unreadCount: data.length })
    } finally {
      set({ loading: false })
    }
  },

  subscribe: (userId: string) => {
    if (get().channel) return // ya suscripto
    const channel = notificationsApi.subscribeToNotifications(userId, (n) => {
      get().addNotification(n)
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

  markAllRead: async (userId: string) => {
    await notificationsApi.markAllRead(userId)
    set({ notifications: [], unreadCount: 0 })
  },

  addNotification: (n: AppNotification) => {
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },
}))
