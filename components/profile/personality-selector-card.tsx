'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Heart, Brain, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getPersonalityList, type PersonalityId, type PersonalityConfig } from '@/lib/config/personalities'

interface PersonalitySelectorCardProps {
  currentPersonality: PersonalityId | null
  onPersonalityChange: (personality: PersonalityId) => void
  disabled?: boolean
}

// Icon mapping for each personality
const personalityIcons: Record<PersonalityId, React.ReactNode> = {
  nur: <Sparkles className="w-4 h-4" />,
  farin: <Heart className="w-4 h-4" />,
  zak: <Brain className="w-4 h-4" />
}

// Color classes for each personality
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

function PersonalityOption({
  personality,
  isSelected,
  onSelect,
  disabled
}: {
  personality: PersonalityConfig
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  const colors = colorClasses[personality.id]

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "relative flex-1 p-3 rounded-xl border-2 transition-all duration-200 text-left",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        isSelected
          ? [colors.bgSelected, colors.borderSelected, 'shadow-md']
          : [colors.bg, colors.border, colors.bgHover]
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: personality.id === 'nur' ? '#8B5CF6' : personality.id === 'farin' ? '#F43F5E' : '#3B82F6'
          }}
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}

      {/* Content */}
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center",
          colors.iconBg
        )}>
          <span className={colors.text}>
            {personalityIcons[personality.id]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">
            {personality.name}
          </h4>
        </div>
      </div>

      <p className={cn("text-xs font-medium mb-1", colors.text)}>
        {personality.tagline}
      </p>

      <p className="text-xs text-gray-500 line-clamp-2">
        {personality.description}
      </p>
    </button>
  )
}

export function PersonalitySelectorCard({
  currentPersonality,
  onPersonalityChange,
  disabled = false
}: PersonalitySelectorCardProps) {
  const personalities = getPersonalityList()

  const handleSelect = (personalityId: PersonalityId) => {
    if (disabled || personalityId === currentPersonality) return
    onPersonalityChange(personalityId)
  }

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-fuchsia-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">AI Coach</h2>
            <p className="text-sm text-gray-500">Choose your coaching personality</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {personalities.map((personality) => (
            <PersonalityOption
              key={personality.id}
              personality={personality}
              isSelected={currentPersonality === personality.id}
              onSelect={() => handleSelect(personality.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}
