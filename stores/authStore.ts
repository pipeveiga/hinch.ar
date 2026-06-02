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
      // Escuchar cambios futuros de sesión
      auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          // Solo actuar si aún no nos hidratamos (getSession() puede llegar primero)
          if (get().isHydrated) return
          let user: User | null = null
          if (session) {
            try { user = await usersApi.getMe() } catch { /* ignorar */ }
          }
          set({ session, user, isLoading: false, isHydrated: true })
        } else if (event === 'SIGNED_IN') {
          set({ session })
          try { set({ user: await usersApi.getMe() }) } catch { /* ignorar */ }
        } else if (event === 'TOKEN_REFRESHED') {
          set({ session })
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null })
        }
      })

      // Fallback inmediato: getSession() lee AsyncStorage directamente.
      // En Android a veces llega antes que INITIAL_SESSION.
      const { data: { session } } = await auth.getSession()
      if (get().isHydrated) return  // INITIAL_SESSION ya lo manejó
      let user: User | null = null
      if (session) {
        try { user = await usersApi.getMe() } catch { /* ignorar */ }
      }
      set({ session, user, isLoading: false, isHydrated: true })
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
      const { data, error } = await auth.signInWithEmail(email, password)
      if (error) throw error
      const user = await usersApi.getMe()
      set({ user, session: data.session })
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
