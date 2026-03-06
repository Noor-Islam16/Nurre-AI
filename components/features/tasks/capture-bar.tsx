'use client'

import { useEffect, useRef } from 'react'
import { Plus, Mic, Send, Brain, Target, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CaptureBarProps {
  value: string
  onChange: (value: string) => void
  onToggleForm: () => void
  onSubmit: (value: string) => void
  onChip: (action: 'breakdown' | 'prioritize' | 'estimate') => void
  isListening?: boolean
  audioLevel?: number
  onMicToggle?: () => void
}

const chips = [
  {
    id: 'breakdown' as const,
    label: 'Break down',
    icon: Brain,
  },
  {
    id: 'prioritize' as const,
    label: 'Prioritize',
    icon: Target,
  },
  {
    id: 'estimate' as const,
    label: 'Estimate time',
    icon: Clock,
  },
]

export function CaptureBar({
  value,
  onChange,
  onToggleForm,
  onSubmit,
  onChip,
  isListening = false,
  audioLevel = 0,
  onMicToggle,
}: CaptureBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onSubmit(value.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-10',
        'bg-white border-b border-gray-200',
        'shadow-sm',
        'transition-shadow duration-200'
      )}
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Main Input Row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 mb-3">
          {/* + Button (Toggle Form) */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onToggleForm}
            className={cn(
              'h-11 w-11 p-0 shrink-0',
              'border-teal-200 text-teal-700 hover:bg-teal-50',
              'transition-colors'
            )}
            aria-label="Toggle task form"
          >
            <Plus className="w-5 h-5" />
          </Button>

          {/* Input Field */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task or ask Nuree…"
              className={cn(
                'h-11 pr-3 text-gray-900',
                'border-gray-300 focus-visible:ring-violet-400',
                'placeholder:text-gray-500'
              )}
              aria-label="Task or question input"
            />
          </div>

          {/* Mic Button */}
          {onMicToggle && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onMicToggle}
              className={cn(
                'h-11 w-11 p-0 shrink-0 relative',
                'transition-all duration-200',
                isListening
                  ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white border-violet-600 hover:from-violet-600 hover:to-violet-700'
                  : 'border-violet-200 text-violet-700 hover:bg-violet-50'
              )}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {/* Pulsing ring based on audio level */}
              {isListening && audioLevel > 0 && (
                <motion.div
                  className="absolute inset-0 rounded-md bg-violet-300"
                  animate={{
                    scale: 1 + audioLevel * 0.3,
                    opacity: 0.2 + audioLevel * 0.3,
                  }}
                  transition={{ duration: 0.1 }}
                />
              )}
              <Mic className="w-5 h-5 relative z-10" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={!value.trim()}
            className={cn(
              'h-11 w-11 p-0 shrink-0',
              'bg-teal-600 hover:bg-teal-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
            aria-label="Submit"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>

        {/* Chips Row */}
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChip(chip.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'bg-violet-50 text-violet-700 hover:bg-violet-100',
                'border border-violet-200',
                'transition-colors text-sm font-medium',
                'min-h-[44px] md:min-h-0', // 44px touch target on mobile
                'focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2'
              )}
              aria-label={chip.label}
            >
              <chip.icon className="w-3.5 h-3.5" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
