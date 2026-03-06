'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, Play, Loader2 } from 'lucide-react'
import { useFocusRecommendation } from '@/hooks/use-focus-recommendation'
import { useUserStore } from '@/store/user-store'
import { getPersonality } from '@/lib/config/personalities'
import { cn } from '@/lib/utils'

interface SmartRecommendationProps {
  onAccept: (taskId: string | null, duration: number) => void
  className?: string
}

/**
 * SmartRecommendation Component
 *
 * Displays AI-powered recommendation for focus sessions.
 * Shows suggested task and duration with Accept/Customize actions.
 */
export function SmartRecommendation({
  onAccept,
  className
}: SmartRecommendationProps) {
  const recommendation = useFocusRecommendation()
  const { profile } = useUserStore()
  const personality = getPersonality(profile?.selected_personality)
  const coachName = personality.name

  const handleAccept = () => {
    onAccept(recommendation.taskId, recommendation.duration)
  }

  if (recommendation.isLoading) {
    return (
      <div className={cn(
        "p-4 lg:p-5 rounded-xl",
        "bg-violet-50/30 backdrop-blur-sm",
        className
      )}>
        <div className="flex items-center gap-2 lg:gap-3">
          <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 text-violet-500 animate-spin" />
          <span className="text-sm lg:text-base text-gray-600">Getting recommendation...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "p-4 lg:p-5 rounded-xl",
      "bg-violet-50/30 backdrop-blur-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-2 lg:gap-3 mb-3 lg:mb-4">
        <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-violet-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm lg:text-base text-gray-700">
            <span className="font-medium text-gray-900">{coachName}</span>
            {' recommends starting with '}
            <span className="font-semibold text-emerald-600">
              {recommendation.duration} minutes
            </span>
            {recommendation.taskTitle && (
              <>
                {' on '}
                <span className="font-medium text-gray-900">
                  {recommendation.taskTitle}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Accept Button */}
      <Button
        onClick={handleAccept}
        size="sm"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 lg:gap-2 h-11 lg:h-12 lg:text-base"
      >
        <Play className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        Accept
      </Button>
    </div>
  )
}
