'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { audioManager, type SoundType as AudioSoundType } from '@/lib/audio/audio-manager'
import { audioPreloader } from '@/lib/audio/audio-preloader'

export type SoundType = 'cafe' | 'forest' | 'ocean' | 'rain' | 'whitenoise'

interface BackgroundNoiseSettings {
  enabled: boolean
  soundType: SoundType | null
  volume: number // 0-100
}

const STORAGE_KEY = 'background-noise-settings'

const DEFAULT_SETTINGS: BackgroundNoiseSettings = {
  enabled: false,
  soundType: null,
  volume: 30,
}

export function useBackgroundNoise() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [settings, setSettings] = useState<BackgroundNoiseSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse background noise settings:', e)
      }
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Helper to stop all audio elements
  const stopAllSounds = useCallback(() => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    // Use audio manager to stop all sounds
    audioManager.stopAll()
    
    // Clear the current reference
    audioRef.current = null
  }, [])

  // Load and prepare audio
  const loadSound = useCallback(async (soundType: SoundType) => {
    setIsLoading(true)
    setError(null)

    try {
      // First, stop ALL sounds to prevent overlapping
      stopAllSounds()

      // Use audio manager to load the sound
      const audio = await audioManager.loadAudio(soundType as AudioSoundType)
      
      // Configure audio
      audio.loop = true
      audio.volume = settings.volume / 100
      audio.currentTime = 0

      audioRef.current = audio
      setIsLoading(false)

      // Auto-play if enabled
      if (settings.enabled) {
        await play()
      }
      
      // Preload other sounds in background
      if (audioPreloader.shouldPreload()) {
        const otherSounds = ['rain', 'forest', 'ocean'].filter(s => s !== soundType) as AudioSoundType[]
        audioPreloader.startPreloading({
          priority: [],
          optional: otherSounds,
          networkAware: true
        })
      }
    } catch (err) {
      console.error('Failed to load sound:', err)
      setError('Failed to load sound. Please try again.')
      setIsLoading(false)
    }
  }, [settings.volume, settings.enabled, stopAllSounds])

  // Play audio
  const play = useCallback(async () => {
    if (!audioRef.current) return

    // Stop all other sounds first
    audioManager.stopAll()

    try {
      await audioRef.current.play()
    } catch (err) {
      // Handle autoplay restrictions
      console.warn('Autoplay prevented:', err)
      setError('Click anywhere to enable sound')
      
      // Wait for user interaction
      const handleInteraction = async () => {
        try {
          await audioRef.current?.play()
          setError(null)
        } catch (e) {
          console.error('Failed to play after interaction:', e)
        }
        document.removeEventListener('click', handleInteraction)
      }
      document.addEventListener('click', handleInteraction, { once: true })
    }
  }, [])

  // Pause audio
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
    }
  }, [])

  // Stop audio completely
  const stop = useCallback(() => {
    // Use the robust stopAllSounds helper
    stopAllSounds()
    // Also update settings to reflect stopped state
    setSettings(prev => ({ ...prev, enabled: false }))
  }, [stopAllSounds])

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume))
    setSettings(prev => ({ ...prev, volume: clampedVolume }))
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume / 100
    }
  }, [])

  // Set sound type
  const setSoundType = useCallback(async (soundType: SoundType | null) => {
    if (soundType === settings.soundType) return
    
    // Always stop all sounds before switching
    stopAllSounds()
    
    setSettings(prev => ({ ...prev, soundType }))
    
    if (soundType) {
      await loadSound(soundType)
    }
  }, [settings.soundType, loadSound, stopAllSounds])

  // Toggle enabled state
  const toggleEnabled = useCallback(() => {
    if (!settings.enabled && settings.soundType) {
      // Turning on - stop all sounds first then play
      stopAllSounds()
      setSettings(prev => ({ ...prev, enabled: true }))
      // Play will be triggered by the settings change effect
    } else {
      // Turning off - stop all sounds completely
      stop()
    }
  }, [settings.enabled, settings.soundType, stop, stopAllSounds])

  // Load sound when settings change
  useEffect(() => {
    if (settings.soundType && settings.enabled) {
      loadSound(settings.soundType)
    }
  }, [settings.soundType])

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume / 100
    }
  }, [settings.volume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all audio elements on unmount
      stopAllSounds()
      // Clear cache if component unmounts
      audioManager.clearCache(false)
    }
  }, [stopAllSounds])

  return {
    settings,
    isLoading,
    error,
    play,
    pause,
    stop,
    setVolume,
    setSoundType,
    toggleEnabled,
    isPlaying: audioRef.current ? !audioRef.current.paused : false,
  }
}