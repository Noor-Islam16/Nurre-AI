import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getDashboardStats() {
  const supabase = await createClient()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  try {
    // Use Promise.all to run queries in parallel
    const [
      totalUsersResult,
      onboardedUsersResult,
      newUsers30dResult,
      totalTasksResult,
      completedTasksResult,
      focusSessions7dResult,
      aiChats24hResult,
      pendingAlertsResult,
      activeRestrictionsResult,
      presentationsResult,
      assessments7dResult,
      exportRequestsResult,
      deletionRequestsResult,
    ] = await Promise.all([
      // User stats - using count queries only
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),

      // Task stats
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', true),

      // Engagement stats
      supabase.from('focus_sessions').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo.toISOString()),

      // Moderation stats
      supabase.from('admin_alerts').select('*', { count: 'exact', head: true }).eq('requires_review', true).is('reviewed_at', null),
      supabase.from('user_restrictions').select('*', { count: 'exact', head: true }).neq('restriction_level', 'none'),

      // ADHD presentations - only fetch necessary data
      supabase.from('users').select('adhd_presentation').not('adhd_presentation', 'is', null),

      // Assessment stats
      supabase.from('assessment_responses').select('*', { count: 'exact', head: true }).gte('completed_at', sevenDaysAgo.toISOString()),

      // Privacy requests
      supabase.from('data_export_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('data_deletion_requests').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    ])

    // Get unique active users - try RPC function first, fallback to manual counting
    let activeUsers24hData = 0;
    let activeUsers7dData = 0;

    try {
      // Try to use RPC function for better performance
      const { data: rpc24h, error: error24h } = await supabase
        .rpc('count_distinct_users_since', { since_timestamp: oneDayAgo.toISOString() });

      const { data: rpc7d, error: error7d } = await supabase
        .rpc('count_distinct_users_since', { since_timestamp: sevenDaysAgo.toISOString() });

      if (!error24h && rpc24h !== null) {
        activeUsers24hData = rpc24h;
      } else {
        // Fallback: Get count of distinct users from events (less efficient)
        const { data: events24h } = await supabase
          .from('events')
          .select('user_id')
          .gte('created_at', oneDayAgo.toISOString());
        activeUsers24hData = new Set(events24h?.map(e => e.user_id) || []).size;
      }

      if (!error7d && rpc7d !== null) {
        activeUsers7dData = rpc7d;
      } else {
        // Fallback: Get count of distinct users from events (less efficient)
        const { data: events7d } = await supabase
          .from('events')
          .select('user_id')
          .gte('created_at', sevenDaysAgo.toISOString());
        activeUsers7dData = new Set(events7d?.map(e => e.user_id) || []).size;
      }
    } catch (error) {
      console.log('RPC function not available, using fallback method');
      // Both fallback queries if RPC entirely fails
      const [events24h, events7d] = await Promise.all([
        supabase.from('events').select('user_id').gte('created_at', oneDayAgo.toISOString()),
        supabase.from('events').select('user_id').gte('created_at', sevenDaysAgo.toISOString())
      ]);
      activeUsers24hData = new Set(events24h.data?.map(e => e.user_id) || []).size;
      activeUsers7dData = new Set(events7d.data?.map(e => e.user_id) || []).size;
    }

    // Process ADHD presentations efficiently
    const presentationCounts = presentationsResult.data?.reduce((acc, { adhd_presentation }) => {
      acc[adhd_presentation] = (acc[adhd_presentation] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const totalUsers = totalUsersResult.count || 0
    const onboardedUsers = onboardedUsersResult.count || 0
    const totalTasks = totalTasksResult.count || 0
    const completedTasks = completedTasksResult.count || 0

    return {
      users: {
        total: totalUsers,
        onboarded: onboardedUsers,
        active24h: activeUsers24hData || 0,
        active7d: activeUsers7dData || 0,
        new30d: newUsers30dResult.count || 0,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      engagement: {
        focusSessions7d: focusSessions7dResult.count || 0,
        aiChats24h: aiChats24hResult.count || 0,
        assessments7d: assessments7dResult.count || 0,
      },
      moderation: {
        pendingAlerts: pendingAlertsResult.count || 0,
        activeRestrictions: activeRestrictionsResult.count || 0,
      },
      privacy: {
        exportRequests: exportRequestsResult.count || 0,
        deletionRequests: deletionRequestsResult.count || 0,
      },
      presentations: presentationCounts,
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    // Return empty stats on error to prevent dashboard from breaking
    return {
      users: { total: 0, onboarded: 0, active24h: 0, active7d: 0, new30d: 0 },
      tasks: { total: 0, completed: 0, completionRate: 0 },
      engagement: { focusSessions7d: 0, aiChats24h: 0, assessments7d: 0 },
      moderation: { pendingAlerts: 0, activeRestrictions: 0 },
      privacy: { exportRequests: 0, deletionRequests: 0 },
      presentations: {},
    }
  }
}


export async function GET() {
  try {
    const supabase = await createClient()

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
    if (ADMIN_EMAILS.length === 0) {
      return new NextResponse('No admins configured', { status: 403 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!ADMIN_EMAILS.includes(profile?.email || '')) {
      return new NextResponse('Not an admin', { status: 403 })
    }

    // Get stats (client-side caching handles refresh interval)
    const stats = await getDashboardStats()

    return NextResponse.json(stats, {
      headers: {
        // Browser can cache for 1 minute, and use stale data for up to 5 minutes while revalidating
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats', details: error.message },
      { status: 500 }
    )
  }
}