import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * User activity status levels
 */
export enum ActivityStatus {
  ACTIVE = 'active',       // Event within 15 minutes - FULL AI PROCESSING
  ENGAGED = 'engaged',     // Event within 30 minutes - PROCESS WITH LOWER PRIORITY
  IDLE = 'idle',          // Event within 60 minutes - SKIP COMPLETELY
  INACTIVE = 'inactive'    // No event > 60 minutes - SKIP COMPLETELY
}

/**
 * Activity thresholds configuration
 */
interface ActivityThresholds {
  ACTIVE: number        // Minutes to consider user active
  ENGAGED: number       // Minutes to consider user engaged
  IDLE: number         // Minutes before user is idle
  FOCUS_SESSION_BUFFER: number   // Keep active X min after focus ends
  TASK_DUE_EXTENSION: number     // Extend if task due soon
  STRESS_EXTENSION: number       // Extend if stressed
}

/**
 * Default thresholds (in minutes) - Tightened to reduce API calls
 */
const DEFAULT_THRESHOLDS: ActivityThresholds = {
  ACTIVE: parseInt(process.env.ACTIVE_THRESHOLD || '5'),   // Was 15, now 5 minutes
  ENGAGED: parseInt(process.env.ENGAGED_THRESHOLD || '10'), // Was 30, now 10 minutes
  IDLE: parseInt(process.env.IDLE_THRESHOLD || '20'),      // Was 60, now 20 minutes
  FOCUS_SESSION_BUFFER: 5,
  TASK_DUE_EXTENSION: 15,
  STRESS_EXTENSION: 20
}

/**
 * User with activity information
 */
export interface UserActivity {
  id: string
  email: string
  lastEventTimestamp: Date | null
  lastEventType: string | null
  hasActiveFocusSession: boolean
  hasRecentChatMessage: boolean
  hasUpcomingTaskDue: boolean
  recentMoodScore: number | null
  status: ActivityStatus
  minutesSinceLastEvent: number | null
}

/**
 * Detects and classifies user activity for cost-optimized AI processing
 */
export class UserActivityDetector {
  private thresholds: ActivityThresholds
  private supabase: SupabaseClient | null = null
  
  constructor(thresholds: Partial<ActivityThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
  }
  
  /**
   * Initialize Supabase client
   */
  private async getSupabase(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }
  
  /**
   * Get all active users that should be processed
   */
  async getActiveUsers(): Promise<UserActivity[]> {
    const supabase = await this.getSupabase()
    
    // Get users with recent events (within IDLE threshold)
    const usersWithRecentEvents = await this.getUsersWithRecentEvents(this.thresholds.IDLE)
    
    if (usersWithRecentEvents.length === 0) {
      console.log('[UserActivityDetector] No users with recent events')
      return []
    }
    
    // Enrich with additional context for each user
    const enrichedUsers = await Promise.all(
      usersWithRecentEvents.map(user => this.enrichUserActivity(user))
    )
    
    // Classify users by activity status
    const categorizedUsers = enrichedUsers.map(user => ({
      ...user,
      status: this.getUserActivityStatus(user)
    }))
    
    // Filter only ACTIVE and ENGAGED users for processing
    const usersToProcess = categorizedUsers.filter(
      user => user.status === ActivityStatus.ACTIVE || user.status === ActivityStatus.ENGAGED
    )
    
    // Sort by priority (ACTIVE first, then by recency)
    usersToProcess.sort((a, b) => {
      // Prioritize ACTIVE over ENGAGED
      if (a.status === ActivityStatus.ACTIVE && b.status !== ActivityStatus.ACTIVE) return -1
      if (b.status === ActivityStatus.ACTIVE && a.status !== ActivityStatus.ACTIVE) return 1
      
      // Within same status, prioritize by recency
      if (a.minutesSinceLastEvent !== null && b.minutesSinceLastEvent !== null) {
        return a.minutesSinceLastEvent - b.minutesSinceLastEvent
      }
      
      return 0
    })
    
    // Log activity distribution
    const distribution = {
      active: categorizedUsers.filter(u => u.status === ActivityStatus.ACTIVE).length,
      engaged: categorizedUsers.filter(u => u.status === ActivityStatus.ENGAGED).length,
      idle: categorizedUsers.filter(u => u.status === ActivityStatus.IDLE).length,
      inactive: categorizedUsers.filter(u => u.status === ActivityStatus.INACTIVE).length
    }
    
    console.log('[UserActivityDetector] User activity distribution:', distribution)
    console.log(`[UserActivityDetector] Processing ${usersToProcess.length} users (${distribution.active} active, ${distribution.engaged} engaged)`)
    
    return usersToProcess
  }
  
  /**
   * Get users with events within the specified time window
   * CRITICAL: Filter out system-generated events to avoid false activity detection
   */
  private async getUsersWithRecentEvents(minutesAgo: number): Promise<UserActivity[]> {
    const supabase = await this.getSupabase()
    
    // Calculate timestamp for the time window
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
    
    // System-generated event types to exclude
    const systemEventTypes = [
      'ai_message',
      'ai_intervention',
      'ai_tools_requested',
      'tool_executed',
      'intervention_triggered',
      'system_cleanup',
      'auto_save',
      'background_sync'
    ]
    
    // Query for users with recent USER-INITIATED events only
    const { data: recentEvents, error } = await supabase
      .from('events')
      .select(`
        user_id,
        type,
        created_at
      `)
      .gte('created_at', cutoffTime)
      .not('type', 'in', `(${systemEventTypes.join(',')})`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[UserActivityDetector] Error fetching recent events:', error)
      return []
    }
    
    // Group events by user and get most recent
    const userMap = new Map<string, UserActivity>()
    
    for (const event of recentEvents || []) {
      const userId = event.user_id
      
      if (!userMap.has(userId)) {
        const eventTime = new Date(event.created_at)
        const minutesSince = Math.floor((Date.now() - eventTime.getTime()) / (1000 * 60))
        
        userMap.set(userId, {
          id: userId,
          email: '', // Will be populated later if needed
          lastEventTimestamp: eventTime,
          lastEventType: event.type,
          hasActiveFocusSession: false,
          hasRecentChatMessage: false,
          hasUpcomingTaskDue: false,
          recentMoodScore: null,
          status: ActivityStatus.INACTIVE,
          minutesSinceLastEvent: minutesSince
        })
      }
    }
    
    return Array.from(userMap.values())
  }
  
