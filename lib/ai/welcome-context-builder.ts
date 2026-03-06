import { createClient } from '@/lib/supabase/client'
import { toISOStringNoMs } from '@/lib/utils/date-helpers'
import { useTaskStore } from '@/store/task-store'
import { useMoodStore } from '@/store/mood-store'
import { useTimerStore } from '@/store/timer-store'
import { useSessionStore } from '@/store/session-store'
import { checkFirstLoginStatus } from '@/lib/auth/helpers'

export interface WelcomeContext {
  // Time context
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: string
  isWeekend: boolean
  currentTime: string
  
  // User activity
  lastSeenMinutesAgo: number | null
  lastFocusSession: {
    taskName: string
    duration: number
    completedAt: Date
  } | null
  
  // Tasks
  incompleteTasks: number
  todaysTasks: Array<{
    id: string
    title: string
    priority: number
    estimatedMinutes: number
  }>
  overdueTasks: number
  nextTask: {
    title: string
    estimatedMinutes: number
    priority: number
  } | null
  
  // Mood & wellness
  recentMood: {
    mood: string | undefined
    energy: number
    focus: number
    timestamp: string
  } | null
  
  // User profile
  adhdPersona: string
  userName: string | null
  
  // Stats
  todayStats: {
    tasksCompleted: number
    focusMinutes: number
    currentStreak: number
  }
  
  // First login flag
  isFirstLogin: boolean
}

export class WelcomeContextBuilder {
  private supabase = createClient()
  
  async buildContext(userId: string): Promise<WelcomeContext> {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
    const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday'
    
    // Determine time of day
    let timeOfDay: WelcomeContext['timeOfDay']
    if (hour < 6) timeOfDay = 'night'
    else if (hour < 12) timeOfDay = 'morning'
    else if (hour < 17) timeOfDay = 'afternoon'
    else if (hour < 21) timeOfDay = 'evening'
    else timeOfDay = 'night'
    
    // Get user profile
    const { data: profile } = await this.supabase
      .from('users')
      .select('name, adhd_persona')
      .eq('id', userId)
      .single()
    
    // Check if this is first login after onboarding
    const { isFirstLogin } = await checkFirstLoginStatus(userId)
    
    // Get last activity
    const sessionStore = useSessionStore.getState()
    const lastActivity = sessionStore.previousSessionEndedAt
    const lastSeenMinutesAgo = lastActivity 
      ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / 60000)
      : null
    
    // Get tasks from store
    const taskStore = useTaskStore.getState()
    const allTasks = taskStore.tasks || []
    
    // Filter tasks
    const incompleteTasks = allTasks.filter(t => !t.completed)
    const todaysTasks = incompleteTasks.filter(t => {
      if (!t.dueDate) return false
      const dueDate = new Date(t.dueDate)
      return dueDate.toDateString() === now.toDateString()
    })
    
    const overdueTasks = incompleteTasks.filter(t => {
      if (!t.dueDate) return false
      const dueDate = new Date(t.dueDate)
      return dueDate < now && dueDate.toDateString() !== now.toDateString()
    })
    
    // Get next priority task
    const nextTask = incompleteTasks
      .sort((a, b) => {
        // Sort by priority (lower number = higher priority) then by due date
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })[0] || null
    
    // Get last focus session from database
    const { data: lastFocusSession } = await this.supabase
      .from('focus_sessions')
      .select('task_id, actual_duration, ended_at, tasks(title)')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('ended_at', { ascending: false })
      .limit(1)
      .single()
    
    // Get recent mood
    const moodStore = useMoodStore.getState()
    const recentMood = moodStore.currentMood ? {
      mood: moodStore.currentMood.mood,
      energy: moodStore.currentMood.energy || 5,
      focus: moodStore.currentMood.focus || 5,
      timestamp: moodStore.currentMood.created_at || new Date().toISOString()
    } : null
    
    // Get today's stats
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    
    const { data: todayCompletedTasks } = await this.supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('updated_at', toISOStringNoMs(todayStart))
    
    const { data: todayFocusSessions } = await this.supabase
      .from('focus_sessions')
      .select('actual_duration')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('ended_at', toISOStringNoMs(todayStart))
    
    const todayFocusMinutes = todayFocusSessions?.reduce(
      (sum, session) => sum + (session.actual_duration || 0), 
      0
    ) || 0
    
    // Get current streak (simplified - consecutive days with completed tasks)
    const { data: recentActivity } = await this.supabase
      .from('tasks')
      .select('updated_at')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('updated_at', { ascending: false })
      .limit(30)
    
    const currentStreak = this.calculateStreak(recentActivity?.map(a => a.updated_at) || [])
    
    return {
      timeOfDay,
      dayOfWeek,
      isWeekend,
      currentTime: now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      lastSeenMinutesAgo,
      lastFocusSession: lastFocusSession ? {
        taskName: (lastFocusSession as any).tasks?.title || 'Previous task',
        duration: lastFocusSession.actual_duration,
        completedAt: new Date(lastFocusSession.ended_at)
      } : null,
      incompleteTasks: incompleteTasks.length,
      todaysTasks: todaysTasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        estimatedMinutes: t.timeEstimate || 30
      })),
      overdueTasks: overdueTasks.length,
      nextTask: nextTask ? {
        title: nextTask.title,
        estimatedMinutes: nextTask.timeEstimate || 30,
        priority: nextTask.priority
      } : null,
      recentMood,
      adhdPersona: profile?.adhd_persona || 'balanced',
      userName: profile?.name || null,
      todayStats: {
        tasksCompleted: todayCompletedTasks?.length || 0,
        focusMinutes: todayFocusMinutes,
        currentStreak
      },
      isFirstLogin
    }
  }
  
  private calculateStreak(dates: string[]): number {
    if (dates.length === 0) return 0
    
    let streak = 1
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if there's activity today
    const latestDate = new Date(dates[0])
    latestDate.setHours(0, 0, 0, 0)
    
    if (latestDate.getTime() !== today.getTime()) {
      // No activity today yet, check if yesterday had activity
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (latestDate.getTime() !== yesterday.getTime()) {
        return 0 // Streak is broken
      }
    }
    
    // Count consecutive days
    let currentDate = new Date(latestDate)
    for (let i = 1; i < dates.length; i++) {
      const checkDate = new Date(dates[i])
      checkDate.setHours(0, 0, 0, 0)
      currentDate.setDate(currentDate.getDate() - 1)
      
      if (checkDate.getTime() === currentDate.getTime()) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }
}