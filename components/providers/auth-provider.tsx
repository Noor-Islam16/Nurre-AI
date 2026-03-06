'use client'

import { useEffect, useState } from 'react'
import { useUserStore } from '@/store/user-store'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider initializes the user store once at app startup.
 * This ensures user data is fetched ONCE and available to all components/stores.
 *
 * Must be placed early in the component tree (before other providers that need user data).
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useUserStore(state => state.initialize)
  const isInitialized = useUserStore(state => state.isInitialized)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Initialize user store once on mount
    initialize()
  }, [initialize])

  // On server or before mount, just render children
  // This prevents hydration mismatches
  if (!mounted) {
    return <>{children}</>
  }

  // Optionally show loading state while initializing
  // For now, we render children immediately to avoid flash of loading
  // Components can check isInitialized themselves if they need to wait
  return <>{children}</>
}

/**
 * Hook to check if auth is ready
 * Use this in components that need to wait for user data
 */
export function useAuthReady() {
  const isInitialized = useUserStore(state => state.isInitialized)
  const isLoading = useUserStore(state => state.isLoading)

  return {
    isReady: isInitialized && !isLoading,
    isInitialized,
    isLoading
  }
}
