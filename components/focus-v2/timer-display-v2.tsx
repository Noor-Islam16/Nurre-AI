'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface TimerDisplayV2Props {
  mode: 'setup' | 'running'
  timeDisplay: string
  progress: number
  isPaused?: boolean
}

type ScreenSize = 'sm' | 'lg' | 'xl' | '2xl'

export function TimerDisplayV2({
  mode,
  timeDisplay,
  progress,
  isPaused = false
}: TimerDisplayV2Props) {
  const isSetup = mode === 'setup'

  // Responsive sizing based on viewport with multiple breakpoints
  const [screenSize, setScreenSize] = useState<ScreenSize>('sm')

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width >= 1536) {
        setScreenSize('2xl')
      } else if (width >= 1280) {
        setScreenSize('xl')
      } else if (width >= 1024) {
        setScreenSize('lg')
      } else {
        setScreenSize('sm')
      }
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Size configurations for each breakpoint
  const sizeConfigs = {
    sm: { setupSize: '16rem', runningSize: '25rem', setupFont: '3rem', runningFont: '5rem' },
    lg: { setupSize: '22rem', runningSize: '32rem', setupFont: '4rem', runningFont: '6.5rem' },
    xl: { setupSize: '26rem', runningSize: '38rem', setupFont: '5rem', runningFont: '7.5rem' },
    '2xl': { setupSize: '30rem', runningSize: '44rem', setupFont: '6rem', runningFont: '9rem' }
  }

  const config = sizeConfigs[screenSize]

  // Animation variants for smooth transitions - responsive sizes
  const containerVariants = {
    setup: {
      width: config.setupSize,
      height: config.setupSize,
      marginBottom: '0rem'
    },
    running: {
      width: config.runningSize,
      height: config.runningSize,
      marginBottom: '1.5rem'
    }
  }

  const timeTextVariants = {
    setup: {
      fontSize: config.setupFont,
      lineHeight: '1'
    },
    running: {
      fontSize: config.runningFont,
      lineHeight: '1'
    }
  }

  // SVG circle calculations
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress / 100)

  // Status label
  const statusLabel = isPaused ? 'Paused' : 'Focusing...'

  return (
    <div className="text-center">
      {/* Timer Ring Container */}
      <motion.div
        className="relative mx-auto flex items-center justify-center"
        variants={containerVariants}
        initial={mode}
        animate={mode}
        transition={{
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1] // cubic-bezier for smooth easing
        }}
      >
        {/* Progress Ring SVG */}
        <svg
          className="absolute transform -rotate-90 w-full h-full"
          viewBox="0 0 256 256"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke="rgb(229 231 235)"
            strokeWidth={isSetup ? "8" : "12"}
            fill="none"
            className="transition-all duration-400"
          />

          {/* Progress circle */}
          <circle
            cx="128"
            cy="128"
            r={radius}
            stroke={isSetup ? "rgb(16 185 129)" : "url(#timer-gradient)"}
            strokeWidth={isSetup ? "8" : "12"}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={isSetup ? circumference : strokeDashoffset}
            className="transition-all duration-400"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(16 185 129)" />
              <stop offset="100%" stopColor="rgb(5 150 105)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            className="font-bold text-gray-900 font-mono"
            variants={timeTextVariants}
            initial={mode}
            animate={mode}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {timeDisplay}
          </motion.div>

          {/* Status Label - only in running mode */}
          {!isSetup && (
            <motion.div
              className="text-sm lg:text-base xl:text-lg 2xl:text-xl text-gray-700 mt-2 lg:mt-3 xl:mt-4 2xl:mt-5"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {statusLabel}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Screen reader announcement for time updates - throttled via aria-live */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {!isSetup && `Timer: ${timeDisplay}${isPaused ? ', paused' : ', running'}`}
      </div>
    </div>
  )
}
