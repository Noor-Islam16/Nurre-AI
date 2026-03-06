import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Debounce helper
let syncTimeout: NodeJS.Timeout | null = null
const SYNC_DEBOUNCE_MS = 2000

// Automation preferences
export interface AutomationPreferences {
  level: 'minimal' | 'balanced' | 'proactive' | 'maximum'
  allowAutoTaskCreation: boolean
  allowAutoFocusStart: boolean
  allowAutoMoodSubmission: boolean
  requireConfirmation: boolean
}

// Intervention preferences
export interface InterventionPreferences {
  enabled: boolean
  frequency: 'rare' | 'occasional' | 'regular' | 'frequent'
  quietHours: TimeRange[]
  cooldownMinutes: number
  allowedTypes: InterventionType[]
}

// Tool permissions
export interface ToolPermission {
  enabled: boolean
  requireConfirmation: boolean
  maxUsagePerDay?: number
  allowedParameters?: Record<string, any>
}

export interface ToolPermissions {
  create_task: ToolPermission
  start_focus_timer: ToolPermission
  pause_focus_timer: ToolPermission
  resume_focus_timer: ToolPermission
  complete_task: ToolPermission
  update_task_progress: ToolPermission
  suggest_break: ToolPermission
  provide_encouragement: ToolPermission
  track_mood: ToolPermission
  analyze_patterns: ToolPermission
  set_reminder: ToolPermission
  navigate_to_page: ToolPermission
  adjust_task_priority: ToolPermission
  break_down_task: ToolPermission
  generate_reward: ToolPermission
}

// Voice speed type
export type VoiceSpeed = 'slow' | 'normal' | 'fast'

// Voice speed to ElevenLabs speed parameter (range: 0.7 - 1.2)
export const voiceSpeedToRate: Record<VoiceSpeed, number> = {
  slow: 0.8,
  normal: 1.0,
  fast: 1.15
}

// Communication preferences
export interface CommunicationPreferences {
  personality: 'encouraging' | 'direct' | 'gentle' | 'energetic'
  messageLength: 'concise' | 'balanced' | 'detailed'
  useEmoji: boolean
  technicalLevel: 'simple' | 'moderate' | 'technical'
  voiceSpeed: VoiceSpeed
}

// Privacy settings
export interface PrivacySettings {
  storeConversations: boolean
  useDataForImprovement: boolean
  shareAnonymousMetrics: boolean
  dataRetentionDays: number
}

// Time range for quiet hours
export interface TimeRange {
  start: string // HH:MM format
  end: string   // HH:MM format
  label?: string
}

// Intervention types
export type InterventionType = 
  | 'task_reminder'
  | 'break_suggestion'
  | 'mood_checkin'
  | 'focus_prompt'
  | 'encouragement'
  | 'pattern_insight'
  | 'overwhelm_support'
  | 'procrastination_help'

// Quick mode settings
export type QuickMode = 'active' | 'quiet' | 'manual' | 'off' | 'focus' | 'help_me' | 'learning' | 'privacy'

// ADHD profile types
export type ADHDProfile = 'inattentive' | 'hyperactive' | 'combined' | 'custom' | 'none'

// Preset configurations
export interface PreferencePreset {
  name: string
  description: string
  automation: AutomationPreferences
  intervention: InterventionPreferences
  communication: CommunicationPreferences
  privacy: PrivacySettings
}

// Main preferences interface
export interface UserPreferences {
  automation: AutomationPreferences
  intervention: InterventionPreferences
  tools: ToolPermissions
  communication: CommunicationPreferences
  privacy: PrivacySettings
  quickMode: QuickMode
  adhdProfile: ADHDProfile
  dailyFocusGoalMinutes: number
  lastUpdated: Date
  presetName?: string
  lastFocusSound?: 'none' | 'brown' | 'rain'
}

