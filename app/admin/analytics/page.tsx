import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/admin/stats-card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  Brain,
  Target,
  MessageSquare,
  Clock
} from 'lucide-react'

async function getAnalyticsData() {
  const supabase = await createClient()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // User Growth Analytics
  const { data: userGrowth } = await supabase
    .from('users')
    .select('created_at')
    .order('created_at', { ascending: false })

  const usersByDay = userGrowth?.reduce((acc, user) => {
    const date = new Date(user.created_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Feature Usage Analytics
  const { count: totalTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })

  const { count: completedTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)

  const { count: focusSessions } = await supabase
    .from('focus_sessions')
    .select('*', { count: 'exact', head: true })

  const { data: avgFocusDuration } = await supabase
    .from('focus_sessions')
    .select('actual_duration')
    .not('actual_duration', 'is', null)

  const avgDuration = avgFocusDuration?.length
    ? avgFocusDuration.reduce((sum, s) => sum + (s.actual_duration || 0), 0) / avgFocusDuration.length
    : 0

  // AI Usage Analytics
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })

  const { count: conversations24h } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo.toISOString())

  const { count: conversations7d } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString())

  // Get conversation with tool calls
  const { count: toolCallConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .not('tool_calls', 'is', null)

  // Mood Tracking Analytics
  const { data: moodEntries } = await supabase
    .from('mood_entries')
    .select('mood')
    .gte('created_at', sevenDaysAgo.toISOString())

  const moodDistribution = moodEntries?.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Assessment Analytics
  const { data: assessmentData } = await supabase
    .from('assessment_responses')
    .select('assessment_type, severity_level')
    .gte('completed_at', thirtyDaysAgo.toISOString())

  const assessmentsByType = assessmentData?.reduce((acc, assessment) => {
    acc[assessment.assessment_type] = (acc[assessment.assessment_type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Event Types Distribution
  const { data: events } = await supabase
    .from('events')
    .select('type')
    .gte('created_at', sevenDaysAgo.toISOString())

  const eventTypes = events?.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Get top 5 event types
  const topEventTypes = Object.entries(eventTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // User Retention (7-day)
  const { data: weekOldUsers } = await supabase
    .from('users')
    .select('id')
    .gte('created_at', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .lte('created_at', sevenDaysAgo.toISOString())

  let retentionRate = 0
  if (weekOldUsers && weekOldUsers.length > 0) {
    const { data: activeWeekOldUsers } = await supabase
      .from('events')
      .select('user_id')
      .in('user_id', weekOldUsers.map(u => u.id))
      .gte('created_at', sevenDaysAgo.toISOString())

    const uniqueActiveUsers = new Set(activeWeekOldUsers?.map(e => e.user_id) || []).size
    retentionRate = Math.round((uniqueActiveUsers / weekOldUsers.length) * 100)
  }

  return {
    userGrowth: usersByDay,
    taskMetrics: {
      total: totalTasks || 0,
      completed: completedTasks || 0,
      completionRate: totalTasks ? Math.round((completedTasks || 0) / totalTasks * 100) : 0,
    },
    focusMetrics: {
      totalSessions: focusSessions || 0,
      avgDuration: Math.round(avgDuration),
    },
    aiMetrics: {
      totalConversations: totalConversations || 0,
      conversations24h: conversations24h || 0,
      conversations7d: conversations7d || 0,
      toolCallPercentage: totalConversations
        ? Math.round((toolCallConversations || 0) / totalConversations * 100)
        : 0,
    },
    moodDistribution,
    assessmentsByType,
    topEventTypes,
    retentionRate,
  }
}

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsData()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Usage patterns and engagement metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Task Completion Rate"
          value={`${analytics.taskMetrics.completionRate}%`}
          description={`${analytics.taskMetrics.completed} of ${analytics.taskMetrics.total} tasks`}
          icon={Target}
        />
        <StatsCard
          title="Avg Focus Duration"
          value={`${analytics.focusMetrics.avgDuration}m`}
          description={`${analytics.focusMetrics.totalSessions} total sessions`}
          icon={Clock}
        />
        <StatsCard
          title="AI Conversations"
          value={analytics.aiMetrics.conversations7d}
          description="Last 7 days"
          icon={MessageSquare}
          trend={{
            value: analytics.aiMetrics.conversations24h,
            label: 'today'
          }}
        />
        <StatsCard
          title="7-Day Retention"
          value={`${analytics.retentionRate}%`}
          description="Week-old users still active"
          icon={Users}
        />
      </div>

      {/* Event Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Top Event Types (7 days)
          </CardTitle>
          <CardDescription>
            Most common user activities in the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.topEventTypes.map(([type, count]) => {
              const total = Object.values(analytics.topEventTypes).reduce((sum, [, c]) => sum + c, 0)
              const percentage = Math.round((count / total) * 100)

              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{type.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mood Distribution */}
      {Object.keys(analytics.moodDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Mood Distribution (7 days)
            </CardTitle>
            <CardDescription>
              User mood entries from the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {['terrible', 'bad', 'okay', 'good', 'excellent'].map((mood) => {
                const count = analytics.moodDistribution[mood] || 0
                const total = Object.values(analytics.moodDistribution).reduce((sum, c) => sum + c, 0)
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0

                return (
                  <div key={mood} className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{mood}</div>
                    <Badge variant="outline" className="mt-2">{percentage}%</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Usage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Assistant Usage
          </CardTitle>
          <CardDescription>
            Conversation patterns and tool usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analytics.aiMetrics.totalConversations}</div>
              <div className="text-sm text-muted-foreground">Total Conversations</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analytics.aiMetrics.conversations24h}</div>
              <div className="text-sm text-muted-foreground">Last 24 Hours</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analytics.aiMetrics.conversations7d}</div>
              <div className="text-sm text-muted-foreground">Last 7 Days</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{analytics.aiMetrics.toolCallPercentage}%</div>
              <div className="text-sm text-muted-foreground">With Tool Calls</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Distribution */}
      {Object.keys(analytics.assessmentsByType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Clinical Assessments (30 days)
            </CardTitle>
            <CardDescription>
              Completed assessments by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.assessmentsByType).map(([type, count]) => (
                <div key={type} className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground uppercase">{type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}