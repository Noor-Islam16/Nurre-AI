import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { requestCache } from '@/lib/cache/request-cache'
import { calculateAutoPriority, sortTasksByPriority, type Priority } from '@/lib/utils/task-priority'
import type { RecurringPattern } from '@/types/database'
import { useUserStore } from './user-store'

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

interface Task {
  id: string
  user_id?: string
  parent_id?: string  // Changed from parent_task_id
  title: string
  description?: string
  timeEstimate?: number
  priority: number
  completed: boolean
  aiSubtasks?: string[]  // Changed from aiGeneratedSteps
  dueDate?: Date
  recurringPattern?: RecurringPattern
  priorityOverride: boolean
  createdAt: Date
  completedAt?: Date
  order_index?: number
}

interface TaskStore {
  tasks: Task[]
  isLoading: boolean

  fetchTasks: () => Promise<void>
  addTask: (task: Partial<Task>) => Promise<Task | null>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  reorderTasks: (tasks: Task[]) => void

  // Tool-friendly methods for native tool calling
  createTaskFromTool: (params: {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    timeEstimate?: number
    dueDate?: string
    subtasks?: string[]
  }) => Promise<{ taskId: string; success: boolean; error?: string }>

  completeTaskFromTool: (taskId: string, notes?: string) => Promise<{ success: boolean; error?: string }>

  editTaskFromTool: (taskId: string, updates: {
    title?: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    timeEstimate?: number
    dueDate?: string
  }) => Promise<{ success: boolean; error?: string }>

  breakDownTask: (taskId: string) => Promise<{ steps: string[]; success: boolean; error?: string }>

  updateTaskProgress: (taskId: string, progress: number) => Promise<{ success: boolean; error?: string }>

