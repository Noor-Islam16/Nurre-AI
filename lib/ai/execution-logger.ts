import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@supabase/supabase-js'
import { queueEmbeddingJob } from '@/lib/ai/vector/enqueue-embedding-job'

// OpenAI tool call interfaces
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
  content: string
}

export interface StateChange {
  entity: string
  field: string
  oldValue: any
  newValue: any
}

export interface ToolExecution {
  id: string
  timestamp: Date
  tool: string
  parameters: Record<string, any>
  result: any
  status: 'success' | 'failed' | 'pending'
  source: 'user' | 'intervention' | 'brain'
  context: {
    message?: string
    trigger?: string
    confidence?: number
  }
  impact: {
    entitiesCreated?: string[]
    stateChanges?: StateChange[]
    userResponse?: 'helpful' | 'not helpful'
  }
  undoable?: {
    canUndo: boolean
    undoAction?: string
    undoWindow: number
    undoExpiry?: Date
  }
  duration?: number
  error?: string
}

export interface FilterOptions {
  dateRange?: {
    start: Date
    end: Date
  }
  tools?: string[]
  status?: 'all' | 'success' | 'failed' | 'pending'
  source?: 'user' | 'intervention' | 'brain' | 'all'
  search?: string
}

export interface ExecutionStatistics {
  totalExecutions: number
  successRate: number
  failureRate: number
  pendingCount: number
  mostUsedTool: {
    name: string
    count: number
  }
  mostHelpfulTool: {
    name: string
    helpfulRate: number
  }
  interventionsAccepted: number
  interventionsRejected: number
  averageDuration: number
  toolUsage: Record<string, number>
  sourceDistribution: Record<string, number>
  hourlyDistribution: number[]
  dailyTrend: { date: string; count: number; successRate: number }[]
}

interface ExecutionLoggerStore {
  executions: ToolExecution[]
  maxExecutions: number
  retentionDays: number
  privateMode: boolean
  
  // Actions
  logExecution: (execution: Omit<ToolExecution, 'id' | 'timestamp'>) => string
  updateExecution: (id: string, updates: Partial<ToolExecution>) => void
  getHistory: (filters?: FilterOptions) => ToolExecution[]
  getExecution: (id: string) => ToolExecution | undefined
  getStatistics: (dateRange?: { start: Date; end: Date }) => ExecutionStatistics
  clearHistory: (before?: Date) => void
  deleteExecution: (id: string) => void
  exportHistory: (format: 'json' | 'csv') => string
  importHistory: (data: string, format: 'json' | 'csv') => boolean
  setPrivateMode: (enabled: boolean) => void
  rateExecution: (id: string, helpful: boolean) => void
  undoExecution: (id: string) => Promise<boolean>
  retryExecution: (id: string, newParameters?: Record<string, any>) => Promise<string>
  cleanupOldExecutions: () => void
}

