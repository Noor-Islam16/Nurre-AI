'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, Play, Settings, MessageCircle } from 'lucide-react'

interface ProposalBarV2Props {
  duration: number
  taskTitle?: string | null
  onStartNow: () => void
  onAdjust: () => void
  onAskNuree: () => void
  coachName?: string
}

/**
 * ProposalBarV2 Component
 *
 * Displays AI recommendation in setup mode with action buttons.
 * Shows recommended duration and task selection in a friendly format.
 *
 * Features:
 * - Recommendation text based on current setup
 * - Three action buttons:
 *   - Start now: Begin focus session immediately
 *   - Adjust: Focus the task selector for changes
 *   - Ask Nuree: Expand AI chat for guidance
 */
export function ProposalBarV2({
  duration,
  taskTitle,
  onStartNow,
  onAdjust,
  onAskNuree,
  coachName = 'Nuree'
}: ProposalBarV2Props) {
  const taskDisplay = taskTitle || 'No task'

  return (
    <div className="space-y-3">
      {/* Recommendation Header */}
      <div className="flex items-start gap-2">
        <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Recommended</p>
          <p className="text-sm text-gray-700 mt-1">
            <span className="font-semibold text-emerald-600">{duration} minutes</span> on{' '}
            <span className="font-medium">{taskDisplay}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onStartNow}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          Start now
        </Button>

        <Button
          onClick={onAdjust}
          size="sm"
          variant="outline"
          className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
        >
          <Settings className="w-3.5 h-3.5" />
          Adjust
        </Button>

        <Button
          onClick={onAskNuree}
          size="sm"
          variant="outline"
          className="gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Ask {coachName}
        </Button>
      </div>
    </div>
  )
}
