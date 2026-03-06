'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface StatsSummaryProps {
  points: number
  level: number
  currentStreak: number
  longestStreak: number
  onStart15: () => void
}

export function StatsSummary({
  points,
  level,
  currentStreak,
  longestStreak,
  onStart15
}: StatsSummaryProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <Card className="bg-transparent border-0 shadow-none">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1: Points/Level with Start CTA */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0 }}
            className="space-y-3"
          >
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-gray-900">{points}</span>
                <span className="text-sm font-medium text-gray-600">points</span>
              </div>
              <div className="text-sm text-gray-600">
                Level <span className="font-semibold text-gray-900">{level}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                +5 if you start a 15-min now
              </p>
              <Button
                onClick={onStart15}
                className={cn(
                  "w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white",
                  "focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
                  "transition-colors duration-200"
                )}
              >
                Start 15m
              </Button>
            </div>
          </motion.div>

          {/* Column 2: Streak with flame chip */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.05 }}
            className="space-y-3 border-l border-gray-200 pl-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Flame className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Streak</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{currentStreak}</span>
                <span className="text-sm text-gray-600">day{currentStreak !== 1 ? 's' : ''}</span>
              </div>
              <div className="text-xs text-gray-600">
                Longest: <span className="font-semibold text-gray-900">{longestStreak}</span> day{longestStreak !== 1 ? 's' : ''}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Card>
  )
}
