// import type { AIResponse, AIMetadata } from './types/ai-response.types'
import { createClient } from '@/lib/supabase/client'
import { eventTracker, EventType } from '@/lib/tracking/events'

// Temporary type definitions until ai-response.types is created
type AIResponse = any
type AIMetadata = any

// =====================================================
// Error Types and Interfaces
// =====================================================

export enum ErrorType {
  REFUSAL = 'refusal',
  INCOMPLETE = 'incomplete',
  PARSING = 'parsing',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  TOKEN_LIMIT = 'token_limit',
  UNKNOWN = 'unknown'
}

export interface RefusalResponse {
  type: 'refusal'
  reason?: string
  category?: string
  timestamp: Date
}

export interface IncompleteResponse {
  type: 'incomplete'
  partial?: string
  tokensUsed?: number
  timestamp: Date
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  messageCount?: number
  contextSize?: number
  lastSuccessfulResponse?: Date
}

export interface ErrorMetrics {
  errorType: ErrorType
  count: number
  lastOccurred: Date
  recoveryAttempts: number
  recoveredSuccessfully: boolean
}

// =====================================================
// ADHD-Friendly Error Messages
// =====================================================

const ADHD_FRIENDLY_MESSAGES = {
  [ErrorType.REFUSAL]: [
    "I need to rephrase that differently. Let me help you in another way!",
    "Let's try a different approach to that. What specific part can I help with?",
    "I can't process that exact request, but I'm here to help with your ADHD management!",
  ],
  [ErrorType.INCOMPLETE]: [
    "Let me break that down into smaller pieces for you.",
    "That was a bit much for me to process at once. Let's tackle one thing at a time!",
    "I got a bit overwhelmed there (I know the feeling!). What's the most important part?",
  ],
  [ErrorType.PARSING]: [
    "Oops, my brain glitched for a second there. Let me try again!",
    "Technical hiccup on my end - happens to the best of us! Let's continue.",
    "I stumbled over my words there. Here's what I meant to say...",
  ],
  [ErrorType.NETWORK]: [
    "Connection is being flaky. I'll keep trying!",
    "Network is having a moment. Your message is safe, just waiting to reconnect.",
    "Internet is being uncooperative. Let's give it a second and try again.",
  ],
  [ErrorType.TIMEOUT]: [
    "That took longer than expected. Let me speed things up!",
    "Processing timeout - let's try a quicker approach.",
    "My response got stuck in traffic. Here's a faster route...",
  ],
  [ErrorType.RATE_LIMIT]: [
    "We're moving fast! Let's take a quick breather (good for both of us).",
    "Hit my conversation speed limit. Perfect time for a micro-break!",
    "Rate limit reached - nature's way of saying 'pause and reflect'!",
  ],
  [ErrorType.TOKEN_LIMIT]: [
    "That's a lot to process! Let me focus on the key points.",
    "We've covered a lot. Let's summarize and move forward!",
    "Context getting full - time to start fresh with what matters most.",
  ],
  [ErrorType.UNKNOWN]: [
    "Something unexpected happened, but I'm still here to help!",
    "Minor glitch, but we're good to continue. What's next?",
    "Technical hiccup resolved. Let's keep going!",
  ]
}

// =====================================================
// Error Handler Class
// =====================================================

export class AIErrorHandler {
  private errorMetrics: Map<ErrorType, ErrorMetrics> = new Map()
  private circuitBreakerThreshold = 5
  private circuitBreakerResetTime = 60000 // 1 minute
  private lastErrorTime: Date | null = null
  private consecutiveErrors = 0
  private supabase = createClient()

  constructor() {
    this.initializeMetrics()
  }

  private initializeMetrics(): void {
    Object.values(ErrorType).forEach(type => {
      this.errorMetrics.set(type, {
        errorType: type,
        count: 0,
        lastOccurred: new Date(0),
        recoveryAttempts: 0,
        recoveredSuccessfully: false
      })
    })
  }

  /**
   * Handle safety refusals from OpenAI
   */
  handleRefusal(refusal: RefusalResponse, context?: ErrorContext): AIResponse {
    this.logError(ErrorType.REFUSAL, refusal, context)
    
    const message = this.getRandomMessage(ErrorType.REFUSAL)
    const suggestionMessage = this.getSuggestionForRefusal(refusal.reason)
    
    return this.createFallbackResponse(
      ErrorType.REFUSAL,
      `${message}\n\n${suggestionMessage}`,
      {
        refusal: true,
        reason: refusal.reason,
        suggestion: suggestionMessage
      }
    )
  }

