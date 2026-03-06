'use client'

import { Target, TrendingUp, CheckCircle, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ChallengesCardProps {
  todayChallenge: string
  nextMilestone: string
  dailyGoal: string
  onStart: () => void
}

export function ChallengesCard({
  todayChallenge,
  nextMilestone,
  dailyGoal,
  onStart
}: ChallengesCardProps) {
  return (
    <Card className="bg-transparent border-0 shadow-none">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 rounded-lg">
            <Target className="w-4 h-4 text-rose-600" />
          </div>
          Challenges & Goals
        </h2>

        {/* Three items list */}
        <div className="space-y-4 mb-6">
          {/* Today's Challenge */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-xl flex-shrink-0">
              <Target className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Today&apos;s Challenge
              </h3>
              <p className="text-sm text-gray-900 font-medium">{todayChallenge}</p>
            </div>
          </div>

          {/* Next Milestone */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-100 rounded-xl flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-pink-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Next Milestone
              </h3>
              <p className="text-sm text-gray-900 font-medium">{nextMilestone}</p>
            </div>
          </div>

          {/* Daily Goal */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-xl flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Daily Goal
              </h3>
              <p className="text-sm text-gray-900 font-medium">{dailyGoal}</p>
            </div>
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pt-4 border-t border-rose-100">
          <Button
            onClick={onStart}
            className={cn(
              'w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500',
              'hover:from-rose-600 hover:to-pink-600 text-white',
              'focus:ring-2 focus:ring-rose-500 focus:ring-offset-2',
              'transition-all duration-200 font-semibold rounded-xl',
              'shadow-md hover:shadow-lg'
            )}
          >
            <Play className="w-4 h-4 mr-2 fill-white" />
            Start 15m Focus
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Small steps lead to big progress
          </p>
        </div>
      </div>
    </Card>
  )
}
