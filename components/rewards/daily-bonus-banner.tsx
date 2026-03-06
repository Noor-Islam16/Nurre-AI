'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Star, CheckCircle, Gift } from 'lucide-react'
import { useRewardsStore, GP_VALUES } from '@/store/rewards-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DailyBonusBannerProps {
  className?: string
}

export function DailyBonusBanner({ className }: DailyBonusBannerProps) {
  const shouldReduceMotion = useReducedMotion()
  const { lastDailyBonus, claimDailyBonus } = useRewardsStore()
  const [isClaiming, setIsClaiming] = useState(false)
  const [justClaimed, setJustClaimed] = useState(false)

  // Check if already claimed today
  const today = new Date().toISOString().split('T')[0]
  const alreadyClaimed = lastDailyBonus === today

  const handleClaim = async () => {
    if (alreadyClaimed || isClaiming) return

    setIsClaiming(true)
    const result = await claimDailyBonus()
    setIsClaiming(false)

    if (result.success) {
      setJustClaimed(true)
      // Reset after animation
      setTimeout(() => setJustClaimed(false), 2000)
    }
  }

  // Already claimed state
  if (alreadyClaimed && !justClaimed) {
    return (
      <motion.div
        className={cn(
          "flex items-center justify-between p-4 rounded-2xl",
          "bg-emerald-50 border border-emerald-200",
          className
        )}
        initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
      >
        {/* Left side */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-xl shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">Daily bonus claimed!</p>
            <p className="text-xs text-gray-600">Come back tomorrow for more</p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <Star className="w-4 h-4 fill-emerald-500 text-emerald-500" />
          <span>+{GP_VALUES.daily_bonus} pts</span>
        </div>
      </motion.div>
    )
  }

  // Unclaimed state
  return (
    <motion.div
      className={cn(
        "flex items-center justify-between p-4 rounded-2xl",
        "bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50",
        "border border-rose-200",
        className
      )}
      initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        <motion.div
          className="p-2.5 bg-white rounded-xl shadow-sm"
          animate={shouldReduceMotion ? {} : {
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Gift className="w-5 h-5 text-rose-600" />
        </motion.div>
        <div>
          <p className="text-sm font-medium text-gray-800">
            Claim your daily bonus!
          </p>
          <p className="text-xs text-gray-600">
            +{GP_VALUES.daily_bonus} Growth Points waiting for you
          </p>
        </div>
      </div>

      {/* Right side - Claim button */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {justClaimed ? (
            <motion.div
              key="claimed"
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-emerald-600"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <CheckCircle className="w-4 h-4" />
              <span>+{GP_VALUES.daily_bonus} pts!</span>
            </motion.div>
          ) : (
            <motion.div
              key="button"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className={cn(
                  "px-5 py-2.5 h-auto",
                  "bg-rose-500 hover:bg-rose-600 text-white",
                  "text-sm font-semibold rounded-xl",
                  "shadow-sm hover:shadow transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isClaiming ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Claiming...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Claim
                  </span>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
