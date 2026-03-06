'use client'

import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { FeatureTour } from '@/components/features/feature-tour'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function FeatureTourListener() {
  const { activeTour, completeTour, skipTour } = useAIAssistantStore()
  const [isShowingTour, setIsShowingTour] = useState(false)
  
  useEffect(() => {
    if (activeTour && !isShowingTour) {
      setIsShowingTour(true)
    } else if (!activeTour && isShowingTour) {
      setIsShowingTour(false)
    }
  }, [activeTour, isShowingTour])
  
  const handleComplete = async () => {
    if (!activeTour) return
    
    // Track tour completion
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'tour_completed',
          data: { 
            tour_id: activeTour,
            source: 'interactive'
          }
        })
      }
    } catch (error) {
      console.error('Failed to track tour completion:', error)
    }
    
    // Mark tour as completed
    completeTour(activeTour)
    setIsShowingTour(false)
    
    // Send completion message
    setTimeout(() => {
      useAIAssistantStore.getState().addMessage({
        role: 'assistant',
        content: "Great job completing the tour! You're getting the hang of it. Feel free to explore on your own or ask me for help with anything specific.",
      })
    }, 500)
  }
  
  const handleSkip = async () => {
    if (!activeTour) return
    
    // Track tour skip
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'tour_skipped',
          data: { 
            tour_id: activeTour,
            source: 'user_action'
          }
        })
      }
    } catch (error) {
      console.error('Failed to track tour skip:', error)
    }
    
    skipTour()
    setIsShowingTour(false)
    
    // Send skip acknowledgment
    setTimeout(() => {
      useAIAssistantStore.getState().addMessage({
        role: 'assistant',
        content: "No problem! You can always ask me to show you around specific features when you're ready. Just say 'show me how to...' and I'll guide you.",
      })
    }, 500)
  }
  
  if (!activeTour || !isShowingTour) {
    return null
  }
  
  return (
    <FeatureTour
      tourId={activeTour}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  )
}