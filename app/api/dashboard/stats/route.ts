import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CachedDashboardStats } from '@/lib/stats/cached-stats'
import { createSecureApiResponse } from '@/lib/api/with-security-headers'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString()
    
    // Run queries in parallel for better performance
    const [
      tasksCreatedResult,
      tasksCompletedResult,
      sessionsResult,
      userResult,
      moodsResult
    ] = await Promise.all([
      // Tasks created today
      supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', todayStr),
      
      // Tasks completed today
      supabase
        .from('tasks')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', todayStr)
        .lt('completed_at', tomorrowStr),
      
      // Focus sessions today
      supabase
        .from('focus_sessions')
        .select('actual_duration')
        .eq('user_id', user.id)
        .gte('created_at', todayStr),
      
      // User streak data
      supabase
        .from('users')
        .select('current_streak, longest_streak')
        .eq('id', user.id)
        .single(),
      
      // Mood entries today
      supabase
        .from('mood_entries')
        .select('mood, energy, focus')
        .eq('user_id', user.id)
        .gte('created_at', todayStr)
    ])
    
    // Calculate focus minutes
    const focusMinutesToday = sessionsResult.data?.reduce(
      (acc, session) => acc + (session.actual_duration || 0), 
      0
    ) || 0
    
    // Get weekly progress (last 7 days)
    const weeklyProgress = []
    const weekDates = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      weekDates.push({
        date,
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        startStr: date.toISOString(),
        endStr: new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString()
      })
    }
    
    // Batch fetch weekly data
    const weeklyData = await Promise.all(
      weekDates.map(async ({ date, dayName, startStr, endStr }) => {
        const [completedTasks, focusSessions] = await Promise.all([
          supabase
            .from('tasks')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .eq('completed', true)
            .gte('completed_at', startStr)
            .lt('completed_at', endStr),
          
          supabase
            .from('focus_sessions')
            .select('actual_duration')
            .eq('user_id', user.id)
            .gte('created_at', startStr)
            .lt('created_at', endStr)
        ])
        
        const focusMinutes = focusSessions.data?.reduce(
          (acc, s) => acc + (s.actual_duration || 0), 
          0
        ) || 0
        
        return {
          day: dayName,
          completed: completedTasks.count || 0,
          focusMinutes
        }
      })
    )
    
    // Calculate average mood for today (if any entries)
    const moodMap: Record<string, number> = {
      'excellent': 5,
      'good': 4,
      'okay': 3,
      'bad': 2,
      'terrible': 1
    }
    
    const moodValues = moodsResult.data?.map(m => moodMap[m.mood] || 3) || []
    const avgMood = moodValues.length > 0 
      ? Math.round(moodValues.reduce((a, b) => a + b, 0) / moodValues.length)
      : null
    
    const moodLabel = avgMood ? Object.entries(moodMap).find(([_, value]) => value === avgMood)?.[0] || null : null
    
    const stats = {
      todaysTasks: tasksCreatedResult.count || 0,
      completedToday: tasksCompletedResult.count || 0,
      focusMinutesToday,
      currentStreak: userResult.data?.current_streak || 0,
      longestStreak: userResult.data?.longest_streak || 0,
      moodToday: moodLabel,
      moodEntries: moodsResult.data?.length || 0,
      weeklyProgress: weeklyData,
      // Additional helpful stats
      completionRate: (tasksCreatedResult.count || 0) > 0 
        ? Math.round(((tasksCompletedResult.count || 0) / (tasksCreatedResult.count || 1)) * 100)
        : 0,
      avgFocusPerTask: (tasksCompletedResult.count || 0) > 0
        ? Math.round(focusMinutesToday / (tasksCompletedResult.count || 1))
        : 0
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}