interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

export class MemoryMonitor {
  private static measurements: number[] = []
  private static maxMeasurements = 100

  static measure(): MemoryInfo | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null
    }

    const memory = {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      timestamp: Date.now()
    }

    this.measurements.push(memory.usedJSHeapSize)
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift()
    }

    return memory
  }

  static getMemoryTrend(): 'stable' | 'increasing' | 'decreasing' {
    if (this.measurements.length < 10) return 'stable'

    const recent = this.measurements.slice(-10)
    const older = this.measurements.slice(-20, -10)
    
    if (older.length === 0) return 'stable'
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    
    const change = (recentAvg - olderAvg) / olderAvg
    
    if (change > 0.1) return 'increasing'
    if (change < -0.1) return 'decreasing'
    return 'stable'
  }

  static checkForLeaks(): boolean {
    const trend = this.getMemoryTrend()
    const memory = (performance as any).memory
    
    if (!memory) return false
    
    const current = memory.usedJSHeapSize || 0
    const limit = memory.jsHeapSizeLimit || Infinity
    
    // Alert if memory is consistently increasing and above 70% of limit
    return trend === 'increasing' && current > limit * 0.7
  }

  static logMemoryUsage(): void {
    const memory = this.measure()
    if (!memory) return

    const used = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
    const total = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
    const limit = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)
    
    console.log(`Memory: ${used}MB / ${total}MB (limit: ${limit}MB)`)
    
    if (this.checkForLeaks()) {
      console.warn('⚠️ Potential memory leak detected!')
    }
  }

  static getMemoryStats(): {
    used: string
    total: string
    limit: string
    trend: 'stable' | 'increasing' | 'decreasing'
    hasLeak: boolean
  } | null {
    const memory = this.measure()
    if (!memory) return null

    return {
      used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
      total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
      limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
      trend: this.getMemoryTrend(),
      hasLeak: this.checkForLeaks()
    }
  }

  static clearMeasurements(): void {
    this.measurements = []
  }
}

// Monitor memory in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    MemoryMonitor.logMemoryUsage()
  }, 30000) // Every 30 seconds
}