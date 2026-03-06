import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Preferences } from '@/lib/schemas/preferences'

/**
 * Database-backed preference store
 * This store syncs with the preferences table in Supabase
 */
interface DBPreferenceStore {
  // State
  preferences: Preferences | null
  isLoading: boolean
  error: string | null
  lastFetch: Date | null
  
  // Actions
  fetchPreferences: () => Promise<void>
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>
  resetToDefaults: () => Promise<void>
  
  // Getters
  isWithinQuietHours: () => boolean
  getInterventionCooldown: () => number
  getMaxInterventionsPerHour: () => number
  getFocusDuration: () => number
  getTheme: () => 'light' | 'dark' | 'auto'
}

export const useDBPreferenceStore = create<DBPreferenceStore>()(
  persist(
    (set, get) => ({
      preferences: null,
      isLoading: false,
      error: null,
      lastFetch: null,
      
      fetchPreferences: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/user/preferences')
          
          if (!response.ok) {
            throw new Error('Failed to fetch preferences')
          }
          
          const data = await response.json()
          
          set({
            preferences: data,
            isLoading: false,
            lastFetch: new Date()
          })
        } catch (error) {
          console.error('Error fetching preferences:', error)
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
        }
      },
      
      updatePreference: async (key, value) => {
        const updates = { [key]: value }
        await get().updatePreferences(updates)
      },
      
      updatePreferences: async (updates) => {
        const currentPrefs = get().preferences
        
        // Optimistic update
        if (currentPrefs) {
          set({
            preferences: {
              ...currentPrefs,
              ...updates,
              updated_at: new Date().toISOString()
            } as Preferences
          })
        }
        
        try {
          const response = await fetch('/api/user/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
          })
          
          if (!response.ok) {
            throw new Error('Failed to update preferences')
          }
          
          const data = await response.json()
          
          set({
            preferences: data,
            error: null
          })
        } catch (error) {
          console.error('Error updating preferences:', error)
          
          // Revert optimistic update
          if (currentPrefs) {
            set({ preferences: currentPrefs })
          }
          
          set({
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          
          throw error
        }
      },
      
      resetToDefaults: async () => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch('/api/user/preferences', {
            method: 'DELETE'
          })
          
          if (!response.ok) {
            throw new Error('Failed to reset preferences')
          }
          
          const { preferences } = await response.json()
          
          set({
            preferences,
            isLoading: false,
            error: null
          })
        } catch (error) {
          console.error('Error resetting preferences:', error)
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
          throw error
        }
      },
      
      isWithinQuietHours: () => {
        const prefs = get().preferences
        if (!prefs) return false
        
        const now = new Date()
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
        
        const { quiet_hours } = prefs
        
        // Check if today is included in quiet hours days
        if (!quiet_hours.days.includes(currentDay as any)) {
          return false
        }
        
        // Check time range
        if (quiet_hours.start <= quiet_hours.end) {
          // Same day range (e.g., 09:00 to 17:00)
          return currentTime >= quiet_hours.start && currentTime <= quiet_hours.end
        } else {
          // Overnight range (e.g., 22:00 to 08:00)
          return currentTime >= quiet_hours.start || currentTime <= quiet_hours.end
        }
      },
      
      getInterventionCooldown: () => {
        const prefs = get().preferences
        return prefs?.intervention_cooldown || 15
      },
      
      getMaxInterventionsPerHour: () => {
        const prefs = get().preferences
        return prefs?.max_interventions_per_hour || 6
      },
      
      getFocusDuration: () => {
        const prefs = get().preferences
        return prefs?.focus_duration || 25
      },
      
      getTheme: () => {
        const prefs = get().preferences
        return prefs?.theme || 'auto'
      }
    }),
    {
      name: 'db-preferences-cache',
      partialize: (state) => ({
        preferences: state.preferences,
        lastFetch: state.lastFetch
      })
    }
  )
)