import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Parse a due date string from AI tool calls
 * Handles relative dates ("today", "tomorrow", "next week") and ISO format
 */
function parseDueDateString(dueDateStr: string): Date | undefined {
  if (!dueDateStr) return undefined

  const normalized = dueDateStr.toLowerCase().trim()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (normalized) {
    case 'today':
      return today
    case 'tomorrow':
      return new Date(today.getTime() + 24 * 60 * 60 * 1000)
    case 'next week':
      return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    default:
      // Try parsing as ISO date or other formats
      const parsed = new Date(dueDateStr)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
      return undefined
  }
}

/**
 * Server-side bridge for executing store methods from backend
 * This allows tools to work with store-like methods on the server
 * where Zustand stores aren't directly available
 */
export class StoreBridge {
  constructor(
    private userId: string,
    private supabase: SupabaseClient
  ) {}

  /**
   * Task store methods
   */
  async createTaskFromTool(params: {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    timeEstimate?: number
    dueDate?: string
    subtasks?: string[]
  }): Promise<{ taskId: string; success: boolean; error?: string }> {
    try {
      // Map priority to numeric value
      const priorityMap = { low: 1, medium: 2, high: 3 }
      const priority = params.priority ? priorityMap[params.priority] : 2

      // Parse due date if provided
      const parsedDueDate = params.dueDate ? parseDueDateString(params.dueDate) : undefined

      // Create main task
      const { data: mainTask, error: mainError } = await this.supabase
        .from('tasks')
        .insert({
          user_id: this.userId,
          title: params.title,
          description: params.description || '',
          time_estimate: params.timeEstimate,
          priority,
          completed: false,
          ai_subtasks: params.subtasks,
          due_date: parsedDueDate?.toISOString()
        })
        .select()
        .single()
      
      if (mainError || !mainTask) {
        return { 
          taskId: '', 
          success: false, 
          error: mainError?.message || 'Failed to create task' 
        }
      }
      
      // Create subtasks if provided
      if (params.subtasks?.length) {
        const subtaskData = params.subtasks.map((title, index) => ({
          user_id: this.userId,
          title,
          parent_id: mainTask.id,
          priority: priority - 1,
          completed: false,
          order_index: index
        }))
        
        await this.supabase
          .from('tasks')
          .insert(subtaskData)
      }
      
      return { taskId: mainTask.id, success: true }
    } catch (error) {
      console.error('Task creation failed:', error)
      return { 
        taskId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async completeTaskFromTool(
    taskId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        completed: true,
        completed_at: new Date().toISOString()
      }

      if (notes) {
        updateData.completion_notes = notes
      }

      const { error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', this.userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async editTaskFromTool(
    taskId: string,
    updates: {
      title?: string
      description?: string
      priority?: 'low' | 'medium' | 'high'
      timeEstimate?: number
      dueDate?: string
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Map priority to numeric value if provided
      const priorityMap = { low: 1, medium: 2, high: 3 }

      const updateData: Record<string, any> = {}

      if (updates.title !== undefined) {
        updateData.title = updates.title
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description
      }
      if (updates.priority !== undefined) {
        updateData.priority = priorityMap[updates.priority]
      }
      if (updates.timeEstimate !== undefined) {
        updateData.time_estimate = updates.timeEstimate
      }
      if (updates.dueDate !== undefined) {
        const parsedDueDate = parseDueDateString(updates.dueDate)
        updateData.due_date = parsedDueDate?.toISOString() || null
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No valid updates provided' }
      }

      updateData.updated_at = new Date().toISOString()

      const { error } = await this.supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .eq('user_id', this.userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Timer/Focus store methods
   */
  async startFocusFromTool(params: {
    duration: number
    taskId?: string
    backgroundNoise?: string
  }): Promise<{ sessionId: string; success: boolean; error?: string }> {
    try {
      // Create focus session in database
      const { data: session, error } = await this.supabase
        .from('focus_sessions')
        .insert({
          user_id: this.userId,
          task_id: params.taskId,
          duration: params.duration,
          created_at: new Date().toISOString(),
          background_noise: params.backgroundNoise
        })
        .select()
        .single()
      
      if (error || !session) {
        return { 
          sessionId: '', 
          success: false, 
          error: error?.message || 'Failed to start focus session' 
        }
      }
      
      // Track event
      await this.supabase.from('events').insert({
        user_id: this.userId,
        type: 'focus_start',
        data: {
          duration: params.duration,
          taskId: params.taskId,
          sessionId: session.id,
          backgroundNoise: params.backgroundNoise
        }
      })
      
      return { sessionId: session.id, success: true }
    } catch (error) {
      return { 
        sessionId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start focus'
      }
    }
  }
  
  async pauseFocusFromTool(
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find active session
      const { data: activeSessions, error: findError } = await this.supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', this.userId)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (findError || !activeSessions?.length) {
        return { success: false, error: 'No active focus session found' }
      }
      
      const session = activeSessions[0]
      
      // Update session with pause info
      const { error: updateError } = await this.supabase
        .from('focus_sessions')
        .update({ 
          pause_reason: reason,
          last_paused_at: new Date().toISOString()
        })
        .eq('id', session.id)
      
      if (updateError) {
        return { success: false, error: updateError.message }
      }
      
      // Track pause event
      await this.supabase.from('events').insert({
        user_id: this.userId,
        type: 'focus_pause',
        data: {
          sessionId: session.id,
          reason
        }
      })
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to pause focus'
      }
    }
  }
  
  async endFocusFromTool(
    completed = false
  ): Promise<{ success: boolean; actualDuration?: number; error?: string }> {
    try {
      // Find active session
      const { data: activeSessions, error: findError } = await this.supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', this.userId)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (findError || !activeSessions?.length) {
        return { success: false, error: 'No active focus session found' }
      }
      
      const session = activeSessions[0]
      const startTime = new Date(session.created_at).getTime()
      const actualDuration = Math.floor((Date.now() - startTime) / 60000) // minutes
      
      // Update session
      const { error: updateError } = await this.supabase
        .from('focus_sessions')
        .update({
          actual_duration: actualDuration,
          ended_at: new Date().toISOString(),
          completed
        })
        .eq('id', session.id)
      
      if (updateError) {
        return { success: false, error: updateError.message }
      }
      
      // Track end event
      await this.supabase.from('events').insert({
        user_id: this.userId,
        type: 'focus_end',
        data: {
          sessionId: session.id,
          completed,
          actualDuration
        }
      })
      
      return { success: true, actualDuration }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to end focus'
      }
    }
  }
  
  /**
   * Mood store methods
   */
  async logMoodFromTool(params: {
    mood: 'terrible' | 'bad' | 'okay' | 'good' | 'excellent'
    energy: number
    focus?: number
    notes?: string
  }): Promise<{ entryId: string; success: boolean; error?: string }> {
    try {
      const moodData = {
        user_id: this.userId,
        mood: params.mood,
        energy: params.energy,
        focus: params.focus || 5,
        note: params.notes,
        source: 'tool' as const
      }
      
      const { data, error } = await this.supabase
        .from('mood_entries')
        .insert(moodData)
        .select()
        .single()
      
      if (error || !data) {
        return { 
          entryId: '', 
          success: false, 
          error: error?.message || 'Failed to log mood' 
        }
      }
      
      // Track mood event
      await this.supabase.from('events').insert({
        user_id: this.userId,
        type: 'mood_update',
        data: { 
          mood: data.mood,
          energy: data.energy,
          focus: data.focus,
          source: 'tool'
        }
      })
      
      return { entryId: data.id, success: true }
    } catch (error) {
      return { 
        entryId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Rewards store methods
   */
  async grantRewardFromTool(params: {
    type: 'points' | 'achievement' | 'streak'
    value: number | string
    reason?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      switch (params.type) {
        case 'points':
          const points = typeof params.value === 'number' ? params.value : parseInt(params.value as string, 10)
          
          // Get current profile
          // rose_progress no longer exists in simplified schema
          // const { data: profile } = await this.supabase
          //   .from('users')
          //   .select('rose_progress')
          //   .eq('id', this.userId)
          //   .single()
          
          const newProgress = Math.min(100, points / 10)
          
          // Update points
          // rose_progress no longer exists in simplified schema
          // await this.supabase
          //   .from('users')
          //   .update({ rose_progress: newProgress })
          //   .eq('id', this.userId)
          
          // Log reward event
          await this.supabase.from('events').insert({
            user_id: this.userId,
            type: 'reward_granted',
            data: { 
              type: 'points',
              value: points,
              reason: params.reason || 'Tool reward'
            }
          })
          break
          
        case 'streak':
          const streakDays = typeof params.value === 'number' ? params.value : 1
          
          // Get current streak
          const { data: streakProfile } = await this.supabase
            .from('users')
            .select('current_streak, longest_streak')
            .eq('id', this.userId)
            .single()
          
          const currentStreak = (streakProfile?.current_streak || 0) + streakDays
          const longestStreak = Math.max(currentStreak, streakProfile?.longest_streak || 0)
          
          await this.supabase
            .from('users')
            .update({ 
              current_streak: currentStreak,
              longest_streak: longestStreak
            })
            .eq('id', this.userId)
          break
          
        // Achievement handling would need more complex logic
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}