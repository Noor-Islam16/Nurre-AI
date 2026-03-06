'use client'

import { useTimerStore } from '@/store/timer-store'
import { Button } from '@/components/ui/button'
import { Pause, Play } from 'lucide-react'

interface FocusControlsProps {
  onEnd?: () => void // Optional callback for when End is clicked (for future Wrap-up modal)
}

/**
 * FocusControls Component
 *
 * In-card controls for the Focus timer during a running session.
 * Features:
 * - Pause/Resume toggle button (primary)
 * - End Session button (destructive)
 * - Accessible labels and keyboard activation
 * - Coordinates with StickyFocusController (both use same timer store)
 *
 * Note: When Task 094 (Wrap-up modal) is implemented, the End button
 * will trigger the modal instead of directly stopping the timer.
 */
export function FocusControls({ onEnd }: FocusControlsProps) {
  const isPaused = useTimerStore(state => state.isPaused)
  const pauseTimer = useTimerStore(state => state.pauseTimer)
  const resumeTimer = useTimerStore(state => state.resumeTimer)
  const stopTimer = useTimerStore(state => state.stopTimer)

  const handlePauseResume = () => {
    if (isPaused) {
      resumeTimer()
    } else {
      pauseTimer()
    }
  }

  const handleEnd = async () => {
    // If onEnd callback is provided (for Wrap-up modal), use it
    // Otherwise, directly stop the timer
    if (onEnd) {
      onEnd()
    } else {
      await stopTimer(false)
    }
  }

  return (
    <div className="flex gap-3 justify-center" role="group" aria-label="Focus session controls">
      {/* Pause/Resume Button - Large sizing */}
      <Button
        onClick={handlePauseResume}
        variant={isPaused ? "default" : "outline"}
        size="lg"
        className={isPaused
          ? "min-w-[180px] h-14 text-lg rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          : "min-w-[180px] h-14 text-lg rounded-xl gap-2 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
        }
        aria-label={isPaused ? "Resume focus session" : "Pause focus session"}
      >
        {isPaused ? (
          <>
            <Play className="w-5 h-5" />
            Resume
          </>
        ) : (
          <>
            <Pause className="w-5 h-5" />
            Pause
          </>
        )}
      </Button>

      {/* End Session Button - Large sizing */}
      <Button
        onClick={handleEnd}
        variant="outline"
        size="lg"
        className="min-w-[180px] h-14 text-lg rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
        aria-label="End focus session"
      >
        End Session
      </Button>
    </div>
  )
}
