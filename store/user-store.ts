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

    // Start initialization
    initializationPromise = (async () => {
      set({ isLoading: true, error: null })

      try {
        const supabase = createClient()

        // Get user from auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
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

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_OUT') {
              get().clear()
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (session?.user) {
                // Refresh user data
                set({ user: session.user })
                await get().refreshProfile()
              }
            } else if (event === 'USER_UPDATED') {
              if (session?.user) {
                set({ user: session.user })
              }
            }
          }
        )

        // Store subscription for cleanup if needed
        // Note: In a real app, you might want to store this for cleanup
        // For now, the listener persists for the app lifetime

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
