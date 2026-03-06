'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LinearProgressProps {
  progress: number // 0-100
  className?: string
  showPercentage?: boolean
}

/**
 * LinearProgressBar Component
 *
 * A thin horizontal progress bar for the Focus running state.
 * Shows visual progress with smooth animation.
 */
export function LinearProgress({
  progress,
  className,
  showPercentage = true
}: LinearProgressProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn("w-full max-w-xs", className)}>
      {/* Progress bar container */}
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Percentage label */}
      {showPercentage && (
        <p className="text-xs text-gray-500 text-right mt-1">
          {Math.round(clampedProgress)}%
        </p>
      )}
    </div>
  )
}
