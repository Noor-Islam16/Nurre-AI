/**
 * Standardized responses for guardrail actions
 * Provides consistent error messages and helpful feedback
 */

export interface GuardrailResponse {
  status: number
  error?: string
  message: string
  filtered?: boolean
  retryAfter?: number
  metadata?: any
}

export const GUARDRAIL_RESPONSES = {
  // Rate limiting
  rate_limit: {
    status: 429,
    error: 'Too many requests',
    message: 'You\'re sending messages too quickly. Please wait a moment before trying again.',
    retryAfter: 60,
    metadata: {
      tip: 'Take a short break! Sometimes stepping away for a minute helps with focus.'
    }
  },
  
  // Content filtering - Academic
  academic_filtered: {
    status: 200, // Not an error, just filtered
    filtered: true,
    message: 'I understand school can be challenging with ADHD! While I can\'t write assignments for you, I can help you develop study strategies, break down tasks, and manage your time better. What specific aspect of your schoolwork is challenging?',
    metadata: {
      tip: 'Try asking about: study techniques, time management, focus strategies, or breaking down assignments.'
    }
  },
  
  // Content filtering - Off-topic
  offtopic_filtered: {
    status: 200,
    filtered: true,
    message: 'I\'m not able to help with that, but I can help you organize your tasks, talk through what\'s on your mind, or get focused. What would be most helpful?',
    metadata: {
      tip: 'I can help with: task management, focus sessions, mood tracking, and getting organized.'
    }
  },

  // Content filtering - Prompt injection
  injection_filtered: {
    status: 200,
    filtered: true,
    message: 'Let\'s keep things on track. What can I help you with?',
    metadata: {
      tip: 'I\'m here to help with productivity, not technical tricks.'
    }
  },

  // Content filtering - Inappropriate
  inappropriate_filtered: {
    status: 200,
    filtered: true,
    message: 'Let\'s keep things supportive and productive. How can I help?',
    metadata: {
      tip: 'I\'m here to help you stay on track.'
    }
  },
  
  // Abuse detection - Warning level
  abuse_warning: {
    status: 200,
    message: 'Your message has been processed. Please note that continued policy violations may result in temporary restrictions.',
    metadata: {
      severity: 'warning',
      tip: 'Keep questions focused on how I can help you.'
    }
  },
  
  // Abuse detection - Limited access
  abuse_limited: {
    status: 403,
    error: 'Access limited',
    message: 'Your access has been temporarily limited due to multiple policy violations. You can send up to 5 messages per hour. Please keep your questions focused on ADHD support.',
    metadata: {
      severity: 'limited',
      tip: 'Use your messages wisely - focus on what\'s most important for your ADHD management.'
    }
  },
  
  // Abuse detection - Suspended
  abuse_suspended: {
    status: 403,
    error: 'Access suspended',
    message: 'Your access has been temporarily suspended due to repeated policy violations. Please try again later.',
    metadata: {
      severity: 'suspended',
      tip: 'Take a break and come back when your suspension lifts.'
    }
  },
  
  // System errors
  guardrail_error: {
    status: 500,
    error: 'Safety system error',
    message: 'Our safety systems encountered an issue. Please try again in a moment.',
    metadata: {
      tip: 'If this persists, try refreshing the page.'
    }
  },
  
  // Successful but with warning
  success_with_warning: (warningCount: number) => ({
    status: 200,
    message: `⚠️ Warning: You have ${warningCount} warning${warningCount === 1 ? '' : 's'} remaining before access restrictions are applied. Please keep your questions focused on ADHD support.`,
    metadata: {
      severity: 'warning',
      remainingWarnings: warningCount
    }
  })
}

/**
 * Get appropriate response based on filter reason
 */
export function getFilterResponse(reason: string): GuardrailResponse {
  switch (reason) {
    case 'academic':
      return GUARDRAIL_RESPONSES.academic_filtered
    case 'offtopic':
      return GUARDRAIL_RESPONSES.offtopic_filtered
    case 'injection':
      return GUARDRAIL_RESPONSES.injection_filtered
    case 'inappropriate':
      return GUARDRAIL_RESPONSES.inappropriate_filtered
    default:
      return GUARDRAIL_RESPONSES.offtopic_filtered
  }
}

/**
 * Get appropriate response based on restriction level
 */
export function getRestrictionResponse(level: string): GuardrailResponse {
  switch (level) {
    case 'warning':
      return GUARDRAIL_RESPONSES.abuse_warning
    case 'limited':
      return GUARDRAIL_RESPONSES.abuse_limited
    case 'suspended':
      return GUARDRAIL_RESPONSES.abuse_suspended
    default:
      return GUARDRAIL_RESPONSES.guardrail_error
  }
}

/**
 * Format response with additional context
 */
export function formatGuardrailResponse(
  response: GuardrailResponse,
  additionalContext?: any
): any {
  return {
    ...response,
    timestamp: new Date().toISOString(),
    ...additionalContext
  }
}