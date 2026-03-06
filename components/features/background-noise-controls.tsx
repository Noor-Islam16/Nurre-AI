'use client'

import { useState } from 'react'
import { Volume2, Coffee, Trees, Waves, CloudRain, Circle, ChevronDown, type LucideIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SoundType } from '@/hooks/use-background-noise'

interface BackgroundNoiseControlsProps {
  settings: {
    enabled: boolean
    soundType: SoundType | null
    volume: number
  }
  isLoading: boolean
  error: string | null
  onToggle: () => void
  onSoundSelect: (sound: SoundType) => void
  onVolumeChange: (volume: number) => void
  disabled?: boolean
}

const sounds: { type: SoundType; label: string; icon: LucideIcon }[] = [
  { type: 'rain', label: 'Rain', icon: CloudRain },
  { type: 'ocean', label: 'Ocean', icon: Waves },
  { type: 'forest', label: 'Forest', icon: Trees },
  { type: 'cafe', label: 'Café', icon: Coffee },
  { type: 'whitenoise', label: 'White', icon: Circle },
]

export function BackgroundNoiseControls({
  settings,
  isLoading,
  error,
  onToggle,
  onSoundSelect,
  onVolumeChange,
  disabled = false,
}: BackgroundNoiseControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSoundSelect = (soundType: SoundType) => {
    if (!settings.enabled) {
      onToggle() // Auto-enable when selecting a sound
    }
    onSoundSelect(soundType)
  }

  return (
    <div className="w-full">
      {/* Compact Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all",
          "hover:bg-gray-50 group",
          disabled && "opacity-50 cursor-not-allowed",
          settings.enabled && "bg-gradient-to-r from-purple-50 to-blue-50"
        )}
      >
        <div className="flex items-center space-x-3">
          <Volume2 
            className={cn(
              "w-4 h-4 transition-colors",
              settings.enabled ? "text-purple-600" : "text-gray-700"
            )} 
          />
          <span className={cn(
            "text-sm font-medium",
            settings.enabled ? "text-gray-900" : "text-gray-700"
          )}>
            Background Sounds
          </span>
          {settings.enabled && settings.soundType && (
            <span className="text-xs text-purple-600 font-medium px-2 py-0.5 bg-purple-100 rounded-full">
              {sounds.find(s => s.type === settings.soundType)?.label}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-gray-700 transition-transform",
            isExpanded && "rotate-180"
          )} 
        />
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-4">
              {/* Sound Options - Minimal Icons */}
              <div className="flex justify-between gap-2">
                {sounds.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => handleSoundSelect(type)}
                    disabled={disabled || isLoading}
                    className={cn(
                      "flex-1 p-3 rounded-lg border transition-all group",
                      "hover:border-purple-300 hover:bg-purple-50",
                      settings.soundType === type && settings.enabled
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 bg-white",
                      (disabled || isLoading) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        settings.soundType === type && settings.enabled
                          ? "text-purple-600"
                          : "text-gray-700 group-hover:text-purple-500"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        settings.soundType === type && settings.enabled
                          ? "text-purple-700"
                          : "text-gray-700"
                      )}>
                        {label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Volume Slider - Only show when enabled */}
              {settings.enabled && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Volume</span>
                    <span className="text-xs font-medium text-gray-900">{settings.volume}%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.volume}
                      onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                      disabled={disabled}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${settings.volume}%, rgb(229, 231, 235) ${settings.volume}%, rgb(229, 231, 235) 100%)`
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Toggle Button */}
              <button
                onClick={onToggle}
                disabled={disabled || !settings.soundType}
                className={cn(
                  "w-full py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  settings.enabled
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-purple-500 text-white hover:bg-purple-600",
                  (disabled || !settings.soundType) && "opacity-50 cursor-not-allowed"
                )}
              >
                {settings.enabled ? 'Turn Off' : 'Turn On'}
              </button>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: rgb(147, 51, 234);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.1);
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: rgb(147, 51, 234);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.1);
        }
      `}</style>
    </div>
  )
}