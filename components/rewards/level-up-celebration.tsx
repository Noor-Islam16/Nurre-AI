'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Confetti from 'react-confetti'
import { useWindowSize } from '@/hooks/use-window-size'

const LEVEL_MESSAGES: Record<number, { title: string; message: string }> = {
  2: { title: 'Getting Started', message: "You're building momentum!" },
  3: { title: 'Building Momentum', message: 'Keep up the great work!' },
  4: { title: 'Finding Flow', message: "You're finding your rhythm!" },
  5: { title: 'Consistent', message: 'Your consistency is paying off!' },
  6: { title: 'Dedicated', message: 'Your dedication is inspiring!' },
  7: { title: 'Committed', message: "You're truly committed!" },
  8: { title: 'Master', message: "You've mastered the fundamentals!" },
  9: { title: 'Legend', message: "You're becoming a legend!" },
  10: { title: 'Grandmaster', message: 'Maximum level achieved! Incredible!' },
}

export function LevelUpCelebration() {
  const [isVisible, setIsVisible] = useState(false)
  const [newLevel, setNewLevel] = useState(1)
  const { width, height } = useWindowSize()

  useEffect(() => {
    const handleLevelUp = (event: CustomEvent) => {
      const { newLevel } = event.detail
      setNewLevel(newLevel)
      setIsVisible(true)
    }

    window.addEventListener('level-up', handleLevelUp as EventListener)

    return () => {
      window.removeEventListener('level-up', handleLevelUp as EventListener)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
  }

  const levelInfo = LEVEL_MESSAGES[newLevel] || {
    title: `Level ${newLevel}`,
    message: 'Great progress!'
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Confetti */}
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            colors={['#f43f5e', '#ec4899', '#f472b6', '#fda4af', '#fecdd3']}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{
                  duration: 0.6,
                  repeat: 2
                }}
                className="p-4 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full"
              >
                <Star className="w-12 h-12 text-rose-500" />
              </motion.div>
            </div>

            {/* Level number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="text-5xl font-bold text-rose-600 mb-2"
            >
              Level {newLevel}
            </motion.div>

            {/* Title */}
            <div className="text-xl font-semibold text-gray-800 mb-2">
              {levelInfo.title}
            </div>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              {levelInfo.message}
            </p>

            {/* Sparkles decoration */}
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-rose-400" />
                </motion.div>
              ))}
            </div>

            {/* Continue button */}
            <Button
              onClick={handleClose}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white"
            >
              Awesome!
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
