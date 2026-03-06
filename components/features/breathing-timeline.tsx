'use client'

import { motion } from 'framer-motion'
import { Wind, Timer, ArrowRight } from 'lucide-react'
import { BreathingPattern } from '@/lib/breathing/patterns'

interface BreathingTimelineProps {
  pattern: BreathingPattern | null
  currentPhase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle'
  phaseProgress: number // 0-1
}

const phaseIcons = {
  'inhale': '↑',
  'hold-in': '⊙',
  'exhale': '↓',
  'hold-out': '○',
  'idle': '•'
}

const phaseNames = {
  'inhale': 'Inhale',
  'hold-in': 'Hold',
  'exhale': 'Exhale',
  'hold-out': 'Rest',
  'idle': 'Ready'
}

const phaseColors = {
  'inhale': 'rgb(255, 107, 53)', // Warm Orange
  'hold-in': 'rgb(255, 140, 105)', // Soft Coral
  'exhale': 'rgb(253, 183, 80)', // Golden Yellow
  'hold-out': 'rgb(255, 180, 162)', // Peachy Pink
  'idle': 'rgb(229, 231, 235)'
}

export function BreathingTimeline({ pattern, currentPhase, phaseProgress }: BreathingTimelineProps) {
  if (!pattern) return null

  const phases = pattern.phases

  // Find current phase index
  const currentPhaseIndex = phases.findIndex(p => p.type === currentPhase)

  return (
    <div className="w-full max-w-2xl mx-auto px-2">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-semibold text-gray-900">Breathing Pace</span>
          </div>
          <div className="text-xs text-gray-600">
            {phases.reduce((sum, p) => sum + p.duration, 0)}s per cycle
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="flex items-center gap-1">
            {phases.map((phase, index) => {
              const isCurrent = index === currentPhaseIndex
              const isPast = index < currentPhaseIndex
              const isFuture = index > currentPhaseIndex

              return (
                <div key={index} className="flex items-center flex-1">
                  {/* Phase segment */}
                  <div className="flex-1">
                    <div className="relative">
                      {/* Phase bar */}
                      <div
                        className="h-10 rounded-lg transition-all duration-300 relative overflow-hidden"
                        style={{
                          backgroundColor: isFuture
                            ? 'rgb(243, 244, 246)' // Light gray
                            : isPast
                            ? phaseColors[phase.type]
                            : 'rgb(243, 244, 246)',
                          opacity: isFuture ? 0.5 : 1,
                          border: isCurrent ? `2px solid ${phaseColors[phase.type]}` : '1px solid rgb(229, 231, 235)'
                        }}
                      >
                        {/* Progress fill for current phase */}
                        {isCurrent && (
                          <motion.div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: phaseColors[phase.type],
                              opacity: 0.8
                            }}
                            initial={{ width: '0%' }}
                            animate={{ width: `${phaseProgress * 100}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        )}

                        {/* Phase content */}
                        <div className="relative h-full flex flex-col items-center justify-center px-1.5 gap-0.5">
                          <div
                            className="text-base leading-none flex items-center justify-center"
                            style={{
                              opacity: isCurrent ? 1 : isFuture ? 0.4 : 0.8,
                              marginTop: '-2px'
                            }}
                          >
                            {phaseIcons[phase.type]}
                          </div>
                          <div
                            className="text-[10px] font-semibold text-center leading-none"
                            style={{
                              color: isFuture ? 'rgb(107, 114, 128)' : 'rgb(31, 41, 55)',
                              opacity: isCurrent ? 1 : isFuture ? 0.5 : 0.7
                            }}
                          >
                            {phaseNames[phase.type]}
                          </div>
                          <div
                            className="text-[9px] font-medium leading-none"
                            style={{
                              color: 'rgb(107, 114, 128)',
                              opacity: isCurrent ? 0.9 : isFuture ? 0.4 : 0.6
                            }}
                          >
                            {phase.duration}s
                          </div>
                        </div>

                        {/* Pulse animation for current phase */}
                        {isCurrent && (
                          <motion.div
                            className="absolute inset-0 rounded-lg"
                            style={{
                              boxShadow: `0 0 0 0 ${phaseColors[phase.type]}60`
                            }}
                            animate={{
                              boxShadow: [
                                `0 0 0 0 ${phaseColors[phase.type]}60`,
                                `0 0 0 8px ${phaseColors[phase.type]}00`
                              ]
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeOut"
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow between phases */}
                  {index < phases.length - 1 && (
                    <div className="flex-shrink-0 px-1 flex items-center">
                      <ArrowRight
                        className="w-3.5 h-3.5"
                        style={{
                          color: isPast ? phaseColors[phase.type] : 'rgb(209, 213, 219)',
                          opacity: isPast ? 0.7 : 0.3
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Current phase indicator */}
        {currentPhase !== 'idle' && (
          <motion.div
            className="mt-2 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="text-xs font-semibold"
              style={{ color: phaseColors[currentPhase] }}
            >
              {phaseNames[currentPhase]} {phaseIcons[currentPhase]} · {Math.round(phaseProgress * 100)}%
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
