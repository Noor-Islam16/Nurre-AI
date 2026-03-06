import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type GuardrailAction = 
  | 'blocked_abuse'
  | 'filtered_content'
  | 'response_boundary_violation'
  | 'successful_interaction'
  | 'guardrail_error'
  | 'rate_limit_exceeded'

export interface GuardrailLogEntry {
  userId: string
  action: GuardrailAction
  reason?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  restrictionLevel?: string
  matchedPatterns?: string[]
  metadata?: any
}

export interface GuardrailStats {
  totalEvents: number
  byAction: Record<GuardrailAction, number>
  bySeverity: Record<string, number>
  successRate: number
  lastViolation?: Date
  trend: 'increasing' | 'stable' | 'decreasing'
}

/**
 * Comprehensive logging system for all guardrail actions
 * Provides centralized logging and analytics for security events
 */
export class GuardrailLogger {
  private supabase: SupabaseClient | null = null
  
  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || null
  }
  
  /**
   * Initialize with Supabase client if not provided in constructor
   */
  private async getSupabase(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }
  
  /**
   * Log a guardrail action
   */
  async log(entry: GuardrailLogEntry): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      
      // Sanitize metadata to avoid storing sensitive information
      const sanitizedMetadata = this.sanitizeMetadata(entry.metadata)
      
      await supabase.from('guardrail_logs').insert({
        user_id: entry.userId,
        action: entry.action,
        reason: entry.reason,
        severity: entry.severity,
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString()
      })
      
      // Also log critical events to admin alerts
      if (entry.severity === 'critical' || entry.action === 'blocked_abuse') {
        await this.createAdminAlert(entry, supabase)
      }
    } catch (error) {
      console.error('Failed to log guardrail action:', error)
      // Don't throw - logging shouldn't break the main flow
    }
  }
  
  /**
   * Log multiple entries in batch
   */
  async logBatch(entries: GuardrailLogEntry[]): Promise<void> {
    try {
      const supabase = await this.getSupabase()
      
      const records = entries.map(entry => ({
        user_id: entry.userId,
        action: entry.action,
        reason: entry.reason,
        severity: entry.severity,
        metadata: this.sanitizeMetadata(entry.metadata),
        timestamp: new Date().toISOString()
      }))
      
      await supabase.from('guardrail_logs').insert(records)
    } catch (error) {
      console.error('Failed to log guardrail batch:', error)
    }
  }
  
  /**
   * Get statistics for monitoring
   */
  async getStats(
    userId?: string,
    timeRangeHours: number = 24
  ): Promise<GuardrailStats> {
    try {
      const supabase = await this.getSupabase()
      const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
      
      let query = supabase
        .from('guardrail_logs')
        .select('*')
        .gte('timestamp', cutoffTime.toISOString())
      
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      const { data: logs, error } = await query
      
      if (error) throw error
      
      const stats: GuardrailStats = {
        totalEvents: logs?.length || 0,
        byAction: {} as Record<GuardrailAction, number>,
        bySeverity: {},
        successRate: 0,
        trend: 'stable'
      }
      
      if (logs && logs.length > 0) {
        // Count by action
        for (const log of logs) {
          stats.byAction[log.action as GuardrailAction] = 
            (stats.byAction[log.action as GuardrailAction] || 0) + 1
          
          if (log.severity) {
            stats.bySeverity[log.severity] = 
              (stats.bySeverity[log.severity] || 0) + 1
          }
        }
        
        // Calculate success rate
        const successful = stats.byAction['successful_interaction'] || 0
        stats.successRate = (successful / stats.totalEvents) * 100
        
        // Find last violation
        const violations = logs.filter(l => 
          l.action !== 'successful_interaction'
        ).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        
        if (violations.length > 0) {
          stats.lastViolation = new Date(violations[0].timestamp)
        }
        
        // Calculate trend (compare first half to second half)
        const midpoint = Math.floor(logs.length / 2)
        const firstHalf = logs.slice(0, midpoint)
        const secondHalf = logs.slice(midpoint)
        
        const firstHalfViolations = firstHalf.filter(l => 
          l.action !== 'successful_interaction'
        ).length
        const secondHalfViolations = secondHalf.filter(l => 
          l.action !== 'successful_interaction'
        ).length
        
        if (secondHalfViolations > firstHalfViolations * 1.5) {
          stats.trend = 'increasing'
        } else if (secondHalfViolations < firstHalfViolations * 0.5) {
          stats.trend = 'decreasing'
        }
      }
      
      return stats
    } catch (error) {
      console.error('Failed to get guardrail stats:', error)
      return {
        totalEvents: 0,
        byAction: {} as Record<GuardrailAction, number>,
        bySeverity: {},
        successRate: 100,
        trend: 'stable'
      }
    }
  }
  
  /**
   * Get recent logs for a user
   */
  async getRecentLogs(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const supabase = await this.getSupabase()
      
      const { data, error } = await supabase
        .from('guardrail_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Failed to get recent logs:', error)
      return []
    }
  }
  
  /**
   * Create admin alert for critical events
   */
  private async createAdminAlert(
    entry: GuardrailLogEntry,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      await supabase.from('admin_alerts').insert({
        type: 'guardrail_violation',
        severity: entry.severity || 'high',
        user_id: entry.userId,
        details: {
          action: entry.action,
          reason: entry.reason,
          metadata: entry.metadata
        },
        requires_review: entry.severity === 'critical',
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to create admin alert:', error)
    }
  }
  
  /**
   * Sanitize metadata to avoid storing sensitive information
   */
  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return null
    
    const sanitized = { ...metadata }
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'token', 'api_key', 'apiKey',
      'secret', 'auth', 'authorization', 'cookie'
    ]
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }
    
    // Truncate long strings
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
        sanitized[key] = sanitized[key].substring(0, 500) + '...[truncated]'
      }
    }
    
    return sanitized
  }
  
  /**
   * Clean up old logs (for maintenance)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const supabase = await this.getSupabase()
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)
      
      const { data, error } = await supabase
        .from('guardrail_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString())
        .select('id')
      
      if (error) throw error
      
      return data?.length || 0
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
      return 0
    }
  }
}

// Singleton instance for convenience
let instance: GuardrailLogger | null = null

export function getGuardrailLogger(): GuardrailLogger {
  if (!instance) {
    instance = new GuardrailLogger()
  }
  return instance
}