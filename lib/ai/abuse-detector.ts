/**
 * Abuse Detection System for AI Chat
 * Identifies patterns of misuse, tracks violations, and applies escalating restrictions
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Types and Interfaces
export interface AbusePattern {
  type: 'academic' | 'offtopic' | 'injection' | 'spam' | 'inappropriate' | 'bypass'
  severity: 'low' | 'medium' | 'high' | 'critical'
  count: number
  firstOccurrence: Date
  lastOccurrence: Date
  messages: string[]  // Sanitized samples (max 5)
}

export interface UserAbuseProfile {
  userId: string
  violations: AbusePattern[]
  totalViolations: number
  restrictionLevel: 'none' | 'warning' | 'limited' | 'suspended'
  lastReviewDate: Date
  suspensionEndsAt?: Date
  notes: string[]
}

export interface AbuseCheckResult {
  allowed: boolean
  restrictionLevel: string
  reason?: string
  remainingWarnings?: number
  suspensionEndsAt?: Date
  cooldownRemaining?: number  // Seconds until next message allowed
}

// Restriction thresholds and settings
const RESTRICTION_THRESHOLDS = {
  warning: {
    minViolations: 3,
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
    message: "⚠️ You've made several inappropriate requests. Please keep conversations focused on ADHD support."
  },
  limited: {
    minViolations: 5,
    timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    restrictions: {
      messagesPerHour: 5,  // Reduced from normal
      cooldownMinutes: 5   // Between messages
    },
    message: "🚫 Due to repeated violations, your access has been limited. You can send 5 messages per hour with a 5-minute cooldown."
  },
  suspended: {
    minViolations: 10,
    criticalViolations: 3,  // Or 3 critical violations
    duration: 24 * 60 * 60 * 1000, // 24 hour suspension
    message: "❌ Your access has been temporarily suspended for 24 hours due to policy violations."
  }
}

// Pattern analyzer for detecting abuse patterns
export class PatternAnalyzer {
  /**
   * Detect rapid-fire abuse attempts (spam pattern)
   */
  detectSpamPattern(messages: { content: string; timestamp: Date }[]): boolean {
    // 5+ similar violations in 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    const recentMessages = messages.filter(m => 
      m.timestamp.getTime() > fiveMinutesAgo
    )
    
    if (recentMessages.length < 5) return false
    
    // Check for similar content
    return this.haveSimilarContent(recentMessages.map(m => m.content))
  }
  
  /**
   * Check if messages have similar content (potential spam)
   */
  private haveSimilarContent(contents: string[]): boolean {
    if (contents.length < 2) return false
    
    // Simple similarity check - can be enhanced with Levenshtein distance
    const normalized = contents.map(c => c.toLowerCase().trim())
    const uniqueContents = new Set(normalized)
    
    // If most messages are the same or very similar
    return uniqueContents.size < contents.length * 0.3  // Less than 30% unique
  }
  
  /**
   * Detect attempts to bypass content filters
   */
  detectBypassAttempts(content: string): boolean {
    const bypassPatterns = [
      // Character substitution
      /wr[i1!]te?\s*m[y¥]\s*ess[a@4]y/i,
      /d[o0]\s*m[y¥]\s*h[o0]m[e3]w[o0]rk/i,
      
      // Spacing tricks
      /w\s+r\s+i\s+t\s+e\s+m\s+y\s+e\s+s\s+s\s+a\s+y/i,
      /d\s+o\s+m\s+y\s+h\s+o\s+m\s+e\s+w\s+o\s+r\s+k/i,
      
      // Reversal attempts
      /yasse ym etirw/i,
      /krowemoh ym od/i,
      
      // Encoding attempts
      /base64:/i,
      /atob\(/i,
      /decode\(/i,
      
      // Unicode tricks
      /[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/,  // Invisible characters
      
      // Asking to ignore filters
      /ignore the filter/i,
      /bypass the restriction/i,
      /pretend there's no filter/i
    ]
    
    return bypassPatterns.some(pattern => pattern.test(content))
  }
  
  /**
   * Detect escalating severity in recent violations
   */
  detectEscalation(profile: UserAbuseProfile): boolean {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const recentViolations = profile.violations.filter(v => 
      v.lastOccurrence.getTime() > oneHourAgo
    )
    
    // Check if severity is increasing
    const hasCritical = recentViolations.some(v => v.severity === 'critical')
    const hasMultipleHigh = recentViolations.filter(v => v.severity === 'high').length >= 2
    
    return hasCritical || hasMultipleHigh
  }
}

/**
 * Main Abuse Detector Class
 */
export class AbuseDetector {
  private userProfiles: Map<string, UserAbuseProfile>
  private patternAnalyzer: PatternAnalyzer
  private lastMessageTimes: Map<string, number>  // For cooldown tracking
  
  constructor() {
    this.userProfiles = new Map()
    this.patternAnalyzer = new PatternAnalyzer()
    this.lastMessageTimes = new Map()
  }
  
  /**
   * Check if user should be allowed to use chat
   */
  async checkUser(userId: string): Promise<AbuseCheckResult> {
    const supabase = await createClient()
    
    // Load user's restriction from database
    const { data: restriction } = await supabase
      .from('user_restrictions')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // Check if user is suspended
    if (restriction?.restriction_level === 'suspended') {
      const suspensionEnds = restriction.suspension_ends_at ? 
        new Date(restriction.suspension_ends_at) : null
      
      if (suspensionEnds && suspensionEnds > new Date()) {
        return {
          allowed: false,
          restrictionLevel: 'suspended',
          reason: RESTRICTION_THRESHOLDS.suspended.message,
          suspensionEndsAt: suspensionEnds
        }
      } else if (suspensionEnds) {
        // Suspension expired, lift it
        await this.liftSuspension(userId, supabase)
      }
    }
    
    // Check if user is rate limited
    if (restriction?.restriction_level === 'limited') {
      const cooldownCheck = this.checkCooldown(userId)
      if (!cooldownCheck.allowed) {
        return {
          allowed: false,
          restrictionLevel: 'limited',
          reason: `Please wait ${cooldownCheck.remainingSeconds} seconds before sending another message.`,
          cooldownRemaining: cooldownCheck.remainingSeconds
        }
      }
      
      // Check hourly limit
      const hourlyCount = await this.getHourlyMessageCount(userId, supabase)
      const limit = RESTRICTION_THRESHOLDS.limited.restrictions.messagesPerHour
      
      if (hourlyCount >= limit) {
        return {
          allowed: false,
          restrictionLevel: 'limited',
          reason: `You've reached your hourly message limit (${limit} messages). Please try again later.`,
          cooldownRemaining: 3600  // Wait an hour
        }
      }
    }
    
    // Check for warning level
    if (restriction?.restriction_level === 'warning') {
      const remainingWarnings = Math.max(0, 5 - (restriction.violations_count || 0))
      return {
        allowed: true,
        restrictionLevel: 'warning',
        remainingWarnings
      }
    }
    
    // User is allowed
    return {
      allowed: true,
      restrictionLevel: restriction?.restriction_level || 'none'
    }
  }
  
  /**
   * Record a violation and apply restrictions if needed
   */
  async recordViolation(
    userId: string,
    type: AbusePattern['type'],
    content: string,
    severity: AbusePattern['severity']
  ): Promise<void> {
    const supabase = await createClient()
    
    // Hash content for privacy
    const contentHash = this.hashContent(content)
    
    // Check for bypass attempts
    const isBypass = this.patternAnalyzer.detectBypassAttempts(content)
    if (isBypass) {
      type = 'bypass'
      severity = 'high'  // Bypass attempts are always high severity
    }
    
    // Log the violation
    await supabase.from('abuse_logs').insert({
      user_id: userId,
      violation_type: type,
      severity,
      content_hash: contentHash,
      detected_patterns: [type],
      action_taken: 'logged'
    })
    
    // Update user profile
    const profile = await this.getUserProfile(userId)
    
    // Add or update violation pattern
    const existingPattern = profile.violations.find(v => v.type === type)
    if (existingPattern) {
      existingPattern.count++
      existingPattern.lastOccurrence = new Date()
      existingPattern.severity = this.getHigherSeverity(existingPattern.severity, severity)
      
      // Keep last 5 sanitized samples
      if (existingPattern.messages.length < 5) {
        existingPattern.messages.push(this.sanitizeContent(content))
      }
    } else {
      profile.violations.push({
        type,
        severity,
        count: 1,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        messages: [this.sanitizeContent(content)]
      })
    }
    
    profile.totalViolations++
    
    // Calculate new restriction level
    const newRestriction = await this.calculateRestriction(profile, supabase)
    profile.restrictionLevel = newRestriction
    
    // Save updated profile
    this.userProfiles.set(userId, profile)
    
    // Update database
    await this.updateUserRestriction(userId, profile, supabase)
    
    // Alert admins for critical violations
    if (severity === 'critical' || newRestriction === 'suspended') {
      await this.alertAdmins(userId, type, severity, supabase)
    }
    
    // Check for patterns
    const messages = await this.getRecentMessages(userId, supabase)
    if (this.patternAnalyzer.detectSpamPattern(messages)) {
      await this.recordViolation(userId, 'spam', 'Spam pattern detected', 'high')
    }
  }
  
  /**
   * Get user's abuse profile
   */
  async getUserProfile(userId: string): Promise<UserAbuseProfile> {
    // Check cache first
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!
    }
    
    const supabase = await createClient()
    
    // Load from database
    const { data: logs } = await supabase
      .from('abuse_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100)
    
    const { data: restriction } = await supabase
      .from('user_restrictions')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    // Build profile from logs
    const profile: UserAbuseProfile = {
      userId,
      violations: [],
      totalViolations: logs?.length || 0,
      restrictionLevel: restriction?.restriction_level || 'none',
      lastReviewDate: new Date(),
      suspensionEndsAt: restriction?.suspension_ends_at ? 
        new Date(restriction.suspension_ends_at) : undefined,
      notes: restriction?.notes || []
    }
    
    // Group violations by type
    if (logs) {
      const violationMap = new Map<string, AbusePattern>()
      
      for (const log of logs) {
        const type = log.violation_type as AbusePattern['type']
        if (!violationMap.has(type)) {
          violationMap.set(type, {
            type,
            severity: log.severity,
            count: 0,
            firstOccurrence: new Date(log.timestamp),
            lastOccurrence: new Date(log.timestamp),
            messages: []
          })
        }
        
        const pattern = violationMap.get(type)!
        pattern.count++
        pattern.lastOccurrence = new Date(log.timestamp)
        pattern.severity = this.getHigherSeverity(pattern.severity, log.severity)
      }
      
      profile.violations = Array.from(violationMap.values())
    }
    
    // Cache the profile
    this.userProfiles.set(userId, profile)
    
    return profile
  }
  
  /**
   * Calculate restriction level based on violations
   */
  private async calculateRestriction(
    profile: UserAbuseProfile,
    supabase: SupabaseClient
  ): Promise<UserAbuseProfile['restrictionLevel']> {
    const now = Date.now()
    
    // Count critical violations
    const criticalCount = profile.violations
      .filter(v => v.severity === 'critical')
      .reduce((sum, v) => sum + v.count, 0)
    
    // Check for immediate suspension (critical violations)
    if (criticalCount >= RESTRICTION_THRESHOLDS.suspended.criticalViolations) {
      return 'suspended'
    }
    
    // Count recent violations (last 7 days)
    const sevenDaysAgo = now - RESTRICTION_THRESHOLDS.limited.timeWindow
    const recentViolations = profile.violations
      .filter(v => v.lastOccurrence.getTime() > sevenDaysAgo)
      .reduce((sum, v) => sum + v.count, 0)
    
    // Check for suspension (10+ violations in 7 days)
    if (recentViolations >= RESTRICTION_THRESHOLDS.suspended.minViolations) {
      return 'suspended'
    }
    
    // Check for limited access (5+ violations in 7 days)
    if (recentViolations >= RESTRICTION_THRESHOLDS.limited.minViolations) {
      return 'limited'
    }
    
    // Count violations in last 24 hours
    const oneDayAgo = now - RESTRICTION_THRESHOLDS.warning.timeWindow
    const dailyViolations = profile.violations
      .filter(v => v.lastOccurrence.getTime() > oneDayAgo)
      .reduce((sum, v) => sum + v.count, 0)
    
    // Check for warning (3+ violations in 24 hours)
    if (dailyViolations >= RESTRICTION_THRESHOLDS.warning.minViolations) {
      return 'warning'
    }
    
    // Check for escalation pattern
    if (this.patternAnalyzer.detectEscalation(profile)) {
      return 'warning'
    }
    
    return 'none'
  }
  
  /**
   * Update user restriction in database
   */
  private async updateUserRestriction(
    userId: string,
    profile: UserAbuseProfile,
    supabase: SupabaseClient
  ): Promise<void> {
    const suspensionEndsAt = profile.restrictionLevel === 'suspended' ?
      new Date(Date.now() + RESTRICTION_THRESHOLDS.suspended.duration) : null
    
    await supabase
      .from('user_restrictions')
      .upsert({
        user_id: userId,
        restriction_level: profile.restrictionLevel,
        violations_count: profile.totalViolations,
        last_violation: new Date().toISOString(),
        suspension_ends_at: suspensionEndsAt?.toISOString(),
        notes: profile.notes,
        updated_at: new Date().toISOString()
      })
  }
  
  /**
   * Alert admins about critical violations
   */
  private async alertAdmins(
    userId: string,
    violationType: string,
    severity: string,
    supabase: SupabaseClient
  ): Promise<void> {
    await supabase.from('admin_alerts').insert({
      type: 'abuse_detection',
      severity,
      user_id: userId,
      details: {
        userId,
        violationType,
        severity,
        timestamp: new Date().toISOString(),
        message: `User ${userId} has triggered a ${severity} ${violationType} violation`
      },
      requires_review: severity === 'critical'
    })
    
    console.warn(`[ADMIN ALERT] User ${userId}: ${severity} ${violationType} violation`)
  }
  
  /**
   * Clean old violations (30+ days old)
   */
  async cleanOldViolations(): Promise<void> {
    const supabase = await createClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    // Remove old minor violations
    await supabase
      .from('abuse_logs')
      .delete()
      .lt('timestamp', thirtyDaysAgo.toISOString())
      .in('severity', ['low', 'medium'])
    
    // Reset restriction levels if clean for 30 days
    await supabase
      .from('user_restrictions')
      .update({ 
        restriction_level: 'none',
        violations_count: 0 
      })
      .lt('last_violation', thirtyDaysAgo.toISOString())
      .neq('restriction_level', 'none')
    
    // Clear cached profiles for cleaned users
    this.userProfiles.clear()
  }
  
  /**
   * Lift expired suspension
   */
  private async liftSuspension(userId: string, supabase: SupabaseClient): Promise<void> {
    await supabase
      .from('user_restrictions')
      .update({
        restriction_level: 'warning',  // Downgrade to warning
        suspension_ends_at: null
      })
      .eq('user_id', userId)
    
    // Clear from cache
    this.userProfiles.delete(userId)
  }
  
  /**
   * Check cooldown for limited users
   */
  private checkCooldown(userId: string): { allowed: boolean; remainingSeconds: number } {
    const lastMessageTime = this.lastMessageTimes.get(userId) || 0
    const cooldownMs = RESTRICTION_THRESHOLDS.limited.restrictions.cooldownMinutes * 60 * 1000
    const timeSinceLastMessage = Date.now() - lastMessageTime
    
    if (timeSinceLastMessage < cooldownMs) {
      return {
        allowed: false,
        remainingSeconds: Math.ceil((cooldownMs - timeSinceLastMessage) / 1000)
      }
    }
    
    // Update last message time
    this.lastMessageTimes.set(userId, Date.now())
    
    return { allowed: true, remainingSeconds: 0 }
  }
  
  /**
   * Get hourly message count for rate limiting
   */
  private async getHourlyMessageCount(userId: string, supabase: SupabaseClient): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', oneHourAgo.toISOString())
    
    return count || 0
  }
  
  /**
   * Get recent messages for pattern analysis
   */
  private async getRecentMessages(
    userId: string, 
    supabase: SupabaseClient
  ): Promise<{ content: string; timestamp: Date }[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const { data } = await supabase
      .from('conversations')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', fiveMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    return (data || []).map(m => ({
      content: m.content,
      timestamp: new Date(m.created_at)
    }))
  }
  
  /**
   * Helper: Hash content for privacy
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }
  
  /**
   * Helper: Sanitize content for storage
   */
  private sanitizeContent(content: string): string {
    // Remove PII and truncate
    let sanitized = content
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 97) + '...'
    }
    
    return sanitized
  }
  
  /**
   * Helper: Get higher severity level
   */
  private getHigherSeverity(
    current: AbusePattern['severity'],
    new_: AbusePattern['severity']
  ): AbusePattern['severity'] {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 }
    return levels[new_] > levels[current] ? new_ : current
  }
}

// Singleton instance
let detectorInstance: AbuseDetector | null = null

export function getAbuseDetector(): AbuseDetector {
  if (!detectorInstance) {
    detectorInstance = new AbuseDetector()
  }
  return detectorInstance
}

// PatternAnalyzer is already exported at the top of the file