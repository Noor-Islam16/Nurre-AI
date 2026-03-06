import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { eventTracker, EventType } from '@/lib/tracking/events'
import { BreathingPattern, getPatternById, getPhaseAtTime, getTotalDuration } from '@/lib/breathing/patterns'
import { timerService } from '@/lib/services/timer-service'
import { useUserStore } from './user-store'

interface TimerStore {
  isRunning: boolean
  isPaused: boolean
  duration: number // minutes
  timeRemaining: number // seconds
  currentTaskId?: string
  sessionId?: string
  intervalId?: NodeJS.Timeout
  
  // Timestamp tracking for accuracy
  startTimestamp: number | null
  pausedTimestamp: number | null
  totalPausedDuration: number
  timerId: string | null
  
  // Track all active intervals for cleanup
  activeIntervals: Set<NodeJS.Timeout>
  
  // Breathing mode
  isBreathingMode: boolean
  breathingPattern: BreathingPattern | null
  breathingPhase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle'
  breathingCycleCount: number
  breathingElapsedTime: number // seconds since breathing started
  breathingPhaseProgress: number // 0-1 progress in current phase
  breathingInstruction: string
  
  // Timer actions
  startTimer: (duration: number, taskId?: string) => Promise<void>
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: (completed?: boolean) => Promise<void>
  tick: () => void
  setDuration: (minutes: number) => void
  
  // Breathing actions
  startBreathing: (patternId: string) => void
  stopBreathing: () => void
  updateBreathingState: () => void
  
  // Cleanup method to clear all intervals
  cleanup: () => void
  
  // Tool-friendly methods for native tool calling
  startFocusFromTool: (params: {
    duration: number
    taskId?: string
    backgroundNoise?: string
  }) => Promise<{ sessionId: string; success: boolean; error?: string }>
  
  pauseFocusFromTool: (reason?: string) => Promise<{ success: boolean; error?: string }>
  
  resumeFocusFromTool: () => Promise<{ success: boolean; error?: string }>
  
  endFocusFromTool: (completed?: boolean) => Promise<{ success: boolean; actualDuration?: number; error?: string }>
  
  triggerBreakFromTool: (duration?: number) => Promise<{ success: boolean; error?: string }>
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  isPaused: false,
  duration: 25,
  timeRemaining: 25 * 60,
  currentTaskId: undefined,
  sessionId: undefined,
  intervalId: undefined,
  
  // Timestamp tracking
  startTimestamp: null,
  pausedTimestamp: null,
  totalPausedDuration: 0,
  timerId: null,
  
  // Track all active intervals
  activeIntervals: new Set(),
  
  // Breathing mode initial state
  isBreathingMode: false,
  breathingPattern: null,
  breathingPhase: 'idle',
  breathingCycleCount: 0,
  breathingElapsedTime: 0,
  breathingPhaseProgress: 0,
  breathingInstruction: '',
  
  startTimer: async (duration, taskId) => {
    const state = get()

    // Prevent multiple intervals - clear any existing interval first
    if (state.intervalId) {
      console.warn('[Timer] Clearing existing timer interval before starting new one')
      clearInterval(state.intervalId)
      state.activeIntervals.delete(state.intervalId)
    }

    const supabase = createClient()

    // Try user store first, fall back to direct Supabase auth if not initialized yet
    let user = useUserStore.getState().user
    if (!user) {
      console.warn('[Timer] User store not ready, fetching user directly from Supabase')
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        user = authUser
      } catch (e) {
        console.error('[Timer] Failed to get user from Supabase:', e)
      }
    }

    if (!user) {
      console.error('[Timer] Cannot start timer: no authenticated user')
      return
    }

