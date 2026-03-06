'use client'

import { motion } from 'framer-motion'
import { Volume2, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { VoiceSpeed } from '@/store/preference-store'

interface VoiceSpeedCardProps {
  currentSpeed: VoiceSpeed
  onSpeedChange: (speed: VoiceSpeed) => void
  disabled?: boolean
}

const speedOptions: { id: VoiceSpeed; label: string; description: string }[] = [
  { id: 'slow', label: 'Slow', description: 'Easier to follow' },
  { id: 'normal', label: 'Normal', description: 'Default speed' },
  { id: 'fast', label: 'Fast', description: 'Quicker responses' }
]

export function VoiceSpeedCard({
  currentSpeed,
  onSpeedChange,
  disabled = false
}: VoiceSpeedCardProps) {
  const handleSelect = (speed: VoiceSpeed) => {
    if (disabled || speed === currentSpeed) return
    onSpeedChange(speed)
  }

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <Volume2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Voice Speed</h2>
            <p className="text-sm text-gray-500">Adjust how fast the AI speaks</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-3">
          {speedOptions.map((option) => {
            const isSelected = currentSpeed === option.id
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={disabled}
                className={cn(
                  "relative flex-1 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                  disabled && "opacity-50 cursor-not-allowed",
                  isSelected
                    ? "bg-indigo-100 border-indigo-500 shadow-md"
                    : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}

                <h4 className="text-sm font-semibold text-gray-900">
                  {option.label}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
