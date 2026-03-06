import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { toISOStringNoMs } from '@/lib/utils/date-helpers'
import { Achievement } from '@/lib/constants/achievements'
import { requestCache } from '@/lib/cache/request-cache'
import { useUserStore } from './user-store'

// Growth Points Level Thresholds
export const LEVEL_THRESHOLDS = [
  { level: 1, minGP: 0, title: 'Beginner' },
  { level: 2, minGP: 100, title: 'Getting Started' },
  { level: 3, minGP: 250, title: 'Building Momentum' },
  { level: 4, minGP: 500, title: 'Finding Flow' },
  { level: 5, minGP: 1000, title: 'Consistent' },
  { level: 6, minGP: 2000, title: 'Dedicated' },
  { level: 7, minGP: 5000, title: 'Committed' },
  { level: 8, minGP: 10000, title: 'Master' },
  { level: 9, minGP: 20000, title: 'Legend' },
  { level: 10, minGP: 50000, title: 'Grandmaster' },
] as const

// Growth Points Values for Activities
export const GP_VALUES = {
  daily_bonus: 5,
  task_complete: 10,
  focus_complete: 20,
  mood_checkin: 5,
  breathing_complete: 5,
} as const

interface RewardsStore {
  currentStreak: number
  longestStreak: number
  totalPoints: number
  achievements: Achievement[]
  previouslyUnlocked: string[]
  isLoading: boolean
  _isFetching: boolean
  _lastFetchedAt?: number

  // Growth Points state
  growthPoints: number
  currentLevel: number
  lastDailyBonus: string | null
  isLoadingGP: boolean

  fetchRewards: () => Promise<void>
  updateStreak: () => Promise<void>
  addPoints: (points: number) => Promise<void>
  checkAchievements: () => Promise<void>
  checkForNewAchievements: () => Achievement[]

  // Growth Points methods
  fetchGrowthPoints: () => Promise<void>
  earnGP: (amount: number, reason: string) => Promise<{
    success: boolean
    newTotal?: number
    newLevel?: number
    leveledUp?: boolean
  }>
  claimDailyBonus: () => Promise<{
    success: boolean
    alreadyClaimed?: boolean
    newTotal?: number
    newLevel?: number
    leveledUp?: boolean
  }>
  getLevel: () => number
  getLevelTitle: () => string
  getProgressToNextLevel: () => number
  getNextLevelThreshold: () => number | null

  // Computed getters
  get level(): number

  // Tool-friendly methods for native tool calling
  grantRewardFromTool: (params: {
    type: 'points' | 'achievement' | 'streak'
    value: number | string
    reason?: string
  }) => Promise<{ success: boolean; error?: string }>

