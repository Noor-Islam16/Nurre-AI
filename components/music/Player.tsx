'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { consentManager } from '@/lib/privacy/consent-manager'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/user-store'

export type MusicCategory = 'focus' | 'calm' | 'productivity' | 'sleep'

export type MusicTrack = {
  id: string
  title: string
  url: string
  category: MusicCategory
  hz_label?: string | null
  duration_sec?: number | null
  has_voice?: boolean | null
  producer_name?: string | null
  producer_url?: string | null
  signedUntil?: string
}

type PlayerState = {
  currentTrack: MusicTrack | null
  isPlaying: boolean
  isLooping: boolean
  volume: number // 0..1
  progress: number // seconds
  duration: number // seconds
  percentComplete: number // 0..1
  error: string | null
}

type PlayerControls = {
  play: (track: MusicTrack) => Promise<boolean>
  pause: () => void
  resume: () => Promise<boolean>
  seek: (seconds: number) => void
  setVolume: (v: number) => void
  toggleLoop: () => void
  stop: () => void
}

type MusicPlayerContextType = PlayerState & PlayerControls

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined)

// Storage keys
const SESSION_STORAGE_KEY = 'music.session'
const PROGRESS_SAVE_INTERVAL = 5000 // Save progress every 5 seconds

// Type for persisted session
type PersistedMusicSession = {
  track: MusicTrack
  progress: number
  wasPlaying: boolean
  savedAt: number
}

