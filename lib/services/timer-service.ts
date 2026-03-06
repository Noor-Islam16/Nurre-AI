// Timer Service - Abstraction layer for timer operations
// Handles both Service Worker and fallback modes

export interface TimerState {
  timerId: string
  startedAt: number
  duration: number // in minutes
  pausedAt: number | null
  totalPausedDuration: number
  taskId?: string
  remainingSeconds: number
  isRunning: boolean
  isPaused: boolean
}

class TimerService {
  private static instance: TimerService
  private serviceWorkerReady: boolean = false
  private fallbackTimers: Map<string, TimerState> = new Map()
  private fallbackIntervals: Map<string, NodeJS.Timeout> = new Map()
  
  private constructor() {
    // Check if service worker is available
    if (typeof window !== 'undefined') {
      this.initializeServiceWorker()
      this.setupVisibilityHandling()
      this.setupStorageSync()
    }
  }
  
  static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService()
    }
    return TimerService.instance
  }
  
  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        this.serviceWorkerReady = !!registration.active
        console.log('Timer service: Service worker ready')
      } catch (error) {
        console.warn('Timer service: Service worker not available, using fallback', error)
        this.serviceWorkerReady = false
      }
    }
  }
  
  private setupVisibilityHandling() {
    // Reconcile time when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.reconcileAllTimers()
      }
    })
    
    // Also reconcile on focus
    window.addEventListener('focus', () => {
      this.reconcileAllTimers()
    })
  }
  
  private setupStorageSync() {
    // Sync with localStorage for persistence
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('timer_')) {
        this.syncFromStorage(event.key)
      }
    })
  }
  
  private async reconcileAllTimers() {
    // Get all active timer IDs from localStorage
    const timerIds = this.getStoredTimerIds()
    
    for (const timerId of timerIds) {
      await this.reconcileTimer(timerId)
    }
  }
  
  private async reconcileTimer(timerId: string) {
    // Get state from service worker if available
    if (this.serviceWorkerReady) {
      const swState = await this.getTimerFromServiceWorker(timerId)
      if (swState) {
        // Update local state and storage
        this.updateLocalState(timerId, swState)
        return swState
      }
    }
    
    // Fallback to localStorage
    const storedState = this.getTimerFromStorage(timerId)
    if (storedState) {
      // Calculate current state based on timestamps
      const now = Date.now()
      let elapsed = now - storedState.startedAt
      
      if (storedState.pausedAt) {
        elapsed = storedState.pausedAt - storedState.startedAt
      }
      
      elapsed -= storedState.totalPausedDuration
      const remainingMs = Math.max(0, storedState.duration * 60 * 1000 - elapsed)
      storedState.remainingSeconds = Math.floor(remainingMs / 1000)
      
      this.fallbackTimers.set(timerId, storedState)
      return storedState
    }
    
    return null
  }
  
  async startTimer(timerId: string, duration: number, taskId?: string): Promise<boolean> {
    const timerState: TimerState = {
      timerId,
      startedAt: Date.now(),
      duration,
      pausedAt: null,
      totalPausedDuration: 0,
      taskId,
      remainingSeconds: duration * 60,
      isRunning: true,
      isPaused: false
    }
    
    // Store in localStorage immediately
    this.saveTimerToStorage(timerId, timerState)
    
    // Try service worker first
    if (this.serviceWorkerReady) {
      try {
        const success = await this.startTimerInServiceWorker(timerId, duration, taskId)
        if (success) {
          console.log('Timer started in service worker:', timerId)
          return true
        }
      } catch (error) {
        console.warn('Failed to start timer in service worker:', error)
      }
    }
    
    // Fallback to local timer
    console.log('Using fallback timer:', timerId)
    this.startFallbackTimer(timerState)
    return true
  }
  
  async pauseTimer(timerId: string): Promise<boolean> {
    // Update localStorage
    const state = await this.getTimerState(timerId)
    if (state && !state.pausedAt) {
      state.pausedAt = Date.now()
      state.isPaused = true
      state.isRunning = false
      this.saveTimerToStorage(timerId, state)
    }
    
    // Try service worker
    if (this.serviceWorkerReady) {
      try {
        await this.sendToServiceWorker('PAUSE_TIMER', { timerId })
      } catch (error) {
        console.warn('Failed to pause in service worker:', error)
      }
    }
    
    // Handle fallback timer
    this.pauseFallbackTimer(timerId)
    return true
  }
  
  async resumeTimer(timerId: string): Promise<boolean> {
    // Update localStorage
    const state = await this.getTimerState(timerId)
    if (state && state.pausedAt) {
      const pauseDuration = Date.now() - state.pausedAt
      state.totalPausedDuration += pauseDuration
      state.pausedAt = null
      state.isPaused = false
      state.isRunning = true
      this.saveTimerToStorage(timerId, state)
    }
    
    // Try service worker
    if (this.serviceWorkerReady) {
      try {
        await this.sendToServiceWorker('RESUME_TIMER', { timerId })
      } catch (error) {
        console.warn('Failed to resume in service worker:', error)
      }
    }
    
    // Handle fallback timer
    this.resumeFallbackTimer(timerId)
    return true
  }
  
  async stopTimer(timerId: string, completed: boolean = false): Promise<boolean> {
    // Remove from localStorage
    this.removeTimerFromStorage(timerId)
    
    // Try service worker
    if (this.serviceWorkerReady) {
      try {
        await this.sendToServiceWorker('STOP_TIMER', { timerId, completed })
      } catch (error) {
        console.warn('Failed to stop in service worker:', error)
      }
    }
    
    // Handle fallback timer
    this.stopFallbackTimer(timerId)
    return true
  }
  
  async getTimerState(timerId: string): Promise<TimerState | null> {
    // Try service worker first
    if (this.serviceWorkerReady) {
      const swState = await this.getTimerFromServiceWorker(timerId)
      if (swState) return swState
    }
    
    // Check fallback timers
    const fallbackTimer = this.fallbackTimers.get(timerId)
    if (fallbackTimer) {
      return this.calculateCurrentState(fallbackTimer)
    }
    
    // Check localStorage
    const storedState = this.getTimerFromStorage(timerId)
    if (storedState) {
      return this.calculateCurrentState(storedState)
    }
    
    return null
  }
  
  // Service Worker communication
  private async sendToServiceWorker(type: string, data: any): Promise<any> {
    if (!navigator.serviceWorker?.controller) {
      throw new Error('No service worker controller')
    }
    
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data)
        } else {
          reject(new Error(event.data.error || 'Service worker operation failed'))
        }
      }
      
      // We checked controller is not null above
      navigator.serviceWorker.controller!.postMessage(
        { type, data },
        [channel.port2]
      )
      
      // Timeout after 3 seconds
      setTimeout(() => {
        reject(new Error('Service worker timeout'))
      }, 3000)
    })
  }
  
  private async startTimerInServiceWorker(timerId: string, duration: number, taskId?: string): Promise<boolean> {
    const response = await this.sendToServiceWorker('START_TIMER', {
      timerId,
      duration,
      taskId
    })
    return response.success
  }
  
  private async getTimerFromServiceWorker(timerId: string): Promise<TimerState | null> {
    try {
      const response = await this.sendToServiceWorker('GET_TIMER_STATE', { timerId })
      if (response.exists) {
        return {
          timerId,
          startedAt: response.startedAt,
          duration: Math.floor((response.remainingSeconds + response.elapsed) / 60),
          pausedAt: response.isPaused ? Date.now() : null,
          totalPausedDuration: 0,
          taskId: response.taskId,
          remainingSeconds: response.remainingSeconds,
          isRunning: response.isRunning,
          isPaused: response.isPaused
        }
      }
    } catch (error) {
      console.warn('Failed to get timer from service worker:', error)
    }
    return null
  }
  
  // Fallback timer implementation
  private startFallbackTimer(state: TimerState) {
    this.fallbackTimers.set(state.timerId, state)
    
    // Clear any existing interval
    const existingInterval = this.fallbackIntervals.get(state.timerId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }
    
    // Start new interval
    const interval = setInterval(() => {
      const timer = this.fallbackTimers.get(state.timerId)
      if (!timer || timer.pausedAt) {
        clearInterval(interval)
        this.fallbackIntervals.delete(state.timerId)
        return
      }
      
      // Update based on timestamp
      const currentState = this.calculateCurrentState(timer)
      if (currentState.remainingSeconds <= 0) {
        this.handleTimerComplete(state.timerId)
        clearInterval(interval)
        this.fallbackIntervals.delete(state.timerId)
      } else {
        // Broadcast update
        this.broadcastTimerUpdate(currentState)
      }
    }, 1000)
    
    this.fallbackIntervals.set(state.timerId, interval)
  }
  
  private pauseFallbackTimer(timerId: string) {
    const timer = this.fallbackTimers.get(timerId)
    if (timer && !timer.pausedAt) {
      timer.pausedAt = Date.now()
      timer.isPaused = true
      timer.isRunning = false
      
      // Clear interval
      const interval = this.fallbackIntervals.get(timerId)
      if (interval) {
        clearInterval(interval)
        this.fallbackIntervals.delete(timerId)
      }
    }
  }
  
  private resumeFallbackTimer(timerId: string) {
    const timer = this.fallbackTimers.get(timerId)
    if (timer && timer.pausedAt) {
      const pauseDuration = Date.now() - timer.pausedAt
      timer.totalPausedDuration += pauseDuration
      timer.pausedAt = null
      timer.isPaused = false
      timer.isRunning = true
      
      // Restart interval
      this.startFallbackTimer(timer)
    }
  }
  
  private stopFallbackTimer(timerId: string) {
    // Clear interval
    const interval = this.fallbackIntervals.get(timerId)
    if (interval) {
      clearInterval(interval)
      this.fallbackIntervals.delete(timerId)
    }
    
    // Remove timer
    this.fallbackTimers.delete(timerId)
  }
  
  private calculateCurrentState(timer: TimerState): TimerState {
    const now = Date.now()
    let elapsed = now - timer.startedAt
    
    if (timer.pausedAt) {
      elapsed = timer.pausedAt - timer.startedAt
    }
    
    elapsed -= timer.totalPausedDuration
    const remainingMs = Math.max(0, timer.duration * 60 * 1000 - elapsed)
    
    return {
      ...timer,
      remainingSeconds: Math.floor(remainingMs / 1000)
    }
  }
  
  private handleTimerComplete(timerId: string) {
    // Dispatch complete event
    window.dispatchEvent(new CustomEvent('timer-service-complete', {
      detail: { timerId }
    }))
    
    // Clean up
    this.stopFallbackTimer(timerId)
    this.removeTimerFromStorage(timerId)
  }
  
  private broadcastTimerUpdate(state: TimerState) {
    window.dispatchEvent(new CustomEvent('timer-service-update', {
      detail: state
    }))
  }
  
  // LocalStorage helpers
  private saveTimerToStorage(timerId: string, state: TimerState) {
    try {
      localStorage.setItem(`timer_${timerId}`, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save timer to storage:', error)
    }
  }
  
  private getTimerFromStorage(timerId: string): TimerState | null {
    try {
      const stored = localStorage.getItem(`timer_${timerId}`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to get timer from storage:', error)
    }
    return null
  }
  
  private removeTimerFromStorage(timerId: string) {
    try {
      localStorage.removeItem(`timer_${timerId}`)
    } catch (error) {
      console.warn('Failed to remove timer from storage:', error)
    }
  }
  
  private getStoredTimerIds(): string[] {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('timer_')) {
        ids.push(key.replace('timer_', ''))
      }
    }
    return ids
  }
  
  private syncFromStorage(key: string) {
    const timerId = key.replace('timer_', '')
    const state = this.getTimerFromStorage(timerId)
    
    if (state) {
      this.fallbackTimers.set(timerId, state)
      
      // If timer should be running but isn't, restart it
      if (state.isRunning && !state.isPaused && !this.fallbackIntervals.has(timerId)) {
        this.startFallbackTimer(state)
      }
    }
  }
  
  private updateLocalState(timerId: string, state: Partial<TimerState>) {
    const existing = this.fallbackTimers.get(timerId)
    if (existing) {
      Object.assign(existing, state)
    }
  }
}

// Export singleton instance
export const timerService = TimerService.getInstance()