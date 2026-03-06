'use client'

import { useEffect } from 'react'
import { useTimerStore } from '@/store/timer-store'
import { useRouter } from 'next/navigation'

/**
 * Hook to automatically cleanup timer intervals on unmount
 * Use this in any component that uses the timer store
 */
export function useTimerCleanup() {
  const cleanup = useTimerStore(state => state.cleanup)
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanup()
    }
  }, [cleanup])
}

/**
 * Hook to cleanup timer when navigating away
 * Shows confirmation dialog if timer is running
 */
export function useTimerNavigationCleanup() {
  const cleanup = useTimerStore(state => state.cleanup)
  const isRunning = useTimerStore(state => state.isRunning)
  const isBreathingMode = useTimerStore(state => state.isBreathingMode)
  const router = useRouter()
  
  useEffect(() => {
    const handleRouteChange = (e: PopStateEvent) => {
      if (isRunning || isBreathingMode) {
        const message = isBreathingMode 
          ? 'Breathing exercise is in progress. Do you want to stop it?'
          : 'Timer is still running. Do you want to stop it?'
        
        const shouldStop = window.confirm(message)
        
        if (shouldStop) {
          cleanup()
        } else {
          // Prevent navigation
          e.preventDefault()
          // Push current state back
          window.history.pushState(null, '', window.location.href)
        }
      }
    }
    
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [cleanup, isRunning, isBreathingMode, router])
}

/**
 * Combined hook for full timer cleanup protection
 * Use this in the main timer component
 */
export function useTimerProtection() {
  useTimerCleanup()
  useTimerNavigationCleanup()
}