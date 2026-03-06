import { BreathingPattern } from '@/lib/breathing/patterns'

export interface BreathingCoachMessage {
  message: string
  type: 'encouragement' | 'instruction' | 'achievement' | 'tip'
}

export function getBreathingStartMessage(pattern: BreathingPattern): BreathingCoachMessage {
  const messages: Record<string, BreathingCoachMessage> = {
    '478': {
      message: "Let's calm your nervous system with 4-7-8 breathing. This technique is scientifically proven to reduce anxiety. Follow the visual guide and breathe at your own pace.",
      type: 'instruction'
    },
    'box': {
      message: "Box breathing is used by Navy SEALs to enhance focus under pressure. Let's build your mental clarity together. Match your breath to the visual cues.",
      type: 'instruction'
    },
    '444': {
      message: "Perfect choice for a quick reset! This simple pattern is great for ADHD minds. Just 3 cycles will help you refocus.",
      type: 'instruction'
    },
    'resonance': {
      message: "Resonance breathing creates heart coherence, promoting sustained calm. This gentle rhythm will help balance your nervous system.",
      type: 'instruction'
    }
  }
  
  return messages[pattern.id] || {
    message: "Let's begin your breathing exercise. Follow the visual guide and breathe naturally.",
    type: 'instruction'
  }
}

export function getBreathingEncouragement(pattern: string, cycleCount: number): BreathingCoachMessage {
  const encouragements: BreathingCoachMessage[] = []
  
  // Cycle-based encouragements
  if (cycleCount === 1) {
    encouragements.push(
      { message: "Great start! You're already activating your parasympathetic nervous system.", type: 'encouragement' },
      { message: "Perfect rhythm! Your brain is thanking you already.", type: 'encouragement' },
      { message: "You're doing amazing! Feel your focus sharpening.", type: 'encouragement' }
    )
  } else if (cycleCount === 3) {
    encouragements.push(
      { message: "3 cycles complete! You've just given your ADHD brain a powerful reset.", type: 'achievement' },
      { message: "Excellent work! Your nervous system is now in a calmer state.", type: 'achievement' },
      { message: "You did it! 3 cycles is all it takes to shift your mental state.", type: 'achievement' }
    )
  } else if (cycleCount === 5) {
    encouragements.push(
      { message: "5 cycles! You're building incredible mental resilience.", type: 'achievement' },
      { message: "Impressive dedication! Your focus capacity is expanding.", type: 'achievement' },
      { message: "You're in the zone! This is what regulated breathing feels like.", type: 'achievement' }
    )
  } else if (cycleCount === 10) {
    encouragements.push(
      { message: "10 cycles! You're a breathing champion! 🌟", type: 'achievement' },
      { message: "Incredible! You've mastered this breathing technique.", type: 'achievement' },
      { message: "Zen master level achieved! Your nervous system is fully regulated.", type: 'achievement' }
    )
  }
  
  // Pattern-specific encouragements
  const patternMessages: Record<string, BreathingCoachMessage[]> = {
    '478': [
      { message: "Notice how the extended exhale naturally calms your mind.", type: 'tip' },
      { message: "This pattern is lowering your cortisol levels with each breath.", type: 'tip' },
      { message: "The 7-second hold is where the magic happens - oxygen absorption peaks.", type: 'tip' }
    ],
    'box': [
      { message: "Imagine drawing a perfect square with your breath.", type: 'tip' },
      { message: "This technique improves decision-making by balancing your autonomic nervous system.", type: 'tip' },
      { message: "Box breathing enhances focus by creating predictable rhythm for your ADHD brain.", type: 'tip' }
    ],
    '444': [
      { message: "Simple patterns work best for ADHD minds - you're doing great!", type: 'encouragement' },
      { message: "This rhythm is perfect for quick mental resets between tasks.", type: 'tip' },
      { message: "4-4-4 is your secret weapon for beating procrastination.", type: 'tip' }
    ],
    'resonance': [
      { message: "You're synchronizing your heart and breath - powerful stuff!", type: 'tip' },
      { message: "This pattern optimizes your heart rate variability.", type: 'tip' },
      { message: "Resonance breathing is like meditation without the sitting still.", type: 'tip' }
    ]
  }
  
  // Combine all applicable messages
  if (patternMessages[pattern]) {
    encouragements.push(...patternMessages[pattern])
  }
  
  // Return a random encouragement if available
  if (encouragements.length > 0) {
    return encouragements[Math.floor(Math.random() * encouragements.length)]
  }
  
  // Default encouragement
  return {
    message: "You're doing great! Keep following the rhythm.",
    type: 'encouragement'
  }
}

export function getBreathingCompletionMessage(pattern: string, totalCycles: number): BreathingCoachMessage {
  if (totalCycles >= 10) {
    return {
      message: `Amazing session! ${totalCycles} cycles completed. Your nervous system is fully regulated and your mind is primed for deep focus. You've built serious mental resilience today!`,
      type: 'achievement'
    }
  } else if (totalCycles >= 5) {
    return {
      message: `Great work! ${totalCycles} cycles completed. You've successfully reset your nervous system and improved your focus capacity. Ready to tackle anything now!`,
      type: 'achievement'
    }
  } else if (totalCycles >= 3) {
    return {
      message: `Well done! ${totalCycles} cycles is perfect for a quick reset. Your ADHD brain just got the regulation it needed. Feel the difference?`,
      type: 'achievement'
    }
  } else if (totalCycles >= 1) {
    return {
      message: "Good start! Even one cycle helps. Try for 3 next time - that's the sweet spot for ADHD nervous system regulation.",
      type: 'encouragement'
    }
  }
  
  return {
    message: "Thanks for trying the breathing exercise. Come back anytime you need a mental reset!",
    type: 'encouragement'
  }
}

export function shouldSuggestBreathing(context: {
  taskSwitchCount?: number
  idleTime?: number
  mood?: string
  stressLevel?: number
  lastBreathingTime?: Date
}): { suggest: boolean; reason: string } {
  // Don't suggest if recently did breathing (within 30 minutes)
  if (context.lastBreathingTime) {
    const timeSince = Date.now() - context.lastBreathingTime.getTime()
    if (timeSince < 30 * 60 * 1000) {
      return { suggest: false, reason: '' }
    }
  }
  
  // Check various triggers
  if (context.taskSwitchCount && context.taskSwitchCount >= 5) {
    return { 
      suggest: true, 
      reason: "I notice you're switching between tasks frequently. A quick breathing exercise could help you refocus."
    }
  }
  
  if (context.idleTime && context.idleTime > 300) { // 5 minutes idle
    return {
      suggest: true,
      reason: "You've been idle for a while. A breathing exercise could help you get back into flow."
    }
  }
  
  if (context.mood === 'stressed' || context.mood === 'anxious' || context.mood === 'overwhelmed') {
    return {
      suggest: true,
      reason: "I sense you might be feeling overwhelmed. Let's reset with a calming breathing exercise."
    }
  }
  
  if (context.stressLevel && context.stressLevel > 7) {
    return {
      suggest: true,
      reason: "Your stress levels seem high. A breathing exercise can quickly calm your nervous system."
    }
  }
  
  return { suggest: false, reason: '' }
}