// Default tool permissions
const defaultToolPermissions: ToolPermissions = {
  create_task: { enabled: true, requireConfirmation: false },
  start_focus_timer: { enabled: true, requireConfirmation: false },
  pause_focus_timer: { enabled: true, requireConfirmation: false },
  resume_focus_timer: { enabled: true, requireConfirmation: false },
  complete_task: { enabled: true, requireConfirmation: false },
  update_task_progress: { enabled: true, requireConfirmation: false },
  suggest_break: { enabled: true, requireConfirmation: false },
  provide_encouragement: { enabled: true, requireConfirmation: false },
  track_mood: { enabled: true, requireConfirmation: true },
  analyze_patterns: { enabled: true, requireConfirmation: false },
  set_reminder: { enabled: true, requireConfirmation: false },
  navigate_to_page: { enabled: false, requireConfirmation: true },
  adjust_task_priority: { enabled: true, requireConfirmation: false },
  break_down_task: { enabled: true, requireConfirmation: false },
  generate_reward: { enabled: true, requireConfirmation: false }
}

// Default preferences
const defaultPreferences: UserPreferences = {
  automation: {
    level: 'balanced',
    allowAutoTaskCreation: false,
    allowAutoFocusStart: false,
    allowAutoMoodSubmission: false,
    requireConfirmation: true
  },
  intervention: {
    enabled: true,
    frequency: 'occasional',
    quietHours: [
      { start: '22:00', end: '08:00', label: 'Night' }
    ],
    cooldownMinutes: 15,
    allowedTypes: ['task_reminder', 'break_suggestion', 'focus_prompt', 'encouragement']
  },
  tools: defaultToolPermissions,
  communication: {
    personality: 'encouraging',
    messageLength: 'balanced',
    useEmoji: true,
    technicalLevel: 'moderate',
    voiceSpeed: 'normal'
  },
  privacy: {
    storeConversations: true,
    useDataForImprovement: false,
    shareAnonymousMetrics: false,
    dataRetentionDays: 30
  },
  quickMode: 'active',
  adhdProfile: 'none',
  dailyFocusGoalMinutes: 120,
  lastUpdated: new Date(),
  lastFocusSound: 'none'
}

// Preference presets
export const preferencePresets: Record<string, PreferencePreset> = {
  cautious: {
    name: 'Cautious',
    description: 'Minimal automation, always ask before taking actions',
    automation: {
      level: 'minimal',
      allowAutoTaskCreation: false,
      allowAutoFocusStart: false,
      allowAutoMoodSubmission: false,
      requireConfirmation: true
    },
    intervention: {
      enabled: false,
      frequency: 'rare',
      quietHours: [],
      cooldownMinutes: 30,
      allowedTypes: []
    },
    communication: {
      personality: 'gentle',
      messageLength: 'concise',
      useEmoji: false,
      technicalLevel: 'simple',
      voiceSpeed: 'slow'
    },
    privacy: {
      storeConversations: false,
      useDataForImprovement: false,
      shareAnonymousMetrics: false,
      dataRetentionDays: 7
    }
  },
  balanced: {
    name: 'Balanced',
    description: 'Default settings with moderate automation',
    ...defaultPreferences
  },
  assistant: {
    name: 'Full Assistant',
    description: 'High automation for maximum productivity',
    automation: {
      level: 'maximum',
      allowAutoTaskCreation: true,
      allowAutoFocusStart: true,
      allowAutoMoodSubmission: true,
      requireConfirmation: false
    },
    intervention: {
      enabled: true,
      frequency: 'regular',
      quietHours: [{ start: '22:00', end: '08:00', label: 'Night' }],
      cooldownMinutes: 10,
      allowedTypes: [
        'task_reminder',
        'break_suggestion',
        'mood_checkin',
        'focus_prompt',
        'encouragement',
        'pattern_insight',
        'overwhelm_support',
        'procrastination_help'
      ]
    },
    communication: {
      personality: 'energetic',
      messageLength: 'detailed',
      useEmoji: true,
      technicalLevel: 'moderate',
      voiceSpeed: 'normal'
    },
    privacy: {
      storeConversations: true,
      useDataForImprovement: true,
      shareAnonymousMetrics: true,
      dataRetentionDays: 90
    }
  },
  adhd_friendly: {
    name: 'ADHD Optimized',
    description: 'Optimized for ADHD with frequent breaks and encouragement',
    automation: {
      level: 'proactive',
      allowAutoTaskCreation: true,
      allowAutoFocusStart: false,
      allowAutoMoodSubmission: false,
      requireConfirmation: false
    },
    intervention: {
      enabled: true,
      frequency: 'frequent',
      quietHours: [{ start: '22:00', end: '08:00', label: 'Night' }],
      cooldownMinutes: 15,
      allowedTypes: [
        'task_reminder',
        'break_suggestion',
        'focus_prompt',
        'encouragement',
        'overwhelm_support',
        'procrastination_help'
      ]
    },
    communication: {
      personality: 'encouraging',
      messageLength: 'concise',
      useEmoji: true,
      technicalLevel: 'simple',
      voiceSpeed: 'slow'
    },
    privacy: {
      storeConversations: true,
      useDataForImprovement: false,
      shareAnonymousMetrics: false,
      dataRetentionDays: 30
    }
  }
}

