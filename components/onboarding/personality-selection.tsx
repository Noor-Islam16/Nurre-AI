'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getPersonalityList, type PersonalityId, type PersonalityConfig } from '@/lib/config/personalities'
import { ChevronLeft, Check, Sparkles, Heart, Brain } from 'lucide-react'

interface PersonalitySelectionProps {
  onSelect: (personalityId: PersonalityId) => void
  onBack: () => void
  isSubmitting?: boolean
  recommendedAvatar?: PersonalityId
}

// Icon mapping for each personality
const personalityIcons: Record<PersonalityId, React.ReactNode> = {
  nur: <Sparkles className="w-6 h-6" />,
  farin: <Heart className="w-6 h-6" />,
  zak: <Brain className="w-6 h-6" />
}

// Color classes for each personality (can't use dynamic Tailwind classes)
const colorClasses: Record<PersonalityId, {
  bg: string
  bgHover: string
  bgSelected: string
  border: string
  borderSelected: string
  text: string
  iconBg: string
}> = {
  nur: {
    bg: 'bg-violet-50',
    bgHover: 'hover:bg-violet-100',
    bgSelected: 'bg-violet-100',
    border: 'border-violet-200',
    borderSelected: 'border-violet-500',
    text: 'text-violet-600',
    iconBg: 'bg-violet-100'
  },
  farin: {
    bg: 'bg-rose-50',
    bgHover: 'hover:bg-rose-100',
    bgSelected: 'bg-rose-100',
    border: 'border-rose-200',
    borderSelected: 'border-rose-500',
    text: 'text-rose-600',
    iconBg: 'bg-rose-100'
  },
  zak: {
    bg: 'bg-blue-50',
    bgHover: 'hover:bg-blue-100',
    bgSelected: 'bg-blue-100',
    border: 'border-blue-200',
    borderSelected: 'border-blue-500',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100'
  }
}

function PersonalityCard({
  personality,
  isSelected,
  isRecommended = false,  // ADD THIS with default value
  onSelect
}: {
  personality: PersonalityConfig
  isSelected: boolean
  isRecommended?: boolean  // ADD THIS
  onSelect: () => void
}) {
  const colors = colorClasses[personality.id]

  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        "relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        isSelected
          ? [colors.bgSelected, colors.borderSelected, 'shadow-lg ring-2 ring-offset-2', `ring-${personality.primaryColor}-500`]
          : [colors.bg, colors.border, colors.bgHover, 'hover:shadow-md']
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center",
            `bg-${personality.primaryColor}-500`
          )}
          style={{
            backgroundColor: personality.id === 'nur' ? '#8B5CF6' : personality.id === 'farin' ? '#F43F5E' : '#3B82F6'
          }}
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* Header with icon and name */}
      <div className="flex items-start gap-4 mb-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          colors.iconBg
        )}>
          <span className={colors.text}>
            {personalityIcons[personality.id]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {personality.name}
          </h3>
          <div className="flex flex-col gap-1">
            <p className={cn("text-sm font-medium", colors.text)}>
              {personality.tagline}
            </p>
            {isRecommended && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 w-fit">
                ✨ Recommended for you
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed mb-3">
        {personality.description}
      </p>

      {/* Best for */}
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Best for:</span> {personality.bestFor}
        </p>
      </div>

      {/* Voice style hint */}
      <div className="mt-2">
        <p className="text-xs text-gray-400 italic">
          Voice: {personality.voiceStyle}
        </p>
      </div>
    </motion.button>
  )
}

export function PersonalitySelection({
  onSelect,
  onBack,
  isSubmitting = false,
  recommendedAvatar
}: PersonalitySelectionProps) {
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityId | null>(recommendedAvatar || null)
  const personalities = getPersonalityList()

  const handleContinue = () => {
    if (selectedPersonality) {
      onSelect(selectedPersonality)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-4xl p-6 sm:p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
            >
              Choose Your AI Coach
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600"
            >
              Each coach has a unique personality and style. Pick the one that feels right for you.
            </motion.p>
          </div>

          {/* Personality Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {personalities.map((personality, index) => (
                <motion.div
                  key={personality.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                >
                  <PersonalityCard
                    personality={personality}
                    isSelected={selectedPersonality === personality.id}
                    isRecommended={recommendedAvatar === personality.id}
                    onSelect={() => setSelectedPersonality(personality.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Info note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-violet-50 border border-violet-200 rounded-lg p-4"
          >
            <div className="flex">
              <svg className="w-5 h-5 text-violet-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-violet-800">
                <p>
                  You can change your AI coach anytime in your Profile settings.
                  Don&apos;t worry about picking the &quot;perfect&quot; one now!
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex gap-3 pt-4"
          >
            <Button
              onClick={onBack}
              variant="outline"
              size="lg"
              className="gap-2"
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1"
              size="lg"
              disabled={!selectedPersonality || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </span>
                  Saving...
                </>
              ) : (
                <>
                  Continue with {selectedPersonality ? personalities.find(p => p.id === selectedPersonality)?.name : '...'}
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </Card>
    </div>
  )
}
