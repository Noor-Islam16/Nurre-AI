'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTimerStore } from '@/store/timer-store'
import { useTaskStore } from '@/store/task-store'
import { FocusSetup } from './focus-setup'
import { FocusRunning } from './focus-running'
import { CoachDrawer } from './coach-drawer'
import { WrapupModal } from './wrapup-modal'

interface FocusPageV2Props {
  sessionId: string | null
}

type FocusViewMode = 'setup' | 'running' | 'wrapup'

/**
 * FocusPageV2 Component
 *
 * Redesigned Focus page with single-column layout.
 * - Setup State: "One-Tap Focus" experience
 * - Running State: "Flow Mode" immersive experience
 * - Coach Drawer: Slide-out AI assistant panel
 *
 * Keyboard shortcuts:
 * Setup: Enter (start), N (focus task), 1/2/3 (duration), +/- (adjust)
 * Running: Space (pause/resume), Escape (end), C (coach)
 */
export function FocusPageV2({ sessionId }: FocusPageV2Props) {
  const isRunning = useTimerStore(state => state.isRunning)
  const isPaused = useTimerStore(state => state.isPaused)
  const duration = useTimerStore(state => state.duration)
  const timeRemaining = useTimerStore(state => state.timeRemaining)
  const startTimer = useTimerStore(state => state.startTimer)
  const setDuration = useTimerStore(state => state.setDuration)
  const pauseTimer = useTimerStore(state => state.pauseTimer)
  const resumeTimer = useTimerStore(state => state.resumeTimer)

  const tasks = useTaskStore(state => state.tasks)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showWrapupModal, setShowWrapupModal] = useState(false)
  const [showCoachDrawer, setShowCoachDrawer] = useState(false)
  const [timeSpentOnSession, setTimeSpentOnSession] = useState(0)

  // Format time display
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

  // Calculate progress
  const progress = ((duration * 60 - timeRemaining) / (duration * 60)) * 100

  const mode: FocusViewMode = useMemo(() => {
    if (isRunning) {
      return 'running'
    }
    return 'setup'
  }, [isRunning])

  // Get selected task
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null

  // Handlers
  const handleSelectTask = useCallback((taskId: string, meta?: { title?: string; estimate?: number }) => {
    setSelectedTaskId(taskId)
    if (meta?.estimate && meta.estimate > 0) {
      const sanitized = Math.max(5, Math.min(120, Math.round(meta.estimate)))
      setDuration(sanitized)
    }
  }, [setDuration])

  const handleStart = useCallback(async () => {
    await startTimer(duration, selectedTaskId || undefined)
  }, [startTimer, duration, selectedTaskId])

  const handleEnd = useCallback(() => {
    const spent = Math.floor((duration * 60 - timeRemaining) / 60)
    setTimeSpentOnSession(spent)
    setShowWrapupModal(true)
  }, [duration, timeRemaining])

  const handleWrapupComplete = useCallback((action?: 'done' | 'snooze' | 'breakdown') => {
    setShowWrapupModal(false)
    setTimeSpentOnSession(0)
    if (action === 'snooze') {
      setDuration(25)
    }
  }, [setDuration])

  const handleOpenCoach = useCallback(() => {
    setShowCoachDrawer(true)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable all shortcuts when modal/drawer is open
      if (showWrapupModal || showCoachDrawer) return

      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Setup mode shortcuts
      if (mode === 'setup') {
        // Enter to start (not when typing)
        if (e.key === 'Enter' && !isTyping) {
          e.preventDefault()
          handleStart()
          return
        }

        // 1, 2, 3 for quick duration (not when typing)
        if (!isTyping) {
          if (e.key === '1') {
            e.preventDefault()
            setDuration(10)
            return
          }
          if (e.key === '2') {
            e.preventDefault()
            setDuration(25)
            return
          }
          if (e.key === '3') {
            e.preventDefault()
            setDuration(45)
            return
          }
        }
      }

      // Running mode shortcuts
      if (mode === 'running') {
        // Space to pause/resume (not when typing)
        if (e.key === ' ' && !isTyping) {
          e.preventDefault()
          if (isPaused) {
            resumeTimer()
          } else {
            pauseTimer()
          }
          return
        }

        // Escape to open wrapup
        if (e.key === 'Escape') {
          e.preventDefault()
          handleEnd()
          return
        }

        // C to open coach (not when typing)
        if (e.key.toLowerCase() === 'c' && !isTyping) {
          e.preventDefault()
          setShowCoachDrawer(true)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, showWrapupModal, showCoachDrawer, handleStart, handleEnd, isPaused, pauseTimer, resumeTimer, setDuration])

  // Voice-based duration selection
  useEffect(() => {
    const handleVoice = (event: Event) => {
      if (mode !== 'setup' || showWrapupModal) return

      const detail = (event as CustomEvent<{ transcript: string }>).detail
      if (!detail?.transcript) return
      const transcript = detail.transcript.trim()
      if (!transcript) return

      const durationMatch = transcript.match(/(\d+)\s*(minute|minutes|min|mins?|m)\b/i)
      if (durationMatch) {
        const minutes = parseInt(durationMatch[1], 10)
        if (minutes >= 5 && minutes <= 120) {
          setDuration(minutes)
        }
      }
    }

    window.addEventListener('voice-transcript', handleVoice as EventListener)
    return () => window.removeEventListener('voice-transcript', handleVoice as EventListener)
  }, [mode, setDuration, showWrapupModal])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-2 pb-8">
      <AnimatePresence mode="wait">
        {mode === 'setup' ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FocusSetup
              duration={duration}
              selectedTaskId={selectedTaskId}
              selectedTaskTitle={selectedTask?.title || null}
              onDurationChange={setDuration}
              onSelectTask={handleSelectTask}
              onUnlinkTask={() => setSelectedTaskId(null)}
              onStart={handleStart}
              onOpenCoach={handleOpenCoach}
            />
          </motion.div>
        ) : (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <FocusRunning
              timeDisplay={timeDisplay}
              progress={progress}
              timeRemaining={timeRemaining}
              isPaused={isPaused}
              taskTitle={selectedTask?.title || null}
              onEnd={handleEnd}
              onOpenCoach={handleOpenCoach}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coach Drawer */}
      <CoachDrawer
        open={showCoachDrawer}
        onOpenChange={setShowCoachDrawer}
        mode={mode === 'running' ? 'running' : 'setup'}
        sessionId={sessionId}
      />

      {/* Wrapup Modal */}
      {showWrapupModal && (
        <WrapupModal
          open={showWrapupModal}
          onOpenChange={setShowWrapupModal}
          taskId={selectedTaskId || undefined}
          taskTitle={selectedTask?.title}
          timeSpent={timeSpentOnSession}
          onComplete={handleWrapupComplete}
        />
      )}
    </div>
  )
}
