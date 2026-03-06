import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
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
  const supabase = await createClient()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get users with basic info
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchQuery) {
    query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
  }

  const { data: users, error } = await query

  if (error || !users) {
    console.error('Failed to fetch users:', error)
    return []
  }

  // Enhance with additional stats
  const enhancedUsers = await Promise.all(
    users.map(async (user) => {
      // Get last activity
      const { data: lastActivity } = await supabase
        .from('events')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get task stats
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)

      // Get focus session count
      const { count: totalFocusSessions } = await supabase
        .from('focus_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Check for restrictions
      const { data: restriction } = await supabase
        .from('user_restrictions')
        .select('restriction_level')
        .eq('user_id', user.id)
        .single()

      return {
        ...user,
        last_active: lastActivity?.created_at,
        total_tasks: totalTasks || 0,
        completed_tasks: completedTasks || 0,
        total_focus_sessions: totalFocusSessions || 0,
        has_restriction: restriction?.restriction_level !== 'none' && restriction?.restriction_level !== null,
      }
    })
  )

  return enhancedUsers
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