// Store interface
interface PreferenceStore {
  preferences: UserPreferences
  sessionOverrides: Partial<UserPreferences>
  isInitialized: boolean
  isLoadingFromDB: boolean
  isSyncingToDB: boolean
  lastSyncedAt: Date | null
  syncError: string | null

  // Actions
  setPreferences: (preferences: Partial<UserPreferences>) => void
  setAutomationLevel: (level: AutomationPreferences['level']) => void
  setToolPermission: (tool: keyof ToolPermissions, permission: Partial<ToolPermission>) => void
  setInterventionFrequency: (frequency: InterventionPreferences['frequency']) => void
  setQuickMode: (mode: QuickMode) => void
  setADHDProfile: (profile: ADHDProfile) => void
  setDailyFocusGoal: (minutes: number) => void
  applyPreset: (presetName: string) => void
  resetToDefaults: () => void
  setSessionOverride: (overrides: Partial<UserPreferences>) => void
  clearSessionOverrides: () => void
  exportPreferences: () => string
  importPreferences: (json: string) => boolean
  isWithinQuietHours: () => boolean
  canUseTool: (tool: keyof ToolPermissions) => boolean
  shouldRequireConfirmation: (tool: keyof ToolPermissions) => boolean
  getEffectivePreferences: () => UserPreferences
  setLastFocusSound: (sound: 'none' | 'brown' | 'rain') => void

  // Database sync actions
  loadFromDatabase: () => Promise<void>
  syncToDatabase: () => Promise<void>
  scheduleSyncToDatabase: () => void
}

