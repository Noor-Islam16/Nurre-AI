'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineNudgeProps {
  progress: number // 0-100
  timeRemaining: number // seconds
  isPaused: boolean
  className?: string
}

/**
 * InlineNudge Component
 *
 * Displays a single motivational message during focus sessions.
 * Message changes based on progress, time remaining, and pause state.
 */
export function InlineNudge({
  progress,
  timeRemaining,
  isPaused,
  className
}: InlineNudgeProps) {
  // Determine the appropriate nudge message
  const nudgeMessage = useMemo(() => {
    if (isPaused) {
      return 'Timer paused. Resume when you\'re ready.'
    }

    // Last 5 minutes (300 seconds)
    if (timeRemaining <= 5 * 60) {
      return 'Almost done! Final push!'
    }

    // Midpoint (45-55%)
    if (progress >= 45 && progress < 55) {
      return 'Halfway there! You got this.'
    }

    // Early stage (< 25%)
    if (progress < 25) {
      return 'Strong start! Keep the momentum.'
    }

    // Late stage (> 75%)
    if (progress >= 75) {
      return 'Home stretch! Stay focused.'
    }

    // Default
    return 'You\'re making progress. Stay focused.'
  }, [progress, timeRemaining, isPaused])

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg",
        "bg-emerald-50/50 border border-emerald-100",
        "max-w-sm mx-auto",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
        <p className="text-sm text-emerald-700">{nudgeMessage}</p>
      </div>
    </div>
  )
}
