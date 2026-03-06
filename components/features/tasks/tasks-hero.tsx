'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TasksHeroProps {
  completedCount: number
  dailyGoal: number
  currentStreak: number
  className?: string
}

// Encouraging messages based on progress
function getEncouragement(completed: number, goal: number): string {
  if (completed === 0) return "Let\u2019s get started! Pick something small."
  if (completed < goal) {
    const remaining = goal - completed
    if (remaining === 1) return "Almost there! One more task."
    return `Nice! ${remaining} more to hit your goal.`
  }
  if (completed === goal) return "Goal reached! Keep the momentum!"
  return "You\u2019re on fire! Amazing work!"
}

export function TasksHero({ completedCount, dailyGoal, currentStreak, className }: TasksHeroProps) {
  const shouldReduceMotion = useReducedMotion()

  // Calculate progress percentage
  const progress = Math.min((completedCount / dailyGoal) * 100, 100)
  const encouragement = getEncouragement(completedCount, dailyGoal)

  // SVG ring calculations - base size, CSS handles responsive
  const size = 80
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress / 100)

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.1 }}
      className={cn(
        "bg-white/30 backdrop-blur-sm rounded-2xl xl:rounded-3xl p-6 xl:p-8 2xl:p-10",
        className
      )}
    >
      <div className="flex items-center justify-between">
        {/* Progress Ring and Text */}
        <div className="flex items-center gap-4 xl:gap-6 2xl:gap-8">
          {/* SVG Progress Ring */}
          <div className="relative w-20 h-20 xl:w-28 xl:h-28 2xl:w-36 2xl:h-36 flex-shrink-0">
            <svg
              className="transform -rotate-90 w-full h-full"
              viewBox={`0 0 ${size} ${size}`}
              aria-hidden="true"
            >
              {/* Gradient Definition */}
              <defs>
                <linearGradient id="task-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#14B8A6" /> {/* teal-500 */}
                  <stop offset="100%" stopColor="#0D9488" /> {/* teal-600 */}
                </linearGradient>
              </defs>

              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#F0FDFA" // teal-50
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Progress Arc */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#task-ring-gradient)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
              />
            </svg>

            {/* Center Number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-teal-700">
                {completedCount}/{dailyGoal}
              </span>
            </div>
          </div>

          {/* Text */}
          <div>
            <h2 className="text-lg xl:text-xl 2xl:text-2xl font-semibold text-gray-900">Today&apos;s Progress</h2>
            <p className="text-sm xl:text-base 2xl:text-lg text-gray-600">
              {completedCount} of {dailyGoal} tasks done
            </p>
            <motion.p
              key={encouragement}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm xl:text-base 2xl:text-lg text-teal-600 font-medium mt-0.5 xl:mt-1"
            >
              {encouragement}
            </motion.p>
          </div>
        </div>

        {/* Streak Pill */}
        {currentStreak > 0 && (
          <motion.div
            initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 15, delay: 0.2 }}
            className="flex items-center gap-1.5 xl:gap-2 2xl:gap-3 px-3 py-1.5 xl:px-4 xl:py-2 2xl:px-5 2xl:py-2.5 bg-rose-50 text-rose-700 rounded-full"
          >
            <Flame className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />
            <span className="text-sm xl:text-base 2xl:text-lg font-semibold">{currentStreak} day streak</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
