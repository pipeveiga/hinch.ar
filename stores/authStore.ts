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
    // Listener de cambios FUTUROS de sesión.
    // IMPORTANTE: NO hacer `await` de funciones de Supabase acá adentro.
    // El callback corre con el lock interno de auth tomado; llamar getUser()/
    // getSession()/getMe() vuelve a pedir ese lock y produce un DEADLOCK que
    // deja la app clavada en la pantalla de carga. El fetch del perfil se
    // difiere con setTimeout(…, 0) para que corra fuera del lock.
    // async para satisfacer el tipo del callback (espera Promise<void>), pero
    // OJO: sigue sin haber ningún `await` de Supabase acá adentro — eso es lo
    // que evita el deadlock; el async vacío resuelve al toque y libera el lock.
    auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        set({ session })
        setTimeout(() => { get().refreshUser().catch(() => {}) }, 0)
      } else if (event === 'TOKEN_REFRESHED') {
        set({ session })
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, session: null })
      }
    })

    // Red de seguridad: pase lo que pase (deadlock, red colgada, storage
    // lento), salimos de la pantalla de carga como mucho en 8 segundos.
    const failsafe = setTimeout(() => {
      if (!get().isHydrated) set({ isLoading: false, isHydrated: true })
    }, 8000)

    try {
      // Hidratación canónica: getSession() lee la sesión del storage. Corre
      // fuera del callback, así que getMe() ya puede tomar el lock sin trabarse.
      const { data: { session } } = await auth.getSession()
      set({ session })
      if (session) {
        try { set({ user: await usersApi.getMe() }) } catch { /* perfil se reintenta luego */ }
      }
    } catch (error) {
      console.error('[AuthStore] Error al inicializar:', error)
    } finally {
      clearTimeout(failsafe)
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
