import { createClient } from '@/lib/supabase/client'
import { toISOStringNoMs } from '@/lib/utils/date-helpers'
import { patternCalculator } from '@/lib/patterns/pattern-calculator'
import { SimplePattern } from '@/lib/patterns/simple-patterns'
import { AIContextCache } from './context-cache'

// Compact state for token efficiency
export interface CompactUserState {
  currentFocus: any | null
  activeTasks: any[]
  recentMood: any | null
  todayStats: {
    tasksCompleted: number
    focusMinutes: number
    currentStreak: number
  }
  nextTask: any | null
  lastActive: Date | null
}

// Detailed state for comprehensive context
export interface DetailedUserState extends CompactUserState {
  recentTasks: any[]
  patterns: any[]
  preferences: any
  interventionHistory: any[]
  weekStats: any
}

export interface UserContext {
  immediate: {
    currentPage: string
    idleTime: number
    lastInteraction: Date
    activeTaskId?: string
    focusSessionActive: boolean
    tabSwitches: number
  }
  
  session: {
    startTime: Date
    tasksCompleted: number
    tasksCreated: number
    focusMinutes: number
    breaksTaken: number
    moodProgression: string[]
    interventionCount: number
    distractionEvents: number
  }
  
  tasks?: {
    activeTasks: any[]  // List of active tasks with title, time_estimate, priority
  }
  
  historical: {
    averageTaskCompletionTime: number
    mostProductiveHours: number[]
    commonProcrastinationTriggers: string[]
    preferredSessionLength: number
    successfulPatterns: any[]
    personalityInsights: any
  }
  
  psychological: {
    currentMood?: string
    energyLevel?: number
    stressIndicators: number
    focusScore: number
    motivationLevel: number
    overwhelmScore: number
  }
  
  patterns?: {
    insights: SimplePattern[]
    calculatedAt: string
  }
}

export class ContextEngine {
  private context: UserContext | null = null
  private userId: string | null = null
  private updateInterval: NodeJS.Timeout | null = null
  private cache: Map<string, { data: any; expires: number }> = new Map()
  private supabase: ReturnType<typeof createClient> | null = null
  
  async initialize(userId: string) {
    this.userId = userId
    this.supabase = createClient()
    await this.buildContext()
    
    // Update context every minute
    this.updateInterval = setInterval(() => {
      this.buildContext()
    }, 60000)
  }
  
  async buildContext(): Promise<UserContext> {
    if (!this.userId) throw new Error('User ID not set')
    if (!this.supabase) this.supabase = createClient()
    
    const now = new Date()
    const sessionStart = new Date(now.getTime() - 4 * 60 * 60 * 1000) // 4 hours ago
    
    // Fetch all data in parallel with caching
    const [
      recentEvents,
      currentTask,
      moodEntries,
      focusSessions,
      patterns,
      activeTasks
    ] = await Promise.all([
      AIContextCache.getContext(
        this.userId,
        'recent_events',
        () => this.getUserEvents(50, sessionStart),
        { limit: 50, since: sessionStart.toISOString() }
      ),
      AIContextCache.getContext(
        this.userId,
        'current_task',
        () => this.getCurrentTask(),
      ),
      AIContextCache.getContext(
        this.userId,
        'mood_history',
        () => this.getRecentMoods(sessionStart),
        { since: sessionStart.toISOString() }
      ),
      AIContextCache.getContext(
        this.userId,
        'focus_stats',
        () => this.getFocusSessions(sessionStart),
        { since: sessionStart.toISOString() }
      ),
      AIContextCache.getContext(
        this.userId,
        'pattern_analysis',
        () => this.getPatterns()
      ),
      AIContextCache.getContext(
        this.userId,
        'task_summary',
        () => this.getActiveTasks(10),
        { limit: 10 }
      )
    ])
    
    // Calculate immediate context
    const lastEvent = recentEvents?.[0]
    const idleEvents = recentEvents?.filter(e => e.event_type === 'idle_detected') || []
    const tabSwitches = recentEvents?.filter(e => e.event_type === 'tab_switch').length || 0
    
    // Calculate session metrics
    const completedTasks = recentEvents?.filter(e => e.event_type === 'task_complete').length || 0
    const createdTasks = recentEvents?.filter(e => e.event_type === 'task_create').length || 0
    const focusMinutes = focusSessions?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
    
    // Calculate psychological state
    const latestMood = moodEntries?.[0]
    const stressIndicators = this.calculateStressLevel(recentEvents || [])
    const overwhelmScore = this.calculateOverwhelmScore(createdTasks, completedTasks, currentTask)
    
    this.context = {
      immediate: {
        currentPage: lastEvent?.page_url || '/',
        idleTime: idleEvents[0]?.event_data?.idleTime || 0,
        lastInteraction: lastEvent ? new Date(lastEvent.created_at) : now,
        activeTaskId: currentTask?.id,
        focusSessionActive: focusSessions?.some(s => !s.ended_at) || false,
        tabSwitches,
      },
      
      session: {
        startTime: sessionStart,
        tasksCompleted: completedTasks,
        tasksCreated: createdTasks,
        focusMinutes,
        breaksTaken: 0, // Calculate from events
        moodProgression: moodEntries?.map(m => m.mood) || [],
        interventionCount: 0, // Calculate from events
        distractionEvents: tabSwitches + idleEvents.length,
      },
      
      historical: {
        averageTaskCompletionTime: 30, // Calculate from historical data
        mostProductiveHours: [9, 10, 14, 15], // Calculate from patterns
        commonProcrastinationTriggers: [], // Analyze patterns
        preferredSessionLength: 25, // Calculate from successful sessions
        successfulPatterns: [], // Extract from data
        personalityInsights: {}, // Build over time
      },
      
      psychological: {
        currentMood: latestMood?.mood,
        energyLevel: latestMood?.energy,
        stressIndicators,
        focusScore: this.calculateFocusScore(tabSwitches, idleEvents.length),
        motivationLevel: 5, // Calculate based on activity
        overwhelmScore,
      },
      
      patterns: patterns ? {
        insights: patterns,
        calculatedAt: new Date().toISOString()
      } : undefined,
      
      tasks: activeTasks && activeTasks.length > 0 ? {
        activeTasks: activeTasks
      } : undefined
    }
    
    return this.context
  }
  
