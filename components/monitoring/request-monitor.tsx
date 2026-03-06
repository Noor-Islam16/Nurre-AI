'use client'

import { useEffect, useState } from 'react'
import { getRequestMetrics } from '@/lib/supabase/client-with-logging'
import { requestCache } from '@/lib/cache/request-cache'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RequestMonitor() {
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    requestsPerMinute: 0,
    requestsPerHour: 0,
    cacheStats: {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0
    }
  })

  useEffect(() => {
    const updateMetrics = () => {
      const requestMetrics = getRequestMetrics()
      const cacheStats = requestCache.getStats()
      
      setMetrics({
        totalRequests: requestMetrics.totalRequests,
        requestsPerMinute: requestMetrics.requestsPerMinute,
        requestsPerHour: requestMetrics.requestsPerHour,
        cacheStats
      })
    }

    // Update immediately
    updateMetrics()

    // Update every 5 seconds only when page is visible
    let interval: NodeJS.Timeout | null = null
    
    const startMonitoring = () => {
      if (interval) return
      interval = setInterval(() => {
        // Only update when page is visible
        if (document.visibilityState === 'visible') {
          updateMetrics()
        }
      }, 5000)
    }
    
    const stopMonitoring = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateMetrics() // Update immediately when visible
        startMonitoring()
      } else {
        stopMonitoring()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Start monitoring if visible
    if (document.visibilityState === 'visible') {
      startMonitoring()
    }
    
    return () => {
      stopMonitoring()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const getStatusColor = (value: number, threshold: number) => {
    if (value > threshold) return 'text-red-500'
    if (value > threshold * 0.7) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Request Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className={`text-2xl font-bold ${getStatusColor(metrics.totalRequests, 1000)}`}>
              {metrics.totalRequests}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Requests/Min</p>
            <p className={`text-2xl font-bold ${getStatusColor(metrics.requestsPerMinute, 20)}`}>
              {metrics.requestsPerMinute}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Requests/Hour</p>
            <p className={`text-2xl font-bold ${getStatusColor(metrics.requestsPerHour, 100)}`}>
              {metrics.requestsPerHour}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
            <p className={`text-2xl font-bold ${metrics.cacheStats.hitRate > 50 ? 'text-green-500' : 'text-yellow-500'}`}>
              {metrics.cacheStats.hitRate.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Cache Size:</span> {metrics.cacheStats.size}
            </div>
            <div>
              <span className="text-muted-foreground">Cache Hits:</span> {metrics.cacheStats.hits}
            </div>
            <div>
              <span className="text-muted-foreground">Cache Misses:</span> {metrics.cacheStats.misses}
            </div>
          </div>
        </div>
        
        {metrics.requestsPerHour > 100 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ High request volume detected. Caching is active to reduce load.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}