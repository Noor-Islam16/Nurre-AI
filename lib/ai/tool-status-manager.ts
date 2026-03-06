import { EventEmitter } from 'events'

/**
 * Status of a tool execution
 */
export enum ToolStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Tool execution record
 */
export interface ToolExecution {
  id: string
  tool: string
  status: ToolStatus
  startTime: Date
  endTime?: Date
  duration?: number
  details?: any
  error?: string
  progress?: number
  metadata?: {
    description?: string
    input?: any
    output?: any
    retryCount?: number
  }
}

/**
 * Event types emitted by the tool status manager
 */
export enum ToolStatusEvent {
  EXECUTION_ADDED = 'execution:added',
  STATUS_UPDATED = 'status:updated',
  EXECUTION_COMPLETED = 'execution:completed',
  EXECUTION_FAILED = 'execution:failed',
  BATCH_CLEARED = 'batch:cleared'
}

/**
 * Manages tool execution status and history
 */
export class ToolStatusManager extends EventEmitter {
  private executions: Map<string, ToolExecution> = new Map()
  private executionHistory: ToolExecution[] = []
  private activeExecutions: Set<string> = new Set()
  private maxHistorySize: number = 100
  
  constructor(options?: { maxHistorySize?: number }) {
    super()
    if (options?.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize
    }
  }
  
  /**
   * Add a new tool execution
   */
  addExecution(tool: string, details?: any): string {
    const id = this.generateExecutionId(tool)
    const execution: ToolExecution = {
      id,
      tool,
      status: ToolStatus.PENDING,
      startTime: new Date(),
      details,
      metadata: {
        description: this.getToolDescription(tool)
      }
    }
    
    this.executions.set(id, execution)
    this.activeExecutions.add(id)
    
    this.emit(ToolStatusEvent.EXECUTION_ADDED, execution)
    
    return id
  }
  
  /**
   * Update the status of an execution
   */
  updateStatus(
    executionId: string, 
    status: ToolStatus, 
    updates?: Partial<ToolExecution>
  ): void {
    const execution = this.executions.get(executionId)
    if (!execution) {
      console.warn(`Execution ${executionId} not found`)
      return
    }
    
    // Update execution record
    execution.status = status
    
    if (updates) {
      Object.assign(execution, updates)
    }
    
    // Update timing for completed executions
    if (status === ToolStatus.SUCCESS || status === ToolStatus.FAILED || status === ToolStatus.CANCELLED) {
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
      
      // Move to history
      this.activeExecutions.delete(executionId)
      this.executionHistory.push(execution)
      
      // Trim history if needed
      if (this.executionHistory.length > this.maxHistorySize) {
        this.executionHistory.shift()
      }
      
      // Emit completion event
      if (status === ToolStatus.SUCCESS) {
        this.emit(ToolStatusEvent.EXECUTION_COMPLETED, execution)
      } else if (status === ToolStatus.FAILED) {
        this.emit(ToolStatusEvent.EXECUTION_FAILED, execution)
      }
    }
    
    // Update progress for executing status
    if (status === ToolStatus.EXECUTING && !execution.progress) {
      execution.progress = 0
      this.startProgressSimulation(executionId)
    }
    
    this.emit(ToolStatusEvent.STATUS_UPDATED, execution)
  }
  
  /**
   * Update execution progress
   */
  updateProgress(executionId: string, progress: number): void {
    const execution = this.executions.get(executionId)
    if (execution && execution.status === ToolStatus.EXECUTING) {
      execution.progress = Math.min(100, Math.max(0, progress))
      this.emit(ToolStatusEvent.STATUS_UPDATED, execution)
    }
  }
  
  /**
   * Get all active executions
   */
  getActiveExecutions(): ToolExecution[] {
    return Array.from(this.activeExecutions)
      .map(id => this.executions.get(id))
      .filter(Boolean) as ToolExecution[]
  }
  
  /**
   * Get execution by ID
   */
  getExecution(executionId: string): ToolExecution | undefined {
    return this.executions.get(executionId)
  }
  
