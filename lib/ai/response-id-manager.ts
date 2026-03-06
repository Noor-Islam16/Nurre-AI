/**
 * Manages response IDs for conversation continuity
 * Response IDs are stored per session and persist across page navigation
 */

const RESPONSE_ID_KEY_PREFIX = 'ai-response-id-'
const RESPONSE_ID_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export class ResponseIdManager {
  /**
   * Get the last response ID for a session
   */
  static getLastResponseId(sessionId: string): string | null {
    if (!sessionId) return null
    
    try {
      const key = `${RESPONSE_ID_KEY_PREFIX}${sessionId}`
      const stored = localStorage.getItem(key)
      
      if (!stored) return null
      
      const data = JSON.parse(stored)
      const now = Date.now()
      
      // Check if expired
      if (data.timestamp && (now - data.timestamp) > RESPONSE_ID_EXPIRY) {
        localStorage.removeItem(key)
        return null
      }
      
      return data.responseId
    } catch (error) {
      console.warn('Error accessing localStorage for response ID:', error)
      return null
    }
  }
  
  /**
   * Save a response ID for a session
   */
  static saveResponseId(sessionId: string, responseId: string): void {
    if (!sessionId || !responseId) return
    
    try {
      const key = `${RESPONSE_ID_KEY_PREFIX}${sessionId}`
      const data = {
        responseId,
        timestamp: Date.now()
      }
      
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.warn('Error saving response ID to localStorage:', error)
      // Continue - this is for optimization only
    }
  }
  
  /**
   * Clear response ID for a session
   */
  static clearResponseId(sessionId: string): void {
    if (!sessionId) return
    
    const key = `${RESPONSE_ID_KEY_PREFIX}${sessionId}`
    localStorage.removeItem(key)
  }
  
  /**
   * Clear all expired response IDs
   */
  static clearExpired(): void {
    const now = Date.now()
    const keys = Object.keys(localStorage)
    
    keys.forEach(key => {
      if (key.startsWith(RESPONSE_ID_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            if (data.timestamp && (now - data.timestamp) > RESPONSE_ID_EXPIRY) {
              localStorage.removeItem(key)
            }
          }
        } catch {
          // Remove corrupted data
          localStorage.removeItem(key)
        }
      }
    })
  }
  
  /**
   * Get all response IDs (for debugging)
   */
  static getAllResponseIds(): Record<string, { responseId: string; timestamp: number }> {
    const result: Record<string, { responseId: string; timestamp: number }> = {}
    const keys = Object.keys(localStorage)
    
    keys.forEach(key => {
      if (key.startsWith(RESPONSE_ID_KEY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key)
          if (stored) {
            const data = JSON.parse(stored)
            const sessionId = key.replace(RESPONSE_ID_KEY_PREFIX, '')
            result[sessionId] = data
          }
        } catch {
          // Skip corrupted data
        }
      }
    })
    
    return result
  }
}