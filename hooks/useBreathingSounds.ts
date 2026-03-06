'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export function useBreathingSounds() {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastPhaseRef = useRef<string>('')

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('breathing-sounds-enabled')
    if (saved !== null) {
      setSoundEnabled(JSON.parse(saved))
    }
  }, [])

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('breathing-sounds-enabled', JSON.stringify(soundEnabled))
  }, [soundEnabled])

  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play a tone with specified frequency and duration
  const playTone = useCallback((frequency: number, duration: number = 0.2, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return

    try {
      const context = getAudioContext()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      oscillator.frequency.value = frequency
      oscillator.type = type

      // Envelope for smooth attack and release
      const now = context.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01) // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration) // Release

      oscillator.start(now)
      oscillator.stop(now + duration)
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }, [soundEnabled, getAudioContext])

  // Play different sounds for different phases
  const playInhaleSound = useCallback(() => {
    // Rising tone (C to E)
    playTone(523.25, 0.15, 'sine') // C5
    setTimeout(() => playTone(659.25, 0.15, 'sine'), 50) // E5
  }, [playTone])

  const playExhaleSound = useCallback(() => {
    // Falling tone (E to C)
    playTone(659.25, 0.15, 'sine') // E5
    setTimeout(() => playTone(523.25, 0.15, 'sine'), 50) // C5
  }, [playTone])

  const playHoldSound = useCallback(() => {
    // Single gentle tone
    playTone(587.33, 0.12, 'sine') // D5
  }, [playTone])

  const playCompleteSound = useCallback(() => {
    // Ascending chord
    playTone(523.25, 0.2, 'sine') // C5
    setTimeout(() => playTone(659.25, 0.2, 'sine'), 80) // E5
    setTimeout(() => playTone(783.99, 0.3, 'sine'), 160) // G5
  }, [playTone])

  // Play sound based on phase
  const playPhaseSound = useCallback((phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle') => {
    // Don't play if phase hasn't changed
    if (phase === lastPhaseRef.current) return
    lastPhaseRef.current = phase

    switch (phase) {
      case 'inhale':
        playInhaleSound()
        break
      case 'hold-in':
      case 'hold-out':
        playHoldSound()
        break
      case 'exhale':
        playExhaleSound()
        break
      default:
        break
    }
  }, [playInhaleSound, playExhaleSound, playHoldSound])

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  return {
    soundEnabled,
    toggleSound,
    playPhaseSound,
    playCompleteSound
  }
}
