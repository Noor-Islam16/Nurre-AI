'use client'

import { useEffect } from 'react'
import { useRewardsStore, GP_VALUES } from '@/store/rewards-store'
import { useToast } from '@/hooks/use-toast'
import { Star } from 'lucide-react'

export function useGrowthPointsListener() {
  const { earnGP } = useRewardsStore()
  const { toast } = useToast()

  // Helper to show points toast with rose styling
  const showPointsToast = (amount: number, reason: string) => {
    toast({
      description: (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 rounded-full flex-shrink-0">
            <Star className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <div>
            <div className="font-bold text-rose-600">+{amount} pts</div>
            <div className="text-sm text-gray-600">{reason}</div>
          </div>
        </div>
      ),
    })
  }

  useEffect(() => {
    // Task completed: +10 pts
    const handleTaskComplete = async () => {
      const result = await earnGP(GP_VALUES.task_complete, 'task_complete')

      if (result.success) {
        showPointsToast(GP_VALUES.task_complete, 'Task completed!')
      }
    }

    // Focus session completed: +20 pts
    const handleFocusComplete = async () => {
      const result = await earnGP(GP_VALUES.focus_complete, 'focus_complete')

      if (result.success) {
        showPointsToast(GP_VALUES.focus_complete, 'Focus session complete!')
      }
    }

    // Mood logged: +5 pts
    const handleMoodLog = async () => {
      const result = await earnGP(GP_VALUES.mood_checkin, 'mood_checkin')

      if (result.success) {
        showPointsToast(GP_VALUES.mood_checkin, 'Mood logged!')
      }
    }

    // Breathing exercise completed: +5 pts
    const handleBreathingComplete = async () => {
      const result = await earnGP(GP_VALUES.breathing_complete, 'breathing_complete')

      if (result.success) {
        showPointsToast(GP_VALUES.breathing_complete, 'Breathing exercise complete!')
      }
    }

    // Add event listeners
    window.addEventListener('task-completed', handleTaskComplete as EventListener)
    window.addEventListener('timer-complete', handleFocusComplete as EventListener)
    window.addEventListener('mood-logged', handleMoodLog as EventListener)
    window.addEventListener('breathing-complete', handleBreathingComplete as EventListener)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('task-completed', handleTaskComplete as EventListener)
      window.removeEventListener('timer-complete', handleFocusComplete as EventListener)
      window.removeEventListener('mood-logged', handleMoodLog as EventListener)
      window.removeEventListener('breathing-complete', handleBreathingComplete as EventListener)
    }
  }, [earnGP, toast])
}
