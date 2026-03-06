'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Frown, Meh, Smile, Heart, Sparkles, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { eventTracker, EventType } from '@/lib/tracking/events'
import { useMoodStore } from '@/store/mood-store'
import confetti from 'canvas-confetti'

interface MoodOption {
  id: 'terrible' | 'bad' | 'okay' | 'good' | 'excellent'
  icon: LucideIcon
  label: string
  energy: number
  focus: number
}

const moodOptions: MoodOption[] = [
  { id: 'terrible', icon: Frown, label: 'Terrible', energy: 2, focus: 2 },
  { id: 'bad', icon: Meh, label: 'Bad', energy: 4, focus: 4 },
  { id: 'okay', icon: Smile, label: 'Okay', energy: 6, focus: 6 },
  { id: 'good', icon: Heart, label: 'Good', energy: 8, focus: 8 },
  { id: 'excellent', icon: Sparkles, label: 'Excellent', energy: 10, focus: 9 }
]

// Color mapping for mood icons and borders
const moodColors = {
  terrible: { icon: 'text-red-500', border: 'border-red-300 hover:border-red-400', bg: 'hover:bg-red-50' },
  bad: { icon: 'text-orange-500', border: 'border-orange-300 hover:border-orange-400', bg: 'hover:bg-orange-50' },
  okay: { icon: 'text-yellow-500', border: 'border-yellow-300 hover:border-yellow-400', bg: 'hover:bg-yellow-50' },
  good: { icon: 'text-green-500', border: 'border-green-300 hover:border-green-400', bg: 'hover:bg-green-50' },
  excellent: { icon: 'text-violet-500', border: 'border-violet-300 hover:border-violet-400', bg: 'hover:bg-violet-50' }
}

interface MoodCheckProps {
  onMoodSelected?: () => void
  context?: string
  className?: string
  variant?: 'default' | 'widget'
}

export function MoodCheck({ onMoodSelected, context, className, variant = 'default' }: MoodCheckProps = {}) {
  const { 
    addMoodEntry, 
    fetchRecentMoods,
  } = useMoodStore()
  
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  
  useEffect(() => {
    fetchRecentMoods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const handleMoodSelect = async (option: MoodOption) => {
    // Visual feedback - select the mood
    setSelectedMood(option.id)
    setIsSubmitting(true)
    
    // Auto-save immediately with context if provided
    await addMoodEntry({
      mood: option.id,
      energy: option.energy,
      focus: option.focus,
      source: 'user'
    }, context)

    // Dispatch mood-logged event for points earning
    window.dispatchEvent(new CustomEvent('mood-logged', {
      detail: {
        moodId: option.id,
        energy: option.energy,
        focus: option.focus,
        timestamp: new Date().toISOString()
      }
    }))

    eventTracker.track(EventType.MOOD_CHECK, {
      energy: option.energy,
      focus: option.focus,
      mood: option.label,
      source: 'icon'
    })
    
    // Trigger celebration for excellent mood
    if (option.id === 'excellent') {
      // Fire multiple bursts for extra celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFC700', '#FFD700', '#FFE700', '#FFA500', '#FF69B4']
      })
      
      // Second burst slightly delayed for more impact
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFC700', '#FFD700', '#FFE700']
        })
      }, 150)
      
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFC700', '#FFD700', '#FFE700']
        })
      }, 300)
    } else if (option.id === 'good') {
      // Smaller celebration for good mood
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#60A5FA', '#93C5FD', '#DBEAFE']
      })
    }
    
    // Show success feedback
    setJustSubmitted(true)
    setIsSubmitting(false)
    
    // Call the callback if provided
    if (onMoodSelected) {
      // Delay slightly to show the success message
      setTimeout(() => {
        onMoodSelected()
      }, 1000)
    }
    
    // Reset after 2 seconds (only if no callback)
    if (!onMoodSelected) {
      setTimeout(() => {
        setJustSubmitted(false)
        setSelectedMood(null)
      }, 2000)
    }
  }
  
  // Widget variant - compact layout with gradient
  if (variant === 'widget') {
    return (
      <Card className={`
        bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100
        border-purple-200
        h-[8rem] overflow-hidden
        hover:shadow-lg transition-all duration-300
        ${className || ''}
      `}>
        <CardContent className="p-3 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                How are you feeling?
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Quick mood check
              </p>
            </div>
            <motion.div
              animate={{
                scale: justSubmitted ? [1, 1.2, 1] : 1
              }}
              className={`p-1.5 rounded-lg ${justSubmitted ? 'bg-green-100' : 'bg-purple-100'}`}
            >
              {justSubmitted ? (
                <span className="text-sm text-green-600">✓</span>
              ) : (
                <Sparkles className="w-4 h-4 text-purple-600" />
              )}
            </motion.div>
          </div>

          {/* Compact mood buttons */}
          <div className="flex justify-between items-center gap-1">
            {moodOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedMood === option.id

              return (
                <motion.button
                  key={option.id}
                  onClick={() => handleMoodSelect(option)}
                  disabled={isSubmitting && !isSelected}
                  whileTap={{ scale: 0.9 }}
                  className={`
                    flex flex-col items-center gap-1 p-1.5 rounded-lg
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-purple-200 ring-2 ring-purple-400'
                      : 'hover:bg-white/60'
                    }
                    ${isSubmitting && !isSelected ? 'opacity-50' : ''}
                  `}
                >
                  <Icon className={`
                    w-5 h-5
                    ${isSelected ? 'text-purple-700' : moodColors[option.id as keyof typeof moodColors].icon}
                  `} />
                  <span className="text-[0.625rem] font-medium text-gray-700">
                    {option.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant - original layout
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          How are you feeling?
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-4 space-y-4">
      
      {/* Icon Buttons */}
      <div className="flex justify-between items-center gap-3 py-2">
        {moodOptions.map((option) => {
          const Icon = option.icon
          const isSelected = selectedMood === option.id
          const colors = moodColors[option.id as keyof typeof moodColors]

          return (
            <motion.button
              key={option.id}
              onClick={() => handleMoodSelect(option)}
              disabled={isSubmitting && !isSelected}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-lg
                transition-all duration-200
                ${isSelected
                  ? 'bg-violet-100 ring-2 ring-violet-400'
                  : colors.bg
                }
                ${isSubmitting && !isSelected ? 'opacity-50' : ''}
              `}
            >
              <Icon
                className={`
                  w-6 h-6
                  ${isSelected ? 'text-violet-600' : colors.icon}
                `}
              />
              <span className="text-xs font-medium text-gray-700">
                {option.label}
              </span>
            </motion.button>
          )
        })}
      </div>
      
      {/* Success Message */}
      <AnimatePresence>
        {justSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center pt-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 500,
                damping: 15
              }}
              className="inline-flex items-center gap-2 text-sm text-green-600 font-medium"
            >
              <span className="text-lg">✓</span>
              <span>Mood saved!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </CardContent>
    </Card>
  )
}