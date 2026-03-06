import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin endpoint for viewing abuse reports and managing user restrictions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Admin check - In production, implement proper admin authentication
    // For now, you can use environment variable or a hardcoded list
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []
    const { data: userProfile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()
    
    if (!ADMIN_EMAILS.includes(userProfile?.email || '')) {
      // For development, allow if no admin emails configured
      if (ADMIN_EMAILS.length > 0) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('range') || '7d'
    const severity = searchParams.get('severity') || 'all'
    const userId = searchParams.get('userId')
    
    // Calculate time cutoff
    const cutoffTime = getCutoffTime(timeRange)
    
    // Build query for abuse logs
    let logsQuery = supabase
      .from('abuse_logs')
      .select(`
        *,
        user:users!user_id(
          id,
          email,
          display_name
        )
      `)
      .gte('timestamp', cutoffTime.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100)
    
    if (severity !== 'all') {
      logsQuery = logsQuery.eq('severity', severity)
    }
    
    if (userId) {
      logsQuery = logsQuery.eq('user_id', userId)
    }
    
    const { data: logs, error: logsError } = await logsQuery
    
    if (logsError) {
      console.error('Error fetching abuse logs:', logsError)
      return NextResponse.json({ error: 'Failed to fetch abuse logs' }, { status: 500 })
    }
    
    // Get user restrictions
    const { data: restrictions } = await supabase
      .from('user_restrictions')
      .select(`
        *,
        user:users!user_id(
          id,
          email,
          display_name
        )
      `)
      .neq('restriction_level', 'none')
      .order('updated_at', { ascending: false })
    
    // Get pending admin alerts
    const { data: alerts } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('type', 'abuse_detection')
      .eq('requires_review', true)
      .is('reviewed_at', null)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Calculate statistics
    const stats = {
      totalViolations: logs?.length || 0,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      uniqueUsers: new Set<string>(),
      recentTrend: 'stable' as 'increasing' | 'stable' | 'decreasing'
    }
    
    if (logs) {
      for (const log of logs) {
        // Count by type
        stats.byType[log.violation_type] = (stats.byType[log.violation_type] || 0) + 1
        
        // Count by severity
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
        
        // Track unique users
        stats.uniqueUsers.add(log.user_id)
      }
      
      // Calculate trend (compare last 24h to previous 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
      
      const recentCount = logs.filter(l => 
        new Date(l.timestamp) > oneDayAgo
      ).length
      
      const previousCount = logs.filter(l => {
        const time = new Date(l.timestamp)
        return time > twoDaysAgo && time <= oneDayAgo
      }).length
      
      if (recentCount > previousCount * 1.5) {
        stats.recentTrend = 'increasing'
      } else if (recentCount < previousCount * 0.5) {
        stats.recentTrend = 'decreasing'
      }
    }
    
    return NextResponse.json({
      logs: logs || [],
      restrictions: restrictions || [],
      alerts: alerts || [],
      stats: {
        ...stats,
        uniqueUsers: stats.uniqueUsers.size,
        activeRestrictions: restrictions?.length || 0,
        pendingAlerts: alerts?.length || 0
      },
      timeRange,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Abuse reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch abuse reports', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update user restriction (admin action)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Admin check - same as GET method
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []
    const { data: userProfile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()
    
    if (!ADMIN_EMAILS.includes(userProfile?.email || '')) {
      if (ADMIN_EMAILS.length > 0) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    const body = await request.json()
    const { userId, action, reason } = body
    
    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Perform action
    switch (action) {
      case 'lift_restriction':
        await supabase
          .from('user_restrictions')
          .update({
            restriction_level: 'none',
            violations_count: 0,
            suspension_ends_at: null,
            notes: [`Restriction lifted by admin: ${reason || 'No reason provided'}`]
          })
          .eq('user_id', userId)
        break
        
      case 'reset_violations':
        await supabase
          .from('abuse_logs')
          .delete()
          .eq('user_id', userId)
        
        await supabase
          .from('user_restrictions')
          .update({
            violations_count: 0,
            notes: [`Violations reset by admin: ${reason || 'No reason provided'}`]
          })
          .eq('user_id', userId)
        break
        
      case 'suspend':
        const suspensionDuration = body.duration || 24 // hours
        const suspensionEnds = new Date(Date.now() + suspensionDuration * 60 * 60 * 1000)
        
        await supabase
          .from('user_restrictions')
          .upsert({
            user_id: userId,
            restriction_level: 'suspended',
            suspension_ends_at: suspensionEnds.toISOString(),
            notes: [`Suspended by admin: ${reason || 'Policy violation'}`],
            updated_at: new Date().toISOString()
          })
        break
        
      case 'mark_reviewed':
        const alertId = body.alertId
        if (alertId) {
          await supabase
            .from('admin_alerts')
            .update({
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.id
            })
            .eq('id', alertId)
        }
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    // Log admin action
    await supabase.from('events').insert({
      user_id: user.id,
      type: 'admin_action',
      data: {
        action,
        targetUserId: userId,
        reason
      }
    })
    
    return NextResponse.json({
      success: true,
      action,
      userId,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Admin action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform admin action', details: error.message },
      { status: 500 }
    )
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
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
}