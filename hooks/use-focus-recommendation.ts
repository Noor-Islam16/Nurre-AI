'use client'

import { useState, useEffect } from 'react'
import { useTaskStore } from '@/store/task-store'
import { useUserStore } from '@/store/user-store'

export interface FocusRecommendation {
  taskId: string | null
  taskTitle: string | null
  duration: number
  timeEstimate: number | null
  reasoning: string
  isLoading: boolean
  error: string | null
}

/**
 * useFocusRecommendation Hook
 *
 * Provides AI-powered recommendations for focus sessions.
 * Uses task priority and time estimates to suggest optimal sessions.
 */
export function useFocusRecommendation(): FocusRecommendation {
  const [recommendation, setRecommendation] = useState<FocusRecommendation>({
    taskId: null,
    taskTitle: null,
    duration: 25,
    timeEstimate: null,
    reasoning: '',
    isLoading: true,
    error: null
  })

  const user = useUserStore(state => state.user)
  const tasks = useTaskStore(state => state.tasks)
  const fetchTasks = useTaskStore(state => state.fetchTasks)

  useEffect(() => {
    const loadRecommendation = async () => {
      // Ensure tasks are loaded
      if (tasks.length === 0) {
        try {
          await fetchTasks()
        } catch (err) {
          console.error('[useFocusRecommendation] Failed to fetch tasks:', err)
        }
      }
    }

    loadRecommendation()
  }, [tasks.length, fetchTasks])

  useEffect(() => {
    // Calculate recommendation when tasks are available
    if (!user?.id) {
      setRecommendation(prev => ({
        ...prev,
        isLoading: false
      }))
      return
    }

    // Get active (incomplete) tasks sorted by priority
    const activeTasks = tasks
      .filter(task => !task.completed)
      .sort((a, b) => {
        // Sort by priority (high to low), then by due date
        if (a.priority !== b.priority) {
          return (b.priority || 0) - (a.priority || 0)
        }
        // Tasks with due dates come first
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && b.dueDate) return 1
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        return 0
      })

    const topTask = activeTasks[0] || null

    // Calculate recommended duration
    let duration = 25 // Default
    let reasoning = ''

    if (topTask) {
      // Use task's time estimate if available
      if (topTask.timeEstimate && topTask.timeEstimate > 0) {
        // Clamp between 10 and 60 minutes
        duration = Math.max(10, Math.min(60, topTask.timeEstimate))
        reasoning = `${duration} minutes on "${topTask.title}"`
      } else {
        // Adjust based on time of day
        const hour = new Date().getHours()
        if (hour >= 14 && hour <= 17) {
          // Afternoon slump - shorter sessions
          duration = 25
        } else if (hour >= 9 && hour <= 11) {
          // Morning peak - can do longer
          duration = 45
        } else {
          duration = 25
        }
        reasoning = `${duration} minutes on "${topTask.title}"`
      }

      // Add priority context
      if (topTask.priority >= 3) {
        reasoning += ' (high priority)'
      }
    } else {
      // No tasks - recommend a general session
      reasoning = `${duration} minute focus session`
    }

    setRecommendation({
      taskId: topTask?.id || null,
      taskTitle: topTask?.title || null,
      duration,
      timeEstimate: topTask?.timeEstimate || null,
      reasoning,
      isLoading: false,
      error: null
    })
  }, [user?.id, tasks])

  return recommendation
}
