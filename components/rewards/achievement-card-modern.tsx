'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Lock, MoreVertical, Share2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Achievement,
  AchievementRarity,
  getRarityLabel
} from '@/lib/constants/achievements'

interface AchievementCardModernProps {
  achievement: Achievement
  index?: number
  onShare?: (achievement: Achievement) => void
}

// Rarity badge styling
function getRarityBadgeClass(rarity: AchievementRarity): string {
  switch (rarity) {
    case AchievementRarity.COMMON:
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case AchievementRarity.RARE:
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case AchievementRarity.EPIC:
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case AchievementRarity.LEGENDARY:
      return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border-amber-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// Get next step hint text
function getNextStepText(achievement: Achievement): string {
  if (achievement.unlocked) {
    return 'Completed!'
  }
  const remaining = achievement.target - achievement.progress
  if (remaining === 1) {
    return '1 more to go'
  }
  return `${remaining} more to go`
}

export function AchievementCardModern({
  achievement,
  index = 0,
  onShare
}: AchievementCardModernProps) {
  const shouldReduceMotion = useReducedMotion()
  const progressPercentage = Math.min(
    100,
    Math.round((achievement.progress / achievement.target) * 100)
  )
  const isLegendary = achievement.rarity === AchievementRarity.LEGENDARY
  const isEpic = achievement.rarity === AchievementRarity.EPIC

  return (
    <motion.div
      className="relative"
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.05, duration: 0.3 }}
      whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.01 }}
    >
      {/* Legendary Glow Effect */}
      {achievement.unlocked && isLegendary && (
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-200/40 via-yellow-200/40 to-amber-200/40 blur-lg"
          animate={shouldReduceMotion ? {} : {
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Epic Glow Effect */}
      {achievement.unlocked && isEpic && (
        <motion.div
          className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-purple-200/30 via-pink-200/30 to-purple-200/30 blur-md"
          animate={shouldReduceMotion ? {} : {
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Card */}
      <div
        className={cn(
          "relative p-5 rounded-2xl transition-all duration-300",
          achievement.unlocked
            ? "bg-white border border-gray-100 shadow-sm hover:shadow-lg"
            : "bg-gray-50 border border-gray-200 opacity-75"
        )}
      >
        {/* Header: Icon, Title, Rarity, Menu */}
        <div className="flex items-start gap-3 mb-4">
          {/* Icon */}
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0",
              achievement.unlocked
                ? "bg-gradient-to-br from-rose-100 to-pink-100 shadow-sm"
                : "bg-gray-100"
            )}
          >
            {achievement.unlocked ? (
              achievement.icon
            ) : (
              <Lock className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "text-base font-semibold truncate",
                achievement.unlocked ? "text-gray-900" : "text-gray-600"
              )}
              title={achievement.title}
            >
              {achievement.title}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
              {achievement.description}
            </p>
          </div>

          {/* Menu (unlocked only) */}
          {achievement.unlocked && onShare && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onShare(achievement)}
                  className="cursor-pointer"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Rarity Badge */}
        <div className="mb-3">
          <Badge
            variant="outline"
            className={cn("text-xs font-medium", getRarityBadgeClass(achievement.rarity))}
          >
            {getRarityLabel(achievement.rarity)}
          </Badge>
        </div>

        {/* Progress Bar - THICKER */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-gray-600">Progress</span>
            <span className="text-gray-900 font-semibold">
              {achievement.progress}/{achievement.target}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                achievement.unlocked
                  ? "bg-gradient-to-r from-rose-400 to-pink-500"
                  : "bg-gray-300"
              )}
              initial={shouldReduceMotion ? { width: `${progressPercentage}%` } : { width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={shouldReduceMotion ? { duration: 0 } : {
                duration: 0.8,
                ease: "easeOut",
                delay: index * 0.05
              }}
            />
          </div>
        </div>

        {/* Status Text */}
        <div className="flex items-center gap-1.5">
          {achievement.unlocked ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">
                {getNextStepText(achievement)}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-500 italic">
              {getNextStepText(achievement)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
