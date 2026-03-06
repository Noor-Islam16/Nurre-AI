import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Level thresholds for Growth Points
const LEVEL_THRESHOLDS = [
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
]

function getLevelInfo(gp: number) {
  let currentLevel = 1
  let title = 'Beginner'

  for (const threshold of LEVEL_THRESHOLDS) {
    if (gp >= threshold.minGP) {
      currentLevel = threshold.level
      title = threshold.title
    }
  }

  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel + 1)
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel)!

  let progress = 100
  if (nextThreshold) {
    const progressInLevel = gp - currentThreshold.minGP
    const levelRange = nextThreshold.minGP - currentThreshold.minGP
    progress = Math.round((progressInLevel / levelRange) * 100)
  }

  return {
    currentLevel,
    levelTitle: title,
    progressToNextLevel: progress,
    nextLevelThreshold: nextThreshold?.minGP || null
  }
}

// Achievement definitions with metadata
const ACHIEVEMENT_METADATA: Record<string, { title: string; description: string; icon: string }> = {
  'first-task': {
    title: 'First Step',
    description: 'Complete your first task',
    icon: '🎯'
  },
  'week-streak': {
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥'
  },
  'focus-master': {
    title: 'Focus Master', 
    description: 'Complete 10 focus sessions',
    icon: '🧘'
  },
  'task-crusher': {
    title: 'Task Crusher',
    description: 'Complete 50 tasks',
    icon: '💪'
  },
  'early-bird': {
    title: 'Early Bird',
    description: 'Complete a task before 9 AM',
    icon: '🌅'
  },
  'month-streak': {
    title: 'Dedication Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆'
  },
  'focus-century': {
    title: 'Focus Champion',
    description: 'Complete 100 hours of focus time',
    icon: '⏱️'
  },
  'weekend-warrior': {
    title: 'Weekend Warrior',
    description: 'Complete tasks on the weekend',
    icon: '🦸'
  }
}

