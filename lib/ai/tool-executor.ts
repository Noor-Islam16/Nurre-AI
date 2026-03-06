import { useTaskStore } from '@/store/task-store'
import { useTimerStore } from '@/store/timer-store'
import { useMoodStore } from '@/store/mood-store'
import { useRewardsStore } from '@/store/rewards-store'
import { createClient } from '@/lib/supabase/client'
import { toolRegistry } from './functions'
import { StoreBridge } from './store-bridge'

// =====================================================
// Native OpenAI Tool Call Types
// =====================================================

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

export interface OpenAIToolResult {
  tool_call_id: string
  role: 'tool'
  content: string // JSON string result
}

// =====================================================
// Tool Executor Class - Native Tools Only
// =====================================================

export class ToolExecutor {
  private taskStore: any
  private timerStore: any
  private moodStore: any
  private rewardsStore: any
  private supabase = createClient()
  private storeBridge?: StoreBridge
  private isServerSide: boolean
  private userId?: string
  
  constructor(userId?: string, supabaseClient?: any) {
    this.userId = userId
    // Detect if running on server (no window object)
    this.isServerSide = typeof window === 'undefined'
    
    if (this.isServerSide && userId && supabaseClient) {
      // Use StoreBridge for server-side execution
      this.storeBridge = new StoreBridge(userId, supabaseClient)
      this.supabase = supabaseClient
      // Create proxy objects that delegate to StoreBridge
      this.taskStore = {
        createTaskFromTool: (params: any) => this.storeBridge!.createTaskFromTool(params),
        completeTaskFromTool: (taskId: string, notes?: string) => this.storeBridge!.completeTaskFromTool(taskId, notes),
        // TODO: Implement these methods in StoreBridge
        // breakDownTask: (taskId: string) => this.storeBridge!.breakDownTask(taskId),
        // updateTaskProgress: (taskId: string, progress: number) => this.storeBridge!.updateTaskProgress(taskId, progress),
        tasks: [] // Empty for server-side
      }
      this.timerStore = {
        startFocusFromTool: (params: any) => this.storeBridge!.startFocusFromTool(params),
        pauseFocusFromTool: (reason?: string) => this.storeBridge!.pauseFocusFromTool(reason),
        // TODO: Implement resumeFocusFromTool in StoreBridge
        // resumeFocusFromTool: () => this.storeBridge!.resumeFocusFromTool(),
        endFocusFromTool: (completed?: boolean) => this.storeBridge!.endFocusFromTool(completed),
        // TODO: Implement triggerBreakFromTool in StoreBridge
        // triggerBreakFromTool: (duration: number) => this.storeBridge!.triggerBreakFromTool(duration),
        isRunning: false,
        isPaused: false,
        sessionId: undefined
      }
      this.moodStore = {
        logMoodFromTool: (params: any) => this.storeBridge!.logMoodFromTool(params)
      }
      this.rewardsStore = {
        grantRewardFromTool: (params: any) => this.storeBridge!.grantRewardFromTool(params),
        // TODO: Implement celebrateFromTool in StoreBridge
        // celebrateFromTool: (params: any) => this.storeBridge!.celebrateFromTool(params)
      }
    } else {
      // Use Zustand stores for client-side execution
      this.taskStore = useTaskStore.getState()
      this.timerStore = useTimerStore.getState()
      this.moodStore = useMoodStore.getState()
      this.rewardsStore = useRewardsStore.getState()
      
      // Subscribe to store updates to always have latest state
      useTaskStore.subscribe((state) => {
        this.taskStore = state
      })
      useTimerStore.subscribe((state) => {
        this.timerStore = state
      })
      useMoodStore.subscribe((state) => {
        this.moodStore = state
      })
      useRewardsStore.subscribe((state) => {
        this.rewardsStore = state
      })
    }
  }

  /**
   * Helper method to check if we're on a specific page
   */
  private isOnPage(targetRoute: string): boolean {
    if (this.isServerSide || typeof window === 'undefined') {
      return false
    }
    
    const currentPath = window.location.pathname
    // Handle root path
    if (targetRoute === '/' && currentPath === '/') {
      return true
    }
    // Handle dashboard alias
    if (targetRoute === '/' && currentPath === '/dashboard') {
      return true
    }
    if (targetRoute === '/dashboard' && currentPath === '/') {
      return true
    }
    // Standard path comparison
    return currentPath === targetRoute
  }
  
  /**
   * Helper method to navigate to a page if not already there
   */
  private async navigateIfNeeded(page: string, reason?: string): Promise<void> {
    if (this.isServerSide || typeof window === 'undefined') {
      return
    }
    
    const pageRoutes: Record<string, string> = {
      'dashboard': '/',
      'tasks': '/planner',
      'planner': '/planner',
      'focus': '/focus',
      'mood': '/dashboard',
      'analytics': '/dashboard',
      'settings': '/settings',
      'chat': '/calm',
      'rewards': '/rewards'
    }
    
    const targetRoute = pageRoutes[page] || `/${page}`
    
    // Only navigate if not already on the page
    if (!this.isOnPage(targetRoute)) {
      window.dispatchEvent(new CustomEvent('navigate-to-page', {
        detail: {
          route: targetRoute,
          page,
          smooth: true
        }
      }))
    }
  }

  /**
   * Execute native OpenAI tool calls
   */
  async executeNativeTools(toolCalls: OpenAIToolCall[]): Promise<OpenAIToolResult[]> {
    const results: OpenAIToolResult[] = []
    
    // Process tools in parallel when possible
    const parallelExecutions = toolCalls.map(async (toolCall) => {
      const result = await this.executeSingleNativeTool(toolCall)
      results.push(result)
    })
    
    await Promise.all(parallelExecutions)
    
    return results
  }
  
