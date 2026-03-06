'use client'

import { motion } from 'framer-motion'
import { Target, Clock, CheckCircle, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsBarProps {
  todaysTasks: number
  completedToday: number
  focusMinutes: number
  currentStreak: number
  dailyTaskGoal: number
  streakIncreased?: boolean
  className?: string
  isLoading?: boolean
}

// Calculate percentage for progress bars
function getCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return completed > 0 ? 100 : 0
  return Math.min(Math.round((completed / total) * 100), 100)
}

// Format focus time to be more readable
function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

// Mini progress bar component
function ProgressBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="w-full h-1 xl:h-1.5 2xl:h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn("h-full rounded-full", color)}
      />
    </div>
  )
}

// Individual stat card with consistent height and color theme
function StatCard({
  icon: Icon,
  label,
  value,
  maxValue,
  color,
  bgColor,
  borderColor,
  format,
  index,
  showDots = false
}: {
  icon: any
  label: string
  value: number
  maxValue?: number
  color: string
  bgColor: string
  borderColor: string
  format?: (val: number) => string
  index: number
  showDots?: boolean
}) {
  const displayValue = format ? format(value) : value.toString()
  const percentage = maxValue ? getCompletionPercentage(value, maxValue) : 0
  const showProgress = maxValue !== undefined && !showDots

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-1 min-w-0"
    >
      <div className={cn(
        "h-[4.5rem] xl:h-[5.5rem] 2xl:h-[6.5rem] bg-white/25 backdrop-blur-sm rounded-lg xl:rounded-xl",
        "hover:bg-white/35 transition-all duration-200",
        "relative overflow-hidden"
      )}>
        {/* Colored left border */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 xl:w-1.5", borderColor)} />

        {/* Content with subtle colored background */}
        <div className={cn("h-full flex flex-col justify-between p-3 xl:p-4 2xl:p-5 pl-4 xl:pl-5 2xl:pl-6", bgColor)}>
          {/* Top row: Icon, label and value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 xl:gap-3">
              <Icon className={cn("w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6", color)} />
              <span className="text-xs xl:text-sm 2xl:text-base font-medium text-gray-600">{label}</span>
            </div>
            <span className={cn("font-mono text-lg xl:text-xl 2xl:text-2xl font-bold", color)}>
              {displayValue}
            </span>
          </div>

          {/* Bottom row: Progress indicator */}
          <div className="mt-1 xl:mt-2">
            {showProgress ? (
              <div className="space-y-1 xl:space-y-1.5">
                <ProgressBar percentage={percentage} color={borderColor} />
                {maxValue > 0 && (
                  <p className="text-xs xl:text-sm 2xl:text-base text-gray-500 text-right">
                    {value}/{maxValue}
                  </p>
                )}
              </div>
            ) : showDots ? (
              // Streak dots visualization
              <div className="flex items-center gap-1 xl:gap-1.5 2xl:gap-2">
                {[...Array(Math.min(7, Math.max(0, value)))].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className={cn(
                      "w-1.5 h-1.5 xl:w-2 xl:h-2 2xl:w-2.5 2xl:h-2.5 rounded-full",
                      i < value ? borderColor : 'bg-gray-300'
                    )}
                  />
                ))}
                {value > 7 && (
                  <span className="text-xs xl:text-sm 2xl:text-base text-gray-500 ml-1">+{value - 7}</span>
                )}
              </div>
            ) : (
              <div className="h-4 xl:h-5 2xl:h-6" /> // Spacer to maintain height
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function StatsBar(props: StatsBarProps) {
  const { className, isLoading = false } = props

  // Use the daily task goal from dashboard store
  const DAILY_TASK_GOAL = props.dailyTaskGoal
  const DAILY_FOCUS_GOAL = 120 // 2 hours in minutes

  // Calculate task progress percentage based on daily goal
  const taskPercentage = getCompletionPercentage(props.completedToday, DAILY_TASK_GOAL)

  if (isLoading) {
    return (
      <div className={cn(
        "p-3 xl:p-4 2xl:p-5",
        className
      )}>
        <div className="flex gap-2 md:gap-3 xl:gap-4 2xl:gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex-1 h-[4.5rem] xl:h-[5.5rem] 2xl:h-[6.5rem] bg-white/20 backdrop-blur-sm rounded-lg xl:rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "p-3 xl:p-4 2xl:p-5",
      className
    )}>
      <div className="flex gap-2 md:gap-3 xl:gap-4 2xl:gap-5">
        {/* Tasks - Just shows total tasks today */}
        <StatCard
          icon={Target}
          label="Tasks"
          value={props.todaysTasks}
          color="text-teal-600"
          bgColor="bg-teal-50/30"
          borderColor="bg-teal-500"
          index={0}
        />

        {/* Daily Goal - Shows progress */}
        <StatCard
          icon={CheckCircle}
          label="Daily Goal"
          value={props.completedToday}
          maxValue={DAILY_TASK_GOAL}
          color="text-violet-600"
          bgColor="bg-violet-50/30"
          borderColor="bg-violet-500"
          format={(val) => `${val}/${DAILY_TASK_GOAL}`}
          index={1}
        />

        {/* Focus Time */}
        <StatCard
          icon={Clock}
          label="Focus"
          value={props.focusMinutes}
          maxValue={DAILY_FOCUS_GOAL}
          color="text-emerald-600"
          bgColor="bg-emerald-50/30"
          borderColor="bg-emerald-500"
          format={formatFocusTime}
          index={2}
        />

        {/* Streak */}
        <StatCard
          icon={Flame}
          label="Streak"
          value={props.currentStreak}
          color="text-rose-700"
          bgColor="bg-pink-50/30"
          borderColor="bg-rose-600"
          format={(val) => val === 1 ? '1 day' : `${val} days`}
          index={3}
          showDots={true}
        />
      </div>
    </div>
  )
}