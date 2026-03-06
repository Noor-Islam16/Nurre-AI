import { consentManager } from '@/lib/privacy/consent-manager';

export enum EventType {
  // Page events
  PAGE_VIEW = 'page_view',
  PAGE_EXIT = 'page_exit',
  
  // Task events
  TASK_CREATE = 'task_create',
  TASK_UPDATE = 'task_update',
  TASK_COMPLETE = 'task_complete',
  TASK_DELETE = 'task_delete',
  
  // Focus events
  FOCUS_START = 'focus_start',
  FOCUS_PAUSE = 'focus_pause',
  FOCUS_RESUME = 'focus_resume',
  FOCUS_END = 'focus_end',
  FOCUS_INTERRUPT = 'focus_interrupt',
  
  // User behavior
  IDLE_DETECTED = 'idle_detected',
  TAB_SWITCH = 'tab_switch',
  RAPID_CLICKING = 'rapid_clicking',
  TEXT_DELETION = 'text_deletion',
  SCROLL_PATTERN = 'scroll_pattern',
  
  // Mood events
  MOOD_CHECK = 'mood_check',
  
  // AI events
  AI_MESSAGE = 'ai_message',
  AI_INTERVENTION = 'ai_intervention',
  AI_TOOL_EXECUTION = 'ai_tool_execution',
  AI_ERROR = 'ai_error',
  INTERVENTION_ACCEPTED = 'intervention_accepted',
  INTERVENTION_DISMISSED = 'intervention_dismissed',
  
  // AI Brain events
  AI_BRAIN_START = 'ai_brain_start',
  AI_BRAIN_STOP = 'ai_brain_stop',
  AI_BRAIN_ERROR = 'ai_brain_error',
  INTERVENTION_ENGINE_INIT = 'intervention_engine_init',
  INTERVENTION_RESPONSE = 'intervention_response',
  MANUAL_INTERVENTION = 'manual_intervention',
  
  // Additional events
  REMINDER_CREATE = 'reminder_create',
  REMINDER_DELIVERED = 'reminder_delivered',
  BACKGROUND_NOISE_START = 'background_noise_start',
  BACKGROUND_NOISE_STOP = 'background_noise_stop',
  
  // Pattern events
  PATTERN_DETECTED = 'pattern_detected',
  PATTERN_PREDICTED = 'pattern_predicted',
  PATTERN_OCCURRED = 'pattern_occurred',
  PATTERN_PREVENTED = 'pattern_prevented',

  // Vector pipeline events
  VECTOR_EMBEDDING_SUCCESS = 'vector_embedding_success',
  VECTOR_EMBEDDING_FAILURE = 'vector_embedding_failure',
  VECTOR_PIPELINE_PAUSED = 'vector_pipeline_paused',

  // Coaching portal events (M5 Phase 5)
  BOOKING_STARTED = 'booking_started',
  BOOKING_RETURNED = 'booking_returned',
  CLAIM_CODE_GENERATED = 'claim_code_generated',
  CLAIM_CODE_REDEEMED = 'claim_code_redeemed',
  CLAIM_CODE_FAILED = 'claim_code_failed',
  CLAIM_CODE_LIMIT_REACHED = 'claim_code_limit_reached',

  // Music events (M5 Phase 5)
  MUSIC_PLAY_START = 'music_play_start',
  MUSIC_PLAY_COMPLETE = 'music_play_complete',
}

export interface TrackingEvent {
  type: EventType
  data?: any
  timestamp?: number
}

export interface UserEvent {
  type: EventType
  timestamp: Date
  metadata?: any
}

class EventTracker {
  private queue: TrackingEvent[] = []
  private userId: string | null = null
  private idleTimer: NodeJS.Timeout | null = null
  private lastActivity: number = Date.now()
  private isInitialized = false
  private pendingEvents: TrackingEvent[] = []
  private processQueueTimer: NodeJS.Timeout | null = null
  private failureCount = 0
  private resetIdleTimer: (() => void) | null = null
  private clickHandler: (() => void) | null = null
  private visibilityHandler: (() => void) | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private listeners: Map<string, EventListener> = new Map()
  private timers: Set<NodeJS.Timeout> = new Set()
  
  // Memory management limits
  private readonly maxQueueSize = 100
  private readonly maxPendingEvents = 50
  private readonly maxFailedEvents = 50
  private readonly maxLocalStorageSize = 1024 * 50 // 50KB limit
  
