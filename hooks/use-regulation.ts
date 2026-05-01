import { useState, useEffect } from 'react'
import type { LoopState } from '@/types/calibration'

export type InterventionType = 
  | 'breathing' 
  | 'talk_it_out' 
  | 'grounding' 
  | 'short_sound_reset' 
  | 'quick_challenge' 
  | 'movement_prompt' 
  | 'energising_sound' 
  | 'light_activation' 
  | 'simple_start_cue'
  | 'none'

export interface RegulationAdvice {
  interventions: InterventionType[]
  primaryPrompt: string
}

export function useRegulation(functionalState: LoopState | null) {
  const [advice, setAdvice] = useState<RegulationAdvice>({ interventions: ['none'], primaryPrompt: '' })

  useEffect(() => {
    if (!functionalState) {
      setAdvice({ interventions: ['none'], primaryPrompt: '' })
      return
    }

    switch (functionalState) {
      case 'Overwhelmed':
        setAdvice({
          interventions: ['breathing', 'talk_it_out', 'grounding'],
          primaryPrompt: 'You seem overwhelmed. Let\'s take a deep breath together or talk it out.'
        })
        break
      case 'Distracted':
        setAdvice({
          interventions: ['short_sound_reset', 'quick_challenge'],
          primaryPrompt: 'Having trouble focusing? Let\'s do a quick sound reset to get back on track.'
        })
        break
      case 'Restless':
        setAdvice({
          interventions: ['movement_prompt', 'energising_sound'],
          primaryPrompt: 'Feeling restless? It might be a good time for a quick movement break.'
        })
        break
      case 'Low Energy':
        setAdvice({
          interventions: ['light_activation', 'simple_start_cue'],
          primaryPrompt: 'Energy feeling low? Let\'s start with something very simple.'
        })
        break
      case 'Focused':
        setAdvice({
          interventions: ['none'],
          primaryPrompt: 'You are in a great state for deep work. Let\'s tackle your most important task.'
        })
        break
      default:
        setAdvice({ interventions: ['none'], primaryPrompt: '' })
    }
  }, [functionalState])

  return advice
}