// Create the store
export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      sessionOverrides: {},
      isInitialized: false,
      isLoadingFromDB: false,
      isSyncingToDB: false,
      lastSyncedAt: null,
      syncError: null,

      setPreferences: (newPreferences) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            ...newPreferences,
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      setLastFocusSound: (sound) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            lastFocusSound: sound,
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      setAutomationLevel: (level) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            automation: {
              ...state.preferences.automation,
              level
            },
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      setToolPermission: (tool, permission) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            tools: {
              ...state.preferences.tools,
              [tool]: {
                ...state.preferences.tools[tool],
                ...permission
              }
            },
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      setInterventionFrequency: (frequency) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            intervention: {
              ...state.preferences.intervention,
              frequency
            },
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      setQuickMode: (mode) => {
        const modeOverrides: Partial<UserPreferences> = {}
        
        switch (mode) {
          case 'quiet':
            modeOverrides.intervention = {
              ...get().preferences.intervention,
              enabled: false
            }
            break
          case 'manual':
            modeOverrides.automation = {
              ...get().preferences.automation,
              level: 'minimal',
              requireConfirmation: true
            }
            break
          case 'off':
            modeOverrides.automation = {
              ...get().preferences.automation,
              level: 'minimal'
            }
            modeOverrides.intervention = {
              ...get().preferences.intervention,
              enabled: false
            }
            break
          case 'focus':
            modeOverrides.intervention = {
              ...get().preferences.intervention,
              enabled: false
            }
            break
          case 'help_me':
            modeOverrides.automation = {
              ...get().preferences.automation,
              level: 'maximum'
            }
            modeOverrides.intervention = {
              ...get().preferences.intervention,
              frequency: 'frequent'
            }
            break
          case 'learning':
            modeOverrides.communication = {
              ...get().preferences.communication,
              messageLength: 'detailed',
              technicalLevel: 'technical'
            }
            break
          case 'privacy':
            modeOverrides.privacy = {
              ...get().preferences.privacy,
              storeConversations: false,
              useDataForImprovement: false,
              shareAnonymousMetrics: false
            }
            break
        }

        set(state => ({
          preferences: {
            ...state.preferences,
            quickMode: mode,
            lastUpdated: new Date()
          },
          sessionOverrides: mode === 'active' ? {} : modeOverrides
        }))
        get().scheduleSyncToDatabase()
      },

      setADHDProfile: (profile) => {
        let updates: Partial<UserPreferences> = {}

        if (profile !== 'none' && profile !== 'custom') {
          updates = preferencePresets.adhd_friendly
        }

        set(state => ({
          preferences: {
            ...state.preferences,
            ...updates,
            adhdProfile: profile,
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      setDailyFocusGoal: (minutes) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            dailyFocusGoalMinutes: Math.max(0, minutes),
            lastUpdated: new Date()
          }
        }))
        get().scheduleSyncToDatabase()
      },

      applyPreset: (presetName) => {
        const preset = preferencePresets[presetName]
        if (!preset) return

        set({
          preferences: {
            ...preset,
            tools: defaultToolPermissions,
            quickMode: 'active',
            adhdProfile: presetName === 'adhd_friendly' ? 'combined' : 'none',
            dailyFocusGoalMinutes: 120,
            lastUpdated: new Date(),
            presetName
          }
        })
        get().scheduleSyncToDatabase()
      },

      resetToDefaults: () => {
        set({
          preferences: defaultPreferences,
          sessionOverrides: {}
        })
        get().scheduleSyncToDatabase()
      },

      setSessionOverride: (overrides) => {
        set(state => ({
          sessionOverrides: {
            ...state.sessionOverrides,
            ...overrides
          }
        }))
      },

      clearSessionOverrides: () => {
        set({ sessionOverrides: {} })
      },

      exportPreferences: () => {
        return JSON.stringify(get().preferences, null, 2)
      },

      importPreferences: (json) => {
        try {
          const imported = JSON.parse(json)
          set({
            preferences: {
              ...imported,
              lastUpdated: new Date()
            }
          })
          get().scheduleSyncToDatabase()
          return true
        } catch {
          return false
        }
      },

      isWithinQuietHours: () => {
        const now = new Date()
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        const { intervention } = get().getEffectivePreferences()
        
        return intervention.quietHours.some(range => {
          if (range.start <= range.end) {
            return currentTime >= range.start && currentTime <= range.end
          } else {
            // Handle overnight ranges (e.g., 22:00 to 08:00)
            return currentTime >= range.start || currentTime <= range.end
          }
        })
      },

      canUseTool: (tool) => {
        const { tools } = get().getEffectivePreferences()
        return tools[tool]?.enabled ?? false
      },

      shouldRequireConfirmation: (tool) => {
        const { tools, automation } = get().getEffectivePreferences()
        return tools[tool]?.requireConfirmation || automation.requireConfirmation
      },

      getEffectivePreferences: () => {
        const state = get()
        return {
          ...state.preferences,
          ...state.sessionOverrides
        } as UserPreferences
      },

      // Database sync methods
      loadFromDatabase: async () => {
        // Only load in browser
        if (typeof window === 'undefined') return

        set({ isLoadingFromDB: true, syncError: null })

        try {
          const response = await fetch('/api/user/ai-preferences')

          if (!response.ok) {
            if (response.status === 401) {
              // User not logged in, skip loading
              set({ isLoadingFromDB: false, isInitialized: true })
              return
            }
            throw new Error('Failed to fetch AI preferences')
          }

          const data = await response.json()

          if (data.ai_preferences) {
            // Check if DB data is newer than local
            const dbLastUpdated = new Date(data.ai_preferences.lastUpdated || 0)
            const localLastUpdated = new Date(get().preferences.lastUpdated || 0)

            if (dbLastUpdated > localLastUpdated) {
              // DB has newer data, use it
              set({
                preferences: {
                  ...data.ai_preferences,
                  lastUpdated: dbLastUpdated
                },
                isLoadingFromDB: false,
                isInitialized: true,
                lastSyncedAt: new Date()
              })
              console.log('[PreferenceStore] Loaded preferences from database')
            } else {
              // Local is newer or same, keep it but mark as initialized
              set({
                isLoadingFromDB: false,
                isInitialized: true,
                lastSyncedAt: new Date()
              })
              // Sync local to DB if local is newer
              if (localLastUpdated > dbLastUpdated) {
                get().scheduleSyncToDatabase()
              }
            }
          } else {
            // No DB data, sync current local preferences
            set({ isLoadingFromDB: false, isInitialized: true })
            get().scheduleSyncToDatabase()
          }
        } catch (error) {
          console.error('[PreferenceStore] Failed to load from database:', error)
          set({
            isLoadingFromDB: false,
            isInitialized: true,
            syncError: error instanceof Error ? error.message : 'Failed to load preferences'
          })
        }
      },

      syncToDatabase: async () => {
        // Only sync in browser
        if (typeof window === 'undefined') return

        set({ isSyncingToDB: true, syncError: null })

        try {
          const response = await fetch('/api/user/ai-preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ai_preferences: get().preferences
            })
          })

          if (!response.ok) {
            if (response.status === 401) {
              // User not logged in, skip syncing
              set({ isSyncingToDB: false })
              return
            }
            throw new Error('Failed to save AI preferences')
          }

          set({
            isSyncingToDB: false,
            lastSyncedAt: new Date(),
            syncError: null
          })
          console.log('[PreferenceStore] Synced preferences to database')
        } catch (error) {
          console.error('[PreferenceStore] Failed to sync to database:', error)
          set({
            isSyncingToDB: false,
            syncError: error instanceof Error ? error.message : 'Failed to sync preferences'
          })
        }
      },

      scheduleSyncToDatabase: () => {
        // Only schedule in browser
        if (typeof window === 'undefined') return

        // Cancel any pending sync
        if (syncTimeout) {
          clearTimeout(syncTimeout)
        }

        // Schedule new sync with debounce
        syncTimeout = setTimeout(() => {
          get().syncToDatabase()
          syncTimeout = null
        }, SYNC_DEBOUNCE_MS)
      }
    }),
    {
      name: 'ai-preferences',
      partialize: (state) => ({
        preferences: state.preferences,
        lastSyncedAt: state.lastSyncedAt
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydrating from localStorage, skip DB fetch if recently synced
        if (state) {
          const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
          const lastSync = state.lastSyncedAt ? new Date(state.lastSyncedAt).getTime() : 0
          const isFresh = Date.now() - lastSync < STALE_THRESHOLD_MS

          if (!isFresh) {
            setTimeout(() => {
              state.loadFromDatabase()
            }, 100)
          }
        }
      }
    }
  )
)
