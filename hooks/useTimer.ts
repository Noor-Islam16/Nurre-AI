'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTimerStore } from '@/store/timer-store'
import { useTaskStore } from '@/store/task-store'
import { timerService } from '@/lib/services/timer-service'

export interface TimerHookReturn {
  // Timer state
  isRunning: boolean
  isPaused: boolean
  duration: number
  timeRemaining: number
  currentTaskId?: string
  selectedTaskId: string
  
  // Derived values
  timeDisplay: string
  progress: number
  minutes: number
  seconds: number
  
  // Timer actions
  handleStart: () => void
  handlePause: () => void
  handleResume: () => void
  handleStop: () => void
  handleDurationChange: (change: number) => void
  setSelectedTaskId: (id: string) => void
  setDuration: (minutes: number) => void
  
  // Task data
  tasks: Array<{
    id: string
    title: string
    timeEstimate?: number
    completed: boolean
  }>
  activeTasks: Array<{
    id: string
    title: string
    timeEstimate?: number
    completed: boolean
  }>
  
  // Presets
  presets: Array<{
    label: string
    minutes: number
    description: string
  }>
}

export function useTimer(backgroundNoise?: any): TimerHookReturn {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [isReconciling, setIsReconciling] = useState(false)
  
  const {
    isRunning,
    isPaused,
    duration,
    timeRemaining,
    currentTaskId,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    setDuration,
  } = useTimerStore()
  
  const { tasks } = useTaskStore()
  const activeTasks = tasks.filter(t => !t.completed)
  
  // Format time display
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  
  // Calculate progress
  const progress = ((duration * 60 - timeRemaining) / (duration * 60)) * 100
  
  // Preset durations based on ADHD best practices
  const presets = [
    { label: 'Quick', minutes: 10, description: 'Perfect for starting' },
    { label: 'Pomodoro', minutes: 25, description: 'Classic focus session' },
    { label: 'Deep', minutes: 45, description: 'For hyperfocus mode' },
    { label: 'Custom', minutes: 0, description: 'Set your own' },
  ]
  
  const handleStart = () => {
    startTimer(duration, selectedTaskId || undefined)
    // Start background noise if enabled
    if (backgroundNoise?.settings.enabled && backgroundNoise?.settings.soundType) {
      backgroundNoise.play()
    }
  }
  
  const handleStop = () => {
    if (window.confirm('Are you sure you want to stop the timer?')) {
      stopTimer(false)
      // Stop background noise
      backgroundNoise?.stop()
    }
  }
  
  const handlePause = () => {
    pauseTimer()
    // Pause background noise
    backgroundNoise?.pause()
  }
  
  const handleResume = () => {
    resumeTimer()
    // Resume background noise if enabled
    if (backgroundNoise?.settings.enabled && backgroundNoise?.settings.soundType) {
      backgroundNoise.play()
    }
  }
  
  const handleDurationChange = (change: number) => {
    const newDuration = Math.max(1, Math.min(120, duration + change))
    setDuration(newDuration)
  }
  
  // Reconcile timer on visibility change
  const reconcileTimer = useCallback(async () => {
    if (!currentTaskId || isReconciling) return
    
    setIsReconciling(true)
    try {
      // Get current timer state from service
      const timerId = useTimerStore.getState().timerId
      if (timerId) {
        const state = await timerService.getTimerState(timerId)
        if (state) {
          // Update local state with accurate time
          useTimerStore.setState({
            timeRemaining: state.remainingSeconds,
            isRunning: state.isRunning,
            isPaused: state.isPaused
          })
        }
      }
    } catch (error) {
      console.warn('Failed to reconcile timer:', error)
    } finally {
      setIsReconciling(false)
    }
  }, [currentTaskId])
  
  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRunning) {
        // Tab became visible, reconcile timer
        reconcileTimer()
      }
    }
    
    const handleFocus = () => {
      if (isRunning) {
        reconcileTimer()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isRunning, reconcileTimer])
  
  // Listen for service worker timer updates
  useEffect(() => {
    const handleSwTimerUpdate = (e: CustomEvent) => {
      const { remainingSeconds, isRunning: running, isPaused: paused } = e.detail
      
      // Update local state with service worker state
      useTimerStore.setState({
        timeRemaining: remainingSeconds,
        isRunning: running,
        isPaused: paused
      })
    }
    
    const handleSwTimerComplete = (e: CustomEvent) => {
      // Timer completed in service worker
      stopTimer(true)
    }
    
    window.addEventListener('sw-timer-update' as any, handleSwTimerUpdate)
    window.addEventListener('sw-timer-complete' as any, handleSwTimerComplete)
    window.addEventListener('timer-service-update' as any, handleSwTimerUpdate)
    window.addEventListener('timer-service-complete' as any, handleSwTimerComplete)
    
    return () => {
      window.removeEventListener('sw-timer-update' as any, handleSwTimerUpdate)
      window.removeEventListener('sw-timer-complete' as any, handleSwTimerComplete)
      window.removeEventListener('timer-service-update' as any, handleSwTimerUpdate)
      window.removeEventListener('timer-service-complete' as any, handleSwTimerComplete)
    }
  }, [stopTimer])
  
  // Listen for external timer start events
  useEffect(() => {
    const handleExternalStart = (e: CustomEvent) => {
      const { duration: d, taskId } = e.detail
      setSelectedTaskId(taskId || '')
      startTimer(d || 25, taskId)
      // Start background noise if enabled
      if (backgroundNoise?.settings.enabled && backgroundNoise?.settings.soundType) {
        backgroundNoise.play()
      }
    }
    
    window.addEventListener('start-focus-timer' as any, handleExternalStart)
    return () => {
      window.removeEventListener('start-focus-timer' as any, handleExternalStart)
    }
  }, [backgroundNoise, startTimer])
  
  // Reconcile on mount if timer is running
  useEffect(() => {
    if (isRunning) {
      reconcileTimer()
    }
  }, [])
  
  return {
    // Timer state
    isRunning,
    isPaused,
    duration,
    timeRemaining,
    currentTaskId,
    selectedTaskId,
    
    // Derived values
    timeDisplay,
    progress,
    minutes,
    seconds,
    
    // Timer actions
    handleStart,
    handlePause,
    handleResume,
    handleStop,
    handleDurationChange,
    setSelectedTaskId,
    setDuration,
    
    // Task data
    tasks,
    activeTasks,
    
    // Presets
    presets,
  }
}