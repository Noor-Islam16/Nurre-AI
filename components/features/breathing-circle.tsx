'use client'

import { motion } from 'framer-motion'
import { BreathingPattern } from '@/lib/breathing/patterns'

interface BreathingCircleProps {
  phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out' | 'idle'
  phaseProgress: number // 0-1
  pattern: BreathingPattern | null
  instruction: string
  cycleCount: number
  elapsedTime: number
}

export function BreathingCircle({ 
  phase, 
  phaseProgress, 
  pattern,
  instruction,
  cycleCount,
  elapsedTime
}: BreathingCircleProps) {
  if (!pattern) return null
  
  // Calculate current phase duration
  const currentPhase = pattern.phases.find(p => p.type === phase)
  const phaseDuration = currentPhase?.duration || 1
  const timeRemaining = Math.ceil(phaseDuration * (1 - phaseProgress))
  
  // Calculate scales and opacities based on phase
  const getOuterScale = () => {
    switch(phase) {
      case 'inhale': return 0.9 + (0.1 * phaseProgress)
      case 'hold-in': return 1.0
      case 'exhale': return 1.0 - (0.1 * phaseProgress)
      case 'hold-out': return 0.9
      default: return 0.9
    }
  }
  
  const getInnerScale = () => {
    switch(phase) {
      case 'inhale': return 0.7 + (0.3 * phaseProgress)
      case 'hold-in': return 1.0
      case 'exhale': return 1.0 - (0.3 * phaseProgress)
      case 'hold-out': return 0.7
      default: return 0.7
    }
  }
  
  const getCenterScale = () => {
    switch(phase) {
      case 'inhale': return 1.0 + (0.5 * phaseProgress)
      case 'hold-in': return 1.5
      case 'exhale': return 1.5 - (0.5 * phaseProgress)
      case 'hold-out': return 1.0
      default: return 1.0
    }
  }
  
  const getPhaseColor = () => {
    switch(phase) {
      case 'inhale': return 'rgb(255, 107, 53)' // Warm Orange
      case 'hold-in': return 'rgb(255, 140, 105)' // Soft Coral
      case 'exhale': return 'rgb(253, 183, 80)' // Golden Yellow
      case 'hold-out': return 'rgb(255, 180, 162)' // Peachy Pink
      default: return 'rgb(255, 107, 53)' // Warm Orange
    }
  }

  const getPhaseGlow = () => {
    const color = getPhaseColor()
    return `0 0 60px ${color}40, 0 0 100px ${color}20`
  }
  
  const getInnerOpacity = () => {
    switch(phase) {
      case 'inhale': return 0.2 + (0.2 * phaseProgress)
      case 'hold-in': return 0.4
      case 'exhale': return 0.4 - (0.2 * phaseProgress)
      case 'hold-out': return 0.2
      default: return 0.2
    }
  }
  
  // Calculate countdown scale animation
  const countdownScale = phase === 'inhale' ? 1 + (0.3 * phaseProgress) : 
                         phase === 'exhale' ? 1.3 - (0.3 * phaseProgress) : 1.15

  return (
    <div className="relative w-full max-w-[350px] aspect-square mx-auto">
      <svg viewBox="0 0 350 350" className="absolute inset-0 w-full h-full" style={{ filter: `drop-shadow(${getPhaseGlow()})` }} preserveAspectRatio="xMidYMid meet">
        {/* Background circle */}
        <circle
          cx="175"
          cy="175"
          r="162"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.08"
          className="text-orange-300"
        />

        {/* Outer breathing ring */}
        <motion.circle
          cx="175"
          cy="175"
          r="150"
          fill="none"
          stroke="url(#breathingGradient)"
          strokeWidth="8"
          initial={{ scale: 0.9, strokeOpacity: 0.4 }}
          animate={{
            scale: getOuterScale(),
            strokeOpacity: phase === 'inhale' ? 0.7 : 0.4,
          }}
          transition={{
            scale: {
              duration: currentPhase?.duration || 4,
              ease: [0.34, 1.56, 0.64, 1] // Spring easing
            },
            strokeOpacity: { duration: 0.4 }
          }}
        />

        {/* Middle pulsing ring */}
        <motion.circle
          cx="175"
          cy="175"
          r="112"
          fill="none"
          stroke={getPhaseColor()}
          strokeWidth="3"
          initial={{ scale: 0.8, strokeOpacity: 0.3 }}
          animate={{
            scale: getInnerScale() * 1.1,
            strokeOpacity: phase === 'hold-in' || phase === 'hold-out' ? 0.6 : 0.3,
          }}
          transition={{
            scale: {
              duration: currentPhase?.duration || 4,
              ease: [0.34, 1.56, 0.64, 1]
            },
            strokeOpacity: { duration: 0.4 }
          }}
        />

        {/* Inner filled circle */}
        <motion.circle
          cx="175"
          cy="175"
          r="100"
          fill="url(#innerGradient)"
          initial={{ scale: 0.7, fillOpacity: 0.15 }}
          animate={{
            scale: getInnerScale(),
            fillOpacity: getInnerOpacity() * 1.5,
          }}
          transition={{
            scale: {
              duration: currentPhase?.duration || 4,
              ease: [0.34, 1.56, 0.64, 1]
            },
            fillOpacity: { duration: 0.4 }
          }}
        />
        
        {/* Removed center dot to avoid blocking countdown */}
        
        {/* Progress arc */}
        <motion.circle
          cx="175"
          cy="175"
          r="158"
          fill="none"
          stroke={getPhaseColor()}
          strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 158}`}
          strokeDashoffset={`${2 * Math.PI * 158 * (1 - phaseProgress)}`}
          strokeLinecap="round"
          transform="rotate(-90 175 175)"
          opacity="0.6"
        />

        {/* Phase instruction text curved along top arc */}
        <motion.text
          fill={getPhaseColor()}
          fontSize="20"
          fontWeight="700"
          opacity={1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={instruction}
        >
          <textPath href="#topArc" startOffset="50%" textAnchor="middle">
            {instruction}
          </textPath>
        </motion.text>

        {/* Gradients and paths */}
        <defs>
          {/* Arc path for curved text */}
          <path
            id="topArc"
            d="M 40 175 A 135 135 0 0 1 310 175"
            fill="none"
          />

          <linearGradient id="breathingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(255, 107, 53)" />
            <stop offset="33%" stopColor="rgb(255, 140, 105)" />
            <stop offset="66%" stopColor="rgb(253, 183, 80)" />
            <stop offset="100%" stopColor="rgb(255, 180, 162)" />
          </linearGradient>
          <radialGradient id="innerGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor={getPhaseColor()} stopOpacity="0.4" />
            <stop offset="100%" stopColor={getPhaseColor()} stopOpacity="0.15" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Central countdown - large, semi-transparent, breathing with animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="relative"
          animate={{
            scale: countdownScale,
          }}
          transition={{
            duration: 1.2,
            ease: [0.34, 1.56, 0.64, 1]
          }}
        >
          <div
            className="text-8xl font-bold"
            style={{
              color: getPhaseColor(),
              opacity: 0.35,
              textShadow: `0 0 50px ${getPhaseColor()}60, 0 0 80px ${getPhaseColor()}30`
            }}
          >
            {timeRemaining}
          </div>
        </motion.div>
      </div>
      
      {/* Pattern name - subtle at bottom */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div className="text-sm text-orange-800 opacity-60 font-medium">
          {pattern.name}
        </div>
      </div>

      {/* Cycle progress dots around the outer ring */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 350 350" preserveAspectRatio="xMidYMid meet">
        {[...Array(pattern.recommendedCycles)].map((_, i) => {
          const angle = (i * 360 / pattern.recommendedCycles - 90) * Math.PI / 180
          const x = 175 + Math.cos(angle) * 168
          const y = 175 + Math.sin(angle) * 168

          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={i < cycleCount ? getPhaseColor() : 'rgb(251, 207, 232)'}
              initial={{ scale: 0 }}
              animate={{
                scale: i < cycleCount ? 1.3 : 0.9,
                opacity: i < cycleCount ? 1 : 0.4
              }}
              transition={{ delay: i * 0.05 }}
              style={{
                filter: i < cycleCount ? `drop-shadow(0 0 6px ${getPhaseColor()})` : 'none'
              }}
            />
          )
        })}
      </svg>
      
      {/* Floating particles for visual interest */}
      {phase === 'exhale' && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 350 350" preserveAspectRatio="xMidYMid meet">
          {[...Array(6)].map((_, i) => {
            const endX = 175 + Math.cos(i * 60 * Math.PI / 180) * 133
            const endY = 175 + Math.sin(i * 60 * Math.PI / 180) * 133
            return (
              <motion.circle
                key={i}
                r="5"
                fill={getPhaseColor()}
                initial={{
                  cx: 175,
                  cy: 175,
                  scale: 0,
                  opacity: 0
                }}
                animate={{
                  cx: endX,
                  cy: endY,
                  scale: [0, 1.5, 0],
                  opacity: [0, 0.6, 0]
                }}
                transition={{
                  duration: phaseDuration,
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: i * 0.12
                }}
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}