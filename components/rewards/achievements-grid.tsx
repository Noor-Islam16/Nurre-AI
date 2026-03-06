'use client'

import { Achievement } from '@/lib/constants/achievements'
import { AchievementCardModern } from './achievement-card-modern'

interface AchievementsGridProps {
  items: Achievement[]
  onShare: (achievement: Achievement) => void
}

export function AchievementsGrid({ items, onShare }: AchievementsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((achievement, index) => (
        <AchievementCardModern
          key={achievement.id}
          achievement={achievement}
          index={index}
          onShare={onShare}
        />
      ))}
    </div>
  )
}
