'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/store/user-store'
import type { User } from '@supabase/supabase-js'

/**
 * Hook to access the current user from the centralized user store.
 * This is a convenience wrapper around useUserStore for backward compatibility.
 *
 * The user-store is initialized once by AuthProvider at app startup,
 * so this hook does not make additional network calls.
 */
export function useUser(): { user: User | null; loading: boolean } {
  const user = useUserStore(state => state.user)
  const isLoading = useUserStore(state => state.isLoading)
  const isInitialized = useUserStore(state => state.isInitialized)
  const initialize = useUserStore(state => state.initialize)

  // Ensure store is initialized (in case component renders before AuthProvider)
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  return {
    user,
    loading: !isInitialized || isLoading
  }
}