  celebrateFromTool: (params: {
    event: string
    message?: string
  }) => Promise<{ success: boolean; error?: string }>
}

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  currentStreak: 0,
  longestStreak: 0,
  totalPoints: 0,
  achievements: [],
  previouslyUnlocked: [],
  isLoading: false,
  _isFetching: false,
  _lastFetchedAt: undefined,

  // Growth Points initial state
  growthPoints: 0,
  currentLevel: 1,
  lastDailyBonus: null,
  isLoadingGP: false,

  fetchRewards: async () => {
    const now = Date.now()
    const { _isFetching, _lastFetchedAt } = get()
    // Simple throttle: prevent overlapping calls and refetches within 5s
    if (_isFetching) return
    if (_lastFetchedAt && now - _lastFetchedAt < 5000) return

    // Serve from cache if recent (60s TTL)
    const cacheKey = 'rewards-store:data'
    const cached = requestCache.get<any>(cacheKey)
    if (cached) {
      set({
        currentStreak: cached.currentStreak || 0,
        longestStreak: cached.longestStreak || 0,
        achievements: cached.achievements || [],
        isLoading: false,
        _isFetching: false,
        _lastFetchedAt: now,
      })
      return
    }
    set({ isLoading: true, _isFetching: true })

    try {
      // Fetch rewards data from API
      const response = await fetch('/api/rewards')

      if (!response.ok) {
        throw new Error('Failed to fetch rewards')
      }

      const data = await response.json()

      // Update store with API data
      set({
        currentStreak: data.currentStreak || 0,
        longestStreak: data.longestStreak || 0,
        achievements: data.achievements || [],
        isLoading: false,
        _isFetching: false,
        _lastFetchedAt: now,
      })

      // Cache result for 60 seconds
      requestCache.set(cacheKey, data, 60000)

      // Check for newly unlocked achievements
      const previousAchievements = get().achievements
      const newlyUnlocked = data.achievements.filter((achievement: Achievement) => {
        const prev = previousAchievements.find(a => a.id === achievement.id)
        return achievement.unlocked && prev && !prev.unlocked
      })

      // Trigger celebrations for newly unlocked achievements
      newlyUnlocked.forEach((achievement: Achievement) => {
        window.dispatchEvent(new CustomEvent('achievement-unlocked', {
          detail: achievement
        }))
      })

    } catch (error) {
      console.error('Failed to fetch rewards:', error)
      set({ isLoading: false, _isFetching: false, _lastFetchedAt: now })
    }
  },

  updateStreak: async () => {
    try {
      const supabase = createClient()
      const user = useUserStore.getState().user

      if (!user) return

      // Check if user has completed tasks today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: todaysTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', toISOStringNoMs(today))

      if (todaysTasks && todaysTasks.length > 0) {
        const { data: profile } = await supabase
          .from('users')
          .select('current_streak, longest_streak')
          .eq('id', user.id)
          .single()

        if (profile) {
          let newStreak = profile.current_streak + 1
          const newLongestStreak = Math.max(newStreak, profile.longest_streak)

          await supabase
            .from('users')
            .update({
              current_streak: newStreak,
              longest_streak: newLongestStreak,
            })
            .eq('id', user.id)

          set({
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
          })
        }
      }
    } catch (err) {
      console.error('[Rewards] updateStreak failed:', err)
    }
  },

  addPoints: async (points) => {
    set((state) => ({
      totalPoints: state.totalPoints + points,
    }))

    // Note: Points are tracked locally for UI
    // Growth Points (GP) system will replace this in future tasks
  },

  checkAchievements: async () => {
    const achievements = get().achievements
    const updatedAchievements = [...achievements]

    // Check each achievement
    for (const achievement of updatedAchievements) {
      if (!achievement.unlocked && achievement.progress >= achievement.target) {
        achievement.unlocked = true
        achievement.unlockedAt = new Date()

        // Show celebration
        window.dispatchEvent(new CustomEvent('achievement-unlocked', {
          detail: achievement
        }))
      }
    }

    set({ achievements: updatedAchievements })
  },

  checkForNewAchievements: () => {
    const previousUnlocked = get().previouslyUnlocked || []
    const currentAchievements = get().achievements

    const newlyUnlocked = currentAchievements.filter(a =>
      a.unlocked && !previousUnlocked.includes(a.id)
    )

    if (newlyUnlocked.length > 0) {
      set({
        previouslyUnlocked: currentAchievements
          .filter(a => a.unlocked)
          .map(a => a.id)
      })
    }

    return newlyUnlocked
  },

  // Growth Points methods
  fetchGrowthPoints: async () => {
    set({ isLoadingGP: true })

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        set({ isLoadingGP: false })
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('growth_points, current_level, last_daily_bonus')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('[Rewards] Error fetching growth points:', error)
        set({ isLoadingGP: false })
        return
      }

      if (data) {
        set({
          growthPoints: data.growth_points || 0,
          currentLevel: data.current_level || 1,
          lastDailyBonus: data.last_daily_bonus,
          isLoadingGP: false
        })
      } else {
        set({ isLoadingGP: false })
      }
    } catch (err) {
      console.error('[Rewards] fetchGrowthPoints threw:', err)
      set({ isLoadingGP: false })
    }
  },

  earnGP: async (amount: number, reason: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return { success: false }

      const { data, error } = await supabase
        .rpc('add_growth_points', {
          p_user_id: user.id,
          p_points: amount,
          p_reason: reason
        })

      if (error) {
        console.error('[Rewards] Error earning GP:', error)
        return { success: false }
      }

      const result = data?.[0]
      if (!result) return { success: false }

      const oldLevel = get().currentLevel

      set({
        growthPoints: result.new_total,
        currentLevel: result.new_level
      })

      if (result.leveled_up && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('level-up', {
          detail: {
            oldLevel,
            newLevel: result.new_level,
            totalGP: result.new_total
          }
        }))
      }

      return {
        success: true,
        newTotal: result.new_total,
        newLevel: result.new_level,
        leveledUp: result.leveled_up
      }
    } catch (err) {
      console.error('[Rewards] earnGP threw:', err)
      return { success: false }
    }
  },

  claimDailyBonus: async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { lastDailyBonus } = get()

      if (lastDailyBonus === today) {
        return { success: false, alreadyClaimed: true }
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return { success: false }

      const { error: updateError } = await supabase
        .from('users')
        .update({ last_daily_bonus: today })
        .eq('id', user.id)

      if (updateError) {
        console.error('[Rewards] Error updating daily bonus date:', updateError)
        return { success: false }
      }

      const result = await get().earnGP(GP_VALUES.daily_bonus, 'daily_bonus')

      if (result.success) {
        set({ lastDailyBonus: today })
      }

      return {
        success: result.success,
        newTotal: result.newTotal,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp
      }
    } catch (err) {
      console.error('[Rewards] claimDailyBonus threw:', err)
      return { success: false }
    }
  },

  getLevel: () => {
    const gp = get().growthPoints

    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (gp >= LEVEL_THRESHOLDS[i].minGP) {
        return LEVEL_THRESHOLDS[i].level
      }
    }
    return 1
  },

  getLevelTitle: () => {
    const level = get().currentLevel
    return LEVEL_THRESHOLDS.find(t => t.level === level)?.title || 'Beginner'
  },

  getProgressToNextLevel: () => {
    const { growthPoints, currentLevel } = get()

    if (currentLevel >= 10) return 100 // Max level

    const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)
    const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1)

    if (!currentThreshold || !nextThreshold) return 0

    const progressInLevel = growthPoints - currentThreshold.minGP
    const levelRange = nextThreshold.minGP - currentThreshold.minGP

    return Math.round((progressInLevel / levelRange) * 100)
  },

  getNextLevelThreshold: () => {
    const { currentLevel } = get()

    if (currentLevel >= 10) return null

    return LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1)?.minGP || null
  },

  get level() {
    return Math.floor(get().totalPoints / 100) + 1
  },

  // Tool-friendly methods for native tool calling
  grantRewardFromTool: async (params) => {
    try {
      const supabase = createClient()
      const user = useUserStore.getState().user

      if (!user) {
        return { success: false, error: 'No authenticated user' }
      }

      switch (params.type) {
        case 'points':
          const points = typeof params.value === 'number' ? params.value : parseInt(params.value, 10)
          await get().addPoints(points)

          // Log reward event
          await supabase.from('events').insert({
            user_id: user.id,
            type: 'reward_granted',
            data: {
              type: 'points',
              value: points,
              reason: params.reason || 'Tool reward'
            }
          })
          break

        case 'achievement':
          const achievementId = params.value.toString()
          const achievements = [...get().achievements]
          const achievement = achievements.find(a => a.id === achievementId)

          if (achievement && !achievement.unlocked) {
            achievement.unlocked = true
            achievement.unlockedAt = new Date()
            set({ achievements })

            // Trigger celebration
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('achievement-unlocked', {
                detail: achievement
              }))
            }
          }
          break

        case 'streak':
          const streakDays = typeof params.value === 'number' ? params.value : 1
          const currentStreak = get().currentStreak + streakDays
          const longestStreak = Math.max(currentStreak, get().longestStreak)

          await supabase
            .from('users')
            .update({
              current_streak: currentStreak,
              longest_streak: longestStreak
            })
            .eq('id', user.id)

          set({ currentStreak, longestStreak })
          break
      }

      return { success: true }
    } catch (error) {
      console.error('Tool reward grant failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  celebrateFromTool: async (params) => {
    try {
      // Trigger celebration event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tool-celebration', {
          detail: {
            event: params.event,
            message: params.message || `Celebrating ${params.event}!`
          }
        }))
      }

      // Could also add points or update achievements
      if (params.event === 'task_completed') {
        await get().addPoints(10)
      } else if (params.event === 'focus_completed') {
        await get().addPoints(25)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },
}))