  /**
   * Enrich user activity with additional context
   */
  private async enrichUserActivity(user: UserActivity): Promise<UserActivity> {
    const supabase = await this.getSupabase()
    
    // Check for active focus session
    const { data: focusSession } = await supabase
      .from('focus_sessions')
      .select('id')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .single()
    
    user.hasActiveFocusSession = !!focusSession
    
    // Check for recent chat messages (last 5 minutes)
    const recentChatCutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentChat } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', recentChatCutoff)
      .limit(1)
      .single()
    
    user.hasRecentChatMessage = !!recentChat
    
    // Check for upcoming tasks (due in next hour)
    const upcomingDueCutoff = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { data: upcomingTask } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('due_date', upcomingDueCutoff)
      .gte('due_date', new Date().toISOString())
      .limit(1)
      .single()
    
    user.hasUpcomingTaskDue = !!upcomingTask
    
    // Get recent mood score (last 2 hours)
    const moodCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: moodEntry } = await supabase
      .from('mood_entries')
      .select('score')
      .eq('user_id', user.id)
      .gte('created_at', moodCutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    user.recentMoodScore = moodEntry?.score || null
    
    return user
  }
  
  /**
   * Determine user's activity status based on context
   */
  private getUserActivityStatus(user: UserActivity): ActivityStatus {
    if (!user.minutesSinceLastEvent) {
      return ActivityStatus.INACTIVE
    }
    
    const minutesSinceEvent = user.minutesSinceLastEvent
    
    // Special cases that extend active status
    if (user.hasActiveFocusSession) {
      // Always active during focus session
      return ActivityStatus.ACTIVE
    }
    
    if (user.hasRecentChatMessage) {
      // Active if chatting recently
      return ActivityStatus.ACTIVE
    }
    
    if (user.hasUpcomingTaskDue) {
      // Extend active period if task due soon
      const extendedThreshold = this.thresholds.ACTIVE + this.thresholds.TASK_DUE_EXTENSION
      if (minutesSinceEvent < extendedThreshold) {
        return ActivityStatus.ACTIVE
      }
    }
    
    if (user.recentMoodScore !== null && user.recentMoodScore < 3) {
      // Extend active period if user is stressed
      const extendedThreshold = this.thresholds.ACTIVE + this.thresholds.STRESS_EXTENSION
      if (minutesSinceEvent < extendedThreshold) {
        return ActivityStatus.ACTIVE
      }
    }
    
    // Standard cooldown periods
    if (minutesSinceEvent < this.thresholds.ACTIVE) {
      return ActivityStatus.ACTIVE
    }
    
    if (minutesSinceEvent < this.thresholds.ENGAGED) {
      return ActivityStatus.ENGAGED
    }
    
    if (minutesSinceEvent < this.thresholds.IDLE) {
      return ActivityStatus.IDLE
    }
    
    return ActivityStatus.INACTIVE
  }
  
  /**
   * Get activity status for a specific user
   */
  async getUserStatus(userId: string): Promise<ActivityStatus> {
    const supabase = await this.getSupabase()
    
    // Get user's most recent event
    const { data: recentEvent } = await supabase
      .from('events')
      .select('created_at, type')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!recentEvent) {
      return ActivityStatus.INACTIVE
    }
    
    const eventTime = new Date(recentEvent.created_at)
    const minutesSince = Math.floor((Date.now() - eventTime.getTime()) / (1000 * 60))
    
    // Create user activity object
    const userActivity: UserActivity = {
      id: userId,
      email: '',
      lastEventTimestamp: eventTime,
      lastEventType: recentEvent.type,
      hasActiveFocusSession: false,
      hasRecentChatMessage: false,
      hasUpcomingTaskDue: false,
      recentMoodScore: null,
      status: ActivityStatus.INACTIVE,
      minutesSinceLastEvent: minutesSince
    }
    
    // Enrich with context
    const enrichedUser = await this.enrichUserActivity(userActivity)
    
    // Return calculated status
    return this.getUserActivityStatus(enrichedUser)
  }
  
  /**
   * Check if planner should run based on time of day
   */
  isWithinOperatingHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    
    // Check quiet hours (10pm - 7am)
    if (hour >= 22 || hour < 7) {
      return false
    }
    
    // Different schedules for weekdays vs weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend: 10am - 10pm
      return hour >= 10 && hour < 22
    } else {
      // Weekday: 7am - 10pm
      return hour >= 7 && hour < 22
    }
  }
}

// Singleton instance
let activityDetector: UserActivityDetector | null = null

/**
 * Get singleton activity detector instance
 */
export function getUserActivityDetector(): UserActivityDetector {
  if (!activityDetector) {
    activityDetector = new UserActivityDetector()
  }
  return activityDetector
}