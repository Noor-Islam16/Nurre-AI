'use client'

import { useState, useEffect } from 'react'
import { useTimerStore } from '@/store/timer-store'

export interface BreathingHookReturn {
  // Breathing state
  isBreathingMode: boolean
  breathingPattern: any
  breathingPhase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle'
  breathingPhaseProgress: number
  breathingInstruction: string
  breathingCycleCount: number
  breathingElapsedTime: number
  
  // Modal state
  showBreathingModal: boolean
  setShowBreathingModal: (show: boolean) => void
  
  // Actions
  stopBreathing: () => void
}

export function useBreathing(backgroundNoise?: any): BreathingHookReturn {
  const [showBreathingModal, setShowBreathingModal] = useState(false)
  
  const {
    isBreathingMode,
    breathingPattern,
    breathingPhase,
    breathingPhaseProgress,
    breathingInstruction,
    breathingCycleCount,
    breathingElapsedTime,
    stopBreathing: stopBreathingTimer,
    isRunning,
  } = useTimerStore()
  
  const stopBreathing = () => {
    stopBreathingTimer()
    // Resume background noise if it was playing before
    if (isRunning && backgroundNoise?.settings.enabled) {
      backgroundNoise.play()
    }
  }
  
  // Stop background noise when entering breathing mode
  useEffect(() => {
    if (isBreathingMode) {
      backgroundNoise?.pause()
    }
  }, [isBreathingMode, backgroundNoise])
  
  return {
    // Breathing state
    isBreathingMode,
    breathingPattern,
    breathingPhase,
    breathingPhaseProgress,
    breathingInstruction,
    breathingCycleCount,
    breathingElapsedTime,
    
    // Modal state
    showBreathingModal,
    setShowBreathingModal,
    
    // Actions
    stopBreathing,
  }
}