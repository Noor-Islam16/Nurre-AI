'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, CheckCircle, Clock, Flame, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsPillRowProps {
  daysActiveThisMonth?: number
  totalTasksCompleted?: number
  totalFocusMinutes?: number
  currentStreak?: number
  className?: string
}

interface StatPill {
  icon: LucideIcon
  label: string
  value: string | number
  color: 'blue' | 'teal' | 'emerald' | 'rose'
}

const colorMap: Record<StatPill['color'], { bg: string; icon: string }> = {
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600'
  },
  teal: {
    bg: 'bg-teal-100',
    icon: 'text-teal-600'
  },
  emerald: {
    bg: 'bg-emerald-100',
    icon: 'text-emerald-600'
  },
  rose: {
    bg: 'bg-rose-100',
    icon: 'text-rose-600'
  }
}

export function StatsPillRow({
  daysActiveThisMonth = 0,
  totalTasksCompleted = 0,
  totalFocusMinutes = 0,
  currentStreak = 0,
  className
}: StatsPillRowProps) {
  const shouldReduceMotion = useReducedMotion()

  // Convert focus minutes to hours
  const focusHours = Math.round((totalFocusMinutes / 60) * 10) / 10

  const stats: StatPill[] = [
    {
      icon: Calendar,
      label: 'Days Active',
      value: daysActiveThisMonth,
      color: 'blue'
    },
    {
      icon: CheckCircle,
      label: 'Tasks Done',
      value: totalTasksCompleted,
      color: 'teal'
    },
    {
      icon: Clock,
      label: 'Focus Time',
      value: focusHours > 0 ? `${focusHours}h` : '0h',
      color: 'emerald'
    },
    {
      icon: Flame,
      label: 'Streak',
      value: `${currentStreak}d`,
      color: 'rose'
    }
  ]

  return (
    <div className={cn(
      "flex gap-3 overflow-x-auto pb-2 scrollbar-hide",
      "md:flex-wrap md:justify-center md:overflow-visible",
      className
    )}>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const colors = colorMap[stat.color]

        return (
          <motion.div
            key={stat.label}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5",
              "rounded-full bg-white border border-gray-200",
              "shadow-sm hover:shadow-md transition-shadow duration-200",
              "shrink-0"
            )}
            initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.1, duration: 0.3 }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
          >
            {/* Icon */}
            <div className={cn("p-1.5 rounded-full", colors.bg)}>
              <Icon className={cn("w-4 h-4", colors.icon)} />
            </div>

            {/* Value and Label */}
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 leading-tight">
                {stat.value}
              </span>
              <span className="text-xs text-gray-500">
                {stat.label}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