  initialize(userId: string) {
    if (this.isInitialized) return
    
    this.userId = userId
    this.isInitialized = true
    
    // Process any pending events that were tracked before initialization
    if (this.pendingEvents.length > 0) {
      // Limit pending events before processing
      const eventsToProcess = this.pendingEvents.slice(-this.maxPendingEvents)
      this.queue.push(...eventsToProcess)
      this.pendingEvents = []
      this.processQueue()
    }
    
    // Now safe to setup listeners
    this.setupIdleDetection()
    this.setupVisibilityTracking()
    this.setupActivityTracking()
    this.setupCleanupInterval()
    this.setupPageUnloadHandler()
  }
  
  track(type: EventType, data?: any) {
    // Check for analytics consent before tracking
    if (!consentManager.hasConsentFor('analytics')) {
      // Queue the event in case consent is granted later
      consentManager.queueEvent(() => {
        this.track(type, data);
      });
      return;
    }

    const event: TrackingEvent = {
      type,
      data,
      timestamp: Date.now()
    }
    
    // If not initialized yet, store events for later
    if (!this.isInitialized || !this.userId) {
      // Limit pending events
      if (this.pendingEvents.length >= this.maxPendingEvents) {
        this.pendingEvents.shift() // Remove oldest
      }
      this.pendingEvents.push(event)
      return
    }
    
    // Limit queue size
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift() // Remove oldest
    }
    
