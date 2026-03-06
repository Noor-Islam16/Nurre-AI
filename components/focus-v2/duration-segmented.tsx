'use client'

import { useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESETS = [10, 25, 45] as const
const CUSTOM_MIN = 5
const CUSTOM_MAX = 120
const CUSTOM_STEP = 5

interface DurationSegmentedProps {
  value: number
  onChange: (minutes: number) => void
  disabled?: boolean
}

/**
 * DurationSegmented Component (Redesigned)
 *
 * Three pill buttons (10m, 25m, 45m) with +/- fine-tuning.
 * Pills are rounded-full with scale effect on selection.
 */
export function DurationSegmented({ value, onChange, disabled = false }: DurationSegmentedProps) {
  const isPreset = PRESETS.includes(value as typeof PRESETS[number])

  const clampValue = (minutes: number) => {
    return Math.max(CUSTOM_MIN, Math.min(CUSTOM_MAX, minutes))
  }

  // Keyboard shortcuts for +/- adjustment
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      // Don't trigger if a modal is open
      const hasOpenModal = document.querySelector('[role="dialog"][data-state="open"]') !== null
      if (hasOpenModal) return

      const active = document.activeElement as HTMLElement | null
      if (active && (active.tagName === 'INPUT' || active.isContentEditable)) {
        return
      }

      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        onChange(clampValue(value - CUSTOM_STEP))
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        onChange(clampValue(value + CUSTOM_STEP))
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [value, onChange])

  const handlePresetClick = (preset: number) => {
    if (disabled) return
    onChange(preset)
  }

  const handleAdjust = (delta: number) => {
    if (disabled) return
    onChange(clampValue(value + delta))
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <label className="block text-sm lg:text-base font-medium text-gray-700">Duration</label>

      {/* Pill buttons */}
      <div className="flex gap-3 lg:gap-4 justify-center" role="radiogroup">
        {PRESETS.map(preset => {
          const isSelected = value === preset
          return (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              className={cn(
                'h-14 w-20 lg:h-16 lg:w-24 rounded-full text-base lg:text-lg font-semibold transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2',
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {preset}m
            </button>
          )
        })}
      </div>

      {/* Fine-tuning controls - always visible */}
      <div className="flex items-center justify-center gap-3 lg:gap-4">
        <button
          type="button"
          onClick={() => handleAdjust(-CUSTOM_STEP)}
          disabled={disabled || value <= CUSTOM_MIN}
          className={cn(
            'w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center',
            'bg-gray-100 text-gray-700 transition-colors',
            'hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400',
            (disabled || value <= CUSTOM_MIN) && 'cursor-not-allowed opacity-40'
          )}
          aria-label="Decrease duration by 5 minutes"
        >
          <Minus className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>

        <div className="min-w-[60px] lg:min-w-[80px] text-center">
          <span className="text-lg lg:text-xl font-semibold text-gray-900 font-mono">
            {value}
          </span>
          <span className="text-sm lg:text-base text-gray-500 ml-1">min</span>
        </div>

        <button
          type="button"
          onClick={() => handleAdjust(CUSTOM_STEP)}
          disabled={disabled || value >= CUSTOM_MAX}
          className={cn(
            'w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center',
            'bg-gray-100 text-gray-700 transition-colors',
            'hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400',
            (disabled || value >= CUSTOM_MAX) && 'cursor-not-allowed opacity-40'
          )}
          aria-label="Increase duration by 5 minutes"
        >
          <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>
      </div>
    </div>
  )
}
