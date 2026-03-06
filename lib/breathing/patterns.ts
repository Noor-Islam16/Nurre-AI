export interface BreathingPhase {
  type: 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
  duration: number
  instruction: string
}

export interface BreathingPattern {
  id: string
  name: string
  description: string
  phases: BreathingPhase[]
  color: string
  icon: string
  difficulty: 'easy' | 'medium' | 'advanced'
  benefits: string[]
  recommendedCycles: number
}

export const breathingPatterns: Record<string, BreathingPattern> = {
  '478': {
    id: '478',
    name: '4-7-8 Breathing',
    description: 'Calming technique for anxiety relief',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Breathe in' },
      { type: 'hold-in', duration: 7, instruction: 'Hold' },
      { type: 'exhale', duration: 8, instruction: 'Breathe out slowly' }
    ],
    color: 'from-blue-400 to-blue-600',
    icon: '🌊',
    difficulty: 'medium',
    benefits: ['Reduces anxiety', 'Promotes sleep', 'Calms nervous system'],
    recommendedCycles: 4
  },
  'box': {
    id: 'box',
    name: 'Box Breathing',
    description: 'Navy SEAL technique for focus',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Breathe in' },
      { type: 'hold-in', duration: 4, instruction: 'Hold' },
      { type: 'exhale', duration: 4, instruction: 'Breathe out' },
      { type: 'hold-out', duration: 4, instruction: 'Hold empty' }
    ],
    color: 'from-green-400 to-teal-600',
    icon: '⬜',
    difficulty: 'medium',
    benefits: ['Improves focus', 'Reduces stress', 'Enhances performance'],
    recommendedCycles: 6
  },
  '444': {
    id: '444',
    name: '4-4-4 Simple',
    description: 'Quick reset for ADHD minds',
    phases: [
      { type: 'inhale', duration: 4, instruction: 'Breathe in' },
      { type: 'hold-in', duration: 4, instruction: 'Hold' },
      { type: 'exhale', duration: 4, instruction: 'Breathe out' }
    ],
    color: 'from-purple-400 to-pink-600',
    icon: '✨',
    difficulty: 'easy',
    benefits: ['Quick mental reset', 'Easy to remember', 'ADHD-friendly'],
    recommendedCycles: 5
  },
  'resonance': {
    id: 'resonance',
    name: 'Resonance Breathing',
    description: 'Heart coherence for sustained calm',
    phases: [
      { type: 'inhale', duration: 5, instruction: 'Breathe in slowly' },
      { type: 'exhale', duration: 5, instruction: 'Breathe out slowly' }
    ],
    color: 'from-pink-400 to-red-600',
    icon: '❤️',
    difficulty: 'easy',
    benefits: ['Heart rate variability', 'Sustained calm', 'Emotional balance'],
    recommendedCycles: 8
  }
}

export function getPatternById(id: string): BreathingPattern | undefined {
  return breathingPatterns[id]
}

export function getTotalDuration(pattern: BreathingPattern): number {
  return pattern.phases.reduce((sum, phase) => sum + phase.duration, 0)
}

export function getPhaseAtTime(pattern: BreathingPattern, elapsedSeconds: number): {
  phase: BreathingPhase
  phaseIndex: number
  phaseProgress: number
  cycleProgress: number
} {
  const totalDuration = getTotalDuration(pattern)
  const cycleTime = elapsedSeconds % totalDuration
  
  let accumulatedTime = 0
  for (let i = 0; i < pattern.phases.length; i++) {
    const phase = pattern.phases[i]
    if (cycleTime < accumulatedTime + phase.duration) {
      const phaseElapsed = cycleTime - accumulatedTime
      return {
        phase,
        phaseIndex: i,
        phaseProgress: phaseElapsed / phase.duration,
        cycleProgress: cycleTime / totalDuration
      }
    }
    accumulatedTime += phase.duration
  }
  
  // Should never reach here, but return first phase as fallback
  return {
    phase: pattern.phases[0],
    phaseIndex: 0,
    phaseProgress: 0,
    cycleProgress: 0
  }
}