  private calculateStressLevel(events: any[]): number {
    const stressfulEvents = events.filter(e => 
      ['rapid_clicking', 'text_deletion', 'tab_switch'].includes(e.event_type)
    )
    return Math.min(stressfulEvents.length / 10, 1) * 10
  }
  
  private calculateFocusScore(tabSwitches: number, idleCount: number): number {
    const distractionScore = (tabSwitches + idleCount * 2) / 10
    return Math.max(0, 10 - distractionScore)
  }
  
  private calculateOverwhelmScore(created: number, completed: number, currentTask: any): number {
    const taskRatio = created > 0 ? completed / created : 1
    const hasUrgentTask = currentTask?.priority >= 3
    return (1 - taskRatio) * 5 + (hasUrgentTask ? 3 : 0)
  }
  
  private async getPatterns(): Promise<SimplePattern[] | null> {
    try {
      if (!this.userId) return null
      
      // Try to get from cache first
      const cached = this.cache.get('patterns')
      if (cached && cached.expires > Date.now()) {
        return cached.data as SimplePattern[]
      }
      
      // Calculate patterns
      const patterns = await patternCalculator.getAllPatterns(this.userId)
      
      // Cache for 30 minutes
      this.cache.set('patterns', { 
        data: patterns, 
        expires: Date.now() + 30 * 60 * 1000 
      })
      setTimeout(() => this.cache.delete('patterns'), 30 * 60 * 1000)
      
      return patterns
    } catch (error) {
      console.error('Error fetching patterns for context:', error)
      return null
    }
  }
  
  getContext(userId?: string): UserContext | null {
    return this.context
  }
  
