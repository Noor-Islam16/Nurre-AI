'use client'

import { useMemo } from 'react'
import { MessageCircle, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimerDisplayV2 } from './timer-display-v2'
import { TaskSelectorV2 } from './task-selector-v2'
import { DurationSegmented } from './duration-segmented'
import { SmartRecommendation } from './smart-recommendation'
import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'

interface FocusSetupProps {
  duration: number
  selectedTaskId: string | null
  selectedTaskTitle: string | null
  onDurationChange: (duration: number) => void
  onSelectTask: (taskId: string, meta?: { title?: string; estimate?: number }) => void
  onUnlinkTask: () => void
  onStart: () => void
  onOpenCoach: () => void
}

/**
 * FocusSetup Component - Landscape-Optimized
 *
 * Uses horizontal space efficiently on widescreen displays.
 * - Desktop: Timer on left, controls on right (side-by-side)
 * - Mobile: Stacked vertically
 * - No scrolling required on desktop
 */
export function FocusSetup({
  duration,
  selectedTaskId,
  selectedTaskTitle,
  onDurationChange,
  onSelectTask,
  onUnlinkTask,
  onStart,
  onOpenCoach
}: FocusSetupProps) {
  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])

  const handleAcceptRecommendation = (taskId: string | null, recommendedDuration: number) => {
    if (taskId) {
      onSelectTask(taskId, { estimate: recommendedDuration })
    }
    onDurationChange(recommendedDuration)
  }

  return (
    <div className="w-full max-w-[min(90vw,1600px)] mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-8 min-h-[calc(100vh-8rem)] flex items-center justify-center">
      {/* Landscape layout: Timer left, Controls right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-8 lg:gap-16 w-full">

        {/* Left: Hero Timer */}
        <div className="flex flex-col items-center justify-center lg:flex-1">
          <TimerDisplayV2
            mode="setup"
            timeDisplay={`${duration}:00`}
            progress={0}
          />
        </div>

        {/* Right: Controls Panel */}
        <div className="flex flex-col gap-5 lg:flex-1 lg:max-w-md">
          {/* Smart Recommendation */}
          <SmartRecommendation
            onAccept={handleAcceptRecommendation}
          />

          {/* Task Selector */}
          <TaskSelectorV2
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            onUnlink={onUnlinkTask}
            placeholder="Select a task... (optional)"
          />

          {/* Duration Pills */}
          <DurationSegmented
            value={duration}
            onChange={onDurationChange}
            disabled={false}
          />

          {/* Start Button */}
          <Button
            onClick={onStart}
            className="w-full h-14 lg:h-16 text-lg lg:text-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg rounded-xl"
            size="lg"
          >
            <Play className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
            Start Focus Session
          </Button>

          {/* Footer */}
          <div className="flex items-center justify-center gap-3 text-sm lg:text-base text-gray-500">
            <span>
              Press <kbd className="px-1.5 py-0.5 lg:px-2 lg:py-1 bg-gray-100 border border-gray-300 rounded text-gray-700 font-mono text-xs lg:text-sm">Enter</kbd> to start
            </span>
            <span className="text-gray-300">·</span>
            <button
              onClick={onOpenCoach}
              className="inline-flex items-center gap-1.5 lg:gap-2 text-violet-600 hover:text-violet-700 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5" />
              Ask {personality.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
