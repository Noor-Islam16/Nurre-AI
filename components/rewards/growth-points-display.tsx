'use client'

import { useEffect } from 'react'
import { useRewardsStore } from '@/store/rewards-store'
import { motion } from 'framer-motion'
import { Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GrowthPointsDisplayProps {
  className?: string
  compact?: boolean
}

export function GrowthPointsDisplay({
  className,
  compact = false
}: GrowthPointsDisplayProps) {
  const {
    growthPoints,
    currentLevel,
    getLevelTitle,
    getProgressToNextLevel,
    getNextLevelThreshold,
    isLoadingGP,
    fetchGrowthPoints
  } = useRewardsStore()

  // Fetch growth points on mount
  useEffect(() => {
    fetchGrowthPoints()
  }, [fetchGrowthPoints])

  const progress = getProgressToNextLevel()
  const nextThreshold = getNextLevelThreshold()
  const levelTitle = getLevelTitle()
  const gpToNextLevel = nextThreshold ? nextThreshold - growthPoints : 0

  if (isLoadingGP) {
    return (
      <div className={cn(
        "bg-rose-50 rounded-xl p-4 animate-pulse",
        className
      )}>
        <div className="h-8 bg-rose-200 rounded w-24 mb-2" />
        <div className="h-4 bg-rose-200 rounded w-32" />
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 bg-rose-50 rounded-lg px-3 py-2",
        className
      )}>
        <Star className="w-4 h-4 text-rose-500" />
        <span className="font-bold text-rose-700">
          {growthPoints.toLocaleString()} pts
        </span>
        <span className="text-xs text-rose-500">Lv {currentLevel}</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border border-rose-100",
      className
    )}>
      {/* Header with points total */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-100 rounded-lg">
            <Star className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <motion.div
              key={growthPoints}
              initial={{ scale: 1.2, color: '#be185d' }}
              animate={{ scale: 1, color: '#9f1239' }}
              className="text-2xl font-bold text-rose-800"
            >
              {growthPoints.toLocaleString()} Growth Points
            </motion.div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-rose-700">
            Level {currentLevel}
          </div>
          <div className="text-xs text-rose-500">
            {levelTitle}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {currentLevel < 10 && (
        <div className="space-y-2">
          <div className="h-2.5 bg-rose-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-xs text-rose-600">
            <span>{progress}% to Level {currentLevel + 1}</span>
            <span>{gpToNextLevel.toLocaleString()} pts to go</span>
          </div>
        </div>
      )}

      {/* Max level state */}
      {currentLevel >= 10 && (
        <div className="flex items-center gap-2 text-sm text-rose-600">
          <TrendingUp className="w-4 h-4" />
          <span>Maximum level reached!</span>
        </div>
      )}
    </div>
  )
}
