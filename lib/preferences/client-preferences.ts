import { createClient } from '@/lib/supabase/client'
import type { Preferences } from '@/lib/schemas/preferences'

/**
 * Client-side preference fetcher for browser contexts
 * Used by client components that need preference data
 */
export class ClientPreferences {
  private cache: Map<string, { data: Preferences; expires: number }> = new Map()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get user preferences from database with caching
   */
  async getPreferences(userId: string): Promise<Preferences | null> {
    if (!userId) return null
    
    // Check cache first
    const cached = this.cache.get(userId)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    try {
      // Fetch from database using client supabase
      const supabase = createClient()
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return defaults
          return this.getDefaultPreferences(userId)
        }
        console.error('Error fetching preferences:', error)
        return this.getDefaultPreferences(userId)
      }

      if (!data) {
        return this.getDefaultPreferences(userId)
      }

      // Cache the result
      this.cache.set(userId, {
        data,
        expires: Date.now() + this.cacheTTL
      })

      return data
    } catch (error) {
      console.error('Error in getPreferences:', error)
      return this.getDefaultPreferences(userId)
    }
  }

  /**
   * Get default preferences for a user
   */
  getDefaultPreferences(userId: string): Preferences {
    return {
      id: `default-${userId}`,
      user_id: userId,
      quiet_hours: {
        start: "22:00",
        end: "08:00",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
      },
      theme: 'auto',
      focus_duration: 25,
      break_ratio: 0.20,
      notifications: true,
      ai_personality: 'balanced',
      intervention_cooldown: 15,
      max_interventions_per_hour: 6,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Check if current time is within user's quiet hours
   */
  async isQuietHours(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId)
    if (!prefs || !prefs.quiet_hours) return false
    
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]
    
    const { quiet_hours } = prefs
    
    // Check if today is included in quiet hours days
    if (!quiet_hours.days || !quiet_hours.days.includes(currentDay as any)) {
      return false
    }
    
    // Check time range
    const { start, end } = quiet_hours
    if (start <= end) {
      // Same day range (e.g., 09:00 to 17:00)
      return currentTime >= start && currentTime <= end
    } else {
      // Overnight range (e.g., 22:00 to 08:00)
      return currentTime >= start || currentTime <= end
    }
  }

  /**
   * Get milliseconds until quiet hours end
   */
  async msUntilQuietHoursEnd(userId: string): Promise<number> {
    const prefs = await this.getPreferences(userId)
    if (!prefs || !prefs.quiet_hours) return 0
    
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const { quiet_hours } = prefs
    
    // If not in quiet hours, return 0
    if (!(await this.isQuietHours(userId))) {
      return 0
    }
    
    // Calculate time until end
    const [endHour, endMin] = quiet_hours.end.split(':').map(Number)
    const endDate = new Date()
    endDate.setHours(endHour, endMin, 0, 0)
    
    // If end time is tomorrow (overnight range)
    if (quiet_hours.start > quiet_hours.end && currentTime >= quiet_hours.start) {
      endDate.setDate(endDate.getDate() + 1)
    }
    
    return Math.max(0, endDate.getTime() - now.getTime())
  }

  /**
   * Get intervention cooldown in milliseconds
   */
  async getInterventionCooldown(userId: string): Promise<number> {
    const prefs = await this.getPreferences(userId)
    return (prefs?.intervention_cooldown || 15) * 60 * 1000
  }

  /**
   * Get max interventions per hour
   */
  async getMaxInterventionsPerHour(userId: string): Promise<number> {
    const prefs = await this.getPreferences(userId)
    return prefs?.max_interventions_per_hour || 6
  }

  /**
   * Get AI personality setting
   */
  async getAIPersonality(userId: string): Promise<string> {
    const prefs = await this.getPreferences(userId)
    return prefs?.ai_personality || 'balanced'
  }

  /**
   * Get focus duration default
   */
  async getFocusDuration(userId: string): Promise<number> {
    const prefs = await this.getPreferences(userId)
    return prefs?.focus_duration || 25
  }

  /**
   * Clear cache for a specific user or all users
   */
  clearCache(userId?: string) {
    if (userId) {
      this.cache.delete(userId)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Clear cache when preferences are updated
   * Call this from the preferences API when updates occur
   */
  onPreferencesUpdated(userId: string) {
    this.clearCache(userId)
  }
}

// Export singleton instance
export const clientPreferences = new ClientPreferences()