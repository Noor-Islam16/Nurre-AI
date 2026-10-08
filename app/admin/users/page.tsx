import { Suspense } from 'react'
import { createServiceClient } from '@/lib/supabase/admin'
import { UserTable } from '@/components/admin/user-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Search } from 'lucide-react'

interface UserWithStats {
  id: string
  email: string
  name: string | null
  adhd_persona: string | null
  adhd_presentation: string | null
  onboarding_completed: boolean
  onboarding_version: number | null
  created_at: string
  updated_at: string
  current_streak: number
  longest_streak: number
  inatt_severity: number | null
  hyper_severity: number | null
  last_active?: string
  total_tasks?: number
  completed_tasks?: number
  total_focus_sessions?: number
  has_restriction?: boolean
}

async function getUsers(searchQuery?: string): Promise<UserWithStats[]> {
  // Service-role client: this page is only reachable by admins (the admin
  // layout is fail-closed). The user-scoped RLS client could only see rows
  // the admin owns, which made user/account data look inconsistent.
  const supabase = createServiceClient()

  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchQuery) {
    // strip characters that have meaning inside a PostgREST .or() filter
    const safe = searchQuery.replace(/[%,()*\\]/g, ' ').trim()
    if (safe) query = query.or(`email.ilike.%${safe}%,name.ilike.%${safe}%`)
  }

  const { data: users, error } = await query

  if (error || !users) {
    console.error('Failed to fetch users:', error)
    return []
  }
  if (users.length === 0) return []

  const ids = users.map((u) => u.id)

  // ONE query per table instead of 5 queries per user (N+1).
  const [tasksRes, focusRes, eventsRes, restrictionsRes] = await Promise.all([
    supabase.from('tasks').select('user_id, completed').in('user_id', ids),
    supabase.from('focus_sessions').select('user_id').in('user_id', ids),
    supabase
      .from('events')
      .select('user_id, created_at')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('user_restrictions').select('user_id, restriction_level').in('user_id', ids),
  ])

  const totalTasks = new Map<string, number>()
  const completedTasks = new Map<string, number>()
  for (const t of tasksRes.data ?? []) {
    totalTasks.set(t.user_id, (totalTasks.get(t.user_id) ?? 0) + 1)
    if (t.completed) completedTasks.set(t.user_id, (completedTasks.get(t.user_id) ?? 0) + 1)
  }

  const focusCounts = new Map<string, number>()
  for (const f of focusRes.data ?? []) {
    focusCounts.set(f.user_id, (focusCounts.get(f.user_id) ?? 0) + 1)
  }

  // events are ordered newest-first, so the first one seen is the latest
  const lastActive = new Map<string, string>()
  for (const e of eventsRes.data ?? []) {
    if (!lastActive.has(e.user_id)) lastActive.set(e.user_id, e.created_at)
  }

  const restricted = new Map<string, boolean>()
  for (const r of restrictionsRes.data ?? []) {
    restricted.set(
      r.user_id,
      r.restriction_level !== 'none' && r.restriction_level !== null,
    )
  }

  return users.map((user) => ({
    ...user,
    last_active: lastActive.get(user.id),
    total_tasks: totalTasks.get(user.id) ?? 0,
    completed_tasks: completedTasks.get(user.id) ?? 0,
    total_focus_sessions: focusCounts.get(user.id) ?? 0,
    has_restriction: restricted.get(user.id) ?? false,
  }))
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const users = await getUsers(params.search)

  // Calculate stats
  const totalUsers = users.length
  const onboardedUsers = users.filter(u => u.onboarding_completed).length
  const activeUsers = users.filter(u => {
    if (!u.last_active) return false
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return new Date(u.last_active) > dayAgo
  }).length

  const presentationCounts = users.reduce((acc, user) => {
    if (user.adhd_presentation) {
      acc[user.adhd_presentation] = (acc[user.adhd_presentation] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all user accounts
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {onboardedUsers} onboarded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">V2 Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.onboarding_version === 2).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              DSM-5 assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Presentations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(presentationCounts).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Click on a user to view detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          }>
            <UserTable users={users} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}