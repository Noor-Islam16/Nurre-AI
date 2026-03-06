'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Star, CheckCircle, Sparkles, Flame } from 'lucide-react'
import confetti from 'canvas-confetti'

interface Achievement {
  title?: string
  description?: string
  icon?: string
  type?: string
  message?: string
  duration?: number
  sound?: boolean
  intensity?: string
  animation?: any
}

export function AchievementNotification() {
  const [achievement, setAchievement] = useState<Achievement | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    const handleAchievement = (event: CustomEvent) => {
      const detail = event.detail
      setAchievement(detail)
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Trigger celebration animation based on type and intensity
      if (detail.animation) {
        confetti(detail.animation)
      } else {
        // Default confetti based on type
        const celebrationType = detail.type || 'confetti'
        const intensity = detail.intensity || 'medium'
        
        switch (celebrationType) {
          case 'fireworks':
            // Multiple bursts for fireworks
            const fireworksCount = intensity === 'epic' ? 5 : intensity === 'subtle' ? 2 : 3
            for (let i = 0; i < fireworksCount; i++) {
              setTimeout(() => {
                confetti({
                  particleCount: intensity === 'epic' ? 100 : 50,
                  angle: 60 + Math.random() * 60,
                  spread: intensity === 'epic' ? 100 : 60,
                  origin: { x: Math.random(), y: Math.random() * 0.5 }
                })
              }, i * 250)
            }
            break
            
          case 'stars':
            confetti({
              particleCount: intensity === 'epic' ? 100 : intensity === 'subtle' ? 30 : 50,
              spread: intensity === 'epic' ? 180 : 90,
              shapes: ['star'],
              colors: ['#FFD700', '#FFA500', '#FF69B4']
            })
            break
            
          case 'trophy':
            confetti({
              particleCount: intensity === 'epic' ? 150 : intensity === 'subtle' ? 50 : 100,
              spread: 100,
              colors: ['#FFD700', '#FFC700', '#FFE700'],
              shapes: ['star', 'circle']
            })
            break
            
          case 'checkmark':
            // Simple animation, minimal confetti
            if (intensity !== 'subtle') {
              confetti({
                particleCount: 30,
                spread: 50,
                origin: { y: 0.7 }
              })
            }
            break
            
          default:
            // Standard confetti
            confetti({
              particleCount: intensity === 'epic' ? 150 : intensity === 'subtle' ? 50 : 100,
              spread: intensity === 'epic' ? 120 : 70,
              origin: { y: 0.6 }
            })
        }
      }
      
      // Play sound if enabled
      if (detail.sound) {
        // Play celebration sound (implement audio playback if needed)
      }
      
      // Auto-hide after specified duration or default
      const hideDuration = detail.duration || 5000
      timeoutRef.current = setTimeout(() => setAchievement(null), hideDuration)
    }
    
    window.addEventListener('achievement-unlocked' as any, handleAchievement)
    
    return () => {
      window.removeEventListener('achievement-unlocked' as any, handleAchievement)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  const getIcon = () => {
    if (achievement?.icon) return <span className="text-5xl">{achievement.icon}</span>
    
    switch (achievement?.type) {
      case 'trophy':
        return <Trophy className="w-12 h-12" />
      case 'stars':
        return <Star className="w-12 h-12" />
      case 'checkmark':
        return <CheckCircle className="w-12 h-12" />
      case 'fireworks':
        return <Flame className="w-12 h-12" />
      default:
        return <Sparkles className="w-12 h-12" />
    }
  }
  
  const getGradient = () => {
    const intensity = achievement?.intensity || 'medium'
    const type = achievement?.type || 'confetti'
    
    if (type === 'checkmark') {
      return 'from-green-400 to-green-600'
    } else if (type === 'trophy') {
      return 'from-yellow-400 to-yellow-600'
    } else if (intensity === 'epic') {
      return 'from-purple-500 via-pink-500 to-yellow-500'
    } else if (intensity === 'subtle') {
      return 'from-blue-400 to-blue-500'
    }
    return 'from-yellow-400 to-orange-500'
  }
  
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`bg-gradient-to-r ${getGradient()} rounded-xl shadow-2xl p-6 text-white min-w-[300px]`}>
            <button
              onClick={() => setAchievement(null)}
              className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div>
                {(achievement.title || achievement.type !== 'checkmark') && (
                  <div className="flex items-center space-x-2 mb-1">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold text-lg">
                      {achievement.type === 'checkmark' ? 'Task Complete!' : 'Achievement Unlocked!'}
                    </span>
                  </div>
                )}
                {achievement.title && (
                  <h3 className="font-bold text-xl">{achievement.title}</h3>
                )}
                {(achievement.message || achievement.description) && (
                  <p className="text-sm opacity-90">
                    {achievement.message || achievement.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}