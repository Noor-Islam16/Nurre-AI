import { createClient } from '@supabase/supabase-js'

let requestCount = 0
const requestLog: { url: string; timestamp: Date }[] = []

export function createSupabaseClientWithLogging() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) => {
          requestCount++
          requestLog.push({ url: url.toString(), timestamp: new Date() })
          
          // Log every 10th request to avoid spam
          if (requestCount % 10 === 0) {
            console.log(`[Supabase] Request #${requestCount}:`, url)
          }
          
          // Warn if too many requests
          if (requestCount > 100 && requestCount % 50 === 0) {
            console.warn(`[Supabase] High request volume: ${requestCount} requests`)
          }
          
          return fetch(url, options)
        }
      }
    }
  )
  
  return supabase
}

// Export request metrics
export function getRequestMetrics() {
  const now = Date.now()
  const oneMinuteAgo = now - 60000
  const oneHourAgo = now - 3600000
  
  const recentRequests = requestLog.filter(r => r.timestamp.getTime() > oneMinuteAgo)
  const hourlyRequests = requestLog.filter(r => r.timestamp.getTime() > oneHourAgo)
  
  return {
    totalRequests: requestCount,
    requestsPerMinute: recentRequests.length,
    requestsPerHour: hourlyRequests.length,
    recentRequests: recentRequests.slice(-10) // Last 10 requests
  }
}

// Reset metrics (useful for testing)
export function resetRequestMetrics() {
  requestCount = 0
  requestLog.length = 0
}