'use client'

import { MessageCircle } from 'lucide-react'
import { TimerDisplayV2 } from './timer-display-v2'
import { LinearProgress } from './linear-progress'
import { InlineNudge } from './inline-nudge'
import { FocusControls } from './focus-controls'

interface FocusRunningProps {
  timeDisplay: string
  progress: number
  timeRemaining: number
  isPaused: boolean
  taskTitle: string | null
  onEnd: () => void
  onOpenCoach: () => void
}

/**
 * FocusRunning Component - Landscape-Optimized
 *
 * "Flow Mode" running experience optimized for widescreen displays.
 * - Desktop: Timer on left, info/controls on right
 * - Mobile: Stacked vertically
 * - No scrolling required on desktop
 */
export function FocusRunning({
  timeDisplay,
  progress,
  timeRemaining,
  isPaused,
  taskTitle,
  onEnd,
  onOpenCoach
}: FocusRunningProps) {
  return (
    <div className="w-full max-w-[min(90vw,1600px)] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-8 min-h-[calc(100vh-8rem)] flex items-center justify-center">
      {/* Landscape layout: Timer left, Controls right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-8 lg:gap-16 w-full">

        {/* Left: Hero Timer */}
        <div className="flex flex-col items-center justify-center lg:flex-1">
          <TimerDisplayV2
            mode="running"
            timeDisplay={timeDisplay}
            progress={progress}
            isPaused={isPaused}
          />

          {/* Linear Progress below timer */}
          <div className="w-full max-w-xs mt-6">
            <LinearProgress progress={progress} showPercentage />
          </div>
        </div>

        {/* Right: Info & Controls */}
        <div className="flex flex-col items-center lg:items-start gap-6 lg:flex-1 lg:max-w-md">
          {/* Task Label */}
          {taskTitle && (
            <div className="text-center lg:text-left">
              <p className="text-sm text-gray-500">Working on</p>
              <p className="text-xl font-semibold text-gray-900">{taskTitle}</p>
            </div>
          )}

          {/* Inline Nudge */}
          <div className="w-full">
            <InlineNudge
              progress={progress}
              timeRemaining={timeRemaining}
              isPaused={isPaused}
            />
          </div>

          {/* Focus Controls */}
          <div className="w-full">
            <FocusControls onEnd={onEnd} />
          </div>

          {/* Coach Toggle */}
          <div className="flex justify-center lg:justify-start w-full">
            <button
              onClick={onOpenCoach}
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Chat with Nuree
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