  /**
   * Execute a single native tool call
   * Made public for client-side execution from useAIAssistant (Task 101)
   */
  public async executeSingleNativeTool(toolCall: OpenAIToolCall): Promise<OpenAIToolResult> {
    try {
      // Parse the arguments
      let args: any
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch (error) {
        return {
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({
            success: false,
            error: 'Invalid JSON arguments'
          })
        }
      }
      
      // Get the tool definition
      const toolDef = toolRegistry.getTool(toolCall.function.name)
      if (!toolDef) {
        return {
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({
            success: false,
            error: `Unknown tool: ${toolCall.function.name}`
          })
        }
      }
      
      // Execute based on tool name
      // Per Architecture Specification: 10 core tools only
      let result: any
      switch (toolCall.function.name) {
        // Task Management
        case 'create_task':
          result = await this.createTask(args)
          break
        case 'complete_task':
          result = await this.completeTask(args)
          break
        case 'edit_task':
          result = await this.editTask(args)
          break

        // Focus Management
        case 'start_focus':
          result = await this.startFocus(args)
          break
        case 'pause_focus':
          result = await this.pauseFocus(args)
          break
        case 'stop_focus':
          result = await this.stopFocus(args)
          break

        // Music Control
        case 'play_music':
          result = await this.playMusic(args)
          break
        case 'pause_music':
          result = await this.pauseMusic(args)
          break
        case 'stop_music':
          result = await this.stopMusic(args)
          break

        // Mood Tracking
        case 'log_mood':
          result = await this.logMood(args)
          break

        default:
          result = {
            success: false,
            error: `Tool ${toolCall.function.name} not implemented`
          }
      }
      
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(result)
      }
      
    } catch (error: any) {
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify({
          success: false,
          error: error.message || 'Tool execution failed'
        })
      }
    }
  }
  
  // =====================================================
  // Tool Implementations - 10 Core Tools
  // =====================================================

  // ----- Task Management -----

  private async createTask(params: any) {
    try {
      const result = await this.taskStore.createTaskFromTool(params)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async completeTask(params: any) {
    try {
      const result = await this.taskStore.completeTaskFromTool(params.taskId, params.notes)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async editTask(params: any) {
    try {
      const { taskId, ...updates } = params

      if (this.isServerSide && this.storeBridge) {
        // Server-side: use StoreBridge
        const result = await this.storeBridge.editTaskFromTool(taskId, updates)
        return result
      } else {
        // Client-side: use task store
        const result = await this.taskStore.editTaskFromTool(taskId, updates)
        return result
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // ----- Focus Management -----

  private async startFocus(params: any) {
    try {
      const result = await this.timerStore.startFocusFromTool(params)

      // Auto-navigate to focus page after starting timer
      await this.navigateIfNeeded('focus', 'Start your focus session')

      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async pauseFocus(params: any) {
    try {
      const result = await this.timerStore.pauseFocusFromTool(params.reason)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async stopFocus(params: any) {
    try {
      const completed = params.completed !== false // Default to true
      const result = await this.timerStore.endFocusFromTool(completed)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // ----- Music Control -----

  private async playMusic(params: any) {
    try {
      const { category } = params

      if (this.isServerSide) {
        // Server-side (voice): broadcast via Supabase Realtime
        if (this.userId && this.supabase) {
          const channel = this.supabase.channel(`user:${this.userId}:commands`)
          await channel.send({
            type: 'broadcast',
            event: 'music_command',
            payload: { action: 'play', category }
          })
        }
        return { success: true, category, message: `Playing ${category} music` }
      } else {
        // Client-side: dispatch window event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai-music-play', {
            detail: { category }
          }))
        }
        return { success: true, category, message: `Playing ${category} music` }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async pauseMusic(params: any) {
    try {
      if (this.isServerSide) {
        // Server-side (voice): broadcast via Supabase Realtime
        if (this.userId && this.supabase) {
          const channel = this.supabase.channel(`user:${this.userId}:commands`)
          await channel.send({
            type: 'broadcast',
            event: 'music_command',
            payload: { action: 'pause' }
          })
        }
        return { success: true, message: 'Music paused' }
      } else {
        // Client-side: dispatch window event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai-music-pause'))
        }
        return { success: true, message: 'Music paused' }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async stopMusic(params: any) {
    try {
      if (this.isServerSide) {
        // Server-side (voice): broadcast via Supabase Realtime
        if (this.userId && this.supabase) {
          const channel = this.supabase.channel(`user:${this.userId}:commands`)
          await channel.send({
            type: 'broadcast',
            event: 'music_command',
            payload: { action: 'stop' }
          })
        }
        return { success: true, message: 'Music stopped' }
      } else {
        // Client-side: dispatch window event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ai-music-stop'))
        }
        return { success: true, message: 'Music stopped' }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // ----- Mood Tracking -----

  private async logMood(params: any) {
    try {
      const result = await this.moodStore.logMoodFromTool(params)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// Export singleton getter for backward compatibility
let toolExecutorInstance: ToolExecutor | null = null

export function getToolExecutor(userId?: string, supabaseClient?: any): ToolExecutor {
  if (!toolExecutorInstance || userId) {
    toolExecutorInstance = new ToolExecutor(userId, supabaseClient)
  }
  return toolExecutorInstance
}