// Local helpers
async function sendEvent(type: 'music_play_start' | 'music_play_complete', data: Record<string, any>) {
  if (!consentManager.hasConsentFor('analytics')) {
    consentManager.queueEvent(() => {
      void sendEvent(type, data)
    })
    return
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [{ type, metadata: data, timestamp: new Date().toISOString() }] }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch {
    // swallow network errors; batching handled by event tracker in other parts of app
  }
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [error, setError] = useState<string | null>(null)

  const startSentForTrack = useRef<string | null>(null)
  const completeSentForTrack = useRef<string | null>(null)
  const userPausedRef = useRef(false)
  const lastProgressSaveRef = useRef<number>(0)
  const restoredFromStorageRef = useRef(false)

  // percent derived
  const percentComplete = useMemo(() => {
    if (!duration || duration <= 0) return 0
    return Math.min(1, Math.max(0, progress / duration))
  }, [progress, duration])

  // Initialize audio element and event listeners
  useEffect(() => {
    if (!audioRef.current) return

    const audio = audioRef.current

    const onPlay = () => {
      setIsPlaying(true)
      setError(null)
    }
    const onPause = () => {
      setIsPlaying(false)
      // If user explicitly paused near end, count as completion
      if (userPausedRef.current && currentTrack && percentComplete >= 0.8 && completeSentForTrack.current !== currentTrack.id) {
        completeSentForTrack.current = currentTrack.id
        const playedSeconds = audio.currentTime || progress || currentTrack.duration_sec || 0
        void sendEvent('music_play_complete', {
          trackId: currentTrack.id,
          category: currentTrack.category,
          durationMs: Math.round(playedSeconds * 1000) || undefined,
          reason: 'manual_pause'
        })
      }
      userPausedRef.current = false
    }
    const onTimeUpdate = () => {
      setProgress(audio.currentTime || 0)
    }
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }
    const onCanPlay = () => {
      setDuration(audio.duration || 0)
    }
    const onEnded = () => {
      setIsPlaying(false)
      // Count completion on natural end
      if (currentTrack && completeSentForTrack.current !== currentTrack.id) {
        completeSentForTrack.current = currentTrack.id
        const playedSeconds = audio.duration || audio.currentTime || progress || currentTrack.duration_sec || 0
        void sendEvent('music_play_complete', {
          trackId: currentTrack.id,
          category: currentTrack.category,
          durationMs: Math.round(playedSeconds * 1000) || undefined,
          reason: 'ended'
        })
      }
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, duration, percentComplete])

  // Load initial volume from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('music.volume')
      if (stored) {
        const v = parseFloat(stored)
        if (!Number.isNaN(v)) {
          setVolumeState(Math.min(1, Math.max(0, v)))
        }
      }
    } catch {}
  }, [])

  // Load initial loop preference from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('music.loop')
      if (stored === 'true') {
        setIsLooping(true)
      }
    } catch {}
  }, [])

  // Apply volume to audio element and persist
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
    try {
      localStorage.setItem('music.volume', String(volume))
    } catch {}
  }, [volume])

  // Apply loop to audio element and persist
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping
    }
    try {
      localStorage.setItem('music.loop', String(isLooping))
    } catch {}
  }, [isLooping])

  // Save music session to sessionStorage (throttled)
  useEffect(() => {
    if (!currentTrack) {
      // Clear session when no track
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {}
      return
    }

    const now = Date.now()
    // Throttle progress saves to every 5 seconds
    if (now - lastProgressSaveRef.current < PROGRESS_SAVE_INTERVAL) {
      return
    }
    lastProgressSaveRef.current = now

    try {
      const session: PersistedMusicSession = {
        track: currentTrack,
        progress: progress,
        wasPlaying: isPlaying,
        savedAt: now
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    } catch {
      // sessionStorage might be full or disabled
    }
  }, [currentTrack, progress, isPlaying])

  // Restore music session from sessionStorage on mount
  useEffect(() => {
    if (restoredFromStorageRef.current) return
    restoredFromStorageRef.current = true

    const restoreSession = async () => {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
        if (!saved) return

        const session: PersistedMusicSession = JSON.parse(saved)
        if (!session.track || !session.track.id) return

        // Check if signed URL might have expired
        const urlMightBeExpired = session.track.signedUntil
          ? new Date(session.track.signedUntil).getTime() < Date.now()
          : false

        let trackToPlay = session.track

        // If URL might be expired, try to get a fresh one
        if (urlMightBeExpired) {
          try {
            const response = await fetch(`/api/music/tracks?category=${session.track.category}`)
            if (response.ok) {
              const tracks: MusicTrack[] = await response.json()
              const freshTrack = tracks.find(t => t.id === session.track.id)
              if (freshTrack) {
                trackToPlay = freshTrack
              }
            }
          } catch {
            // If fetch fails, try with existing URL anyway
          }
        }

        // Load the track
        const audio = audioRef.current
        if (!audio) return

        setCurrentTrack(trackToPlay)
        audio.src = trackToPlay.url

        // Wait for metadata to load, then seek
        audio.addEventListener('loadedmetadata', function onLoaded() {
          audio.removeEventListener('loadedmetadata', onLoaded)

          // Seek to saved progress
          if (session.progress > 0) {
            try {
              audio.currentTime = Math.min(session.progress, audio.duration || session.progress)
              setProgress(audio.currentTime)
            } catch {}
          }

          // Don't auto-play due to browser restrictions
          // User will need to click play to resume
          // But we can try if they were playing
          if (session.wasPlaying) {
            audio.play().catch(() => {
              // Autoplay blocked - that's fine, user can click play
              setError('Click play to resume your music')
            })
          }
        }, { once: true })

        // Also handle error case
        audio.addEventListener('error', function onError() {
          audio.removeEventListener('error', onError)
          // URL might be invalid/expired - clear the session
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
          setCurrentTrack(null)
          setError('Could not restore music. Please select a track.')
        }, { once: true })

      } catch {
        // JSON parse error or other issue - clear corrupted data
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }

    // Defer session restore to idle time — not critical for page load
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => restoreSession())
    } else {
      setTimeout(restoreSession, 500)
    }
  }, [])

  // Auto-stop after 5 minutes of pause
  useEffect(() => {
    if (currentTrack && !isPlaying) {
      // Music is paused, start 5-minute timer
      const timer = setTimeout(() => {
        // Auto-stop the music after 5 minutes of pause
        const audio = audioRef.current
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
        setCurrentTrack(null)
        setIsPlaying(false)
        setProgress(0)
        setDuration(0)
        setError(null)
        userPausedRef.current = false
        // Clear persisted session on auto-stop
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
        } catch {}
      }, 5 * 60 * 1000) // 5 minutes in milliseconds

      return () => clearTimeout(timer)
    }
  }, [currentTrack, isPlaying])

  // Get user ID for Supabase Realtime (voice AI commands)
  const userId = useUserStore(state => state.user?.id)

  // Helper to play a category by fetching a random track
  const playCategory = useCallback(async (category: MusicCategory) => {
    try {
      const response = await fetch(`/api/music/tracks?category=${category}`)
      if (!response.ok) {
        setError(`Failed to load ${category} music`)
        return
      }
      const tracks: MusicTrack[] = await response.json()
      if (tracks.length > 0) {
        // Pick a random track from the category
        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
        const audio = audioRef.current
        if (audio) {
          setCurrentTrack(randomTrack)
          audio.src = randomTrack.url
          try {
            audio.currentTime = 0
          } catch {}
          setProgress(0)
          await audio.play()
          startSentForTrack.current = randomTrack.id
          void sendEvent('music_play_start', { trackId: randomTrack.id, category: randomTrack.category })
        }
      }
    } catch (err) {
      setError('Could not play music')
    }
  }, [])

  // AI Music Control Listeners (Text Chat + Voice via Supabase Realtime)
  useEffect(() => {
    const audio = audioRef.current

    // Window event handlers for text chat AI commands
    const handleAIPlay = async (e: CustomEvent<{ category: MusicCategory }>) => {
      const category = e.detail?.category
      if (category) {
        await playCategory(category)
      }
    }

    const handleAIPause = () => {
      if (audio) {
        userPausedRef.current = true
        audio.pause()
      }
    }

    const handleAIStop = () => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      setCurrentTrack(null)
      setIsPlaying(false)
      setProgress(0)
      setDuration(0)
      setError(null)
      userPausedRef.current = false
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {}
    }

    // Add window event listeners for text chat AI
    window.addEventListener('ai-music-play', handleAIPlay as unknown as EventListener)
    window.addEventListener('ai-music-pause', handleAIPause)
    window.addEventListener('ai-music-stop', handleAIStop)

    // Supabase Realtime for voice AI commands — deferred to avoid WebSocket on page load
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    let idleHandle: number | ReturnType<typeof setTimeout> | null = null

    if (userId) {
      const initChannel = () => {
        const supabase = createClient()
        channel = supabase.channel(`user:${userId}:commands`)
          .on('broadcast', { event: 'music_command' }, async ({ payload }) => {
            const action = payload?.action
            const category = payload?.category as MusicCategory | undefined

            if (action === 'play' && category) {
              await playCategory(category)
            } else if (action === 'pause') {
              handleAIPause()
            } else if (action === 'stop') {
              handleAIStop()
            }
          })
          .subscribe()
      }

      if (typeof requestIdleCallback !== 'undefined') {
        idleHandle = requestIdleCallback(initChannel)
      } else {
        idleHandle = setTimeout(initChannel, 1000)
      }
    }

    return () => {
      // Cleanup window event listeners
      window.removeEventListener('ai-music-play', handleAIPlay as unknown as EventListener)
      window.removeEventListener('ai-music-pause', handleAIPause)
      window.removeEventListener('ai-music-stop', handleAIStop)

      // Cancel pending idle callback
      if (idleHandle !== null) {
        if (typeof cancelIdleCallback !== 'undefined' && typeof idleHandle === 'number') {
          cancelIdleCallback(idleHandle)
        }
      }

      // Cleanup Supabase channel
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [userId, playCategory])

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.min(1, Math.max(0, v)))
  }, [])

  const toggleLoop = useCallback(() => {
    setIsLooping(prev => !prev)
  }, [])

  const play = useCallback(async (track: MusicTrack): Promise<boolean> => {
    const audio = audioRef.current
    if (!audio) return false

    const isSameTrack = currentTrack?.id === track.id
    const shouldResetMarkers = !isSameTrack || audio.ended || audio.currentTime <= 0.05
    if (shouldResetMarkers) {
      startSentForTrack.current = null
      completeSentForTrack.current = null
    }

    setCurrentTrack(track)
    setError(null)
    try {
      if (!isSameTrack || audio.src !== track.url) {
        audio.src = track.url
      }
      if (shouldResetMarkers) {
        try {
          audio.currentTime = 0
        } catch {}
        setProgress(0)
      }
      await audio.play()
      if (startSentForTrack.current !== track.id) {
        startSentForTrack.current = track.id
        void sendEvent('music_play_start', { trackId: track.id, category: track.category })
      }
      return true
    } catch (e: any) {
      // Autoplay restrictions or load error
      setIsPlaying(false)
      setError('Playback failed. Tap play to continue.')
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    userPausedRef.current = true
    audio.pause()
  }, [])

  const resume = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current
    if (!audio) return false
    try {
      await audio.play()
      return true
    } catch (e: any) {
      setIsPlaying(false)
      setError('Playback failed. Tap play to continue.')
      return false
    }
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    try {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds))
      setProgress(audio.currentTime)
    } catch {}
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setCurrentTrack(null)
    setIsPlaying(false)
    setProgress(0)
    setDuration(0)
    setError(null)
    userPausedRef.current = false
    // Clear persisted session on explicit stop
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {}
  }, [])

  const value = useMemo<MusicPlayerContextType>(() => ({
    currentTrack,
    isPlaying,
    isLooping,
    volume,
    progress,
    duration,
    percentComplete,
    error,
    play,
    pause,
    resume,
    seek,
    setVolume,
    toggleLoop,
    stop,
  }), [currentTrack, isPlaying, isLooping, volume, progress, duration, percentComplete, error, play, pause, resume, seek, setVolume, toggleLoop, stop])

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      {/* Hidden persistent audio element */}
      <audio ref={audioRef} preload="metadata" className="hidden" />
    </MusicPlayerContext.Provider>
  )
}

export function useMusicPlayer(): MusicPlayerContextType {
  const ctx = useContext(MusicPlayerContext)
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider')
  return ctx
}
