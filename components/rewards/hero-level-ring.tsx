'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useRewardsStore } from '@/store/rewards-store'
import { cn } from '@/lib/utils'

interface HeroLevelRingProps {
  className?: string
}

export function HeroLevelRing({ className }: HeroLevelRingProps) {
  const shouldReduceMotion = useReducedMotion()
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
  const ptsToNextLevel = nextThreshold ? nextThreshold - growthPoints : 0
  const isMaxLevel = currentLevel >= 10

  // SVG circle calculations
  const size = 280
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress / 100)

  if (isLoadingGP) {
    return (
      <div className={cn("flex flex-col items-center", className)}>
        <div className="w-[280px] h-[280px] xl:w-[360px] xl:h-[360px] 2xl:w-[440px] 2xl:h-[440px] rounded-full bg-rose-50 animate-pulse" />
        <div className="mt-4 xl:mt-6 2xl:mt-8 h-4 xl:h-5 2xl:h-6 w-32 xl:w-40 2xl:w-48 bg-rose-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Ring Container */}
      <div className="relative w-[280px] h-[280px] xl:w-[360px] xl:h-[360px] 2xl:w-[440px] 2xl:h-[440px]">
        {/* Outer Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-200/60 via-pink-200/40 to-rose-300/60 blur-2xl"
          animate={shouldReduceMotion ? {} : {
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* SVG Progress Ring */}
        <svg
          className="absolute inset-0 transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="level-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" /> {/* rose-400 */}
              <stop offset="100%" stopColor="#EC4899" /> {/* pink-500 */}
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#FFE4E6" // rose-100
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#level-ring-gradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: shouldReduceMotion ? strokeDashoffset : strokeDashoffset }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Level Badge */}
          <motion.div
            className="px-4 py-1.5 xl:px-5 xl:py-2 2xl:px-6 2xl:py-2.5 bg-gradient-to-br from-rose-500 to-pink-600 text-white text-sm xl:text-base 2xl:text-lg font-bold rounded-full shadow-lg"
            initial={shouldReduceMotion ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 15, delay: 0.3 }}
          >
            LEVEL {currentLevel}
          </motion.div>

          {/* Level Title */}
          <motion.div
            className="mt-2 xl:mt-3 2xl:mt-4 text-lg xl:text-xl 2xl:text-2xl font-semibold text-gray-800"
            initial={shouldReduceMotion ? {} : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4, duration: 0.3 }}
          >
            {levelTitle}
          </motion.div>

          {/* Growth Points Total */}
          <motion.div
            className="mt-3 xl:mt-4 2xl:mt-5 flex items-center gap-2 xl:gap-3"
            initial={shouldReduceMotion ? {} : { y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.5, duration: 0.3 }}
          >
            <Star className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 text-rose-500 fill-rose-500" />
            <span className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-rose-700">
              {growthPoints.toLocaleString()}
            </span>
            <span className="text-sm xl:text-base 2xl:text-lg text-gray-600">pts</span>
          </motion.div>
        </div>
      </div>

      {/* Progress Text Below Ring */}
      <motion.div
        className="mt-4 xl:mt-6 2xl:mt-8 text-center"
        initial={shouldReduceMotion ? {} : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.6, duration: 0.3 }}
      >
        {isMaxLevel ? (
          <p className="text-sm xl:text-base 2xl:text-lg font-medium text-rose-600">
            Maximum level reached! You&apos;re a Grandmaster!
          </p>
        ) : (
          <p className="text-sm xl:text-base 2xl:text-lg text-gray-600">
            <span className="font-semibold text-rose-600">{progress}%</span>
            {' '}to Level {currentLevel + 1}
            <span className="mx-2">•</span>
            <span className="font-medium text-gray-700">{ptsToNextLevel.toLocaleString()} pts to go</span>
          </p>
        )}
      </motion.div>
    </div>
  )
}
