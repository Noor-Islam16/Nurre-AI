import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Profile data from users table
export interface UserProfile {
  id: string
  name?: string
  email?: string
  current_streak?: number
  longest_streak?: number
  created_at?: string
  updated_at?: string
  onboarding_completed?: boolean
  selected_personality?: 'nur' | 'farin' | 'zak' // AI coaching personality
  adhd_persona?: string
  last_persona_assessment?: string
  task_types?: string[]
  focus_time?: string
  distraction_pattern?: string
  phone_app?: string
  adhd_pattern?: string
  motivation_style?: string
  overwhelm_support?: string
  avatar_tone?: string
  work_environment?: string
  sensory_preference?: string
}

interface UserState {
  // Core user data
  user: User | null
  profile: UserProfile | null

  // Loading states
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  clear: () => void

  // Selectors (convenience getters)
  getUserId: () => string | null
  isAuthenticated: () => boolean
}

// Prevent multiple simultaneous initialization calls
let initializationPromise: Promise<void> | null = null

/**
 * Supabase reports "no one is signed in" as an AuthSessionMissingError.
 * That is a NORMAL state (login page, signed-out visitor), not a failure —
 * it must not be logged as an error and must not abort initialization.
 */
function isSessionMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { name?: string; message?: string }
  return (
    e.name === 'AuthSessionMissingError' ||
    /auth session missing/i.test(e.message ?? '')
  )
}

// Keep the "listener registered" flag on globalThis so it survives hot reloads
// in development (otherwise every HMR would stack another subscription).
const AUTH_LISTENER_FLAG = '__nuree_user_store_auth_listener__'

/**
 * Subscribe to auth changes EXACTLY ONCE, before we know whether anyone is
 * signed in.
 *
 * Previously the subscription was created only after a successful sign-in
 * check. If the app started signed-out (login page) the listener was never
 * registered, so after logging in the store still believed nobody was signed
 * in — chat refused to send until the page was refreshed.
 */
function registerAuthListener(
  set: (partial: Partial<UserState>) => void,
  get: () => UserState,
) {
  if (typeof window === 'undefined') return
  const g = globalThis as Record<string, unknown>
  if (g[AUTH_LISTENER_FLAG]) return
  g[AUTH_LISTENER_FLAG] = true

  const supabase = createClient()
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      get().clear()
      return
    }

    if (
      (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
      session?.user
    ) {
      const previous = get().user
      set({
        user: session.user,
        isInitialized: true,
        isLoading: false,
        error: null,
      })

      // Only (re)load the profile when the user actually changed or we have
      // none yet — not on every silent token refresh.
      if (!previous || previous.id !== session.user.id || !get().profile) {
        // Defer: never call back into Supabase from inside the auth callback
        // (it can deadlock on the auth lock).
        setTimeout(() => {
          void get().refreshProfile()
        }, 0)
      }
      return
    }

    if (event === 'USER_UPDATED' && session?.user) {
      set({ user: session.user })
    }
  })
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    const state = get()

    // If already initialized, don't re-initialize
    if (state.isInitialized) {
      return
    }

    // If initialization is in progress, wait for it
    if (initializationPromise) {
      return initializationPromise
    }

    // Listen for sign-in / sign-out from the very start, whatever the
    // current state is (see registerAuthListener).
    registerAuthListener(set, get)

    // Start initialization
    initializationPromise = (async () => {
      set({ isLoading: true, error: null })

      try {
        const supabase = createClient()

        // Get user from auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        // "Auth session missing" just means nobody is signed in — not an error.
        if (authError && !isSessionMissingError(authError)) {
          throw authError
        }

        if (!user) {
          // No user logged in - this is not an error
          set({
            user: null,
            profile: null,
            isLoading: false,
            isInitialized: true
          })
          return
        }

        // Fetch profile from users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows found - not an error for new users
          console.error('Failed to fetch profile:', profileError)
        }

        set({
          user,
          profile: profile || { id: user.id, email: user.email },
          isLoading: false,
          isInitialized: true,
          error: null
        })

      } catch (error) {
        console.error('User store initialization failed:', error)
        set({
          error: error instanceof Error ? error.message : 'Failed to initialize user',
          isLoading: false,
          isInitialized: true // Mark as initialized even on error to prevent retry loops
        })
      } finally {
        initializationPromise = null
      }
    })()

    return initializationPromise
  },

  refreshUser: async () => {
    const supabase = createClient()

    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        throw error
      }

      set({ user })

      if (user) {
        await get().refreshProfile()
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to refresh user' })
    }
  },

  refreshProfile: async () => {
    const state = get()
    if (!state.user) return

    const supabase = createClient()

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', state.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      set({
        profile: profile || { id: state.user.id, email: state.user.email }
      })
    } catch (error) {
      console.error('Failed to refresh profile:', error)
    }
  },

  updateProfile: async (updates) => {
    const state = get()
    if (!state.user) return

    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      set({ profile: data })
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  },

  clear: () => {
    set({
      user: null,
      profile: null,
      isLoading: false,
      isInitialized: false, // Allow re-initialization after logout
      error: null
    })
  },

  // Convenience selectors
  getUserId: () => {
    return get().user?.id || null
  },

  isAuthenticated: () => {
    return !!get().user
  }
}))

// Helper hook for components that need to wait for initialization
export function useInitializedUser() {
  const { user, profile, isInitialized, isLoading, error } = useUserStore()

  return {
    user,
    profile,
    isInitialized,
    isLoading,
    error,
    // Only return user if initialized
    userId: isInitialized ? user?.id : undefined
  }
}

// Helper for non-React contexts (stores, services)
export function getUserIdSync(): string | null {
  const state = useUserStore.getState()

  if (!state.isInitialized) {
    console.warn('getUserIdSync called before user store initialization')
    return null
  }

  return state.user?.id || null
}

// Helper to ensure store is initialized before use
export async function ensureUserInitialized(): Promise<User | null> {
  const state = useUserStore.getState()

  if (!state.isInitialized) {
    await state.initialize()
  }

  return useUserStore.getState().user
}