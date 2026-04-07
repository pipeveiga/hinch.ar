import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { auth, usersApi } from '@/lib/supabase'
import type { User } from '@/lib/types'

interface AuthState {
  session:      Session | null
  user:         User | null
  isLoading:    boolean
  isHydrated:   boolean

  // Acciones
  initialize:   () => Promise<void>
  signUp:       (email: string, password: string, fullName: string) => Promise<void>
  signIn:       (email: string, password: string) => Promise<void>
  signOut:      () => Promise<void>
  refreshUser:  () => Promise<void>
  setUser:      (user: User) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:    null,
  user:       null,
  isLoading:  true,
  isHydrated: false,

  initialize: async () => {
    try {
      // INITIAL_SESSION es la forma correcta de restaurar sesión en React Native
      // (getSession() puede fallar al leer AsyncStorage en Android)
      auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          let user: User | null = null
          if (session) {
            try { user = await usersApi.getMe() } catch { /* ignorar */ }
          }
          set({ session, user, isLoading: false, isHydrated: true })
        } else if (event === 'SIGNED_IN') {
          set({ session })
          try {
            const user = await usersApi.getMe()
            set({ user })
          } catch { /* ignorar */ }
        } else if (event === 'TOKEN_REFRESHED') {
          set({ session })
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null })
        }
      })
    } catch (error) {
      console.error('[AuthStore] Error al inicializar:', error)
      set({ isLoading: false, isHydrated: true })
    }
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true })
    try {
      const { error } = await auth.signUpWithEmail(email, password, fullName)
      if (error) throw error
      // El trigger de Supabase crea el perfil automáticamente
      const user = await usersApi.getMe()
      set({ user })
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true })
    try {
      const { error } = await auth.signInWithEmail(email, password)
      if (error) throw error
      const user = await usersApi.getMe()
      set({ user })
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    await auth.signOut()
    set({ session: null, user: null })
  },

  refreshUser: async () => {
    const user = await usersApi.getMe()
    set({ user })
  },

  setUser: (user) => set({ user }),
}))

// Selectores derivados
export const useIsLoggedIn = () => useAuthStore((s) => !!s.session)
export const useCurrentUser = () => useAuthStore((s) => s.user)
export const useIsDriver = () => useAuthStore((s) => s.user?.has_car ?? false)
export const useIsVerified = () => useAuthStore((s) => s.user?.is_verified ?? false)