  /**
   * Handle incomplete responses (token limit reached)
   */
  handleIncomplete(response: IncompleteResponse, context?: ErrorContext): AIResponse {
    this.logError(ErrorType.INCOMPLETE, response, context)
    
    const message = this.getRandomMessage(ErrorType.INCOMPLETE)
    
    // Attempt to parse partial response if available
    if (response.partial) {
      try {
        const partialData = JSON.parse(response.partial)
        if (partialData.message) {
          return {
            message: `${partialData.message}\n\n*[Response was truncated. ${message}]*`,
            tools: {},
            metadata: {
              confidence: 0.5,
              error: true,
              errorType: ErrorType.INCOMPLETE,
              tokensUsed: response.tokensUsed
            } as AIMetadata
          }
        }
      } catch {
        // Partial parse failed, use fallback
      }
    }
    
    return this.createFallbackResponse(ErrorType.INCOMPLETE, message)
  }

  /**
   * Handle parsing errors from malformed responses
   */
  handleParsingError(error: Error, rawResponse: any, context?: ErrorContext): AIResponse {
    this.logError(ErrorType.PARSING, { error: error.message, rawResponse }, context)
    
    const message = this.getRandomMessage(ErrorType.PARSING)
    
    // Try to extract any usable content
    if (typeof rawResponse === 'string' && rawResponse.length > 0) {
      // Check if it looks like a message
      if (!rawResponse.startsWith('{') && !rawResponse.startsWith('[')) {
        return {
          message: rawResponse,
          tools: {},
          metadata: {
            confidence: 0.3,
            error: true,
            errorType: ErrorType.PARSING,
            fallback: true
          } as AIMetadata
        }
      }
    }
    
    return this.createFallbackResponse(ErrorType.PARSING, message)
  }

  /**
   * Handle network and timeout errors
   */
  handleNetworkError(error: Error, context?: ErrorContext): AIResponse {
    const isTimeout = error.message.toLowerCase().includes('timeout')
    const errorType = isTimeout ? ErrorType.TIMEOUT : ErrorType.NETWORK
    
    this.logError(errorType, { error: error.message }, context)
    
    const message = this.getRandomMessage(errorType)
    
    // Check if circuit breaker should activate
    if (this.shouldActivateCircuitBreaker()) {
      return this.createFallbackResponse(
        errorType,
        `${message}\n\nI'm having consistent connection issues. Let's take a short break and try again in a minute. This is a good time to stretch or grab some water!`,
        { circuitBreakerActive: true }
      )
    }
    
    return this.createFallbackResponse(errorType, message)
  }

  /**
   * Handle rate limit errors
   */
  handleRateLimit(retryAfter?: number, context?: ErrorContext): AIResponse {
    this.logError(ErrorType.RATE_LIMIT, { retryAfter }, context)
    
    const message = this.getRandomMessage(ErrorType.RATE_LIMIT)
    const waitTime = retryAfter ? `${Math.ceil(retryAfter / 1000)} seconds` : 'a moment'
    
    return this.createFallbackResponse(
      ErrorType.RATE_LIMIT,
      `${message}\n\nLet's wait ${waitTime} before continuing. Perfect time for a quick stretch!`,
      { rateLimited: true, retryAfter }
    )
  }

  /**
   * Create a fallback response with proper structure
   */
  createFallbackResponse(
    errorType: ErrorType, 
    message?: string,
    additionalMetadata?: Record<string, any>
  ): AIResponse {
    const fallbackMessage = message || this.getRandomMessage(errorType)
    
    return {
      message: fallbackMessage,
      tools: {}, // All tools disabled during errors
      metadata: {
        confidence: 0,
        error: true,
        errorType,
        fallback: true,
        timestamp: new Date().toISOString(),
        ...additionalMetadata
      } as AIMetadata
    }
  }

  /**
   * Implement recovery strategies based on error type
   */
  async attemptRecovery(
    errorType: ErrorType, 
    originalRequest: any,
    context?: ErrorContext
  ): Promise<{ recovered: boolean; response?: AIResponse }> {
    const metrics = this.errorMetrics.get(errorType)!
    metrics.recoveryAttempts++

    switch (errorType) {
      case ErrorType.TOKEN_LIMIT:
      case ErrorType.INCOMPLETE:
        // Reduce context size and retry
        if (originalRequest.messages && originalRequest.messages.length > 3) {
          const reducedMessages = [
            originalRequest.messages[0], // Keep system message
            ...originalRequest.messages.slice(-2) // Keep last 2 messages
          ]
          return { 
            recovered: true, 
            response: this.createFallbackResponse(
              errorType,
              "I've shortened our conversation history to continue. Let's focus on your current needs!"
            )
          }
        }
        break

      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        // Wait and retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, metrics.recoveryAttempts), 30000)
        await new Promise(resolve => setTimeout(resolve, delay))
        return { recovered: false } // Let caller retry
        
      case ErrorType.RATE_LIMIT:
        // Must wait, no immediate recovery possible
        return { 
          recovered: false,
          response: this.handleRateLimit(60000, context)
        }
        
      default:
        return { recovered: false }
    }

    return { recovered: false }
  }

