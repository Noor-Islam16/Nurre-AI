export enum AchievementCategory {
  PRODUCTIVITY = 'productivity',
  CONSISTENCY = 'consistency',
  GROWTH = 'growth',
  SOCIAL = 'social',
  SPECIAL = 'special'
}

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  progress: number
  target: number
  unlocked: boolean
  unlockedAt?: Date
  hidden?: boolean
  chainId?: string
  tips?: string[]
  milestones?: number[]
}

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  // Productivity Category
  {
    id: 'first-task',
    title: 'First Step',
    description: 'Complete your first task',
    icon: '✅',
    category: AchievementCategory.PRODUCTIVITY,
    rarity: AchievementRarity.COMMON,
    target: 1,
    tips: ['Create a simple task and mark it complete']
  },
  {
    id: 'task-master',
    title: 'Task Master',
    description: 'Complete 50 tasks',
    icon: '📋',
    category: AchievementCategory.PRODUCTIVITY,
    rarity: AchievementRarity.RARE,
    target: 50,
    milestones: [10, 25, 40],
    tips: ['Break down large tasks into smaller ones', 'Set realistic daily goals']
  },
  {
    id: 'productivity-legend',
    title: 'Productivity Legend',
    description: 'Complete 500 tasks',
    icon: '🏆',
    category: AchievementCategory.PRODUCTIVITY,
    rarity: AchievementRarity.LEGENDARY,
    target: 500,
    milestones: [100, 200, 350, 450],
    tips: ['Consistency is key', 'Use the AI assistant for task planning']
  },
  {
    id: 'focus-champion',
    title: 'Focus Champion',
    description: 'Complete 100 focus sessions',
    icon: '🎯',
    category: AchievementCategory.PRODUCTIVITY,
    rarity: AchievementRarity.EPIC,
    target: 100,
    milestones: [25, 50, 75],
    tips: ['Start with shorter sessions', 'Take regular breaks']
  },
  
  // Consistency Category
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '📅',
    category: AchievementCategory.CONSISTENCY,
    rarity: AchievementRarity.COMMON,
    target: 7,
    tips: ['Complete at least one task daily']
  },
  {
    id: 'monthly-master',
    title: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '📆',
    category: AchievementCategory.CONSISTENCY,
    rarity: AchievementRarity.RARE,
    target: 30,
    milestones: [14, 21],
    tips: ['Set reminders', 'Start with small daily goals']
  },
  {
    id: 'streak-legend',
    title: 'Streak Legend',
    description: 'Maintain a 100-day streak',
    icon: '🔥',
    category: AchievementCategory.CONSISTENCY,
    rarity: AchievementRarity.LEGENDARY,
    target: 100,
    milestones: [30, 60, 90],
    tips: ['Make it a habit', 'Never skip two days in a row']
  },
  {
    id: 'daily-achiever',
    title: 'Daily Achiever',
    description: 'Complete 5 tasks in one day',
    icon: '⚡',
    category: AchievementCategory.CONSISTENCY,
    rarity: AchievementRarity.COMMON,
    target: 5,
    tips: ['Plan your day ahead', 'Mix easy and hard tasks']
  },
  
  // Growth Category
  {
    id: 'mood-tracker',
    title: 'Mood Tracker',
    description: 'Log your mood 10 times',
    icon: '😊',
    category: AchievementCategory.GROWTH,
    rarity: AchievementRarity.COMMON,
    target: 10,
    tips: ['Check in with yourself regularly']
  },
  {
    id: 'self-aware',
    title: 'Self Aware',
    description: 'Log 50 mood entries',
    icon: '🧠',
    category: AchievementCategory.GROWTH,
    rarity: AchievementRarity.RARE,
    target: 50,
    milestones: [20, 35],
    tips: ['Track patterns in your mood', 'Be honest with yourself']
  },
  {
    id: 'growth-mindset',
    title: 'Growth Mindset',
    description: 'Complete 30 AI coaching sessions',
    icon: '🌱',
    category: AchievementCategory.GROWTH,
    rarity: AchievementRarity.EPIC,
    target: 30,
    milestones: [10, 20],
    tips: ['Ask the AI for advice', 'Be open to feedback']
  },
  
  // Social Category
  {
    id: 'share-success',
    title: 'Share Success',
    description: 'Share an achievement',
    icon: '🎉',
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.COMMON,
    target: 1,
    tips: ['Click the share button on any achievement']
  },
  {
    id: 'team-player',
    title: 'Team Player',
    description: 'Share 10 achievements',
    icon: '🤝',
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.RARE,
    target: 10,
    tips: ['Celebrate your wins', 'Inspire others']
  },
  
  // Special Category
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Complete a task before 8 AM',
    icon: '🌅',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    target: 1,
    hidden: true,
    tips: ['Start your day with a win']
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Complete a focus session after 10 PM',
    icon: '🦉',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    target: 1,
    hidden: true,
    tips: ['Some people work best at night']
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Complete 10 tasks with 100% focus score',
    icon: '💎',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.EPIC,
    target: 10,
    milestones: [3, 6],
    tips: ['Eliminate distractions', 'Work in your optimal environment']
  },
  {
    id: 'year-long-journey',
    title: 'Year-Long Journey',
    description: 'Maintain a 365-day streak',
    icon: '👑',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.LEGENDARY,
    target: 365,
    milestones: [100, 200, 300],
    hidden: true,
    tips: ['The ultimate consistency achievement']
  }
]

