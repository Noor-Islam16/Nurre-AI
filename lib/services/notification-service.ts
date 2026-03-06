import { createClient } from '@/lib/supabase/client'
import { queueEmbeddingJob } from '@/lib/ai/vector/enqueue-embedding-job'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Unified notification service for planner messages and interventions
 * Leverages existing notification components through event dispatching
 */

export interface NotificationAction {
  label: string
  toolCall?: string
  href?: string
  action?: string
  params?: any
}

export interface PlannerMessage {
  userId: string
  text: string
  style: 'gentle' | 'direct' | 'celebratory' | 'urgent'
  actions?: NotificationAction[]
  priority?: number
}

export class NotificationService {
  private static supabase: SupabaseClient = createClient()

  /**
   * Send a planner message as a notification
   * Uses the existing reminder system with enhanced styling
   */
  static async sendPlannerMessage(params: PlannerMessage) {
    try {
      // Map style to priority if not provided
      let priority = params.priority
      if (!priority) {
        switch (params.style) {
          case 'urgent':
            priority = 3
            break
          case 'direct':
            priority = 2
            break
          case 'celebratory':
          case 'gentle':
          default:
            priority = 1
        }
      }

      // Store in events table as reminder for persistence
      const { data, error } = await this.supabase
        .from('events')
        .insert({
          user_id: params.userId,
          type: 'reminder',
          data: {
            title: 'Nuree AI',
            description: params.text,
            priority,
            due_date: new Date().toISOString(), // Immediate
            status: 'pending',
            metadata: {
              source: 'planner',
              style: params.style,
              actions: params.actions,
              autoHide: this.getAutoHideDuration(params.style),
              showConfetti: params.style === 'celebratory'
            }
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create planner message:', error)
        return { success: false, error: error.message }
      }

      // Trigger notification display via event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('show-reminder', {
          detail: {
            reminderId: data.id,
            message: params.text,
            priority,
            style: params.style,
            notificationType: params.style === 'urgent' ? 'urgent' : 'normal',
            actions: this.formatActions(params.actions),
            metadata: {
              source: 'planner',
              autoHide: this.getAutoHideDuration(params.style),
              showConfetti: params.style === 'celebratory'
            }
          }
        }))
      }

      // Log the message for analytics
      await this.supabase
        .from('events')
        .insert({
          user_id: params.userId,
          type: 'planner_message',
          data: {
            style: params.style,
            hasActions: !!params.actions?.length,
            messageLength: params.text.length
          }
        })

      return { success: true, reminderId: data.id }

    } catch (error) {
      console.error('Failed to send planner message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Trigger an achievement celebration
   * Uses existing achievement notification component
   */
  static async triggerCelebration(params: {
    userId: string
    title: string
    message: string
    type?: 'confetti' | 'fireworks' | 'stars' | 'trophy' | 'checkmark'
    intensity?: 'subtle' | 'medium' | 'epic'
  }) {
    if (typeof window === 'undefined') return { success: false, error: 'Not in browser' }

    try {
      // Dispatch achievement event
      window.dispatchEvent(new CustomEvent('achievement-unlocked', {
        detail: {
          id: `celebration-${Date.now()}`,
          title: params.title,
          description: params.message,
          icon: '🎉',
          type: params.type || 'confetti',
          intensity: params.intensity || 'medium'
        }
      }))

      // Log celebration
      await this.supabase
        .from('events')
        .insert({
          user_id: params.userId,
          type: 'celebration_triggered',
          data: {
            title: params.title,
            type: params.type,
            source: 'planner'
          }
        })

      return { success: true }

    } catch (error) {
      console.error('Failed to trigger celebration:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Trigger an AI intervention
   * Uses existing intervention popup component
   */
  static async triggerIntervention(params: {
    userId: string
    message: string
    type: string
    priority?: number
    actions?: NotificationAction[]
  }) {
    if (typeof window === 'undefined') return { success: false, error: 'Not in browser' }

    try {
      // Store intervention as conversation with metadata
      const { data: intervention, error: interventionInsertError } = await this.supabase
        .from('conversations')
        .insert({
          user_id: params.userId,
          role: 'assistant',
          content: params.message,
          metadata: {
            intervention_type: params.type,
            intervention_accepted: false,
            priority: params.priority || 1,
            context: { source: 'planner' }
          }
        })
        .select()
        .single()

      if (interventionInsertError) {
        console.error('Failed to store planner intervention:', interventionInsertError)
      } else if (intervention?.id) {
        queueEmbeddingJob(intervention.id).catch((error) => {
          console.error('Failed to queue embedding job for planner intervention:', error)
        })
      }

      // Dispatch intervention event
      window.dispatchEvent(new CustomEvent('ai-intervention', {
        detail: {
          id: intervention?.id || `intervention-${Date.now()}`,
          message: params.message,
          type: params.type,
          priority: params.priority || 1,
          actions: params.actions || [],
          source: 'planner'
        }
      }))

      return { success: true, interventionId: intervention?.id }

    } catch (error) {
      console.error('Failed to trigger intervention:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  static async cancelReminder(reminderId: string, userId: string) {
    try {
      // Update the reminder status in events table
      const { data: reminder } = await this.supabase
        .from('events')
        .select('*')
        .eq('id', reminderId)
        .eq('user_id', userId)
        .in('type', ['reminder', 'reminder_scheduled'])
        .single()
      
      if (!reminder) {
        return { success: false, error: 'Reminder not found' }
      }

      const { error } = await this.supabase
        .from('events')
        .update({ 
          data: {
            ...reminder.data,
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          }
        })
        .eq('id', reminderId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get active reminders for a user
   */
  static async getActiveReminders(userId: string) {
    try {
      // Query reminders from events table
      const { data: events, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['reminder', 'reminder_scheduled'])
        .order('created_at', { ascending: false })
      
      // Filter for active reminders and transform to expected format
      const data = events?.filter(e => {
        const status = e.data?.status
        return status === 'pending' || status === 'scheduled' || status === 'snoozed'
      }).map(e => ({
        id: e.id,
        user_id: e.user_id,
        title: e.data?.title,
        description: e.data?.description,
        priority: e.data?.priority,
        due_date: e.data?.due_date,
        status: e.data?.status,
        metadata: e.data?.metadata,
        created_at: e.created_at
      })).sort((a, b) => {
        const dateA = new Date(a.due_date || a.created_at)
        const dateB = new Date(b.due_date || b.created_at)
        return dateA.getTime() - dateB.getTime()
      })

      if (error) {
        return { success: false, error: error.message, reminders: [] }
      }

      return { success: true, reminders: data || [] }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        reminders: []
      }
    }
  }

  /**
   * Helper: Get auto-hide duration based on style
   */
  private static getAutoHideDuration(style: string): number {
    switch (style) {
      case 'celebratory':
        return 8000
      case 'gentle':
        return 10000
      case 'direct':
        return 15000
      case 'urgent':
        return 0 // Don't auto-hide
      default:
        return 30000
    }
  }

  /**
   * Helper: Format actions for notification component
   */
  private static formatActions(actions?: NotificationAction[]): any[] {
    if (!actions) return []

    return actions.map(action => ({
      label: action.label,
      action: action.action || (action.toolCall ? 'tool' : action.href ? 'navigate' : 'custom'),
      toolCall: action.toolCall,
      href: action.href,
      params: action.params,
      target: action.href ? 'route' : undefined
    }))
  }

  /**
   * Helper: Set up Supabase client (for server-side usage)
   */
  static setSupabase(client: SupabaseClient) {
    this.supabase = client
  }
}
