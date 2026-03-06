'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTimerStore } from '@/store/timer-store'

export interface BreathingSession {
  id: string
  user_id: string
  pattern_id: string
  duration_seconds: number
  cycles_completed: number
  stress_level_before: number | null
  stress_level_after: number | null
  completed_at: string
  created_at: string
}

export interface CalmBreathingHookReturn {
  // Breathing state
  isBreathingMode: boolean
  breathingPattern: any
  breathingPhase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle'
  breathingPhaseProgress: number
  breathingInstruction: string
  breathingCycleCount: number
  breathingElapsedTime: number

  // Modal and UI state
  showBreathingModal: boolean
  setShowBreathingModal: (show: boolean) => void
  showStressRating: boolean
  setShowStressRating: (show: boolean) => void
  isPreSession: boolean // true for before, false for after

  // Stress tracking
  stressLevelBefore: number | null
  stressLevelAfter: number | null
  setStressLevelBefore: (level: number) => void
  setStressLevelAfter: (level: number) => void

  // Session history
  sessions: BreathingSession[]
  isLoadingSessions: boolean

  // Actions
  startBreathingExercise: (patternId: string) => void
  stopBreathing: () => void
  saveSession: () => Promise<void>
  fetchSessions: () => Promise<void>
}

export function useCalmBreathing(): CalmBreathingHookReturn {
  const [showBreathingModal, setShowBreathingModal] = useState(false)
  const [showStressRating, setShowStressRating] = useState(false)
  const [isPreSession, setIsPreSession] = useState(true)
  const [stressLevelBefore, setStressLevelBefore] = useState<number | null>(null)
  const [stressLevelAfter, setStressLevelAfter] = useState<number | null>(null)
  const [sessions, setSessions] = useState<BreathingSession[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  const {
    isBreathingMode,
    breathingPattern,
    breathingPhase,
    breathingPhaseProgress,
    breathingInstruction,
    breathingCycleCount,
    breathingElapsedTime,
    startBreathing,
    stopBreathing: stopBreathingTimer,
  } = useTimerStore()

  // Start breathing exercise after stress rating
  const startBreathingExercise = useCallback((patternId: string) => {
    setIsPreSession(true)
    setStressLevelBefore(null)
    setStressLevelAfter(null)
    setShowStressRating(true)
    setShowBreathingModal(false)

    // Store pattern ID for later use
    sessionStorage.setItem('pending_breathing_pattern', patternId)
  }, [])

  // Actually start the breathing after pre-session stress rating
  const startBreathingAfterRating = useCallback((patternId: string) => {
    startBreathing(patternId)
    setShowStressRating(false)
  }, [startBreathing])

  // Stop breathing and show post-session stress rating
  const stopBreathing = useCallback(() => {
    stopBreathingTimer()
    setIsPreSession(false)
    setShowStressRating(true)
  }, [stopBreathingTimer])

  // Save session to database
  const saveSession = useCallback(async () => {
    if (!breathingPattern || breathingCycleCount === 0) {
      console.warn('No breathing session to save')
      return
    }

    try {
      const sessionData = {
        patternId: breathingPattern.id,
        durationSeconds: Math.floor(breathingElapsedTime / 1000),
        cyclesCompleted: breathingCycleCount,
        stressLevelBefore,
        stressLevelAfter
      }

      const response = await fetch('/api/breathing/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      })

      if (!response.ok) {
        throw new Error('Failed to save session')
      }

      const savedSession = await response.json()
      console.log('Session saved:', savedSession)

      // Refresh sessions list
      await fetchSessions()

      // Reset stress levels
      setStressLevelBefore(null)
      setStressLevelAfter(null)
      setShowStressRating(false)

    } catch (error) {
      console.error('Error saving breathing session:', error)
      throw error
    }
  }, [breathingPattern, breathingCycleCount, breathingElapsedTime, stressLevelBefore, stressLevelAfter])

  // Fetch session history
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const response = await fetch('/api/breathing/sessions?limit=20')

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()
      setSessions(data)

    } catch (error) {
      console.error('Error fetching breathing sessions:', error)
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  // Load sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Handle pre-session stress rating completion
  useEffect(() => {
    if (stressLevelBefore !== null && isPreSession && showStressRating) {
      const patternId = sessionStorage.getItem('pending_breathing_pattern')
      if (patternId) {
        startBreathingAfterRating(patternId)
        sessionStorage.removeItem('pending_breathing_pattern')
      }
    }
  }, [stressLevelBefore, isPreSession, showStressRating, startBreathingAfterRating])

  return {
    // Breathing state
    isBreathingMode,
    breathingPattern,
    breathingPhase,
    breathingPhaseProgress,
    breathingInstruction,
    breathingCycleCount,
    breathingElapsedTime,

    // Modal and UI state
    showBreathingModal,
    setShowBreathingModal,
    showStressRating,
    setShowStressRating,
    isPreSession,

    // Stress tracking
    stressLevelBefore,
    stressLevelAfter,
    setStressLevelBefore,
    setStressLevelAfter,

    // Session history
    sessions,
    isLoadingSessions,

    // Actions
    startBreathingExercise,
    stopBreathing,
    saveSession,
    fetchSessions,
  }
}