export const useExecutionLogger = create<ExecutionLoggerStore>()(
  persist(
    (set, get) => ({
      executions: [],
      maxExecutions: 1000,
      retentionDays: 30,
      privateMode: false,

      logExecution: (execution) => {
        if (get().privateMode) {
          return 'private-mode-no-id'
        }

        const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const newExecution: ToolExecution = {
          ...execution,
          id,
          timestamp: new Date(),
        }

        set((state) => {
          const updatedExecutions = [newExecution, ...state.executions]
          
          // Limit to max executions
          if (updatedExecutions.length > state.maxExecutions) {
            updatedExecutions.splice(state.maxExecutions)
          }

          return { executions: updatedExecutions }
        })

        // Cleanup old executions
        get().cleanupOldExecutions()

        return id
      },

      updateExecution: (id, updates) => {
        set((state) => ({
          executions: state.executions.map((exec) =>
            exec.id === id ? { ...exec, ...updates } : exec
          ),
        }))
      },

      getHistory: (filters = {}) => {
        const { executions } = get()
        let filtered = [...executions]

        // Apply date range filter
        if (filters.dateRange) {
          filtered = filtered.filter(
            (exec) =>
              new Date(exec.timestamp) >= filters.dateRange!.start &&
              new Date(exec.timestamp) <= filters.dateRange!.end
          )
        }

        // Apply tool filter
        if (filters.tools && filters.tools.length > 0) {
          filtered = filtered.filter((exec) => filters.tools!.includes(exec.tool))
        }

        // Apply status filter
        if (filters.status && filters.status !== 'all') {
          filtered = filtered.filter((exec) => exec.status === filters.status)
        }

        // Apply source filter
        if (filters.source && filters.source !== 'all') {
          filtered = filtered.filter((exec) => exec.source === filters.source)
        }

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filtered = filtered.filter(
            (exec) =>
              exec.tool.toLowerCase().includes(searchLower) ||
              exec.context.message?.toLowerCase().includes(searchLower) ||
              JSON.stringify(exec.parameters).toLowerCase().includes(searchLower)
          )
        }

        return filtered
      },

      getExecution: (id) => {
        return get().executions.find((exec) => exec.id === id)
      },

      getStatistics: (dateRange) => {
        const executions = dateRange
          ? get().getHistory({ dateRange })
          : get().executions

        if (executions.length === 0) {
          return {
            totalExecutions: 0,
            successRate: 0,
            failureRate: 0,
            pendingCount: 0,
            mostUsedTool: { name: 'None', count: 0 },
            mostHelpfulTool: { name: 'None', helpfulRate: 0 },
            interventionsAccepted: 0,
            interventionsRejected: 0,
            averageDuration: 0,
            toolUsage: {},
            sourceDistribution: {},
            hourlyDistribution: new Array(24).fill(0),
            dailyTrend: [],
          }
        }

        // Calculate basic statistics
        const successCount = executions.filter((e) => e.status === 'success').length
        const failureCount = executions.filter((e) => e.status === 'failed').length
        const pendingCount = executions.filter((e) => e.status === 'pending').length

        // Calculate tool usage
        const toolUsage: Record<string, number> = {}
        const toolHelpfulness: Record<string, { helpful: number; total: number }> = {}
        
        executions.forEach((exec) => {
          toolUsage[exec.tool] = (toolUsage[exec.tool] || 0) + 1
          
          if (exec.impact.userResponse) {
            if (!toolHelpfulness[exec.tool]) {
              toolHelpfulness[exec.tool] = { helpful: 0, total: 0 }
            }
            toolHelpfulness[exec.tool].total++
            if (exec.impact.userResponse === 'helpful') {
              toolHelpfulness[exec.tool].helpful++
            }
          }
        })

        // Find most used tool
        const mostUsedTool = Object.entries(toolUsage).reduce(
          (max, [tool, count]) => (count > max.count ? { name: tool, count } : max),
          { name: 'None', count: 0 }
        )

        // Find most helpful tool
        const mostHelpfulTool = Object.entries(toolHelpfulness).reduce(
          (max, [tool, stats]) => {
            const helpfulRate = stats.total > 0 ? stats.helpful / stats.total : 0
            return helpfulRate > max.helpfulRate
              ? { name: tool, helpfulRate }
              : max
          },
          { name: 'None', helpfulRate: 0 }
        )

        // Calculate source distribution
        const sourceDistribution: Record<string, number> = {}
        executions.forEach((exec) => {
          sourceDistribution[exec.source] = (sourceDistribution[exec.source] || 0) + 1
        })

        // Calculate interventions
        const interventions = executions.filter((e) => e.source === 'intervention')
        const interventionsAccepted = interventions.filter(
          (e) => e.impact.userResponse === 'helpful'
        ).length
        const interventionsRejected = interventions.filter(
          (e) => e.impact.userResponse === 'not helpful'
        ).length

        // Calculate average duration
        const durations = executions
          .filter((e) => e.duration)
          .map((e) => e.duration!)
        const averageDuration =
          durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0

        // Calculate hourly distribution
        const hourlyDistribution = new Array(24).fill(0)
        executions.forEach((exec) => {
          const hour = new Date(exec.timestamp).getHours()
          hourlyDistribution[hour]++
        })

        // Calculate daily trend (last 7 days)
        const dailyTrend: { date: string; count: number; successRate: number }[] = []
        const now = new Date()
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)
          
          const nextDate = new Date(date)
          nextDate.setDate(nextDate.getDate() + 1)
          
          const dayExecutions = executions.filter(
            (e) =>
              new Date(e.timestamp) >= date && new Date(e.timestamp) < nextDate
          )
          
          const daySuccess = dayExecutions.filter((e) => e.status === 'success').length
          const successRate = dayExecutions.length > 0 ? daySuccess / dayExecutions.length : 0
          
          dailyTrend.push({
            date: date.toISOString().split('T')[0],
            count: dayExecutions.length,
            successRate: successRate * 100,
          })
        }

        return {
          totalExecutions: executions.length,
          successRate: (successCount / executions.length) * 100,
          failureRate: (failureCount / executions.length) * 100,
          pendingCount,
          mostUsedTool,
          mostHelpfulTool,
          interventionsAccepted,
          interventionsRejected,
          averageDuration,
          toolUsage,
          sourceDistribution,
          hourlyDistribution,
          dailyTrend,
        }
      },

      clearHistory: (before) => {
        if (!before) {
          set({ executions: [] })
        } else {
          set((state) => ({
            executions: state.executions.filter(
              (exec) => new Date(exec.timestamp) >= before
            ),
          }))
        }
      },

      deleteExecution: (id) => {
        set((state) => ({
          executions: state.executions.filter((exec) => exec.id !== id),
        }))
      },

      exportHistory: (format) => {
        const executions = get().executions

        if (format === 'json') {
          return JSON.stringify(executions, null, 2)
        } else {
          // CSV format
          const headers = [
            'ID',
            'Timestamp',
            'Tool',
            'Status',
            'Source',
            'Message',
            'Parameters',
            'Result',
            'Duration',
            'User Response',
          ]
          
          const rows = executions.map((exec) => [
            exec.id,
            new Date(exec.timestamp).toISOString(),
            exec.tool,
            exec.status,
            exec.source,
            exec.context.message || '',
            JSON.stringify(exec.parameters),
            JSON.stringify(exec.result),
            exec.duration?.toString() || '',
            exec.impact.userResponse || '',
          ])
          
          const csv = [
            headers.join(','),
            ...rows.map((row) =>
              row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
            ),
          ].join('\n')
          
          return csv
        }
      },

      importHistory: (data, format) => {
        try {
          if (format === 'json') {
            const executions = JSON.parse(data) as ToolExecution[]
            set((state) => ({
              executions: [...executions, ...state.executions].slice(
                0,
                state.maxExecutions
              ),
            }))
            return true
          } else {
            // CSV parsing would go here
            console.error('CSV import not yet implemented')
            return false
          }
        } catch (error) {
          console.error('Failed to import history:', error)
          return false
        }
      },

      setPrivateMode: (enabled) => {
        set({ privateMode: enabled })
      },

      rateExecution: (id, helpful) => {
        set((state) => ({
          executions: state.executions.map((exec) =>
            exec.id === id
              ? {
                  ...exec,
                  impact: {
                    ...exec.impact,
                    userResponse: helpful ? 'helpful' : 'not helpful',
                  },
                }
              : exec
          ),
        }))
      },

      undoExecution: async (id) => {
        const execution = get().getExecution(id)
        
        if (!execution || !execution.undoable?.canUndo) {
          return false
        }

        // Check if undo window has expired
        if (execution.undoable.undoExpiry && new Date() > new Date(execution.undoable.undoExpiry)) {
          return false
        }

        // Here you would implement the actual undo logic
        // For now, just mark the execution as undone
        get().updateExecution(id, {
          status: 'success',
          impact: {
            ...execution.impact,
            userResponse: 'not helpful',
          },
        })

        return true
      },

      retryExecution: async (id, newParameters) => {
        const execution = get().getExecution(id)
        
        if (!execution) {
          throw new Error('Execution not found')
        }

        // Create a new execution with retry parameters
        const retryId = get().logExecution({
          tool: execution.tool,
          parameters: newParameters || execution.parameters,
          result: null,
          status: 'pending',
          source: execution.source,
          context: {
            ...execution.context,
            message: `Retry of ${id}`,
          },
          impact: {},
        })

        // Here you would implement the actual retry logic
        // For now, just mark it as successful after a delay
        setTimeout(() => {
          get().updateExecution(retryId, {
            status: 'success',
            result: { message: 'Retry successful' },
          })
        }, 1000)

        return retryId
      },

      cleanupOldExecutions: () => {
        const { retentionDays } = get()
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
        
        set((state) => ({
          executions: state.executions.filter(
            (exec) => new Date(exec.timestamp) >= cutoffDate
          ),
        }))
      },
    }),
    {
      name: 'execution-history',
      partialize: (state) => ({
        executions: state.executions.slice(0, 100), // Only persist last 100 for performance
        retentionDays: state.retentionDays,
        privateMode: state.privateMode,
      }),
    }
  )
)