    this.queue.push(event)
    this.processQueue()
  }
  
  private setupIdleDetection() {
    const IDLE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
    
    this.resetIdleTimer = () => {
      this.lastActivity = Date.now()
      
      if (this.idleTimer) {
        clearTimeout(this.idleTimer)
      }
      
      this.idleTimer = setTimeout(() => {
        if (this.isInitialized) {
          this.track(EventType.IDLE_DETECTED, {
            idleTime: Date.now() - this.lastActivity
          })
        }
      }, IDLE_THRESHOLD)
    }
    
    // Track mouse and keyboard activity
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.resetIdleTimer)
      window.addEventListener('keypress', this.resetIdleTimer)
      window.addEventListener('click', this.resetIdleTimer)
      window.addEventListener('scroll', this.resetIdleTimer)
      
      // Start the idle timer
      this.resetIdleTimer()
    }
  }
  
  private setupVisibilityTracking() {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        // Only track if initialized
        if (!this.isInitialized) return
        
        if (document.hidden) {
          this.track(EventType.TAB_SWITCH, { action: 'leave' })
        } else {
          this.track(EventType.TAB_SWITCH, { action: 'return' })
        }
      }
      
      // Delay setup to ensure initialization
      const setupListener = () => {
        if (this.visibilityHandler) {
          document.addEventListener('visibilitychange', this.visibilityHandler)
        }
      }
      
      // Setup after a small delay to ensure initialization
      if (document.readyState === 'complete') {
        setupListener()
      } else {
        window.addEventListener('load', setupListener)
      }
    }
  }
  
  private setupActivityTracking() {
    if (typeof window !== 'undefined') {
      // Track rapid clicking (frustration indicator)
      let clickCount = 0
      let clickTimer: NodeJS.Timeout | null = null
      
      this.clickHandler = () => {
        if (!this.isInitialized) return
        
        clickCount++
        
        if (!clickTimer) {
          clickTimer = setTimeout(() => {
            if (clickCount > 5 && this.isInitialized) {
              this.track(EventType.RAPID_CLICKING, { count: clickCount })
            }
            clickCount = 0
            clickTimer = null
          }, 2000)
        }
      }
      
      window.addEventListener('click', this.clickHandler)
    }
  }
  
  private async processQueue() {
    // Guard conditions
    if (!this.isInitialized || !this.userId) {
      // Store events for later if not initialized
      if (this.queue.length > 0) {
        this.pendingEvents.push(...this.queue)
        this.queue = []
      }
      return
    }
    
    if (this.queue.length === 0) return
    
    // Debounce processing to batch events
    if (this.processQueueTimer) {
      clearTimeout(this.processQueueTimer)
    }
    
    this.processQueueTimer = setTimeout(async () => {
      const events = [...this.queue]
      this.queue = []
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        // Transform events to match API schema
        const apiEvents = events.map(event => ({
          type: event.type,
          metadata: event.data || {},
          timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString()
        }))
        
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: apiEvents }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok && response.status !== 204) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        // Reset failure count on success
        this.failureCount = 0
      } catch (error) {
        // Silently fail for network errors in production
        if (process.env.NODE_ENV === 'development') {
          console.warn('EventTracker: Failed to send events', error)
        }
        
        // Implement exponential backoff for retries
        this.handleFailedEvents(events)
      }
    }, 100) // Batch events within 100ms window
  }
  
  private handleFailedEvents(events: TrackingEvent[]) {
    // Don't re-queue if too many failures
    if (this.failureCount > 3) {
      // Store in localStorage as fallback
      this.storeFailedEventsLocally(events)
      return
    }
    
    // Re-queue with exponential backoff
    setTimeout(() => {
      this.queue.unshift(...events)
      this.processQueue()
    }, Math.min(1000 * Math.pow(2, this.failureCount), 30000))
    
    this.failureCount++
  }
  
  private storeFailedEventsLocally(events: TrackingEvent[]) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const existingEvents = JSON.parse(
          localStorage.getItem('failed_tracking_events') || '[]'
        )
        let updatedEvents = [...existingEvents, ...events].slice(-this.maxFailedEvents)
        
        // Check localStorage size
        const size = new Blob([JSON.stringify(updatedEvents)]).size
        if (size > this.maxLocalStorageSize) {
          // Keep only recent events if size is too large
          updatedEvents = updatedEvents.slice(-20)
        }
        
        localStorage.setItem('failed_tracking_events', JSON.stringify(updatedEvents))
      } catch (e) {
        // Clear if corrupted or full
        try {
          localStorage.removeItem('failed_tracking_events')
        } catch {}
      }
    }
  }
  
  private setupCleanupInterval() {
    // Cleanup old data periodically, but only when user is active
    if (typeof window !== 'undefined') {
      // Import activity monitor dynamically
      import('@/lib/utils/activity-monitor').then(({ ActivityMonitor }) => {
        const monitor = ActivityMonitor.getInstance()
        
        const startCleanup = () => {
          if (this.cleanupInterval) return
          
          this.cleanupInterval = setInterval(() => {
            // Only cleanup when user is active
            if (monitor.isUserActive()) {
              this.cleanupOldData()
            }
          }, 5 * 60 * 1000) // Every 5 minutes
          
          this.timers.add(this.cleanupInterval)
        }
        
        const stopCleanup = () => {
          if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
            this.timers.delete(this.cleanupInterval)
            this.cleanupInterval = null
          }
        }
        
        // Subscribe to activity changes
        monitor.subscribe((status) => {
          if (status === 'active') {
            startCleanup()
          } else {
            stopCleanup()
          }
        })
        
        // Start if initially active
        if (monitor.isUserActive()) {
          startCleanup()
        }
      })
    }
  }
  
  private cleanupOldData() {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    // Clean failed events older than 24 hours
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('failed_tracking_events')
        if (stored) {
          const events = JSON.parse(stored)
          const filtered = events.filter((e: any) => 
            now - new Date(e.timestamp).getTime() < maxAge
          )
          
          if (filtered.length < events.length) {
            localStorage.setItem('failed_tracking_events', JSON.stringify(filtered))
          }
        }
      } catch (error) {
        console.error('Cleanup error:', error)
        try {
          localStorage.removeItem('failed_tracking_events')
        } catch {}
      }
    }
    
    // Clean event queue if it's getting too large
    if (this.queue.length > this.maxQueueSize / 2) {
      this.queue = this.queue.slice(-this.maxQueueSize / 2)
    }
  }
  
  private setupPageUnloadHandler() {
    const cleanup = () => {
      this.cleanup()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', cleanup)
      window.addEventListener('pagehide', cleanup)
      this.listeners.set('beforeunload', cleanup as EventListener)
      this.listeners.set('pagehide', cleanup as EventListener)
    }
  }
  
  cleanup() {
    // Clear all timers
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    if (this.processQueueTimer) {
      clearTimeout(this.processQueueTimer)
      this.processQueueTimer = null
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    // Clear all tracked timers
    this.timers.forEach(timer => {
      clearTimeout(timer)
      clearInterval(timer)
    })
    this.timers.clear()
    
    // Remove all tracked event listeners
    this.listeners.forEach((handler, event) => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(event, handler)
      }
    })
    this.listeners.clear()
    
    // Remove specific event listeners
    if (typeof window !== 'undefined') {
      if (this.resetIdleTimer) {
        window.removeEventListener('mousemove', this.resetIdleTimer)
        window.removeEventListener('keypress', this.resetIdleTimer)
        window.removeEventListener('click', this.resetIdleTimer)
        window.removeEventListener('scroll', this.resetIdleTimer)
      }
      if (this.clickHandler) {
        window.removeEventListener('click', this.clickHandler)
      }
    }
    
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
    }
    
    // Reset state
    this.isInitialized = false
    this.userId = null
    this.queue = []
    this.pendingEvents = []
    this.failureCount = 0
  }
}

export const eventTracker = new EventTracker()