  snoozeTask: (taskId: string, until?: Date) => Promise<{ success: boolean; error?: string }>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  
  fetchTasks: async () => {
    set({ isLoading: true })

    try {
      // Check cache first
      const cacheKey = 'tasks-list'
      const cached = requestCache.get<Task[]>(cacheKey)

      if (cached) {
        set({ tasks: cached, isLoading: false })
        return
      }

      // Fetch via API route — server-side auth is always reliable
      // (avoids RLS timing issues during client-side navigation)
      const res = await fetch('/api/tasks')
      if (!res.ok) {
        console.error('[Tasks] Failed to fetch tasks:', res.status)
        set({ isLoading: false })
        return
      }

      const data = await res.json()

      if (data && Array.isArray(data)) {
        // Map database fields to frontend fields
        const mappedTasks = data.map((task: any) => ({
          ...task,
          timeEstimate: task.time_estimate,      // Map snake_case to camelCase
          aiSubtasks: task.ai_subtasks,          // Also map this if it exists
          completedAt: task.completed_at,        // And this for consistency
          createdAt: task.created_at,            // And this
          updatedAt: task.updated_at,            // And this
          dueDate: task.due_date ? new Date(task.due_date) : undefined,
          recurringPattern: task.recurring_pattern,
          priorityOverride: task.priority_override ?? false,
        }))

        // Sort tasks: overdue → priority → due date → creation date
        const sortedTasks = sortTasksByPriority(mappedTasks)

        // Cache for 30 seconds
        requestCache.set(cacheKey, sortedTasks, 30000)
        set({ tasks: sortedTasks, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (err) {
      console.error('[Tasks] fetchTasks threw:', err)
      set({ isLoading: false })
    }
  },
  
  addTask: async (task) => {
    const supabase = createClient()
    let user = useUserStore.getState().user

    if (!user) {
      // Fall back to direct Supabase auth if user store not initialized
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        user = authUser
      } catch (e) {
        console.error('[Tasks] Failed to get user:', e)
      }
    }

    if (!user) return null

    // Calculate auto-priority if not overridden and due date is set
    const priorityOverride = task.priorityOverride ?? false
    let effectivePriority = task.priority !== undefined ? task.priority : 1

    if (!priorityOverride && task.dueDate) {
      effectivePriority = calculateAutoPriority(task.dueDate)
    }

    const newTask = {
      user_id: user.id,
      title: task.title || '',
      description: task.description,
      time_estimate: task.timeEstimate,
      priority: effectivePriority,
      priority_override: priorityOverride,
      completed: false,
      ai_subtasks: task.aiSubtasks,
      due_date: task.dueDate?.toISOString(),
      recurring_pattern: task.recurringPattern,
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single()

    if (data) {
      // Map database fields to frontend fields
      const mappedTask = {
        ...data,
        timeEstimate: data.time_estimate,
        aiSubtasks: data.ai_subtasks,
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        recurringPattern: data.recurring_pattern,
        priorityOverride: data.priority_override ?? false,
      }

      // Invalidate cache when adding task
      requestCache.delete('tasks-list')

      // Add task and re-sort
      set((state) => ({
        tasks: sortTasksByPriority([mappedTask, ...state.tasks])
      }))

      return mappedTask
    }

    return null
  },
  
  updateTask: async (id, updates) => {
    // Invalidate cache when updating task
    requestCache.delete('tasks-list')
    const supabase = createClient()

    // Get current task to check priority override status
    const currentTask = get().tasks.find(t => t.id === id)

    // Determine if we should recalculate priority
    let effectivePriority = updates.priority
    let priorityOverride = updates.priorityOverride ?? currentTask?.priorityOverride ?? false

    // If priority is being manually changed, set priority override
    if (updates.priority !== undefined && updates.priority !== currentTask?.priority) {
      priorityOverride = true
    }

    // If due date is changing and priority is not manually overridden, recalculate
    if (updates.dueDate !== undefined && !priorityOverride) {
      effectivePriority = calculateAutoPriority(updates.dueDate)
    }

    const updateData: any = {}

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.timeEstimate !== undefined) updateData.time_estimate = updates.timeEstimate
    if (effectivePriority !== undefined) updateData.priority = effectivePriority
    if (updates.completed !== undefined) {
      updateData.completed = updates.completed
      updateData.completed_at = updates.completed ? new Date().toISOString() : null
    }
    if (updates.dueDate !== undefined) {
      updateData.due_date = updates.dueDate ? updates.dueDate.toISOString() : null
    }
    if (updates.recurringPattern !== undefined) {
      updateData.recurring_pattern = updates.recurringPattern
    }
    updateData.priority_override = priorityOverride

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (data) {
      // Map database fields to frontend fields
      const mappedTask = {
        ...data,
        timeEstimate: data.time_estimate,
        aiSubtasks: data.ai_subtasks,
        completedAt: data.completed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        recurringPattern: data.recurring_pattern,
        priorityOverride: data.priority_override ?? false,
      }

      // Update task and re-sort
      set((state) => ({
        tasks: sortTasksByPriority(state.tasks.map(t => t.id === id ? mappedTask : t))
      }))
    }
  },
  
  deleteTask: async (id) => {
    // Invalidate cache when deleting task
    requestCache.delete('tasks-list')
    const supabase = createClient()
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (!error) {
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id)
      }))
    }
  },
  
  toggleComplete: async (id) => {
    // Invalidate cache when toggling task
    requestCache.delete('tasks-list')
    const task = get().tasks.find(t => t.id === id)
    if (task) {
      await get().updateTask(id, { completed: !task.completed })
    }
  },
  
  reorderTasks: (tasks) => {
    set({ tasks })
  },
  
  // Tool-friendly methods for native tool calling
  createTaskFromTool: async (params) => {
    try {
      const supabase = createClient()
      let user = useUserStore.getState().user

      if (!user) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          user = authUser
        } catch (e) {
          console.error('[Tasks] Failed to get user for tool:', e)
        }
      }

      if (!user) {
        return { taskId: '', success: false, error: 'No authenticated user' }
      }

      // Map priority to numeric value
      const priorityMap = { low: 1, medium: 2, high: 3 }
      const priority = params.priority ? priorityMap[params.priority] : 2

      // Parse due date if provided
      const parsedDueDate = params.dueDate ? parseDueDateString(params.dueDate) : undefined

      // Create main task
      const { data: mainTask, error: mainError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
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
        return { taskId: '', success: false, error: mainError?.message || 'Failed to create task' }
      }
      
      // Create subtasks if provided
      if (params.subtasks?.length) {
        const subtaskData = params.subtasks.map((title, index) => ({
          user_id: user.id,
          title,
          parent_id: mainTask.id,
          priority: Math.max(1, priority - 1), // Subtasks have slightly lower priority
          completed: false,
          order_index: index
        }))
        
        await supabase
          .from('tasks')
          .insert(subtaskData)
      }
      
      // Update local state
      set((state) => ({
        tasks: [mainTask, ...state.tasks]
      }))
      
      return { taskId: mainTask.id, success: true }
    } catch (error) {
      console.error('Tool task creation failed:', error)
      return { 
        taskId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
  
  completeTaskFromTool: async (taskId, notes) => {
    try {
      const supabase = createClient()
      
      const updateData: any = {
        completed: true,
        completed_at: new Date().toISOString()
      }
      
      if (notes) {
        updateData.completion_notes = notes
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single()
      
      if (error) {
        return { success: false, error: error.message }
      }
      
      // Update local state
      set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, completed: true } : t)
      }))

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  editTaskFromTool: async (taskId, updates) => {
    try {
      const supabase = createClient()

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
        updateData.priority_override = true // Mark as manually set
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

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Invalidate cache
      requestCache.delete('tasks-list')

      // Update local state with mapped fields
      if (data) {
        const mappedTask = {
          ...data,
          timeEstimate: data.time_estimate,
          aiSubtasks: data.ai_subtasks,
          completedAt: data.completed_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          dueDate: data.due_date ? new Date(data.due_date) : undefined,
          recurringPattern: data.recurring_pattern,
          priorityOverride: data.priority_override ?? false,
        }

        set((state) => ({
          tasks: sortTasksByPriority(state.tasks.map(t => t.id === taskId ? mappedTask : t))
        }))
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  breakDownTask: async (taskId) => {
    try {
      const task = get().tasks.find(t => t.id === taskId)
      if (!task) {
        return { steps: [], success: false, error: 'Task not found' }
      }

      // Call AI to break down the task into 3 ADHD-friendly steps
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Break down this task into exactly 3 actionable, ADHD-friendly steps: "${task.title}". Each step should be:
- Concrete and specific
- Quick to start (low activation energy)
- Take 15 minutes or less
- Include a clear action verb

Return ONLY the 3 steps as a JSON array of strings, nothing else. Example format: ["Step 1 description", "Step 2 description", "Step 3 description"]`
          }],
          context: 'planner'
        })
      })

      if (!response.ok) {
        throw new Error('AI request failed')
      }

      const data = await response.json()
      let steps: string[] = []

      // Parse AI response to extract steps
      try {
        // Try to parse as JSON first
        const content = data.content || data.message || ''
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          steps = JSON.parse(jsonMatch[0])
        } else {
          // Fallback: split by lines and clean up
          steps = content
            .split('\n')
            .filter((line: string) => line.trim() && !line.includes('[') && !line.includes(']'))
            .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').replace(/^"|"$/g, '').trim())
            .filter((line: string) => line.length > 0)
            .slice(0, 3)
        }

        // Ensure we have exactly 3 steps
        if (steps.length < 3) {
          steps = [
            ...steps,
            ...Array(3 - steps.length).fill('').map((_, i) => `Continue with ${task.title} (step ${steps.length + i + 1})`)
          ]
        } else if (steps.length > 3) {
          steps = steps.slice(0, 3)
        }
      } catch (parseError) {
        // Fallback steps if parsing fails
        steps = [
          `Gather what you need for ${task.title}`,
          `Work on ${task.title} for 15 minutes`,
          `Review and complete ${task.title}`
        ]
      }

      // Update task with AI-generated steps
      const supabase = createClient()
      await supabase
        .from('tasks')
        .update({ ai_subtasks: steps })
        .eq('id', taskId)

      // Invalidate cache
      requestCache.delete('tasks-list')

      // Update local state
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, aiSubtasks: steps } : t
        )
      }))

      return { steps, success: true }
    } catch (error) {
      return {
        steps: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
  
  updateTaskProgress: async (taskId, progress) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('tasks')
        .update({ progress_percentage: Math.min(100, Math.max(0, progress)) })
        .eq('id', taskId)

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
  },

  snoozeTask: async (taskId, until) => {
    try {
      // Stub implementation for now - UI only
      // In future, this will update a snooze_until field in the database
      console.log(`Snoozing task ${taskId} until ${until || 'later'}`)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
}))