    // Generate timer ID
    const timerId = `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // START TIMER IMMEDIATELY — don't block on DB operations
    // This gives instant UI feedback when the user clicks Start
    await timerService.startTimer(timerId, duration, taskId)

    // Set up listener for service worker updates
    const handleSwUpdate = (event: CustomEvent) => {
      if (event.detail.timerId === timerId) {
        set({ timeRemaining: event.detail.remainingSeconds })

        if (event.detail.remainingSeconds <= 0) {
          get().stopTimer(true)
        }
      }
    }

    window.addEventListener('sw-timer-update' as any, handleSwUpdate)
    window.addEventListener('timer-service-update' as any, handleSwUpdate)

    // Start display update interval (just for UI, not for tracking)
    const intervalId = setInterval(() => get().tick(), 1000)

    // Track the interval
    const intervals = new Set(state.activeIntervals)
    intervals.add(intervalId)

    // Set running state IMMEDIATELY so the UI switches to running mode
    set({
      isRunning: true,
      isPaused: false,
      duration,
      timeRemaining: duration * 60,
      currentTaskId: taskId,
      intervalId,
      activeIntervals: intervals,
      startTimestamp: Date.now(),
      pausedTimestamp: null,
      totalPausedDuration: 0,
      timerId,
    })

    // Play start sound
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/timer-start.mp3')
      audio.play().catch(() => {})
    }

    // DB operations run in background — don't block the timer
    ;(async () => {
      try {
        // End any existing active session
        const { data: existingSession } = await supabase
          .from('focus_sessions')
          .select('id')
          .eq('user_id', user!.id)
          .is('ended_at', null)
          .single()

        if (existingSession) {
          console.warn('[Timer] Found existing active session, ending it before creating new one')
          await supabase
            .from('focus_sessions')
            .update({
              ended_at: new Date().toISOString(),
              completed: false
            })
            .eq('id', existingSession.id)
        }

        // Create focus session in database
        const { data: session, error: sessionError } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: user!.id,
            task_id: taskId,
            duration: duration,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (sessionError) {
          console.error('[Timer] Failed to create focus session:', sessionError.message)
        } else if (session) {
          // Update store with the DB session ID (for later saving)
          set({ sessionId: session.id })
        }

        // Track event
        eventTracker.track(EventType.FOCUS_START, {
          duration,
          taskId,
          sessionId: session?.id
        })
      } catch (dbError) {
        console.error('[Timer] DB operations failed (timer still running):', dbError)
      }
    })()
  },
  
  pauseTimer: () => {
    const state = get()
    if (!state.isRunning || state.isPaused) return
    
    // Pause in service worker
    if (state.timerId) {
      timerService.pauseTimer(state.timerId)
    }
    
    eventTracker.track(EventType.FOCUS_PAUSE, {
      sessionId: state.sessionId,
      timeRemaining: state.timeRemaining,
    })
    
    set({ 
      isPaused: true,
      pausedTimestamp: Date.now()
    })
  },
  
  resumeTimer: () => {
    const state = get()
    if (!state.isRunning || !state.isPaused) return
    
    // Calculate pause duration
    const pauseDuration = state.pausedTimestamp ? Date.now() - state.pausedTimestamp : 0
    
    // Resume in service worker
    if (state.timerId) {
      timerService.resumeTimer(state.timerId)
    }
    
    eventTracker.track(EventType.FOCUS_RESUME, {
      sessionId: state.sessionId,
      timeRemaining: state.timeRemaining,
    })
    
    set({ 
      isPaused: false,
      pausedTimestamp: null,
      totalPausedDuration: state.totalPausedDuration + pauseDuration
    })
  },
  
  stopTimer: async (completed = false) => {
    const state = get()
    if (!state.isRunning) return
    
    // Stop in service worker
    if (state.timerId) {
      await timerService.stopTimer(state.timerId, completed)
    }
    
    // Clear interval
    if (state.intervalId) {
      clearInterval(state.intervalId)
      
      // Remove from active intervals
      const intervals = new Set(state.activeIntervals)
      intervals.delete(state.intervalId)
      
      set({ activeIntervals: intervals })
    }
    
    // Update session in database
    if (state.sessionId) {
      const supabase = createClient()
      const actualDuration = Math.floor((state.duration * 60 - state.timeRemaining) / 60)
      
      await supabase
        .from('focus_sessions')
        .update({
          actual_duration: actualDuration,
          ended_at: new Date().toISOString(),
          completed,
        })
        .eq('id', state.sessionId)
    }
    
    // Track event
    eventTracker.track(EventType.FOCUS_END, {
      sessionId: state.sessionId,
      completed,
      actualDuration: state.duration * 60 - state.timeRemaining,
    })
    
    // Play end sound
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/timer-end.mp3')
      audio.play().catch(() => {})
    }
    
    // Reset state
    set({
      isRunning: false,
      isPaused: false,
      timeRemaining: state.duration * 60,
      currentTaskId: undefined,
      sessionId: undefined,
      intervalId: undefined,
      startTimestamp: null,
      pausedTimestamp: null,
      totalPausedDuration: 0,
      timerId: null,
    })
  },
  
  tick: () => {
    const state = get()
    if (!state.isRunning || state.isPaused) return
    
    // Calculate time based on timestamps for accuracy
    if (state.startTimestamp) {
      const now = Date.now()
      const elapsed = now - state.startTimestamp - state.totalPausedDuration
      const remainingMs = Math.max(0, state.duration * 60 * 1000 - elapsed)
      const newTime = Math.floor(remainingMs / 1000)
      
      if (newTime <= 0) {
        get().stopTimer(true)
        
        // Show completion notification
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('timer-complete', {
            detail: { taskId: state.currentTaskId }
          }))
        }
      } else {
        set({ timeRemaining: newTime })
      }
    } else {
      // Fallback to decrement if no timestamp
      const newTime = state.timeRemaining - 1
      
      if (newTime <= 0) {
        get().stopTimer(true)
        
        // Show completion notification
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('timer-complete', {
            detail: { taskId: state.currentTaskId }
          }))
        }
      } else {
        set({ timeRemaining: newTime })
      }
    }
  },
  
  setDuration: (minutes) => {
    const state = get()
    if (!state.isRunning) {
      set({
        duration: minutes,
        timeRemaining: minutes * 60,
      })
    }
  },
  
  // Breathing actions
  startBreathing: (patternId) => {
    const pattern = getPatternById(patternId)
    if (!pattern) return
    
    // Stop any existing timer
    const state = get()
    if (state.isRunning) {
      get().stopTimer(false)
    }
    
    // Clear any existing interval
    if (state.intervalId) {
      clearInterval(state.intervalId)
      state.activeIntervals.delete(state.intervalId)
    }
    
    // Start breathing interval
    const intervalId = setInterval(() => get().updateBreathingState(), 100) // Update every 100ms for smooth animations
    
    // Track the interval
    const intervals = new Set(state.activeIntervals)
    intervals.add(intervalId)
    
    set({
      isBreathingMode: true,
      breathingPattern: pattern,
      breathingPhase: pattern.phases[0].type,
      breathingCycleCount: 0,
      breathingElapsedTime: 0,
      breathingPhaseProgress: 0,
      breathingInstruction: pattern.phases[0].instruction,
      intervalId,
      activeIntervals: intervals,
    })
    
    // Track event
    eventTracker.track(EventType.FOCUS_START, {
      mode: 'breathing',
      pattern: patternId,
    })
  },
  
  stopBreathing: () => {
    const state = get()
    
    // Clear interval
    if (state.intervalId) {
      clearInterval(state.intervalId)
      
      // Remove from active intervals
      const intervals = new Set(state.activeIntervals)
      intervals.delete(state.intervalId)
      
      set({ activeIntervals: intervals })
    }
    
    // Track completion
    if (state.breathingCycleCount > 0) {
      eventTracker.track(EventType.FOCUS_END, {
        mode: 'breathing',
        pattern: state.breathingPattern?.id,
        cycles: state.breathingCycleCount,
        duration: state.breathingElapsedTime,
      })
    }
    
    set({
      isBreathingMode: false,
      breathingPattern: null,
      breathingPhase: 'idle',
      breathingCycleCount: 0,
      breathingElapsedTime: 0,
      breathingPhaseProgress: 0,
      breathingInstruction: '',
      intervalId: undefined,
    })
  },
  
  
  updateBreathingState: () => {
    const state = get()
    if (!state.isBreathingMode || !state.breathingPattern) return
    
    const newElapsedTime = state.breathingElapsedTime + 0.1 // 100ms interval
    const totalDuration = getTotalDuration(state.breathingPattern)
    const completedCycles = Math.floor(newElapsedTime / totalDuration)
    
    // Check if we've reached the recommended cycles
    if (completedCycles >= state.breathingPattern.recommendedCycles) {
      // Auto-complete the exercise
      get().stopBreathing()
      
      // Send completion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('breathing-complete', {
          detail: {
            pattern: state.breathingPattern.name,
            cyclesCompleted: completedCycles,
            autoCompleted: true
          }
        }))
      }
      return
    }
    
    const phaseInfo = getPhaseAtTime(state.breathingPattern, newElapsedTime)
    
    // Check if we've changed phases
    if (phaseInfo.phase.type !== state.breathingPhase) {
      // Trigger chat encouragement message when phase changes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('breathing-phase-change', {
          detail: {
            phase: phaseInfo.phase.type,
            pattern: state.breathingPattern.name,
            cycleCount: completedCycles
          }
        }))
      }
    }
    
    set({
      breathingElapsedTime: newElapsedTime,
      breathingPhase: phaseInfo.phase.type,
      breathingPhaseProgress: phaseInfo.phaseProgress,
      breathingInstruction: phaseInfo.phase.instruction,
      breathingCycleCount: completedCycles,
    })
  },
  
  // Tool-friendly methods for native tool calling
  startFocusFromTool: async (params) => {
    try {
      // Use existing timer logic
      await get().startTimer(params.duration, params.taskId)
      
      // Start background noise if requested
      if (params.backgroundNoise && params.backgroundNoise !== 'none') {
        // Trigger background noise event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('background-noise-start', {
            detail: { type: params.backgroundNoise }
          }))
        }
      }
      
      const sessionId = get().sessionId
      return { 
        sessionId: sessionId || '', 
        success: true 
      }
    } catch (error) {
      return { 
        sessionId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start focus session'
      }
    }
  },
  
  pauseFocusFromTool: async (reason) => {
    try {
      const state = get()
      if (!state.isRunning || state.isPaused) {
        return { success: false, error: 'Timer not running or already paused' }
      }
      
      get().pauseTimer()
      
      // Log pause reason if provided
      if (reason && state.sessionId) {
        const supabase = createClient()
        await supabase
          .from('focus_sessions')
          .update({ pause_reason: reason })
          .eq('id', state.sessionId)
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to pause focus'
      }
    }
  },
  
  resumeFocusFromTool: async () => {
    try {
      const state = get()
      if (!state.isRunning || !state.isPaused) {
        return { success: false, error: 'Timer not paused' }
      }
      
      get().resumeTimer()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resume focus'
      }
    }
  },
  
  endFocusFromTool: async (completed = false) => {
    try {
      const state = get()
      if (!state.isRunning) {
        return { success: false, error: 'No active focus session' }
      }
      
      const actualDuration = Math.floor((state.duration * 60 - state.timeRemaining) / 60)
      await get().stopTimer(completed)
      
      return { 
        success: true, 
        actualDuration 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to end focus'
      }
    }
  },
  
  triggerBreakFromTool: async (duration = 5) => {
    try {
      // Stop any active timer
      const state = get()
      if (state.isRunning) {
        await get().stopTimer(false)
      }
      
      // Trigger break notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trigger-break', {
          detail: { 
            duration,
            message: `Time for a ${duration} minute break!`
          }
        }))
      }
      
      // Could start a break timer
      // await get().startTimer(duration, undefined)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to trigger break'
      }
    }
  },
  
  // Cleanup all intervals and end any active DB session
  cleanup: () => {
    const state = get()

    // End the DB session if one exists (fire-and-forget)
    if (state.sessionId) {
      try {
        const supabase = createClient()
        const actualDuration = Math.floor((state.duration * 60 - state.timeRemaining) / 60)
        supabase
          .from('focus_sessions')
          .update({
            actual_duration: actualDuration,
            ended_at: new Date().toISOString(),
            completed: false,
          })
          .eq('id', state.sessionId)
          .then(() => console.log('[Timer] DB session ended during cleanup'))
      } catch (err) {
        console.warn('[Timer] Failed to end DB session:', err)
      }
    }

    // Clear all active intervals
    state.activeIntervals.forEach(intervalId => {
      clearInterval(intervalId)
    })

    // Reset state
    set({
      intervalId: undefined,
      activeIntervals: new Set(),
      isRunning: false,
      isPaused: false,
      isBreathingMode: false,
      timeRemaining: state.duration * 60,
      currentTaskId: undefined,
      sessionId: undefined,
      breathingPattern: null,
      breathingPhase: 'idle',
      breathingCycleCount: 0,
      breathingElapsedTime: 0,
      breathingPhaseProgress: 0,
      breathingInstruction: '',
    })

    console.log('[Timer] Cleanup completed - all intervals cleared')
  },
}))

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useTimerStore.getState().cleanup()
  })
}