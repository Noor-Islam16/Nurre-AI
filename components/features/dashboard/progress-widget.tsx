'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingUp, CheckCircle2, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/store/dashboard-store'
import { usePreferenceStore } from '@/store/preference-store'

export function ProgressWidget() {
  const { stats, fetchStats } = useDashboardStore()
  const { preferences, setDailyFocusGoal } = usePreferenceStore()
  const [isSettingGoal, setIsSettingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusMinutes = stats?.focusMinutesToday || 0
  const completedTasks = stats?.completedToday || 0
  const currentStreak = stats?.currentStreak || 0
  const goal = preferences?.dailyFocusGoalMinutes || 120

  const progressPercent = Math.min(100, Math.round((focusMinutes / goal) * 100))
  const hasGoal = goal > 0

  const handleSetGoal = () => {
    const value = parseInt(goalInput)
    if (!isNaN(value) && value > 0) {
      setDailyFocusGoal(value)
      setIsSettingGoal(false)
      setGoalInput('')
    }
  }

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "h-[12rem] xl:h-[15rem] 2xl:h-[18rem] overflow-hidden",
      "transition-all duration-300"
    )}>
      <CardContent className="p-4 xl:p-5 2xl:p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 xl:mb-4">
          <div className="flex items-center gap-2 xl:gap-3">
            <div className="p-1.5 xl:p-2 2xl:p-2.5 rounded-lg xl:rounded-xl bg-blue-50">
              <TrendingUp className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm xl:text-base 2xl:text-lg">
              Today&apos;s Progress
            </h3>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* SVG Donut Chart */}
            <svg className="w-24 h-24 xl:w-32 xl:h-32 2xl:w-40 2xl:h-40 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="50%"
                cy="50%"
                r="40%"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-blue-100"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50%"
                cy="50%"
                r="40%"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                className="text-blue-600 transition-all duration-500"
                strokeLinecap="round"
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - progressPercent / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-gray-900">{focusMinutes}m</div>
              <div className="text-xs xl:text-sm 2xl:text-base text-gray-600">/ {goal}m</div>
            </div>
          </div>
        </div>

        {/* Bottom stats or goal setter */}
        {!hasGoal || isSettingGoal ? (
          <div className="flex items-center gap-2 xl:gap-3">
            <Input
              type="number"
              placeholder="60"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetGoal()}
              className="h-7 xl:h-9 2xl:h-11 text-xs xl:text-sm 2xl:text-base"
              min="1"
            />
            <Button
              size="sm"
              onClick={handleSetGoal}
              className="h-7 xl:h-9 2xl:h-11 px-2 xl:px-3 2xl:px-4 text-xs xl:text-sm 2xl:text-base bg-blue-600 hover:bg-blue-700"
            >
              Set
            </Button>
            {isSettingGoal && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsSettingGoal(false)
                  setGoalInput('')
                }}
                className="h-7 xl:h-9 2xl:h-11 px-2 xl:px-3 2xl:px-4 text-xs xl:text-sm 2xl:text-base"
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs xl:text-sm 2xl:text-base">
            {focusMinutes === 0 && completedTasks === 0 ? (
              <div className="w-full text-center">
                <p className="text-gray-700 font-medium">
                  First 5 minutes count—ready?
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 xl:gap-1.5 text-gray-700">
                  <CheckCircle2 className="w-3 h-3 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-teal-600" />
                  <span>{completedTasks > 0 ? `${completedTasks} tasks done` : 'Start your first task'}</span>
                </div>
                <div className="text-gray-400">•</div>
                <div className="flex items-center gap-1 xl:gap-1.5 text-gray-700">
                  <Flame className="w-3 h-3 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-orange-600" />
                  <span>{currentStreak > 0 ? `${currentStreak} day streak` : 'Build your streak'}</span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