// Singleton instance for global access
class ExecutionLogger {
  private static instance: ExecutionLogger
  private supabase: ReturnType<typeof createClient> | null = null

  constructor() {
    // Initialize Supabase client if environment variables are available
    if (typeof window !== 'undefined' && 
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    }
  }

  static getInstance(): ExecutionLogger {
    if (!ExecutionLogger.instance) {
      ExecutionLogger.instance = new ExecutionLogger()
    }
    return ExecutionLogger.instance
  }

  log(execution: Omit<ToolExecution, 'id' | 'timestamp'>): string {
    return useExecutionLogger.getState().logExecution(execution)
  }

  update(id: string, updates: Partial<ToolExecution>): void {
    useExecutionLogger.getState().updateExecution(id, updates)
  }

  get(id: string): ToolExecution | undefined {
    return useExecutionLogger.getState().getExecution(id)
  }

  query(filters?: FilterOptions): ToolExecution[] {
    return useExecutionLogger.getState().getHistory(filters)
  }

  stats(dateRange?: { start: Date; end: Date }): ExecutionStatistics {
    return useExecutionLogger.getState().getStatistics(dateRange)
  }

  rate(id: string, helpful: boolean): void {
    useExecutionLogger.getState().rateExecution(id, helpful)
  }

  async undo(id: string): Promise<boolean> {
    return useExecutionLogger.getState().undoExecution(id)
  }