// Growth stages with emojis
const GROWTH_STAGES = {
  'Seed': { emoji: '🌱', minProgress: 0 },
  'Sprout': { emoji: '🌿', minProgress: 20 },
  'Sapling': { emoji: '🪴', minProgress: 40 },
  'Plant': { emoji: '🌳', minProgress: 60 },
  'Tree': { emoji: '🌲', minProgress: 80 },
  'Forest': { emoji: '🌴', minProgress: 95 }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch Growth Points data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('growth_points, current_level, last_daily_bonus, current_streak, longest_streak')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user GP data:', userError)
    }

    // Calculate level info
    const growthPoints = userData?.growth_points || 0
    const levelInfo = getLevelInfo(growthPoints)

    // Get user reward stats (legacy)
    const { data: rewardStats, error: statsError } = await supabase
      .rpc('get_user_rewards', { p_user_id: user.id })
      .single()

    if (statsError || !rewardStats) {
      console.error('Error fetching reward stats:', statsError)
      // Don't fail completely - return GP data at minimum
      if (!userData) {
        return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 })
      }
    }
    
    // Type the reward stats
    const typedRewardStats = rewardStats as {
      current_streak: number
      longest_streak: number
      total_points: number
      current_stage: string
      progress: number
    }
    
    // Get achievement progress
    const { data: achievementData, error: achievementError } = await supabase
      .rpc('check_user_achievements', { p_user_id: user.id })
    
    if (achievementError) {
      console.error('Error fetching achievements:', achievementError)
    }
    
    // Map achievements with metadata
    const achievements = achievementData?.map((a: any) => ({
      id: a.achievement_id,
      title: ACHIEVEMENT_METADATA[a.achievement_id]?.title || 'Unknown Achievement',
      description: ACHIEVEMENT_METADATA[a.achievement_id]?.description || '',
      icon: ACHIEVEMENT_METADATA[a.achievement_id]?.icon || '🏅',
      unlocked: a.unlocked,
      progress: a.progress,
      target: a.target,
      unlockedAt: a.unlocked ? new Date().toISOString() : null // In production, track actual unlock date
    })) || []
    
    // Get the appropriate growth stage emoji
    const stageKey = typedRewardStats.current_stage as keyof typeof GROWTH_STAGES
    const stageData = GROWTH_STAGES[stageKey] || GROWTH_STAGES['Seed']
    
    // Calculate motivational message based on progress
    let motivationalMessage = ''
    if (typedRewardStats.current_streak === 0) {
      motivationalMessage = 'Start your journey today! Complete a task to begin your streak.'
    } else if (typedRewardStats.current_streak < 3) {
      motivationalMessage = 'Great start! Keep going to build momentum.'
    } else if (typedRewardStats.current_streak < 7) {
      motivationalMessage = `${typedRewardStats.current_streak} days strong! You're building a habit.`
    } else if (typedRewardStats.current_streak < 30) {
      motivationalMessage = `Amazing ${typedRewardStats.current_streak}-day streak! You're on fire! 🔥`
    } else {
      motivationalMessage = `Incredible ${typedRewardStats.current_streak}-day streak! You're unstoppable! 🚀`
    }
    
    // Check for recent milestones
    const milestones = []
    if (typedRewardStats.current_streak === 7) {
      milestones.push('🎉 Week streak achieved!')
    }
    if (typedRewardStats.current_streak === 30) {
      milestones.push('🏆 Month streak achieved!')
    }
    if ((rewardStats as any).total_tasks_completed === 50) {
      milestones.push('💪 50 tasks completed!')
    }
    if ((rewardStats as any).total_tasks_completed === 100) {
      milestones.push('🌟 100 tasks completed!')
    }
    
    // Cast rewardStats to any for accessing all properties
    const fullStats = (rewardStats || {}) as any

    const response = {
      // Growth Points data (NEW - Primary)
      growthPoints: growthPoints,
      currentLevel: levelInfo.currentLevel,
      levelTitle: levelInfo.levelTitle,
      progressToNextLevel: levelInfo.progressToNextLevel,
      nextLevelThreshold: levelInfo.nextLevelThreshold,
      lastDailyBonus: userData?.last_daily_bonus || null,

      // Streaks (use userData if available, fallback to rewardStats)
      currentStreak: userData?.current_streak || typedRewardStats?.current_streak || 0,
      longestStreak: userData?.longest_streak || typedRewardStats?.longest_streak || 0,

      // Legacy fields (for backwards compatibility)
      points: growthPoints, // Deprecated, use growthPoints
      growthProgress: fullStats.growth_percentage || 0,
      growthStage: {
        name: typedRewardStats?.current_stage || 'Seed',
        emoji: stageData.emoji,
        nextStage: Object.entries(GROWTH_STAGES).find(
          ([, data]) => data.minProgress > (fullStats.growth_percentage || 0)
        )?.[0] || null
      },

      // Activity stats
      totalTasksCompleted: fullStats.total_tasks_completed || 0,
      totalFocusMinutes: fullStats.total_focus_minutes || 0,
      tasksToday: fullStats.tasks_today || 0,
      focusToday: fullStats.focus_today || 0,
      tasksThisWeek: fullStats.tasks_this_week || 0,

      // Achievements
      achievements,
      motivationalMessage,
      milestones,

      // Stats
      stats: {
        earlyBirdCount: fullStats.early_bird_count || 0,
        averageDailyTasks: fullStats.tasks_this_week
          ? Math.round(fullStats.tasks_this_week / 7 * 10) / 10
          : 0,
        focusHoursTotal: Math.round((fullStats.total_focus_minutes || 0) / 60 * 10) / 10
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Rewards API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint to grant rewards (for testing or manual rewards)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { type, value, reason } = body
    
    // Log reward event
    await supabase.from('events').insert({
      user_id: user.id,
      type: 'reward_granted',
      data: { type, value, reason }
    })
    
    // If it's a streak update, update the user record
    if (type === 'streak') {
      const { data: profile } = await supabase
        .from('users')
        .select('current_streak, longest_streak')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        const newStreak = profile.current_streak + (value || 1)
        await supabase
          .from('users')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, profile.longest_streak)
          })
          .eq('id', user.id)
      }
    }
    
    return NextResponse.json({ success: true, message: 'Reward granted' })
    
  } catch (error) {
    console.error('Reward grant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}