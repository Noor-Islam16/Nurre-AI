'use client'

import { Brain, Cloud, Zap, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MusicCategory } from './Player'

interface CategoryCardProps {
  category: MusicCategory
  title: string
  trackCount: number
  isSelected: boolean
  onClick: () => void
  className?: string
}

const CATEGORY_CONFIG: Record<MusicCategory, {
  icon: typeof Brain
  gradient: string
  iconBg: string
  description: string
}> = {
  focus: {
    icon: Brain,
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-400/30',
    description: 'Deep concentration'
  },
  calm: {
    icon: Cloud,
    gradient: 'from-cyan-500 to-teal-500',
    iconBg: 'bg-cyan-400/30',
    description: 'Emotional balance'
  },
  productivity: {
    icon: Zap,
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-400/30',
    description: 'Get things done'
  },
  sleep: {
    icon: Moon,
    gradient: 'from-indigo-500 to-purple-600',
    iconBg: 'bg-indigo-400/30',
    description: 'Wind down'
  }
}

export function CategoryCard({ category, title, trackCount, isSelected, onClick, className }: CategoryCardProps) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200',
        'bg-gradient-to-br',
        config.gradient,
        'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
        isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-slate-100',
        className
      )}
    >
      {/* Icon */}
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', config.iconBg)}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white text-sm mb-0.5">
        {title}
      </h3>

      {/* Description */}
      <p className="text-white/70 text-xs mb-2">
        {config.description}
      </p>

      {/* Track count */}
      <p className="text-white/80 text-xs font-medium">
        {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
      </p>

      {/* Decorative circle */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
    </button>
  )
}