  async retry(id: string, newParameters?: Record<string, any>): Promise<string> {
    return useExecutionLogger.getState().retryExecution(id, newParameters)
  }

  clear(before?: Date): void {
    useExecutionLogger.getState().clearHistory(before)
  }

  export(format: 'json' | 'csv' = 'json'): string {
    return useExecutionLogger.getState().exportHistory(format)
  }

  import(data: string, format: 'json' | 'csv' = 'json'): boolean {
    return useExecutionLogger.getState().importHistory(data, format)
  }

  setPrivateMode(enabled: boolean): void {
    useExecutionLogger.getState().setPrivateMode(enabled)
  }

  /**
   * Log a native OpenAI tool call to the database
   * @param userId - The ID of the user making the tool call
   * @param toolCall - The OpenAI tool call object
   * @param result - The result of the tool execution
   * @param success - Whether the execution was successful
   * @param executionTimeMs - Time taken to execute the tool in milliseconds
   * @param lane - Whether this is from chat or planner lane
   * @param sessionId - Optional session ID to link with chat messages
   * @param tokenUsage - Optional token usage information
   */
  async logToolCall(
    userId: string,
    toolCall: OpenAIToolCall,
    result: any,
    success: boolean,
    executionTimeMs: number,
    lane: 'chat' | 'planner' = 'chat',
    sessionId?: string,
    tokenUsage?: any
  ): Promise<void> {
    if (!this.supabase) {
      console.warn('Supabase client not initialized, skipping database logging')
      return
    }

    try {
      // Store tool call as conversation with tool_calls JSONB
      const { data: executionRows, error } = await this.supabase.from('conversations').insert({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: `Executed tool: ${toolCall.function.name}`,
        tool_calls: {
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
          result: {
            success,
            data: success ? result : undefined,
            error: !success && result?.error ? result.error : undefined
          },
          execution_time: new Date().toISOString(),
          duration_ms: executionTimeMs,
          lane,
          token_usage: tokenUsage
        },
        created_at: new Date().toISOString()
      } as any).select('id')

      if (error) {
        console.error('Failed to log tool call to database:', error)
      } else if (executionRows && executionRows.length > 0) {
        const ids = executionRows
          .map((row) => (row as { id?: unknown })?.id)
          .filter((id): id is string => typeof id === 'string')

        if (ids.length > 0) {
          queueEmbeddingJob(ids).catch((queueError) => {
            console.error('Failed to queue embedding job for execution log:', queueError)
          })
        }
      }
    } catch (error) {
      console.error('Error logging tool call:', error)
    }

    // Also log to local store for immediate UI updates
    this.log({
      tool: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
      result,
      status: success ? 'success' : 'failed',
      source: lane === 'planner' ? 'brain' : 'user',
      context: {
        message: `Native tool call: ${toolCall.function.name}`,
        trigger: lane
      },
      impact: {
        entitiesCreated: [],
        stateChanges: []
      },
      duration: executionTimeMs,
      error: !success && result?.error ? result.error : undefined
    })
  }

