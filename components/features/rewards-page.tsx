'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { useRewardsStore } from '@/store/rewards-store'
import { motion, useReducedMotion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import confetti from 'canvas-confetti'
import { AchievementDetailsModal } from './achievement-details-modal'
import { HeroLevelRing } from '@/components/rewards/hero-level-ring'
import { DailyBonusBanner } from '@/components/rewards/daily-bonus-banner'
import { StatsPillRow } from '@/components/rewards/stats-pill-row'
import { AchievementsGrid } from '@/components/rewards/achievements-grid'
import { ChallengesCard } from '@/components/rewards/challenges-card'
import {
  Achievement,
  ACHIEVEMENT_DEFINITIONS
} from '@/lib/constants/achievements'

export function RewardsPage() {
  const shouldReduceMotion = useReducedMotion()
  const {
    currentStreak,
    longestStreak,
    achievements,
    fetchRewards,
    fetchGrowthPoints,
  } = useRewardsStore()

  const { toast } = useToast()
  const router = useRouter()

  // Activity stats from API
  const [activityStats, setActivityStats] = useState({
    totalTasksCompleted: 0,
    totalFocusMinutes: 0,
    daysActiveThisMonth: 0,
    tasksToday: 0
  })

  // Initialize and fetch rewards
  useEffect(() => {
    fetchRewards()
    fetchGrowthPoints()

    // Fetch additional activity stats
    const fetchActivityStats = async () => {
      try {
        const response = await fetch('/api/rewards')
        if (response.ok) {
          const data = await response.json()
          setActivityStats({
            totalTasksCompleted: data.totalTasksCompleted || 0,
            totalFocusMinutes: data.totalFocusMinutes || 0,
            daysActiveThisMonth: data.tasksThisWeek ? Math.ceil(data.tasksThisWeek / 3) : 0, // Approximate
            tasksToday: data.tasksToday || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch activity stats:', error)
      }
    }

    fetchActivityStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for achievement unlocks
  useEffect(() => {
    const handleAchievementUnlock = (event: CustomEvent) => {
      const achievement = event.detail
      triggerCelebration(achievement.title)
    }

    window.addEventListener('achievement-unlocked', handleAchievementUnlock as EventListener)
    return () => window.removeEventListener('achievement-unlocked', handleAchievementUnlock as EventListener)
  }, [])

  // Trigger celebration with confetti and toast
  const triggerCelebration = useCallback((message: string) => {
    // Fire confetti only if motion is not reduced
    if (!shouldReduceMotion) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#f43f5e', '#fb7185', '#fda4af'] // Rose/pink colors
      })
    }

    // Show toast
    toast({
      title: 'Achievement Unlocked!',
      description: message,
    })
  }, [toast, shouldReduceMotion])

  // Handle sharing achievement
  const handleShareAchievement = useCallback((achievement: Achievement) => {
    const shareText = `I just unlocked "${achievement.title}" in NureeAI! ${achievement.description}`

    if (navigator.share) {
      navigator.share({
        title: 'Achievement Unlocked!',
        text: shareText,
      })
    } else {
      navigator.clipboard.writeText(shareText)
      toast({
        title: 'Copied to Clipboard',
        description: 'Achievement details copied to share!',
      })
    }
  }, [toast])

  // State for modal
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Merge achievement definitions with progress data
  const mergedAchievements = useMemo(() => {
    return ACHIEVEMENT_DEFINITIONS.map(def => {
      const progressData = achievements.find(a => a.id === def.id)
      return {
        ...def,
        progress: progressData?.progress || 0,
        unlocked: progressData?.unlocked || false,
        unlockedAt: progressData?.unlockedAt
      } as Achievement
    })
  }, [achievements])

  // Calculate daily goal message
  const dailyGoal = useMemo(() => {
    const tasksToday = activityStats.tasksToday || 0
    const tasksRemaining = Math.max(0, 3 - tasksToday)
    if (tasksRemaining > 0) {
      return `Complete ${tasksRemaining} more ${tasksRemaining === 1 ? 'task' : 'tasks'} today`
    }
    return 'Daily tasks complete!'
  }, [activityStats.tasksToday])

  // Handle Start 15m CTA
  const handleStart15m = useCallback(() => {
    router.push('/focus?duration=15&autostart=true')
  }, [router])

  // Count unlocked achievements
  const unlockedCount = mergedAchievements.filter(a => a.unlocked).length

  return (
    <div className="space-y-8 xl:space-y-10 2xl:space-y-12 pb-8 xl:pb-10 2xl:pb-12">
      {/* Hero: Level Ring */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
      >
        <HeroLevelRing />
      </motion.div>

      {/* Daily Bonus Banner */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.1 }}
      >
        <DailyBonusBanner />
      </motion.div>

      {/* Stats Pills Row */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.15 }}
      >
        <StatsPillRow
          daysActiveThisMonth={activityStats.daysActiveThisMonth}
          totalTasksCompleted={activityStats.totalTasksCompleted}
          totalFocusMinutes={activityStats.totalFocusMinutes}
          currentStreak={currentStreak}
        />
      </motion.div>

      {/* Challenges & Goals Card - Now Prominent */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.2 }}
      >
        <ChallengesCard
          todayChallenge="Start a focus session"
          nextMilestone="Keep making progress!"
          dailyGoal={dailyGoal}
          onStart={handleStart15m}
        />
      </motion.div>

      {/* Achievements Section */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.25 }}
      >
        {/* Section Header */}
        <div className="mb-5 xl:mb-6 2xl:mb-8">
          <h2 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-gray-900 flex items-center gap-2 xl:gap-3">
            <div className="p-2 xl:p-2.5 2xl:p-3 bg-rose-100 rounded-xl xl:rounded-2xl">
              <Trophy className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 text-rose-600" />
            </div>
            Achievements
            <span className="ml-2 text-sm xl:text-base 2xl:text-lg font-normal text-gray-500">
              ({unlockedCount} of {mergedAchievements.length} unlocked)
            </span>
          </h2>
          <p className="text-sm xl:text-base 2xl:text-lg text-gray-600 mt-1 xl:mt-2">
            Your collection of accomplishments
          </p>
        </div>

        {/* Achievements Grid */}
        <AchievementsGrid
          items={mergedAchievements}
          onShare={handleShareAchievement}
        />
      </motion.div>

      {/* Achievement Details Modal */}
      <AchievementDetailsModal
        achievement={selectedAchievement}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedAchievement(null)
        }}
      />
    </div>
  )
}
