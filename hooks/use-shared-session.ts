// hooks/use-shared-session.ts
import { useState, useEffect } from 'react'
import { ResponseIdManager } from '@/lib/ai/response-id-manager'

const SESSION_KEY = 'ai-chat-session-id'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export function useSharedSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isNewSession, setIsNewSession] = useState(false)

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem(SESSION_KEY)
    const sessionTimestamp = localStorage.getItem(`${SESSION_KEY}-timestamp`)
    
    const now = Date.now()
    const isExpired = sessionTimestamp ? 
      (now - parseInt(sessionTimestamp)) > SESSION_DURATION : true
    
    if (stored && !isExpired) {
      // Use existing session
      setSessionId(stored)
      setIsNewSession(false)
    } else {
      // Create new session
      const newId = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, newId)
      localStorage.setItem(`${SESSION_KEY}-timestamp`, now.toString())
      setSessionId(newId)
      setIsNewSession(true)
      
      // Clean up old conversation IDs
      localStorage.removeItem('dashboard-conversation-id')
      localStorage.removeItem('focus-conversation-id')
    }
  }, [])

  const resetSession = () => {
    // Clear old session response ID
    if (sessionId) {
      ResponseIdManager.clearResponseId(sessionId)
    }
    
    const newId = crypto.randomUUID()
    const now = Date.now()
    localStorage.setItem(SESSION_KEY, newId)
    localStorage.setItem(`${SESSION_KEY}-timestamp`, now.toString())
    setSessionId(newId)
    setIsNewSession(true)
    
    // Clean up old conversation IDs
    localStorage.removeItem('dashboard-conversation-id')
    localStorage.removeItem('focus-conversation-id')
    
    // Clean up expired response IDs
    ResponseIdManager.clearExpired()
    
    // Dispatch event for components to reset instead of reload
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-reset', { detail: { newSessionId: newId } }))
    }
    
    // Optional: Still reload if preferred for complete reset
    // Uncomment the following line if full reload is needed
    // window.location.reload()
  }

  return {
    sessionId,
    isNewSession,
    resetSession
  }
}