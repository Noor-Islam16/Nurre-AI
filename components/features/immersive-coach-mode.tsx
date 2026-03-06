'use client'

import { useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useVoiceStore } from '@/store/voice-store'
import { useUserStore } from '@/store/user-store'
import { useAudioLevel } from '@/lib/hooks/use-audio-level'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'
import dynamic from 'next/dynamic'
import type { AvatarState } from './dashboard/nuree-avatar'
import { VoiceHistoryPanel, CurrentSubtitle } from '@/components/ui/modern-message'
import { cn } from '@/lib/utils'

// Dynamic import to avoid SSR issues with Three.js
const NureeAvatar = dynamic(
  () => import('./dashboard/nuree-avatar').then(mod => ({ default: mod.NureeAvatar })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-full bg-violet-100 animate-pulse flex items-center justify-center"
        style={{ width: 'clamp(300px, 50vw, 600px)', height: 'clamp(300px, 50vw, 600px)' }}>
        <span className="text-violet-400 text-lg">Loading avatar...</span>
      </div>
    )
  }
)

interface ImmersiveCoachModeProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * ImmersiveCoachMode Component
 *
 * A fullscreen-like viewport-filling experience for the AI coach.
 * - Hides all navigation and distractions
 * - Shows larger avatar, voice history panel, and subtitles
 * - Voice session persists when entering/exiting (managed by parent)
 */
export function ImmersiveCoachMode({ isOpen, onClose }: ImmersiveCoachModeProps) {
  const remoteAudioElementRef = useRef<HTMLAudioElement>(null)

  // Read voice state from global store (don't manage session here)
  const status = useVoiceStore(state => state.status)
  const transcript = useVoiceStore(state => state.transcript)
  const pendingUserTranscript = useVoiceStore(state => state.pendingUserTranscript)
  const pendingAssistantTranscript = useVoiceStore(state => state.pendingAssistantTranscript)
  const userAudioLevel = useVoiceStore(state => state.userAudioLevel)

  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])

  // Audio level for AI speech lip sync
  const aiAudioLevel = useAudioLevel(remoteAudioElementRef.current)

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Map voice status to avatar state
  const avatarState: AvatarState = useMemo(() => {
    switch (status) {
      case 'listening':
        return 'listening'
      case 'thinking':
        return 'thinking'
      case 'speaking':
        return 'speaking'
      default:
        return 'idle'
    }
  }, [status])

  // Get appropriate audio level based on state
  const currentAudioLevel = useMemo(() => {
    if (status === 'listening') {
      return userAudioLevel
    }
    if (status === 'speaking') {
      return aiAudioLevel
    }
    return 0
  }, [status, userAudioLevel, aiAudioLevel])

  const isIdle = status === 'idle' || status === 'ended'

  // Get status label
  const getStatusLabel = () => {
    if (status === 'listening') return 'Listening...'
    if (status === 'thinking') return 'Thinking...'
    if (status === 'speaking') return 'Speaking...'
    if (status === 'connecting') return 'Connecting...'
    return `Tap avatar to talk to ${personality.name}`
  }

  // Get the current/latest message for subtitle display
  const currentSubtitle = useMemo(() => {
    if (pendingAssistantTranscript) {
      return { content: pendingAssistantTranscript, role: 'assistant' as const, isPending: true }
    }
    if (pendingUserTranscript) {
      return { content: pendingUserTranscript, role: 'user' as const, isPending: true }
    }
    if (transcript.length > 0) {
      const last = transcript[transcript.length - 1]
      return { content: last.content, role: last.role, isPending: false }
    }
    return null
  }, [transcript, pendingUserTranscript, pendingAssistantTranscript])

  // Dispatch voice toggle event (same as space bar on dashboard)
  const handleAvatarClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('voice-toggle'))
  }, [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-50 via-gray-50 to-violet-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 xl:top-8 xl:right-8 2xl:top-10 2xl:right-10 z-10 p-3 xl:p-4 2xl:p-5 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white transition-all shadow-sm border border-gray-200/60"
            aria-label="Close immersive mode"
          >
            <X className="w-6 h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8" />
          </button>

          {/* Main content area */}
          <motion.div
            className="h-full flex items-center justify-center px-4 md:px-8 xl:px-12 2xl:px-16"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Two-column layout: History on left, Avatar on right */}
            <div className="w-full max-w-7xl xl:max-w-[90rem] 2xl:max-w-[110rem] flex items-center gap-8 lg:gap-12 xl:gap-16 2xl:gap-20">

              {/* Left: Voice History Panel - hidden on mobile */}
              <div className="hidden md:block w-80 lg:w-96 xl:w-[28rem] 2xl:w-[32rem] h-[70vh] max-h-[600px] xl:max-h-[750px] 2xl:max-h-[900px] flex-shrink-0">
                <div className="h-full bg-white/70 backdrop-blur-sm rounded-2xl xl:rounded-3xl border border-gray-200/60 shadow-lg p-4 xl:p-6 2xl:p-8 overflow-hidden">
                  <VoiceHistoryPanel
                    transcript={transcript}
                    pendingUserTranscript={pendingUserTranscript}
                    pendingAssistantTranscript={pendingAssistantTranscript}
                    maxHeight="100%"
                    className="h-full"
                  />
                </div>
              </div>

              {/* Right: Avatar and Controls */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6 xl:gap-8 2xl:gap-10">
                {/* Avatar with pulsing ring */}
                <motion.div
                  className="relative cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAvatarClick}
                >
                  {/* Pulsing ring based on audio level */}
                  {!isIdle && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-violet-300/30 -z-10"
                      animate={{
                        scale: 1 + currentAudioLevel * 0.15,
                        opacity: 0.2 + currentAudioLevel * 0.3
                      }}
                      transition={{ duration: 0.1 }}
                      style={{
                        width: 'clamp(320px, 45vw, 800px)',
                        height: 'clamp(320px, 45vw, 800px)',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  )}

                  <NureeAvatar
                    state={avatarState}
                    audioLevel={currentAudioLevel}
                    personality={selectedPersonalityId}
                    className={cn(
                      "rounded-full overflow-hidden",
                      "transition-all duration-300",
                      isIdle ? "hover:scale-105" : ""
                    )}
                    style={{
                      width: 'clamp(280px, 40vw, 750px)',
                      height: 'clamp(280px, 40vw, 750px)'
                    }}
                  />
                </motion.div>

                {/* Status Label */}
                <div className="text-center">
                  <p className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-medium text-gray-900">
                    {getStatusLabel()}
                  </p>
                  {isIdle && (
                    <p className="text-sm lg:text-base xl:text-lg 2xl:text-xl text-gray-400 mt-1 xl:mt-2">
                      Press Space to talk
                    </p>
                  )}
                </div>

                {/* Current Subtitle */}
                <AnimatePresence mode="wait">
                  {currentSubtitle && (
                    <CurrentSubtitle
                      content={currentSubtitle.content}
                      role={currentSubtitle.role}
                      isPending={currentSubtitle.isPending}
                      className="mt-2 xl:mt-4 2xl:mt-6 max-w-2xl xl:max-w-3xl 2xl:max-w-4xl"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Hidden Audio Element for Voice Chat (reads from parent's audio) */}
          <audio ref={remoteAudioElementRef} className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
