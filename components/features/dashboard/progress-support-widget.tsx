'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  CheckCircle2,
  Flame,
  Trophy,
  Zap,
  ClipboardList,
  Heart
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useDashboardStore } from '@/store/dashboard-store'
import { usePreferenceStore } from '@/store/preference-store'
import { useRewardsStore } from '@/store/rewards-store'
import { DailyMoodModal } from '@/components/features/daily-mood-modal'

export function ProgressSupportWidget() {
  const router = useRouter()
  const { stats, fetchStats } = useDashboardStore()
  const { preferences } = usePreferenceStore()
  const { totalPoints } = useRewardsStore()
  const [showMoodModal, setShowMoodModal] = useState(false)

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusMinutes = stats?.focusMinutesToday || 0
  const completedTasks = stats?.completedToday || 0
  const currentStreak = stats?.currentStreak || 0
  const goal = preferences?.dailyFocusGoalMinutes || 120

  const progressPercent = Math.min(100, Math.round((focusMinutes / goal) * 100))

  return (
    <>
      <Card className={cn(
        "bg-transparent border-0 shadow-none",
        "h-full flex flex-col",
        "transition-all duration-300"
      )}>
        {/* Section 1: Daily Progress Ring + Stats */}
        <div className="p-4 border-b border-gray-100/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 rounded-lg bg-blue-50/50">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-xs">
              Progress & Support
            </h3>
          </div>

          {/* Compact Ring + Stats Row */}
          <div className="flex items-center justify-between">
            {/* Mini Ring */}
            <div className="relative">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  className="text-blue-100"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                  className="text-blue-600 transition-all duration-500"
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - progressPercent / 100) }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-lg font-bold text-gray-900">{focusMinutes}m</div>
                <div className="text-[10px] text-gray-500">/ {goal}m</div>
              </div>
            </div>

            {/* Tiny Stats */}
            <div className="flex-1 pl-4 space-y-2">
              <div className="flex items-center gap-1.5 text-gray-700">
                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                <span className="text-xs">
                  {completedTasks > 0 ? `${completedTasks} tasks done` : 'No tasks yet'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Flame className="w-3 h-3 text-orange-600" />
                <span className="text-xs">
                  {currentStreak > 0 ? `${currentStreak} day streak` : 'Start a streak'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Rewards Slim Strip */}
        <div className="px-4 py-3 border-b border-gray-100/30 bg-white/10">
          <div className="flex items-start gap-2">
            <div className="p-1 rounded-lg bg-pink-50/50">
              <Trophy className="w-3 h-3 text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-gray-600 mb-1">Rewards</p>
              <div className="flex items-start gap-2 p-2 rounded-md bg-emerald-50/50 border border-emerald-100/50">
                <Zap className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-800">
                  +5 pts if you start a 15‑min focus now.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Quick Assessment */}
        <div className="px-4 py-3 border-b border-gray-100/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ClipboardList className="w-3 h-3 text-indigo-600" />
                <h4 className="font-semibold text-gray-900 text-xs">Quick Assessment</h4>
              </div>
              <p className="text-[11px] text-gray-600">
                Track your progress
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/profile?tab=assessments')}
            className="w-full h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            Start assessment
          </Button>
        </div>

        {/* Section 4: Mood Check-in */}
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Heart className="w-3 h-3 text-purple-600" />
                <h4 className="font-semibold text-gray-900 text-xs">Mood Check-in</h4>
              </div>
              <p className="text-[11px] text-gray-600">
                How are you feeling?
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMoodModal(true)}
            className="w-full h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            Check in
          </Button>
        </div>
      </Card>

      {/* Mood Modal */}
      <DailyMoodModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onComplete={() => setShowMoodModal(false)}
      />
    </>
  )
}
