'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Heart, Smile, Meh, Frown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useMoodStore } from '@/store/mood-store'
import confetti from 'canvas-confetti'

const moodOptions = [
  { icon: Frown, color: 'text-red-500', hoverBg: 'hover:bg-red-100', value: 'terrible' },
  { icon: Meh, color: 'text-orange-500', hoverBg: 'hover:bg-orange-100', value: 'bad' },
  { icon: Smile, color: 'text-yellow-500', hoverBg: 'hover:bg-yellow-100', value: 'okay' },
  { icon: Heart, color: 'text-green-500', hoverBg: 'hover:bg-green-100', value: 'good' },
  { icon: Sparkles, color: 'text-purple-500', hoverBg: 'hover:bg-purple-100', value: 'excellent' }
]

export function MoodWidget() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { addMoodEntry } = useMoodStore()

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood)
    setIsSubmitting(true)

    try {
      await addMoodEntry({
        mood: mood as 'terrible' | 'bad' | 'okay' | 'good' | 'excellent',
        energy: mood === 'excellent' ? 10 : mood === 'good' ? 8 : mood === 'okay' ? 6 : mood === 'bad' ? 4 : 2,
        focus: mood === 'excellent' ? 9 : mood === 'good' ? 8 : mood === 'okay' ? 6 : mood === 'bad' ? 4 : 2
      })

      // Trigger celebration for excellent mood
      if (mood === 'excellent') {
        // Fire multiple bursts for extra celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EC4899', '#F472B6', '#F9A8D4', '#FDA4AF', '#FF69B4']
        })

        // Second burst slightly delayed for more impact
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#EC4899', '#F472B6', '#F9A8D4']
          })
        }, 150)

        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#EC4899', '#F472B6', '#F9A8D4']
          })
        }, 300)
      } else if (mood === 'good') {
        // Smaller celebration for good mood
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#60A5FA', '#93C5FD', '#DBEAFE']
        })
      }

      // Brief celebration
      setTimeout(() => {
        setSelectedMood(null)
      }, 2000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "h-[8rem] xl:h-[10rem] 2xl:h-[12rem] overflow-hidden",
      "transition-all duration-300",
      "group"
    )}>
      <CardContent className="p-4 xl:p-5 2xl:p-6 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm xl:text-base 2xl:text-lg">
            How are you feeling?
          </h3>
        </div>

        {/* Mood Options - Cleaner design */}
        <div className="flex items-center justify-between gap-2 xl:gap-3 mt-2 xl:mt-3">
          <AnimatePresence mode="wait">
            {!selectedMood ? (
              <motion.div
                key="options"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2 xl:gap-3 2xl:gap-4 w-full justify-between"
              >
                {moodOptions.map((option, i) => {
                  const colors = {
                    terrible: 'text-red-500 hover:bg-red-50',
                    bad: 'text-orange-500 hover:bg-orange-50',
                    okay: 'text-yellow-500 hover:bg-yellow-50',
                    good: 'text-green-500 hover:bg-green-50',
                    excellent: 'text-violet-500 hover:bg-violet-50'
                  }

                  return (
                    <motion.button
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMoodSelect(option.value)}
                      disabled={isSubmitting}
                      className={cn(
                        "flex flex-col items-center gap-1 xl:gap-1.5 p-2 xl:p-3 2xl:p-4 rounded-lg xl:rounded-xl",
                        "transition-all duration-200",
                        colors[option.value as keyof typeof colors],
                        isSubmitting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <option.icon className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-8 2xl:h-8" />
                      <span className="text-[0.625rem] xl:text-xs 2xl:text-sm text-gray-600">
                        {option.value.charAt(0).toUpperCase() + option.value.slice(1)}
                      </span>
                    </motion.button>
                  )
                })}
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center w-full"
              >
                <div className="flex items-center justify-center gap-2 xl:gap-3">
                  <Sparkles className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 text-green-500" />
                  <p className="text-sm xl:text-base 2xl:text-lg text-gray-700">Mood logged!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}