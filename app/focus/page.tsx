'use client'

import { useEffect } from 'react'
import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { useSharedSession } from '@/hooks/use-shared-session'
import { useSearchParams } from 'next/navigation'
import { useTimerStore } from '@/store/timer-store'
import { FocusPageV2 } from '@/components/focus-v2/focus-page-v2'

// Force dynamic rendering to avoid useSearchParams static generation issues
export const dynamic = 'force-dynamic'

export default function FocusPage() {
  const setContext = useAIAssistantStore(state => state.setContext)
  const addMessage = useAIAssistantStore(state => state.addMessage)
  const getContextMessages = useAIAssistantStore(state => state.getContextMessages)
  const setSessionId = useAIAssistantStore(state => state.setSessionId)
  const { sessionId } = useSharedSession()
  const searchParams = useSearchParams()
  const setDuration = useTimerStore(state => state.setDuration)

  useEffect(() => {
    setContext('focus')
    // Set session ID in store
    if (sessionId) {
      setSessionId(sessionId)
    }

    // Check for duration query parameter and preset the timer
    const durationParam = searchParams.get('duration')
    if (durationParam) {
      const duration = parseInt(durationParam, 10)
      if (!isNaN(duration) && duration > 0) {
        setDuration(duration)
      }
    }

    // Update document title for Nuree Focus Coach
    document.title = 'Nuree Focus Coach - Your Personal Focus Companion'

    // Add welcome message if this is the first time visiting
    const focusMessages = getContextMessages('focus')
    if (focusMessages.length === 0 && sessionId) {
      addMessage({
        role: 'assistant',
        content: "Welcome! 🎯 I'm here to help you stay focused and productive. What would you like to work on today? You can tell me about your task, and I'll help you break it down and stay motivated!",
        context: 'focus',
        sessionId  // Include sessionId
      } as any)
    }
  }, [setContext, addMessage, getContextMessages, sessionId, setSessionId, searchParams, setDuration])
  
  return (
    <FocusPageV2 sessionId={sessionId} />
  )
}