export const getCategoryIcon = (category: AchievementCategory): string => {
  switch(category) {
    case AchievementCategory.PRODUCTIVITY: return '🎯'
    case AchievementCategory.CONSISTENCY: return '🔥'
    case AchievementCategory.GROWTH: return '🌱'
    case AchievementCategory.SOCIAL: return '🤝'
    case AchievementCategory.SPECIAL: return '⭐'
    default: return '🏆'
  }
}

export const getCategoryLabel = (category: AchievementCategory): string => {
  switch(category) {
    case AchievementCategory.PRODUCTIVITY: return 'Productivity'
    case AchievementCategory.CONSISTENCY: return 'Consistency'
    case AchievementCategory.GROWTH: return 'Growth'
    case AchievementCategory.SOCIAL: return 'Social'
    case AchievementCategory.SPECIAL: return 'Special'
    default: return 'All'
  }
}

export const getRarityStyles = (rarity: AchievementRarity): string => {
  switch(rarity) {
    case AchievementRarity.COMMON:
      return 'border-gray-300 bg-gray-50/50'
    case AchievementRarity.RARE:
      return 'border-blue-400 bg-blue-50/50 shadow-blue-200 shadow-lg'
    case AchievementRarity.EPIC:
      return 'border-purple-400 bg-purple-50/50 shadow-purple-200 shadow-lg animate-pulse-slow'
    case AchievementRarity.LEGENDARY:
      return 'border-yellow-400 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 shadow-yellow-200 shadow-xl animate-shimmer-gold'
    default:
      return 'border-gray-300 bg-gray-50/50'
  }
}

export const getRarityLabel = (rarity: AchievementRarity): string => {
  switch(rarity) {
    case AchievementRarity.COMMON: return 'Common'
    case AchievementRarity.RARE: return 'Rare'
    case AchievementRarity.EPIC: return 'Epic'
    case AchievementRarity.LEGENDARY: return 'Legendary'
    default: return 'Common'
  }
}

export const getRarityColor = (rarity: AchievementRarity): string => {
  switch(rarity) {
    case AchievementRarity.COMMON: return 'text-gray-600'
    case AchievementRarity.RARE: return 'text-blue-600'
    case AchievementRarity.EPIC: return 'text-purple-600'
    case AchievementRarity.LEGENDARY: return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}