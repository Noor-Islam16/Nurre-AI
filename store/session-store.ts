import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SessionState {
  // Welcome message tracking
  hasShownWelcome: boolean
  welcomeShownAt: Date | null
  sessionStartedAt: Date
  
  // Session tracking
  lastActivityAt: Date
  previousSessionEndedAt: Date | null
  
  // Actions
  markWelcomeShown: () => void
  resetWelcomeState: () => void
  updateActivity: () => void
  startNewSession: () => void
  shouldShowWelcome: () => boolean
}

// Helper to check if it's a new session
const isNewSession = (lastActivity: Date | null): boolean => {
  if (!lastActivity) return true
  
  // Consider it a new session if more than 30 minutes have passed
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  return lastActivity < thirtyMinutesAgo
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      hasShownWelcome: false,
      welcomeShownAt: null,
      sessionStartedAt: new Date(),
      lastActivityAt: new Date(),
      previousSessionEndedAt: null,
      
      markWelcomeShown: () => {
        set({
          hasShownWelcome: true,
          welcomeShownAt: new Date()
        })
      },
      
      resetWelcomeState: () => {
        set({
          hasShownWelcome: false,
          welcomeShownAt: null
        })
      },
      
      updateActivity: () => {
        set({ lastActivityAt: new Date() })
      },
      
      startNewSession: () => {
        const state = get()
        set({
          previousSessionEndedAt: state.lastActivityAt,
          sessionStartedAt: new Date(),
          lastActivityAt: new Date(),
          hasShownWelcome: false,
          welcomeShownAt: null
        })
      },
      
      shouldShowWelcome: () => {
        const state = get()
        
        // Don't show if already shown in this session
        if (state.hasShownWelcome) return false
        
        // Check if this is actually a new session
        if (isNewSession(state.previousSessionEndedAt)) {
          // Auto-start new session if it's been more than 30 minutes
          state.startNewSession()
          return true
        }
        
        // If welcome was shown recently (less than 5 minutes ago), don't show again
        if (state.welcomeShownAt) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
          if (state.welcomeShownAt > fiveMinutesAgo) {
            return false
          }
        }
        
        return !state.hasShownWelcome
      }
    }),
    {
      name: 'session-storage',
      // Only persist certain fields
      partialize: (state) => ({
        lastActivityAt: state.lastActivityAt,
        previousSessionEndedAt: state.previousSessionEndedAt,
        welcomeShownAt: state.welcomeShownAt
      })
    }
  )
)