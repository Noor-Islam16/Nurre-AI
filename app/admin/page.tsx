'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/admin/stats-card'
import { CleanupMonitor } from '@/components/admin/cleanup-monitor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  Activity,
  Brain,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Clock,
  Database,
  Shield,
  FileText,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  users: {
    total: number
    onboarded: number
    active24h: number
    active7d: number
    new30d: number
  }
  tasks: {
    total: number
    completed: number
    completionRate: number
  }
  engagement: {
    focusSessions7d: number
    aiChats24h: number
    assessments7d: number
  }
  moderation: {
    pendingAlerts: number
    activeRestrictions: number
  }
  privacy: {
    exportRequests: number
    deletionRequests: number
  }
  presentations: Record<string, number>
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`)
        }

        const data = await response.json()

        if (mounted) {
          setStats(data)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard stats')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Alert className="border-destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!stats) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No data available
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          System overview and key metrics
        </p>
      </div>

      {/* Alerts Section */}
      {(stats.moderation.pendingAlerts > 0 || stats.privacy.exportRequests > 0 || stats.privacy.deletionRequests > 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have {stats.moderation.pendingAlerts > 0 && `${stats.moderation.pendingAlerts} pending alerts`}
              {stats.moderation.pendingAlerts > 0 && (stats.privacy.exportRequests > 0 || stats.privacy.deletionRequests > 0) && ', '}
              {stats.privacy.exportRequests > 0 && `${stats.privacy.exportRequests} export requests`}
              {stats.privacy.exportRequests > 0 && stats.privacy.deletionRequests > 0 && ', '}
              {stats.privacy.deletionRequests > 0 && `${stats.privacy.deletionRequests} deletion requests`}
              {' requiring attention'}
            </span>
            <div className="flex gap-2">
              {stats.moderation.pendingAlerts > 0 && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/admin/moderation">View Alerts</Link>
                </Button>
              )}
              {(stats.privacy.exportRequests > 0 || stats.privacy.deletionRequests > 0) && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/admin/privacy">Privacy Requests</Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.users.total}
          description={`${stats.users.onboarded} completed onboarding`}
          icon={Users}
          trend={stats.users.new30d > 0 ? { value: stats.users.new30d, label: 'new (30d)' } : undefined}
        />
        <StatsCard
          title="Active Users (24h)"
          value={stats.users.active24h}
          description={`${stats.users.active7d} active this week`}
          icon={Activity}
          trend={{
            value: Math.round((stats.users.active24h / stats.users.total) * 100),
            label: '% of total'
          }}
        />
        <StatsCard
          title="Task Completion"
          value={`${stats.tasks.completionRate}%`}
          description={`${stats.tasks.completed} of ${stats.tasks.total} tasks`}
          icon={TrendingUp}
        />
        <StatsCard
          title="AI Interactions"
          value={stats.engagement.aiChats24h}
          description="Conversations (24h)"
          icon={MessageSquare}
          trend={{ value: stats.engagement.focusSessions7d, label: 'focus sessions (7d)' }}
        />
      </div>

      {/* ADHD Presentation Distribution */}
      {Object.keys(stats.presentations).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ADHD Presentation Distribution
            </CardTitle>
            <CardDescription>
              User distribution by DSM-5 assessment results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.presentations).map(([presentation, count]) => (
                <div key={presentation} className="flex flex-col items-center p-4 bg-muted rounded-lg">
                  <span className="text-2xl font-bold">{count}</span>
                  <span className="text-sm text-muted-foreground capitalize">{presentation}</span>
                  <Badge variant="outline" className="mt-2">
                    {Math.round((count / stats.users.onboarded) * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Content Moderation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pending Alerts</span>
                <Badge variant={stats.moderation.pendingAlerts > 0 ? "destructive" : "secondary"}>
                  {stats.moderation.pendingAlerts}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Restrictions</span>
                <Badge variant={stats.moderation.activeRestrictions > 0 ? "destructive" : "secondary"}>
                  {stats.moderation.activeRestrictions}
                </Badge>
              </div>
              <Button className="w-full mt-2" variant="outline" asChild>
                <Link href="/admin/moderation">View All</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span>Completed (7d)</span>
                <Badge variant="secondary">{stats.engagement.assessments7d}</Badge>
              </div>
            </div>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/admin/assessments">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Privacy Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Export Requests</span>
                <Badge variant={stats.privacy.exportRequests > 0 ? "destructive" : "secondary"}>
                  {stats.privacy.exportRequests}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Deletion Requests</span>
                <Badge variant={stats.privacy.deletionRequests > 0 ? "destructive" : "secondary"}>
                  {stats.privacy.deletionRequests}
                </Badge>
              </div>
              <Button className="w-full mt-2" variant="outline" asChild>
                <Link href="/admin/privacy">Manage</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Cleanup Monitor */}
      <CleanupMonitor />
    </div>
  )
}