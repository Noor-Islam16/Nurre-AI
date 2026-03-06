import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin, isAdminAuthError } from '@/lib/auth/admin-auth'

/**
 * API Usage Monitoring Endpoint
 * Tracks API calls and helps identify excessive usage patterns
 */

interface UsageStats {
  totalCalls: number
  byEndpoint: Record<string, number>
  byHour: Array<{ hour: string; count: number }>
  byUser: Array<{ userId: string; count: number }>
  systemVsUser: {
    system: number
    user: number
  }
  plannerRuns: number
  nightSkips: number
  estimatedCost: number
  timeRange: string
  timestamp: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin authorization
    const auth = await verifyAdmin()
    if (isAdminAuthError(auth)) {
      // Allow non-admins to see their own usage
      if (auth.status === 403) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const userStats = await getUserUsageStats(supabase, user.id)
          return NextResponse.json(userStats)
        }
      }
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Get time range from query params
    const timeRange = request.nextUrl.searchParams.get('range') || '24h'
    const cutoffTime = getCutoffTime(timeRange)
    
    // Get total API calls
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('type, user_id, created_at')
      .gte('created_at', cutoffTime.toISOString())
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }
    
    // Calculate statistics
    const stats: UsageStats = {
      totalCalls: events?.length || 0,
      byEndpoint: {},
      byHour: [],
      byUser: [],
      systemVsUser: {
        system: 0,
        user: 0
      },
      plannerRuns: 0,
      nightSkips: 0,
      estimatedCost: 0,
      timeRange,
      timestamp: new Date().toISOString()
    }
    
    // System event types
    const systemEventTypes = [
      'ai_message',
      'ai_intervention', 
      'ai_tools_requested',
      'tool_executed',
      'intervention_triggered',
      'planner_tick',
      'system_cleanup'
    ]
    
    // Process events
    if (events) {
      // Count by endpoint/type
      events.forEach(event => {
        stats.byEndpoint[event.type] = (stats.byEndpoint[event.type] || 0) + 1
        
        // Count system vs user
        if (systemEventTypes.includes(event.type)) {
          stats.systemVsUser.system++
        } else {
          stats.systemVsUser.user++
        }
        
        // Count planner runs
        if (event.type === 'planner_tick') {
          stats.plannerRuns++
        }
      })
      
      // Group by hour
      const hourlyGroups = new Map<string, number>()
      events.forEach(event => {
        const hour = new Date(event.created_at).toISOString().slice(0, 13) + ':00'
        hourlyGroups.set(hour, (hourlyGroups.get(hour) || 0) + 1)
      })
      stats.byHour = Array.from(hourlyGroups.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour))
      
      // Group by user
      const userGroups = new Map<string, number>()
      events.forEach(event => {
        if (event.user_id) {
          userGroups.set(event.user_id, (userGroups.get(event.user_id) || 0) + 1)
        }
      })
      stats.byUser = Array.from(userGroups.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 users
    }
    
    // Check for night skips in logs
    const { data: logs } = await supabase
      .from('planner_logs')
      .select('message')
      .gte('created_at', cutoffTime.toISOString())
      .like('message', '%night_hours%')
    
    stats.nightSkips = logs?.length || 0
    
    // Estimate costs (rough approximation)
    // Assuming: GPT-5 Mini at $0.01 per 1K tokens
    // Average request ~500 tokens
    const aiCalls = stats.byEndpoint['ai_message'] || 0
    const interventions = stats.byEndpoint['ai_intervention'] || 0
    const totalAICalls = aiCalls + interventions + stats.plannerRuns
    stats.estimatedCost = (totalAICalls * 0.5 * 0.01) / 1000 // $0.01 per 1K tokens, 500 tokens avg
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Usage monitoring error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}

/**
 * Get usage stats for a specific user
 */
async function getUserUsageStats(supabase: any, userId: string) {
  const cutoffTime = getCutoffTime('24h')
  
  const { data: events } = await supabase
    .from('events')
    .select('type, created_at')
    .eq('user_id', userId)
    .gte('created_at', cutoffTime.toISOString())
  
  const systemEventTypes = [
    'ai_message',
    'ai_intervention',
    'ai_tools_requested',
    'tool_executed'
  ]
  
  let systemCalls = 0
  let userActions = 0
  
  events?.forEach((event: any) => {
    if (systemEventTypes.includes(event.type)) {
      systemCalls++
    } else {
      userActions++
    }
  })
  
  return {
    userId,
    totalEvents: events?.length || 0,
    systemCalls,
    userActions,
    timeRange: '24h',
    timestamp: new Date().toISOString()
  }
}

/**
 * Calculate cutoff time based on range
 */
function getCutoffTime(range: string): Date {
  const now = new Date()
  
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000)
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
}