  /**
   * Get execution history
   */
  getHistory(limit?: number): ToolExecution[] {
    const history = [...this.executionHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }
  
  /**
   * Clear completed executions
   */
  clearCompleted(): void {
    const completed = Array.from(this.executions.entries())
      .filter(([_, exec]) => 
        exec.status === ToolStatus.SUCCESS || 
        exec.status === ToolStatus.FAILED ||
        exec.status === ToolStatus.CANCELLED
      )
    
    completed.forEach(([id]) => {
      this.executions.delete(id)
      this.activeExecutions.delete(id)
    })
    
    this.emit(ToolStatusEvent.BATCH_CLEARED, completed.length)
  }
  
  /**
   * Clear all executions and history
   */
  clearAll(): void {
    this.executions.clear()
    this.activeExecutions.clear()
    this.executionHistory = []
    this.emit(ToolStatusEvent.BATCH_CLEARED, -1)
  }
  
  /**
   * Cancel an active execution
   */
  cancelExecution(executionId: string): void {
    const execution = this.executions.get(executionId)
    if (execution && (execution.status === ToolStatus.PENDING || execution.status === ToolStatus.EXECUTING)) {
      this.updateStatus(executionId, ToolStatus.CANCELLED, {
        error: 'Cancelled by user'
      })
    }
  }
  
  /**
   * Generate unique execution ID
   */
  private generateExecutionId(tool: string): string {
    return `${tool}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get human-readable tool description
   */
  private getToolDescription(tool: string): string {
    const descriptions: Record<string, string> = {
      create_task: 'Creating a new task',
      update_task: 'Updating task details',
      break_down_task: 'Breaking task into steps',
      start_focus: 'Starting focus session',
      pause_focus: 'Pausing focus timer',
      end_focus: 'Ending focus session',
      submit_mood: 'Recording mood entry',
      start_breathing: 'Starting breathing exercise',
      trigger_break: 'Scheduling a break',
      navigate_to: 'Navigating to page',
      show_celebration: 'Showing celebration',
      schedule_reminder: 'Setting a reminder',
      play_background_noise: 'Playing ambient sounds',
      stop_background_noise: 'Stopping ambient sounds'
    }
    
    return descriptions[tool] || `Executing ${tool}`
  }
  
  /**
   * Simulate progress for long-running executions
   */
  private startProgressSimulation(executionId: string): void {
    const interval = setInterval(() => {
      const execution = this.executions.get(executionId)
      if (!execution || execution.status !== ToolStatus.EXECUTING) {
        clearInterval(interval)
        return
      }
      
      // Simulate progress (slower as it approaches 100%)
      const currentProgress = execution.progress || 0
      const increment = Math.max(1, Math.floor((100 - currentProgress) / 10))
      const newProgress = Math.min(95, currentProgress + increment) // Cap at 95% until actually complete
      
      this.updateProgress(executionId, newProgress)
    }, 500)
  }
  
  /**
   * Get statistics about executions
   */
  getStatistics(): {
    total: number
    active: number
    successful: number
    failed: number
    averageDuration: number
  } {
    const allExecutions = [...this.executions.values(), ...this.executionHistory]
    const successful = allExecutions.filter(e => e.status === ToolStatus.SUCCESS)
    const failed = allExecutions.filter(e => e.status === ToolStatus.FAILED)
    
    const durations = successful
      .map(e => e.duration)
      .filter(Boolean) as number[]
    
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0
    
    return {
      total: allExecutions.length,
      active: this.activeExecutions.size,
      successful: successful.length,
      failed: failed.length,
      averageDuration: Math.round(averageDuration)
    }
  }
}

// Singleton instance
let managerInstance: ToolStatusManager | null = null

/**
 * Get or create the singleton tool status manager
 */
export function getToolStatusManager(): ToolStatusManager {
  if (!managerInstance) {
    managerInstance = new ToolStatusManager()
  }
  return managerInstance
}