  async getContextAsync(userId: string): Promise<UserContext | null> {
    if (!this.context && userId) {
      this.userId = userId
      await this.buildContext()
    }
    return this.context
  }
  
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    this.cache.clear()
  }

  // Invalidate cache when data changes
  async onTaskCompleted(userId: string): Promise<void> {
    await AIContextCache.invalidateContextType(userId, 'task_summary');
    await AIContextCache.invalidateContextType(userId, 'pattern_analysis');
    await AIContextCache.invalidateContextType(userId, 'current_task');
  }

  async onMoodLogged(userId: string): Promise<void> {
    await AIContextCache.invalidateContextType(userId, 'mood_history');
    await AIContextCache.invalidateContextType(userId, 'pattern_analysis');
  }

  async onFocusSessionChanged(userId: string): Promise<void> {
    await AIContextCache.invalidateContextType(userId, 'focus_stats');
    await AIContextCache.invalidateContextType(userId, 'current_task');
  }

  async onEventTracked(userId: string): Promise<void> {
    await AIContextCache.invalidateContextType(userId, 'recent_events');
  }
  
  // =====================================================
  // Token-Efficient State Builders
  // =====================================================
  
  /**
   * Build compact state for minimal token usage
   */
  async buildCompactState(): Promise<CompactUserState> {
    if (!this.userId) throw new Error('User ID not set')
    
    const [currentFocus, activeTasks, recentMood, todayStats, nextTask] = await Promise.all([
      this.getCurrentFocusSession(),
      this.getActiveTasks(10),  // Increased from 3 to 10 for better task matching
      this.getLatestMood(),
      this.getTodayStats(),
      this.getNextPriorityTask()
    ])
    
    return {
      currentFocus,
      activeTasks,
      recentMood,
      todayStats,
      nextTask,
      lastActive: this.getLastActivityTime()
    }
  }
  
  /**
   * Build detailed state with more comprehensive context
   */
  async buildDetailedState(): Promise<DetailedUserState> {
    const compact = await this.buildCompactState()
    
    const [recentTasks, patterns, preferences, interventionHistory, weekStats] = await Promise.all([
      this.getRecentTasks(10),
      this.getUserPatterns(),
      this.getUserPreferences(),
      this.getRecentInterventions(),
      this.getWeeklyStats()
    ])
    
    return {
      ...compact,
      recentTasks,
      patterns,
      preferences,
      interventionHistory,
      weekStats
    }
  }
  
  /**
   * Build optimized state based on token budget
   */
  async buildOptimizedState(maxTokens: number = 500): Promise<any> {
    let state = await this.buildCompactState()
    
    if (this.estimateTokens(state) < maxTokens * 0.7) {
      // Add more context if within budget
      state = await this.buildDetailedState()
    }
    
    return state
  }
  
  /**
   * Estimate token count for a given state object
   */
  estimateTokens(state: any): number {
    // Rough estimation: 1 token per 4 characters
    const stateString = JSON.stringify(state)
    return Math.ceil(stateString.length / 4)
  }
  
  // =====================================================
  // Caching Layer for Performance
  // =====================================================
  
  /**
   * Get cached data or fetch if expired
   */
  async getCached<T>(key: string, fetcher: () => Promise<T>, ttl = 60000): Promise<T> {
    const cached = this.cache.get(key)
    
    if (cached && cached.expires > Date.now()) {
      return cached.data as T
    }
    
    const data = await fetcher()
    this.cache.set(key, { data, expires: Date.now() + ttl })
    
    return data
  }
  
  /**
   * Clear specific cache key or all cache
   */
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
  
  // =====================================================
  // Optimized Data Fetchers
  // =====================================================
  
  /**
   * Get user events with time window optimization
   */
  async getUserEvents(limit = 50, since?: Date): Promise<any[]> {
    if (!this.userId || !this.supabase) return []

    // Default to last 7 days for pattern detection
    const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const { data } = await this.supabase
      .from('events')
      .select('type, data, created_at')
      .eq('user_id', this.userId)
      .gte('created_at', toISOStringNoMs(sinceDate))
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return data || []
  }
  
  /**
   * Get current task with caching
   */
  async getCurrentTask(): Promise<any> {
    if (!this.userId || !this.supabase) return null
    
    return this.getCached('current-task', async () => {
      const { data } = await this.supabase!
        .from('tasks')
        .select('id,title,priority,time_estimate')
        .eq('user_id', this.userId!)
        .eq('completed', false)
        .order('priority', { ascending: false })
        .limit(1)
      
      return data && data.length > 0 ? data[0] : null
    }, 30000) // 30 second cache
  }
  
  /**
   * Get active tasks (top N by priority)
   */
  async getActiveTasks(limit = 3): Promise<any[]> {
    if (!this.userId || !this.supabase) return []
    
    return this.getCached(`active-tasks-${limit}`, async () => {
      const { data } = await this.supabase!
        .from('tasks')
        .select('id,title,priority,time_estimate,due_date,description')
        .eq('user_id', this.userId!)
        .eq('completed', false)
        .order('priority', { ascending: false })
        .limit(limit)
      
      return data || []
    }, 30000)
  }
  
  /**
   * Get recent tasks with limit
   */
  async getRecentTasks(limit = 10): Promise<any[]> {
    if (!this.userId || !this.supabase) return []
    
    const { data } = await this.supabase
      .from('tasks')
      .select('id, title, completed, priority, created_at')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return data || []
  }
  
  /**
   * Get latest mood entry with caching
   */
  async getLatestMood(): Promise<any> {
    if (!this.userId || !this.supabase) return null
    
    return this.getCached('latest-mood', async () => {
      const { data } = await this.supabase!
        .from('mood_entries')
        .select('mood, energy, focus, created_at')
        .eq('user_id', this.userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      return data
    }, 60000) // 1 minute cache
  }
  
  /**
   * Get recent mood entries (default: last 7 days)
   */
  async getRecentMoods(since?: Date): Promise<any[]> {
    if (!this.userId || !this.supabase) return []

    // Default to last 7 days for trend analysis
    const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const { data } = await this.supabase
      .from('mood_entries')
      .select('mood, energy, focus, created_at')
      .eq('user_id', this.userId)
      .gte('created_at', toISOStringNoMs(sinceDate))
      .order('created_at', { ascending: false })
    
    return data || []
  }
  
  /**
   * Get current focus session
   */
  async getCurrentFocusSession(): Promise<any> {
    if (!this.userId || !this.supabase) return null
    
    return this.getCached('current-focus', async () => {
      const { data } = await this.supabase!
        .from('focus_sessions')
        .select('id, task_id, duration, actual_duration, created_at')
        .eq('user_id', this.userId!)
        .is('ended_at', null)
        .single()
      
      return data
    }, 10000) // 10 second cache
  }
  
  /**
   * Get focus sessions for time period (default: last 7 days)
   */
  async getFocusSessions(since?: Date): Promise<any[]> {
    if (!this.userId || !this.supabase) return []

    // Default to last 7 days for pattern analysis
    const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const { data } = await this.supabase
      .from('focus_sessions')
      .select('id, duration, actual_duration, effectiveness')
      .eq('user_id', this.userId)
      .gte('created_at', toISOStringNoMs(sinceDate))
    
    return data || []
  }
  
  /**
   * Get today's statistics
   */
  async getTodayStats(): Promise<{ tasksCompleted: number; focusMinutes: number; currentStreak: number }> {
    if (!this.userId || !this.supabase) {
      return { tasksCompleted: 0, focusMinutes: 0, currentStreak: 0 }
    }
    
    return this.getCached('today-stats', async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const [tasks, sessions] = await Promise.all([
        this.supabase!
          .from('tasks')
          .select('id')
          .eq('user_id', this.userId!)
          .eq('completed', true)
          .gte('completed_at', toISOStringNoMs(todayStart)),
        this.supabase!
          .from('focus_sessions')
          .select('actual_duration')
          .eq('user_id', this.userId!)
          .gte('created_at', toISOStringNoMs(todayStart))
      ])
      
      const tasksCompleted = tasks.data?.length || 0
      const focusMinutes = sessions.data?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
      const currentStreak = await this.calculateStreak()
      
      return { tasksCompleted, focusMinutes, currentStreak }
    }, 60000) // 1 minute cache
  }
  
  /**
   * Calculate current streak
   */
  private async calculateStreak(): Promise<number> {
    // Simplified streak calculation
    return 1 // TODO: Implement actual streak calculation
  }
  
  /**
   * Get next priority task
   */
  async getNextPriorityTask(): Promise<any> {
    const tasks = await this.getActiveTasks(1)
    return tasks[0] || null
  }
  
  /**
   * Get last activity time
   */
  getLastActivityTime(): Date | null {
    return this.context?.immediate.lastInteraction || null
  }
  
  /**
   * Get user patterns (placeholder)
   */
  async getUserPatterns(): Promise<any[]> {
    // TODO: Implement pattern detection
    return []
  }
  
  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<any> {
    if (!this.userId || !this.supabase) return {}
    
    return this.getCached('user-preferences', async () => {
      const { data } = await this.supabase!
        .from('users')
        .select('adhd_persona')
        .eq('id', this.userId!)
        .single()
      
      return data || {}
    }, 300000) // 5 minute cache
  }
  
  /**
   * Get recent interventions
   */
  async getRecentInterventions(): Promise<any[]> {
    if (!this.userId || !this.supabase) return []
    
    // Interventions are now embedded in conversations
    const { data } = await this.supabase
      .from('conversations')
      .select('metadata, created_at')
      .eq('user_id', this.userId)
      .not('metadata->intervention_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)
    
    return data || []
  }
  
  /**
   * Get weekly statistics
   */
  async getWeeklyStats(): Promise<any> {
    if (!this.userId || !this.supabase) return {}
    
    return this.getCached('weekly-stats', async () => {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      
      const [tasks, sessions] = await Promise.all([
        this.supabase!
          .from('tasks')
          .select('id, completed')
          .eq('user_id', this.userId!)
          .gte('created_at', toISOStringNoMs(weekStart)),
        this.supabase!
          .from('focus_sessions')
          .select('actual_duration, effectiveness_score')
          .eq('user_id', this.userId!)
          .gte('created_at', toISOStringNoMs(weekStart))
      ])
      
      const totalTasks = tasks.data?.length || 0
      const completedTasks = tasks.data?.filter(t => t.completed).length || 0
      const totalFocusMinutes = sessions.data?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
      const avgEffectiveness = sessions.data?.length 
        ? sessions.data.reduce((acc, s) => acc + (s.effectiveness_score || 0), 0) / sessions.data.length
        : 0
      
      return {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
        totalFocusMinutes,
        avgEffectiveness,
        dailyAverage: totalFocusMinutes / 7
      }
    }, 300000) // 5 minute cache
  }

  // =====================================================
  // New Context Methods for AI Prompts
  // =====================================================

  /**
   * Get coach notes for this user (if they have a linked coach)
   */
  async getCoachNotes(limit = 10): Promise<{ body: string; created_at: string }[]> {
    if (!this.userId || !this.supabase) return []

    return this.getCached(`coach-notes-${limit}`, async () => {
      const { data, error } = await this.supabase!
        .from('coach_notes')
        .select('body, created_at')
        .eq('user_id', this.userId!)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.warn('Error fetching coach notes:', error.message)
        return []
      }

      return data || []
    }, 5 * 60 * 1000) // 5 minute cache
  }

  /**
   * Get tasks completed today with details
   */
  async getCompletedTasksToday(): Promise<any[]> {
    if (!this.userId || !this.supabase) return []

    return this.getCached('completed-tasks-today', async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data, error } = await this.supabase!
        .from('tasks')
        .select('id, title, completed_at, time_estimate, priority')
        .eq('user_id', this.userId!)
        .eq('completed', true)
        .gte('completed_at', toISOStringNoMs(todayStart))
        .order('completed_at', { ascending: false })

      if (error) {
        console.warn('Error fetching completed tasks:', error.message)
        return []
      }

      return data || []
    }, 60000) // 1 minute cache
  }

  /**
   * Get overdue tasks with details
   */
  async getOverdueTasks(): Promise<any[]> {
    if (!this.userId || !this.supabase) return []

    return this.getCached('overdue-tasks', async () => {
      const now = new Date()

      const { data, error } = await this.supabase!
        .from('tasks')
        .select('id, title, due_date, priority, time_estimate')
        .eq('user_id', this.userId!)
        .eq('completed', false)
        .lt('due_date', toISOStringNoMs(now))
        .order('due_date', { ascending: true })

      if (error) {
        console.warn('Error fetching overdue tasks:', error.message)
        return []
      }

      return data || []
    }, 60000) // 1 minute cache
  }

  /**
   * Get user profile with ADHD data for AI context
   */
  async getUserProfile(): Promise<{
    adhd_persona: string | null
    adhd_presentation: string | null
    inatt_severity: number | null
    hyper_severity: number | null
    selected_personality: string | null
  } | null> {
    if (!this.userId || !this.supabase) return null

    return this.getCached('user-profile', async () => {
      const { data, error } = await this.supabase!
        .from('users')
        .select('adhd_persona, adhd_presentation, inatt_severity, hyper_severity, selected_personality')
        .eq('id', this.userId!)
        .maybeSingle()

      if (error) {
        console.warn('Error fetching user profile:', error.message)
        return null
      }

      return data
    }, 5 * 60 * 1000) // 5 minute cache
  }

  /**
   * Get top ADHD symptom signals from onboarding results
   * These indicate the user's specific struggle areas (e.g., loses_things, avoids_effort)
   */
  async getTopSignals(): Promise<string[]> {
    if (!this.userId || !this.supabase) return []

    return this.getCached('top-signals', async () => {
      const { data, error } = await this.supabase!
        .from('onboarding_results')
        .select('top_signals')
        .eq('user_id', this.userId!)
        .maybeSingle()

      if (error) {
        console.warn('Error fetching top signals:', error.message)
        return []
      }

      // top_signals is stored as JSONB array
      return Array.isArray(data?.top_signals) ? data.top_signals : []
    }, 5 * 60 * 1000) // 5 minute cache
  }
}

export const contextEngine = new ContextEngine()