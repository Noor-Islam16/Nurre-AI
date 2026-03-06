/**
 * Activity Monitor - Detects user activity and browser visibility
 * Prevents API calls when user is inactive or browser is not visible
 */

export type ActivityStatus = 'active' | 'idle' | 'hidden'

interface ActivityListener {
  (status: ActivityStatus): void
}

export class ActivityMonitor {
  private static instance: ActivityMonitor | null = null
  private isActive = true
  private lastUserActivity = Date.now()
  private visibility: DocumentVisibilityState = 'visible'
  private listeners: Set<ActivityListener> = new Set()
  private checkInterval: NodeJS.Timeout | null = null
  
  // Configurable thresholds
  private readonly IDLE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
  private readonly CHECK_INTERVAL = 30 * 1000 // Check every 30 seconds
  
  private constructor() {
    if (typeof document === 'undefined') return
    
    this.setupEventListeners()
    this.startActivityCheck()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): ActivityMonitor {
    if (typeof window === 'undefined') {
      // Return a mock for SSR - use 'as any' to avoid complex type issues
      return {
        isUserActive: () => true,
        getStatus: () => 'active' as ActivityStatus,
        subscribe: () => () => {},
        destroy: () => {},
        getTimeSinceActivity: () => 0
      } as any
    }
    
    if (!this.instance) {
      this.instance = new ActivityMonitor()
    }
    return this.instance
  }
  
  /**
   * Setup event listeners for user activity and visibility
   */
  private setupEventListeners() {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.visibility = document.visibilityState
      this.onActivityChange()
    })
    
    // User activity events (with passive flag for performance)
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ]
    
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity()
      }, { passive: true, capture: true })
    })
    
    // Window focus events
    window.addEventListener('focus', () => {
      this.updateActivity()
    })
    
    window.addEventListener('blur', () => {
      // Don't immediately mark as inactive, just note the blur
      this.onActivityChange()
    })
  }
  
  /**
   * Update last activity timestamp
   */
  private updateActivity() {
    const wasInactive = !this.isUserActive()
    this.lastUserActivity = Date.now()
    
    // If transitioning from inactive to active, notify
    if (wasInactive && this.isUserActive()) {
      console.log('[ActivityMonitor] User became active')
      this.onActivityChange()
    }
  }
  
  /**
   * Start periodic activity check
   */
  private startActivityCheck() {
    if (this.checkInterval) return
    
    this.checkInterval = setInterval(() => {
      this.checkInactivity()
    }, this.CHECK_INTERVAL)
  }
  
  /**
   * Check for inactivity
   */
  private checkInactivity() {
    const wasActive = this.isActive
    this.isActive = this.isUserActive()
    
    if (wasActive !== this.isActive) {
      console.log(`[ActivityMonitor] Status changed: ${this.getStatus()}`)
      this.onActivityChange()
    }
  }
  
  /**
   * Handle activity change
   */
  private onActivityChange() {
    const status = this.getStatus()
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (error) {
        console.error('[ActivityMonitor] Listener error:', error)
      }
    })
  }
  
  /**
   * Check if user is currently active
   */
  isUserActive(): boolean {
    if (this.visibility === 'hidden') return false
    
    const timeSinceActivity = Date.now() - this.lastUserActivity
    return timeSinceActivity < this.IDLE_THRESHOLD
  }
  
  /**
   * Get current activity status
   */
  getStatus(): ActivityStatus {
    if (this.visibility === 'hidden') return 'hidden'
    if (!this.isUserActive()) return 'idle'
    return 'active'
  }
  
  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceActivity(): number {
    return Date.now() - this.lastUserActivity
  }
  
  /**
   * Subscribe to activity changes
   */
  subscribe(listener: ActivityListener): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.listeners.clear()
    ActivityMonitor.instance = null
  }
}

// Note: React hook implementation removed to avoid ESLint errors
// If you need React integration, create a separate hook file that imports React properly

// For non-React usage
export const activityMonitor = typeof window !== 'undefined' 
  ? ActivityMonitor.getInstance()
  : null