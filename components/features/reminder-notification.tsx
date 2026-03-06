'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Clock, X, ChevronRight, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Reminder {
  reminderId: string
  message: string
  priority?: number
  taskId?: string
  notificationType: string
  style?: 'gentle' | 'direct' | 'celebratory' | 'urgent' | 'default'
  actions: Array<{
    label: string
    action: string
    duration?: number
    target?: string
    toolCall?: string
    href?: string
  }>
  metadata?: {
    source?: string
    autoHide?: number
    showConfetti?: boolean
  }
}

/**
 * Handles reminder notifications from the AI assistant
 * Shows ADHD-friendly reminders with snooze and action options
 */
export function ReminderNotification() {
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const handleReminder = (event: CustomEvent) => {
      const reminder = event.detail
      setReminder(reminder)
      setIsVisible(true)

      // Trigger confetti for celebratory style
      if (reminder.style === 'celebratory' || reminder.metadata?.showConfetti) {
        window.dispatchEvent(new CustomEvent('achievement-unlocked', {
          detail: {
            title: 'Great job!',
            description: reminder.message,
            icon: '🎉',
            type: 'confetti'
          }
        }))
      }

      // Calculate auto-hide duration
      let autoHideDuration = 30000 // Default 30 seconds
      
      if (reminder.metadata?.autoHide !== undefined) {
        autoHideDuration = reminder.metadata.autoHide
      } else if (reminder.style) {
        // Style-based auto-hide
        switch (reminder.style) {
          case 'celebratory':
            autoHideDuration = 8000
            break
          case 'gentle':
            autoHideDuration = 10000
            break
          case 'direct':
            autoHideDuration = 15000
            break
          case 'urgent':
            autoHideDuration = 0 // Don't auto-hide
            break
        }
      } else if ((reminder.priority ?? 1) >= 3) {
        autoHideDuration = 0 // Don't auto-hide urgent
      }

      // Set auto-dismiss timer if needed
      if (autoHideDuration > 0) {
        setTimeout(() => {
          setIsVisible(false)
        }, autoHideDuration)
      }
    }

    window.addEventListener('show-reminder', handleReminder as EventListener)

    return () => {
      window.removeEventListener('show-reminder', handleReminder as EventListener)
    }
  }, [])

  const handleAction = async (action: any) => {
    if (!reminder) return

    // Tool calls from planner are no longer supported (planner removed)
    // Tools should be executed through voice or chat AI instead
    if (action.toolCall) {
      console.warn('Tool calls from notifications are deprecated. Use voice or chat AI instead.')
      setIsVisible(false)
      return
    }

    // Handle href navigation
    if (action.href) {
      router.push(action.href)
      setIsVisible(false)
      return
    }

    switch (action.action) {
      case 'snooze':
        // Snooze the reminder
        const snoozeUntil = new Date(Date.now() + action.duration * 60 * 1000)
        
        // First get current reminder from events
        const { data: currentReminder } = await supabase
          .from('events')
          .select('*')
          .eq('id', reminder.reminderId)
          .in('type', ['reminder', 'reminder_scheduled'])
          .single()
        
        if (currentReminder) {
          await supabase
            .from('events')
            .update({
              data: {
                ...currentReminder.data,
                status: 'snoozed',
                snoozed_until: snoozeUntil.toISOString(),
                snooze_count: (currentReminder.data?.snooze_count || 0) + 1
              }
            })
            .eq('id', reminder.reminderId)
        }

        // Schedule re-show
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('show-reminder', { detail: reminder }))
        }, action.duration * 60 * 1000)
        break

      case 'dismiss':
        // Dismiss the reminder in events table
        const { data: reminderToUpdate } = await supabase
          .from('events')
          .select('*')
          .eq('id', reminder.reminderId)
          .in('type', ['reminder', 'reminder_scheduled'])
          .single()
        
        if (reminderToUpdate) {
          await supabase
            .from('events')
            .update({
              data: {
                ...reminderToUpdate.data,
                status: 'dismissed',
                dismissed_at: new Date().toISOString()
              }
            })
            .eq('id', reminder.reminderId)
        }
        break

      case 'navigate':
        // Navigate to task
        if (action.target === 'task' && reminder.taskId) {
          router.push(`/planner?task=${reminder.taskId}`)
        }
        break
    }

    setIsVisible(false)
  }

  const getStyleConfig = (style?: string, priority?: number) => {
    // Use style if provided (for planner messages)
    if (style && style !== 'default') {
      switch (style) {
        case 'gentle':
          return {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-700',
            text: 'text-blue-900 dark:text-blue-100',
            icon: '💙',
            className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-100'
          }
        case 'direct':
          return {
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            border: 'border-yellow-200 dark:border-yellow-700', 
            text: 'text-yellow-900 dark:text-yellow-100',
            icon: '👋',
            className: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-100'
          }
        case 'celebratory':
          return {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-700',
            text: 'text-green-900 dark:text-green-100',
            icon: '🎉',
            showConfetti: true,
            className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-700 dark:text-green-100'
          }
        case 'urgent':
          return {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-700',
            text: 'text-red-900 dark:text-red-100',
            icon: '⚠️',
            className: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-700 dark:text-red-100'
          }
      }
    }
    
    // Fall back to priority-based styles
    switch (priority) {
      case 3: // Urgent
        return { className: 'bg-red-500 border-red-600 text-white' }
      case 2: // Moderate
        return { className: 'bg-yellow-500 border-yellow-600 text-white' }
      default: // Gentle
        return { className: 'bg-blue-500 border-blue-600 text-white' }
    }
  }

  const getNotificationIcon = (style?: string, type?: string) => {
    // Use style icon if available
    const styleConfig = style ? getStyleConfig(style) : null
    if (styleConfig?.icon) {
      return <span className="text-xl">{styleConfig.icon}</span>
    }
    
    // Fall back to type-based icons
    switch (type) {
      case 'urgent':
      case 'critical':
        return <Bell className="w-5 h-5 animate-pulse" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  if (!reminder) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={cn(
            "fixed top-4 right-4 z-50 max-w-md",
            "shadow-lg rounded-lg border-2",
            getStyleConfig(reminder.style, reminder.priority).className
          )}
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getNotificationIcon(reminder.style, reminder.notificationType)}
                <span className="font-semibold">
                  {reminder.metadata?.source === 'planner' ? 'AI Coach' : 'Reminder'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Message */}
            <p className="text-sm mb-4 leading-relaxed">
              {reminder.message}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {reminder.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAction(action)}
                  className="bg-white/20 hover:bg-white/30"
                >
                  {action.action === 'snooze' && <Timer className="w-3 h-3 mr-1" />}
                  {action.action === 'navigate' && <ChevronRight className="w-3 h-3 mr-1" />}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Progress bar for auto-dismiss */}
          {(() => {
            let duration = 30
            let shouldShow = (reminder.priority ?? 1) < 2
            
            // Calculate duration based on style
            if (reminder.style) {
              switch (reminder.style) {
                case 'celebratory':
                  duration = 8
                  shouldShow = true
                  break
                case 'gentle':
                  duration = 10
                  shouldShow = true
                  break
                case 'direct':
                  duration = 15
                  shouldShow = true
                  break
                case 'urgent':
                  shouldShow = false
                  break
              }
            }
            
            // Override with metadata if provided
            if (reminder.metadata?.autoHide !== undefined) {
              duration = reminder.metadata.autoHide / 1000
              shouldShow = reminder.metadata.autoHide > 0
            }
            
            return shouldShow ? (
              <motion.div
                className="h-1 bg-white/30"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration, ease: 'linear' }}
              />
            ) : null
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}