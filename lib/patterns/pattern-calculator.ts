import { createClient } from '@/lib/supabase/client'
import { SimplePattern, PATTERN_CONFIG, formatHour, calculateConfidence } from './simple-patterns'

/**
 * Pattern Calculator Service
 * Calculates simple behavioral patterns from existing database data
 * No complex algorithms - just useful insights from real data
 */

export class PatternCalculator {
  /**
   * Calculate user's peak productivity hours based on task completions
   */
  async calculatePeakHours(userId: string): Promise<SimplePattern | null> {
    try {
      const supabase = createClient()
      
      // Get task completions from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: completions, error } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .not('completed_at', 'is', null)
        .gte('completed_at', thirtyDaysAgo.toISOString())
      
      if (error || !completions || completions.length < 5) {
        return null // Not enough data
      }
      
      // Count completions by hour
      const hourCounts: Record<number, number> = {}
      completions.forEach(task => {
        const hour = new Date(task.completed_at!).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })
      
      // Find top 3 hours
      const sortedHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour))
      
      if (sortedHours.length === 0) return null
      
      const peakHoursFormatted = sortedHours.map(h => formatHour(h)).join(', ')
      const confidence = calculateConfidence(completions.length, 10)
      
      return {
        type: 'peak_hours',
        title: 'Your Power Hours',
        insight: `You're most productive at ${peakHoursFormatted}`,
        confidence,
        recommendation: 'Schedule important tasks during these times',
        ...PATTERN_CONFIG.peak_hours
      }
    } catch (error) {
      console.error('Error calculating peak hours:', error)
      return null
    }
  }

  /**
   * Calculate optimal focus session duration
   */
  async calculateOptimalFocus(userId: string): Promise<SimplePattern | null> {
    try {
      const supabase = createClient()
      
      // Get completed focus sessions from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: sessions, error } = await supabase
        .from('focus_sessions')
        .select('duration, actual_duration, effectiveness')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('created_at', thirtyDaysAgo.toISOString())
      
      if (error || !sessions || sessions.length < 3) {
        return null // Not enough data
      }
      
      // Calculate average duration of effective sessions
      const effectiveSessions = sessions.filter(s => 
        (s.effectiveness || 0) > 70 || !s.effectiveness
      )
      
      if (effectiveSessions.length === 0) return null
      
      const totalDuration = effectiveSessions.reduce((sum, s) => 
        sum + (s.actual_duration || s.duration || 0), 0
      )
      const avgDuration = Math.round(totalDuration / effectiveSessions.length / 5) * 5 // Round to nearest 5
      const confidence = calculateConfidence(sessions.length, 5)
      
      return {
        type: 'focus_duration',
        title: 'Optimal Focus Time',
        insight: `Your sweet spot is ${avgDuration} minute sessions`,
        confidence,
        recommendation: 'Set your timer to this duration for better success',
        ...PATTERN_CONFIG.focus_duration
      }
    } catch (error) {
      console.error('Error calculating optimal focus:', error)
      return null
    }
  }

  /**
   * Calculate task completion velocity and trend
   */
  async calculateTaskVelocity(userId: string): Promise<SimplePattern | null> {
    try {
      const supabase = createClient()
      
      // Get tasks from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      
      // This week's stats
      const { data: thisWeekTasks } = await supabase
        .from('tasks')
        .select('completed')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
      
      // Last week's stats for trend
      const { data: lastWeekTasks } = await supabase
        .from('tasks')
        .select('completed')
        .eq('user_id', userId)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())
      
      if (!thisWeekTasks || thisWeekTasks.length === 0) {
        return null // No tasks this week
      }
      
      const thisWeekCompleted = thisWeekTasks.filter(t => t.completed).length
      const thisWeekTotal = thisWeekTasks.length
      const thisWeekRate = Math.round((thisWeekCompleted / thisWeekTotal) * 100)
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (lastWeekTasks && lastWeekTasks.length > 0) {
        const lastWeekCompleted = lastWeekTasks.filter(t => t.completed).length
        const lastWeekTotal = lastWeekTasks.length
        const lastWeekRate = (lastWeekCompleted / lastWeekTotal) * 100
        
        if (thisWeekRate > lastWeekRate + 5) trend = 'up'
        else if (thisWeekRate < lastWeekRate - 5) trend = 'down'
      }
      
      const confidence = calculateConfidence(thisWeekTotal, 5)
      
      let recommendation = ''
      if (thisWeekRate >= 70) {
        recommendation = 'Great job! Keep up the momentum'
      } else if (thisWeekRate >= 50) {
        recommendation = 'Good progress. Try breaking tasks into smaller pieces'
      } else {
        recommendation = 'Consider reducing task scope for easier wins'
      }
      
      return {
        type: 'task_velocity',
        title: 'Task Completion Rate',
        insight: `${thisWeekRate}% completion this week`,
        confidence,
        recommendation,
        trend,
        ...PATTERN_CONFIG.task_velocity
      }
    } catch (error) {
      console.error('Error calculating task velocity:', error)
      return null
    }
  }

  /**
   * Detect current momentum based on recent completions
   */
  async detectCurrentMomentum(userId: string): Promise<SimplePattern | null> {
    try {
      const supabase = createClient()
      
      // Check last 2 hours
      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
      
      const { data: recentCompletions } = await supabase
        .from('tasks')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', twoHoursAgo.toISOString())
      
      const completionCount = recentCompletions?.length || 0
      
      if (completionCount === 0) {
        return null // No recent momentum
      }
      
      let insight = ''
      let recommendation = ''
      let confidence = 0
      
      if (completionCount >= 3) {
        insight = "You're on fire! 🔥 Multiple tasks completed"
        recommendation = 'Ride this wave - tackle something challenging'
        confidence = 0.9
      } else if (completionCount === 2) {
        insight = 'Building momentum with back-to-back completions'
        recommendation = 'Keep going - you\'ve got this!'
        confidence = 0.7
      } else {
        insight = 'Task completed - momentum building'
        recommendation = 'Quick! Start another small task to build a chain'
        confidence = 0.5
      }
      
      return {
        type: 'momentum',
        title: 'Current Momentum',
        insight,
        confidence,
        recommendation,
        ...PATTERN_CONFIG.momentum
      }
    } catch (error) {
      console.error('Error detecting momentum:', error)
      return null
    }
  }

  /**
   * Assess procrastination risk based on idle patterns
   */
  async assessProcrastinationRisk(userId: string): Promise<SimplePattern | null> {
    try {
      const supabase = createClient()
      
      // Check recent events for idle patterns
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)
      
      const { data: events } = await supabase
        .from('events')
        .select('type, data')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: true })
      
      if (!events || events.length < 3) {
        return null // Not enough recent activity
      }
      
      // Look for patterns: page_view → idle → page_view (task avoidance)
      let idleCount = 0
      let taskViewsWithoutAction = 0
      
      for (let i = 0; i < events.length - 1; i++) {
        const current = events[i]
        const next = events[i + 1]
        
        if (current.type === 'idle_detected') {
          idleCount++
        }
        
        if (current.type === 'page_view' && 
            current.data?.page?.includes('task') &&
            next.type === 'idle_detected') {
          taskViewsWithoutAction++
        }
      }
      
      // Calculate risk level
      const riskScore = (idleCount * 0.3 + taskViewsWithoutAction * 0.7) / Math.max(events.length * 0.1, 1)
      
      if (riskScore < 0.3) {
        return null // Low risk, no pattern to show
      }
      
      let insight = ''
      let recommendation = ''
      let confidence = 0
      
      if (riskScore >= 0.7) {
        insight = 'High procrastination detected - you seem stuck'
        recommendation = 'Try the 2-minute rule: just start with 2 minutes'
        confidence = 0.8
      } else if (riskScore >= 0.5) {
        insight = 'Some task avoidance detected'
        recommendation = 'Break the current task into smaller pieces'
        confidence = 0.6
      } else {
        insight = 'Slight hesitation detected'
        recommendation = 'Take a deep breath and pick the easiest task'
        confidence = 0.4
      }
      
      return {
        type: 'procrastination_risk',
        title: 'Focus Alert',
        insight,
        confidence,
        recommendation,
        ...PATTERN_CONFIG.procrastination_risk
      }
    } catch (error) {
      console.error('Error assessing procrastination:', error)
      return null
    }
  }

  /**
   * Get all patterns for a user
   */
  async getAllPatterns(userId: string): Promise<SimplePattern[]> {
    // Run all calculations in parallel for performance
    const [peakHours, focusDuration, taskVelocity, momentum, procrastination] = await Promise.all([
      this.calculatePeakHours(userId),
      this.calculateOptimalFocus(userId),
      this.calculateTaskVelocity(userId),
      this.detectCurrentMomentum(userId),
      this.assessProcrastinationRisk(userId)
    ])
    
    // Filter out null results and sort by priority
    const patterns = [peakHours, focusDuration, taskVelocity, momentum, procrastination]
      .filter((p): p is SimplePattern => p !== null)
      .sort((a, b) => {
        // Sort by priority (lower number = higher priority)
        const aPriority = PATTERN_CONFIG[a.type].priority
        const bPriority = PATTERN_CONFIG[b.type].priority
        return aPriority - bPriority
      })
    
    // Return top 3-5 patterns
    return patterns.slice(0, 5)
  }
}

// Export singleton instance
export const patternCalculator = new PatternCalculator()