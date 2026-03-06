import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CachedDashboardStats } from '@/lib/stats/cached-stats'
import { createSecureApiResponse } from '@/lib/api/with-security-headers'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return createSecureApiResponse({ error: 'Unauthorized' }, 401)
    }
    
    // Get cached stats (will fetch if not cached)
    const stats = await CachedDashboardStats.getStats(user.id)
    
    return createSecureApiResponse(stats)
    
  } catch (error: any) {
    console.error('Dashboard stats error:', error)
    return createSecureApiResponse(
      { error: error.message || 'Failed to fetch dashboard stats' },
      500
    )
  }
}

// Invalidate cache when data changes
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return createSecureApiResponse({ error: 'Unauthorized' }, 401)
    }
    
    const { type } = await req.json()
    
    // Invalidate cache based on change type
    switch (type) {
      case 'task':
        await CachedDashboardStats.onTaskChange(user.id)
        break
      case 'focus':
        await CachedDashboardStats.onFocusSessionChange(user.id)
        break
      case 'mood':
        await CachedDashboardStats.onMoodChange(user.id)
        break
      case 'streak':
        await CachedDashboardStats.onStreakChange(user.id)
        break
      default:
        await CachedDashboardStats.invalidate(user.id)
    }
    
    return createSecureApiResponse({ success: true })
    
  } catch (error: any) {
    console.error('Cache invalidation error:', error)
    return createSecureApiResponse(
      { error: error.message || 'Failed to invalidate cache' },
      500
    )
  }
}