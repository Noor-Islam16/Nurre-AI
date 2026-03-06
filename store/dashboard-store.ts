import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toISOStringNoMs } from '@/lib/utils/date-helpers'
import { requestCache } from '@/lib/cache/request-cache'
import { dbCircuitBreaker } from '@/lib/resilience/circuit-breaker'
import { useUserStore } from './user-store'

interface DashboardStats {
  todaysTasks: number
  completedToday: number
  focusMinutesToday: number
  currentStreak: number
  moodToday: string[]
  dailyTaskGoal: number
  weeklyProgress: {
    day: string
    completed: number
    focusMinutes: number
  }[]
}

interface DashboardStore {
  stats: DashboardStats | null
  isLoading: boolean
  fetchStats: () => Promise<void>
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: null,
  isLoading: false,
  
  fetchStats: async () => {
    set({ isLoading: true })

    try {
      const supabase = createClient()

      // Try user store first, fall back to direct Supabase auth
      let user = useUserStore.getState().user
      if (!user) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          user = authUser
        } catch (e) {
          console.error('[Dashboard] Failed to get user:', e)
        }
      }

      if (!user) {
        set({ isLoading: false })
        return
      }

      // Check cache first
      const cacheKey = `dashboard-stats-${user.id}`
      const cached = requestCache.get<DashboardStats>(cacheKey)

      if (cached) {
        set({ stats: cached, isLoading: false })
        return
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Run today's queries in parallel for speed
      const [tasksCreatedRes, tasksCompletedRes, sessionsRes, moodsRes, profileRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).gte('created_at', toISOStringNoMs(today)),
        supabase.from('tasks').select('id,completed_at').eq('user_id', user.id).eq('completed', true).gte('completed_at', toISOStringNoMs(today)).lt('completed_at', toISOStringNoMs(tomorrow)),
        supabase.from('focus_sessions').select('*').eq('user_id', user.id).gte('created_at', toISOStringNoMs(today)),
        supabase.from('mood_entries').select('*').eq('user_id', user.id).gte('created_at', toISOStringNoMs(today)),
        supabase.from('users').select('current_streak').eq('id', user.id).single(),
      ])

      const tasksCreatedToday = tasksCreatedRes.data
      const tasksCompletedToday = tasksCompletedRes.data
      const sessions = sessionsRes.data
      const moods = moodsRes.data
      const profile = profileRes.data

      // Calculate weekly progress — run each day's queries in parallel
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)
        return { date, nextDate }
      })

      const weekResults = await Promise.all(
        weekDays.map(({ date, nextDate }) =>
          Promise.all([
            supabase.from('tasks').select('id').eq('user_id', user!.id).eq('completed', true).gte('completed_at', toISOStringNoMs(date)).lt('completed_at', toISOStringNoMs(nextDate)),
            supabase.from('focus_sessions').select('actual_duration').eq('user_id', user!.id).gte('created_at', toISOStringNoMs(date)).lt('created_at', toISOStringNoMs(nextDate)),
          ])
        )
      )

      const weeklyProgress = weekDays.map(({ date }, i) => ({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        completed: weekResults[i][0].data?.length || 0,
        focusMinutes: weekResults[i][1].data?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0,
      }))

      const completedCount = tasksCompletedToday?.length || 0
      const pendingCount = (tasksCreatedToday?.filter(t => !t.completed)?.length || 0)
      const dailyTaskGoal = Math.max(3, completedCount + pendingCount)

      const stats: DashboardStats = {
        todaysTasks: tasksCreatedToday?.length || 0,
        completedToday: tasksCompletedToday?.length || 0,
        focusMinutesToday: sessions?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0,
        currentStreak: profile?.current_streak || 0,
        moodToday: moods?.map(m => m.mood) || [],
        dailyTaskGoal,
        weeklyProgress,
      }

      // Cache for 1 minute
      requestCache.set(cacheKey, stats, 60000)

      set({ stats, isLoading: false })
    } catch (err) {
      console.error('[Dashboard] fetchStats failed:', err)
      set({ isLoading: false })
    }
  },
}))