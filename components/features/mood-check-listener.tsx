'use client'

import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { DailyMoodModal } from '@/components/features/daily-mood-modal'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MoodCheckListener() {
  const { moodCheckRequested, moodCheckContext, clearMoodCheckRequest } = useAIAssistantStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  useEffect(() => {
    if (moodCheckRequested) {
      setIsModalOpen(true)
    }
  }, [moodCheckRequested])
  
  const handleClose = () => {
    setIsModalOpen(false)
    clearMoodCheckRequest()
  }
  
  const handleComplete = async () => {
    // Track that mood was checked with context
    if (moodCheckContext) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Track this as an event
          await supabase.from('events').insert({
            user_id: user.id,
            type: 'mood_check_triggered',
            data: { 
              context: moodCheckContext,
              source: 'ai_triggered'
            }
          })
        }
      } catch (error) {
        console.error('Failed to track mood check event:', error)
      }
    }
    
    setIsModalOpen(false)
    
    // Send appropriate follow-up message based on context
    const contextToUse = moodCheckContext
    clearMoodCheckRequest()
    
    if (contextToUse === 'welcome') {
      // Add a thank you message after mood check from welcome
      setTimeout(() => {
        const store = useAIAssistantStore.getState()
        store.addMessage({
          role: 'assistant',
          content: "Thanks for sharing how you're feeling! Based on your mood, I'll adapt my support to best help you today. What would you like to focus on first?",
        })
      }, 500)
    } else if (contextToUse === 'check_in') {
      // Add a supportive message after check-in
      setTimeout(() => {
        const store = useAIAssistantStore.getState()
        store.addMessage({
          role: 'assistant',
          content: "Thanks for checking in! I've logged your mood. Remember, every check-in helps me understand your patterns better.",
        })
      }, 500)
    }
  }
  
  return (
    <DailyMoodModal
      isOpen={isModalOpen}
      onClose={handleClose}
      onComplete={handleComplete}
      context={moodCheckContext || undefined}
    />
  )
}