  /**
   * Get context-appropriate suggestion for refusals
   */
  private getSuggestionForRefusal(reason?: string): string {
    const suggestions = [
      "Try breaking down your request into specific ADHD management tasks.",
      "I can help with focus timers, task planning, mood tracking, and productivity tips!",
      "Let's focus on what you need help with right now for your ADHD.",
      "Would you like help with organizing tasks, starting a focus session, or managing energy?",
    ]
    
    return suggestions[Math.floor(Math.random() * suggestions.length)]
  }

  /**
   * Get random ADHD-friendly error message
   */
  private getRandomMessage(errorType: ErrorType): string {
    const messages = ADHD_FRIENDLY_MESSAGES[errorType] || ADHD_FRIENDLY_MESSAGES[ErrorType.UNKNOWN]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  /**
   * Check if circuit breaker should activate
   */
  private shouldActivateCircuitBreaker(): boolean {
    const now = new Date()
    
    // Reset counter if enough time has passed
    if (this.lastErrorTime && 
        now.getTime() - this.lastErrorTime.getTime() > this.circuitBreakerResetTime) {
      this.consecutiveErrors = 0
    }
    
    this.consecutiveErrors++
    this.lastErrorTime = now
    
    return this.consecutiveErrors >= this.circuitBreakerThreshold
  }

  /**
   * Log error for monitoring and debugging
   */
  private async logError(
    errorType: ErrorType, 
    details: any,
    context?: ErrorContext
  ): Promise<void> {
    // Update metrics
    const metrics = this.errorMetrics.get(errorType)!
    metrics.count++
    metrics.lastOccurred = new Date()
    
    // Log to console for debugging
    console.error(`AI Error [${errorType}]:`, {
      details,
      context,
      metrics: {
        count: metrics.count,
        consecutiveErrors: this.consecutiveErrors
      }
    })
    
    // Track error event
    eventTracker.track(EventType.AI_ERROR, {
      errorType,
      details: JSON.stringify(details),
      userId: context?.userId,
      sessionId: context?.sessionId
    })
    
    // Store in database for analysis (non-blocking)
    this.storeErrorForAnalysis(errorType, details, context).catch(err => 
      console.error('Failed to store error:', err)
    )
  }

  /**
   * Store error details for later analysis
   */
  private async storeErrorForAnalysis(
    errorType: ErrorType,
    details: any,
    context?: ErrorContext
  ): Promise<void> {
    try {
      await this.supabase.from('ai_errors').insert({
        error_type: errorType,
        details,
        context,
        user_id: context?.userId,
        session_id: context?.sessionId,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      // Silently fail - don't let error logging cause more errors
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByType: Record<ErrorType, number>
    recentErrors: ErrorMetrics[]
    circuitBreakerActive: boolean
  } {
    let totalErrors = 0
    const errorsByType: Record<ErrorType, number> = {} as any
    const recentErrors: ErrorMetrics[] = []
    
    this.errorMetrics.forEach((metrics, type) => {
      totalErrors += metrics.count
      errorsByType[type] = metrics.count
      
      // Include if error occurred in last hour
      if (new Date().getTime() - metrics.lastOccurred.getTime() < 3600000) {
        recentErrors.push(metrics)
      }
    })
    
    return {
      totalErrors,
      errorsByType,
      recentErrors,
      circuitBreakerActive: this.consecutiveErrors >= this.circuitBreakerThreshold
    }
  }

  /**
   * Reset error metrics (for testing or manual reset)
   */
  resetMetrics(): void {
    this.initializeMetrics()
    this.consecutiveErrors = 0
    this.lastErrorTime = null
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let errorHandlerInstance: AIErrorHandler | null = null

export function getAIErrorHandler(): AIErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new AIErrorHandler()
  }
  return errorHandlerInstance
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Check if an error is retryable
 */
export function isRetryableError(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.INCOMPLETE,
    ErrorType.PARSING
  ].includes(errorType)
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  // Never expose technical details to users
  if (error.message.includes('network')) {
    return ADHD_FRIENDLY_MESSAGES[ErrorType.NETWORK][0]
  }
  if (error.message.includes('timeout')) {
    return ADHD_FRIENDLY_MESSAGES[ErrorType.TIMEOUT][0]
  }
  if (error.message.includes('rate')) {
    return ADHD_FRIENDLY_MESSAGES[ErrorType.RATE_LIMIT][0]
  }
  
  return ADHD_FRIENDLY_MESSAGES[ErrorType.UNKNOWN][0]
}