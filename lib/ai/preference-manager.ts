import { clientPreferences } from '@/lib/preferences/client-preferences'
import type { Preferences } from '@/lib/schemas/preferences'
import { usePreferenceStore } from '@/store/preference-store'
// import { AIResponse } from './types/ai-response.types'

// Temporary type until ai-response.types is created
type AIResponse = any

// Legacy types for compatibility (can be removed later)
type ToolPermissions = any
type InterventionType = any

/**
 * PreferenceManager handles the application and validation of user preferences
 * for AI behavior, tool usage, and interventions
 */
export class PreferenceManager {
  private static instance: PreferenceManager

  private constructor() {}

  static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager()
    }
    return PreferenceManager.instance
  }

  /**
   * Get effective preferences from database
   */
  async getEffectivePreferences(userId: string): Promise<Preferences | null> {
    return await clientPreferences.getPreferences(userId)
  }

  /**
   * Check if a specific tool can be used
   */
  canUseTool(toolName: keyof ToolPermissions): boolean {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    const toolPermission = (preferences.tools as any)[toolName]
    
    if (!toolPermission?.enabled) {
      return false
    }

    // Check daily usage limits if set
    if (toolPermission.maxUsagePerDay) {
      const usageToday = this.getToolUsageToday(toolName)
      if (usageToday >= toolPermission.maxUsagePerDay) {
        return false
      }
    }

    return true
  }

  /**
   * Check if confirmation is required for a tool
   */
  requiresConfirmation(toolName: keyof ToolPermissions): boolean {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    const toolPermission = (preferences.tools as any)[toolName]
    
    // Global confirmation requirement overrides individual settings
    if (preferences.automation.requireConfirmation) {
      return true
    }

    return toolPermission?.requireConfirmation ?? false
  }

  /**
   * Validate tool parameters against allowed parameters
   */
  validateToolParameters(
    toolName: keyof ToolPermissions, 
    parameters: Record<string, any>
  ): boolean {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    const toolPermission = (preferences.tools as any)[toolName]
    
    if (!toolPermission?.allowedParameters) {
      return true // No restrictions
    }

    // Check if all parameters are within allowed values
    for (const [key, value] of Object.entries(parameters)) {
      const allowed = toolPermission.allowedParameters[key]
      if (allowed !== undefined) {
        if (Array.isArray(allowed) && !allowed.includes(value)) {
          return false
        }
        if (typeof allowed === 'object' && allowed.min !== undefined && allowed.max !== undefined) {
          if (value < allowed.min || value > allowed.max) {
            return false
          }
        }
      }
    }

    return true
  }

  /**
   * Check if interventions are currently allowed
   */
  async canIntervene(type?: InterventionType): Promise<boolean> {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    // Check if interventions are enabled
    if (!preferences.intervention.enabled) {
      return false
    }

    // Check quiet hours  
    // Use dummy user id since we don't have access to it here
    const inQuietHours = await this.isWithinQuietHours('current-user')
    if (inQuietHours) {
      return false
    }

    // Check if specific intervention type is allowed
    if (type && !preferences.intervention.allowedTypes.includes(type)) {
      return false
    }

    // Check cooldown period
    const cooldownPassed = await this.hasCooldownPassed('current-user')
    if (!cooldownPassed) {
      return false
    }

    return true
  }

  /**
   * Check if currently within quiet hours
   */
  async isWithinQuietHours(userId: string): Promise<boolean> {
    return await clientPreferences.isQuietHours(userId)
  }

  /**
   * Check if cooldown period has passed since last intervention
   */
  async hasCooldownPassed(userId: string): Promise<boolean> {
    const preferences = await this.getEffectivePreferences(userId)
    const lastIntervention = this.getLastInterventionTime()
    
    if (!lastIntervention || !preferences) {
      return true
    }

    const cooldownMs = preferences.intervention_cooldown * 60 * 1000
    return Date.now() - lastIntervention.getTime() >= cooldownMs
  }

  /**
   * Apply preferences to AI response context
   */
  applyToAIContext(context: any): any {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    return {
      ...context,
      automation_level: preferences.automation.level,
      personality: preferences.communication.personality,
      message_length: preferences.communication.messageLength,
      use_emoji: preferences.communication.useEmoji,
      technical_level: preferences.communication.technicalLevel,
      adhd_profile: preferences.adhdProfile,
      allowed_tools: Object.entries(preferences.tools)
        .filter(([_, permission]) => permission.enabled)
        .map(([tool]) => tool),
      require_confirmation: preferences.automation.requireConfirmation
    }
  }

  /**
   * Filter AI response tools based on preferences
   */
  filterResponseTools(response: AIResponse): AIResponse {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    const filteredTools: Record<string, any> = {}

    for (const [toolName, toolConfig] of Object.entries(response.tools)) {
      const toolKey = toolName as keyof ToolPermissions
      
      // Check if tool is enabled
      if (!this.canUseTool(toolKey)) {
        continue
      }

      // Validate parameters if restrictions exist
      if (!this.validateToolParameters(toolKey, toolConfig as Record<string, any>)) {
        continue
      }

      // Add confirmation requirement if needed
      if (this.requiresConfirmation(toolKey)) {
        filteredTools[toolName] = {
          ...(toolConfig as Record<string, any>),
          requireConfirmation: true
        }
      } else {
        filteredTools[toolName] = toolConfig
      }
    }

    return {
      ...response,
      tools: filteredTools
    }
  }

  /**
   * Get intervention frequency delay in milliseconds
   */
  getInterventionDelay(): number {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    switch (preferences.intervention.frequency) {
      case 'rare':
        return 60 * 60 * 1000 // 1 hour
      case 'occasional':
        return 30 * 60 * 1000 // 30 minutes
      case 'regular':
        return 15 * 60 * 1000 // 15 minutes
      case 'frequent':
        return 5 * 60 * 1000  // 5 minutes
      default:
        return 30 * 60 * 1000 // Default 30 minutes
    }
  }

  /**
   * Check if automation level allows a specific action
   */
  canAutomate(action: 'task_creation' | 'focus_start' | 'mood_submission'): boolean {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    switch (preferences.automation.level) {
      case 'minimal':
        return false
      case 'balanced':
        return false // Balanced suggests but doesn't automate
      case 'proactive':
        switch (action) {
          case 'task_creation':
            return preferences.automation.allowAutoTaskCreation
          case 'focus_start':
            return preferences.automation.allowAutoFocusStart
          case 'mood_submission':
            return preferences.automation.allowAutoMoodSubmission
          default:
            return false
        }
      case 'maximum':
        return true // Maximum allows all automation
      default:
        return false
    }
  }

  /**
   * Format message based on communication preferences
   */
  formatMessage(message: string): string {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    // Remove emojis if not preferred
    if (!preferences.communication.useEmoji) {
      message = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '')
    }

    // Adjust message length based on preference
    if (preferences.communication.messageLength === 'concise' && message.length > 100) {
      // Truncate to first sentence or 100 chars
      const firstSentence = message.match(/^[^.!?]+[.!?]/)?.[0]
      message = firstSentence || message.substring(0, 100) + '...'
    }

    return message.trim()
  }

  /**
   * Get quick action suggestions based on current mode
   */
  getQuickActions(): string[] {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    switch (preferences.quickMode) {
      case 'focus':
        return ['Start focus timer', 'Break down current task', 'Minimize distractions']
      case 'help_me':
        return ['What should I do next?', 'I\'m stuck', 'Help me prioritize']
      case 'learning':
        return ['Explain this', 'Why did you suggest that?', 'Teach me about ADHD']
      default:
        return []
    }
  }

  /**
   * Record tool usage for daily limits
   */
  recordToolUsage(toolName: keyof ToolPermissions): void {
    const key = `tool_usage_${String(toolName)}_${new Date().toDateString()}`
    const current = parseInt(localStorage.getItem(key) || '0')
    localStorage.setItem(key, String(current + 1))
  }

  /**
   * Get tool usage count for today
   */
  private getToolUsageToday(toolName: keyof ToolPermissions): number {
    const key = `tool_usage_${String(toolName)}_${new Date().toDateString()}`
    return parseInt(localStorage.getItem(key) || '0')
  }

  /**
   * Record intervention time
   */
  recordIntervention(): void {
    localStorage.setItem('last_intervention', new Date().toISOString())
  }

  /**
   * Get last intervention time
   */
  private getLastInterventionTime(): Date | null {
    const lastTime = localStorage.getItem('last_intervention')
    return lastTime ? new Date(lastTime) : null
  }

  /**
   * Apply ADHD-specific adjustments
   */
  applyADHDOptimizations(context: any): any {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    
    if (preferences.adhdProfile === 'none' || preferences.adhdProfile === 'custom') {
      return context
    }

    const optimizations: Record<string, any> = {
      inattentive: {
        focus_duration: 15,
        break_frequency: 'frequent',
        reminder_style: 'persistent',
        task_breakdown: 'detailed'
      },
      hyperactive: {
        focus_duration: 20,
        break_frequency: 'regular',
        reminder_style: 'gentle',
        task_breakdown: 'moderate'
      },
      combined: {
        focus_duration: 15,
        break_frequency: 'frequent',
        reminder_style: 'adaptive',
        task_breakdown: 'detailed'
      }
    }

    return {
      ...context,
      adhd_optimizations: optimizations[preferences.adhdProfile] || {}
    }
  }

  /**
   * Check if user needs onboarding for preferences
   */
  needsOnboarding(): boolean {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    return !preferences.presetName && preferences.adhdProfile === 'none'
  }

  /**
   * Get suggested preset based on user behavior
   */
  suggestPreset(userBehavior: {
    dismissalRate: number
    toolUsageRate: number
    interventionAcceptance: number
  }): string {
    if (userBehavior.dismissalRate > 0.7) {
      return 'cautious'
    }
    if (userBehavior.toolUsageRate > 0.8 && userBehavior.interventionAcceptance > 0.6) {
      return 'assistant'
    }
    if (userBehavior.interventionAcceptance > 0.5) {
      return 'adhd_friendly'
    }
    return 'balanced'
  }
}

// Export singleton instance
export const preferenceManager = PreferenceManager.getInstance()