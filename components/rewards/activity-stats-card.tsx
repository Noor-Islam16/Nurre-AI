'use client'

import { Calendar, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ActivityStatsCardProps {
  daysActiveThisMonth?: number
  totalTasksCompleted?: number
  totalFocusMinutes?: number
  currentStreak?: number
  longestStreak?: number
}

export function ActivityStatsCard({
  daysActiveThisMonth = 0,
  totalTasksCompleted = 0,
  totalFocusMinutes = 0,
  currentStreak = 0,
  longestStreak = 0
}: ActivityStatsCardProps) {
  const focusHours = Math.round((totalFocusMinutes / 60) * 10) / 10

  const stats = [
    {
      icon: Calendar,
      label: 'Days active this month',
      value: daysActiveThisMonth,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: CheckCircle,
      label: 'Tasks completed',
      value: totalTasksCompleted,
      color: 'text-teal-600',
      bg: 'bg-teal-100'
    },
    {
      icon: Clock,
      label: 'Focus time',
      value: focusHours > 0 ? `${focusHours}h` : '0h',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      icon: TrendingUp,
      label: 'Current streak',
      value: `${currentStreak} days`,
      sublabel: longestStreak > 0 ? `Best: ${longestStreak}` : undefined,
      color: 'text-violet-600',
      bg: 'bg-violet-100'
    }
  ]

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Your Progress
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500">
                  {stat.label}
                </div>
                {stat.sublabel && (
                  <div className="text-xs text-gray-400">
                    {stat.sublabel}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