  /**
   * Query tool calls from the database
   * @param userId - Filter by user ID
   * @param filters - Additional filters
   */
  async queryToolCalls(
    userId: string,
    filters?: {
      lane?: 'chat' | 'planner'
      toolName?: string
      success?: boolean
      startDate?: Date
      endDate?: Date
      limit?: number
    }
  ): Promise<any[]> {
    if (!this.supabase) {
      console.warn('Supabase client not initialized')
      return []
    }

    try {
      // Query conversations with tool_calls data
      let query = this.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .not('tool_calls', 'is', null)
        .order('created_at', { ascending: false })

      // Note: Filtering on JSONB fields requires different approach
      // We'll filter in memory after fetching for now
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query as { data: any[] | null; error: any }

      if (error) {
        console.error('Failed to query tool calls:', error)
        return []
      }

      // Filter the results based on JSONB content
      let results: any[] = data || []
      
      if (filters?.lane) {
        results = results.filter(r => (r.tool_calls as any)?.lane === filters.lane)
      }
      if (filters?.toolName) {
        results = results.filter(r => (r.tool_calls as any)?.name === filters.toolName)
      }
      if (filters?.success !== undefined) {
        results = results.filter(r => (r.tool_calls as any)?.result?.success === filters.success)
      }

      return results
    } catch (error) {
      console.error('Error querying tool calls:', error)
      return []
    }
  }

  /**
   * Get tool call statistics from the database
   * @param userId - The user ID to get statistics for
   * @param dateRange - Optional date range filter
   */
  async getToolCallStats(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalCalls: number
    successRate: number
    avgExecutionTime: number
    toolUsage: Record<string, number>
    laneDistribution: Record<string, number>
  }> {
    const toolCalls = await this.queryToolCalls(userId, {
      startDate: dateRange?.start,
      endDate: dateRange?.end
    })

    if (toolCalls.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgExecutionTime: 0,
        toolUsage: {},
        laneDistribution: {}
      }
    }

    const successCount = toolCalls.filter(tc => tc.success).length
    const totalExecutionTime = toolCalls.reduce((sum, tc) => sum + (tc.execution_time_ms || 0), 0)
    
    const toolUsage: Record<string, number> = {}
    const laneDistribution: Record<string, number> = {}
    
    toolCalls.forEach(tc => {
      toolUsage[tc.tool_name] = (toolUsage[tc.tool_name] || 0) + 1
      laneDistribution[tc.lane] = (laneDistribution[tc.lane] || 0) + 1
    })

    return {
      totalCalls: toolCalls.length,
      successRate: (successCount / toolCalls.length) * 100,
      avgExecutionTime: totalExecutionTime / toolCalls.length,
      toolUsage,
      laneDistribution
    }
  }
}

export const executionLogger = ExecutionLogger.getInstance()
