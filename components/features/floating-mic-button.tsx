'use client'

import { useEffect, useRef } from 'react'
import { Mic, Radio, Volume2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useVoiceStore } from '@/store/voice-store'
import { useVoiceChat } from '@/hooks/use-voice-chat'

export function FloatingMicButton() {
  const status = useVoiceStore(state => state.status)
  const userAudioLevel = useVoiceStore(state => state.userAudioLevel)
  const assistantAudioLevel = useVoiceStore(state => state.assistantAudioLevel)

  const { startSession, stopSession } = useVoiceChat({
    storeMode: 'global',
    voiceMode: 'floating',
    autoSaveTranscript: true,
    mode: 'balanced'
  })

  const isActive = status !== 'idle' && status !== 'ended'
  const isConnecting = status === 'connecting'
  const isListening = status === 'listening'
  const isThinking = status === 'thinking'
  const isSpeaking = status === 'speaking'

  const handleClick = () => {
    if (isActive) {
      stopSession()
    } else {
      startSession()
    }
  }

  // Refs for stable event handler (avoids listener churn from callback identity changes)
  const startSessionRef = useRef(startSession)
  startSessionRef.current = startSession
  const stopSessionRef = useRef(stopSession)
  stopSessionRef.current = stopSession
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive

  // Listen for tap-to-toggle events from AppLayout
  useEffect(() => {
    const handleVoiceToggle = () => {
      // Toggle: if not active start, otherwise stop
      if (!isActiveRef.current) {
        startSessionRef.current()
      } else {
        stopSessionRef.current()
      }
    }

    window.addEventListener('floating-voice-toggle', handleVoiceToggle)

    return () => {
      window.removeEventListener('floating-voice-toggle', handleVoiceToggle)
    }
  }, [])

  // Determine icon based on status
  const Icon = isConnecting
    ? Loader2
    : isSpeaking
    ? Volume2
    : isListening
    ? Radio
    : Mic

  // Determine colors based on status
  const getColors = () => {
    if (isSpeaking) {
      return {
        bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
        ring: 'ring-blue-400',
        glow: 'shadow-blue-500/50'
      }
    }
    if (isListening) {
      return {
        bg: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        ring: 'ring-emerald-400',
        glow: 'shadow-emerald-500/50'
      }
    }
    if (isThinking || isConnecting) {
      return {
        bg: 'bg-gradient-to-r from-violet-500 to-violet-600',
        ring: 'ring-violet-400',
        glow: 'shadow-violet-500/50'
      }
    }
    // Idle
    return {
      bg: 'bg-gradient-to-r from-violet-500 to-violet-600',
      ring: 'ring-violet-400',
      glow: 'shadow-violet-500/50'
    }
  }

  const colors = getColors()

  // Calculate size based on audio level
  const baseSize = 56 // 14 * 4 = 56px (w-14 h-14)
  const maxGrowth = 16 // Can grow up to 16px larger
  const audioLevel = isSpeaking ? assistantAudioLevel : isListening ? userAudioLevel : 0
  const size = baseSize + (audioLevel * maxGrowth)

  // Audio level rings
  const ringCount = 3
  const rings = Array.from({ length: ringCount }, (_, i) => {
    const delay = i * 0.15
    const scale = 1 + (i + 1) * 0.15
    const opacity = audioLevel * (1 - i * 0.25) // Fade outer rings
    return { delay, scale, opacity }
  })

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Audio level rings */}
      <AnimatePresence>
        {(isListening || isSpeaking) && audioLevel > 0.02 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {rings.map((ring, i) => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0 }}
                animate={{
                  scale: ring.scale,
                  opacity: Math.max(0, ring.opacity)
                }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: ring.delay,
                  ease: 'easeOut'
                }}
                className={cn(
                  'absolute rounded-full border-2',
                  isSpeaking
                    ? 'border-blue-400/60'
                    : 'border-emerald-400/60'
                )}
                style={{
                  width: size,
                  height: size
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          width: size,
          height: size
        }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        className={cn(
          'relative rounded-full',
          'text-white shadow-lg hover:shadow-xl',
          'transition-shadow duration-200',
          'flex items-center justify-center',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          colors.bg,
          colors.ring,
          isActive && 'ring-2 ring-offset-2',
          (isListening || isSpeaking) && colors.glow
        )}
        style={{
          width: size,
          height: size
        }}
        aria-label={isActive ? 'Stop voice chat' : 'Start voice chat'}
        aria-pressed={isActive}
      >
        <Icon
          className={cn(
            'w-6 h-6',
            isConnecting && 'animate-spin'
          )}
        />

        {/* Pulsing dot indicator when active */}
        <AnimatePresence>
          {isActive && !isConnecting && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className={cn(
                  'w-full h-full rounded-full',
                  isSpeaking ? 'bg-blue-500' : 'bg-emerald-500'
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
