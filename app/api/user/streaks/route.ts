import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's current streak data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_streak, longest_streak')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('Error fetching user streak data:', userError)
      return NextResponse.json({ error: 'Failed to fetch streak data' }, { status: 500 })
    }
    
    // Get tasks completed today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const { data: todayTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', today.toISOString())
      .lt('completed_at', tomorrow.toISOString())
    
    if (tasksError) {
      console.error('Error fetching today\'s tasks:', tasksError)
    }
    
    // Get streak history for the last 30 days (for visualization)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: completionHistory, error: historyError } = await supabase
      .from('tasks')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: true })
    
    // Process completion history to get daily completion status
    const dailyCompletions = new Map<string, boolean>()
    
    if (completionHistory) {
      completionHistory.forEach(task => {
        if (task.completed_at) {
          const dateKey = new Date(task.completed_at).toISOString().split('T')[0]
          dailyCompletions.set(dateKey, true)
        }
      })
    }
    
    // Build streak calendar data
    const streakCalendar = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      
      streakCalendar.push({
        date: dateKey,
        completed: dailyCompletions.has(dateKey),
        isToday: i === 0
      })
    }
    
    return NextResponse.json({
      currentStreak: userData?.current_streak || 0,
      longestStreak: userData?.longest_streak || 0,
      tasksCompletedToday: todayTasks?.length || 0,
      streakCalendar
    })
    
  } catch (error) {
    console.error('Streak API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint to manually trigger streak calculation (for testing/debugging)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Manually trigger streak recalculation
    const { error } = await supabase.rpc('update_user_streaks', {
      p_user_id: user.id
    })
    
    if (error) {
      console.error('Error updating streak:', error)
      return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 })
    }
    
    // Return updated streak data
    const { data: userData } = await supabase
      .from('users')
      .select('current_streak, longest_streak')
      .eq('id', user.id)
      .single()
    
    return NextResponse.json({
      currentStreak: userData?.current_streak || 0,
      longestStreak: userData?.longest_streak || 0,
      message: 'Streak updated successfully'
    })
    
  } catch (error) {
    console.error('Streak update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}