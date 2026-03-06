'use client'

import { usePathname } from 'next/navigation'

export type AIVariant = 'dashboard' | 'planner' | 'focus' | null

export interface AIVariantConfig {
  variant: AIVariant
  position: 'grid' | 'sidebar' | 'topbar'
  size: 'compact' | 'medium' | 'minimal'
  expandable: boolean
  showQuickActions: boolean
  maxMessages: number
  inputStyle: 'default' | 'minimal' | 'voice-first'
}

const AI_CONFIGS: Record<NonNullable<AIVariant>, Omit<AIVariantConfig, 'variant'>> = {
  dashboard: {
    position: 'grid',
    size: 'compact',
    expandable: false,
    showQuickActions: true,
    maxMessages: 4,
    inputStyle: 'default'
  },
  planner: {
    position: 'sidebar',
    size: 'medium',
    expandable: true,
    showQuickActions: true,
    maxMessages: 6,
    inputStyle: 'default'
  },
  focus: {
    position: 'topbar',
    size: 'minimal',
    expandable: true,
    showQuickActions: false,
    maxMessages: 3,
    inputStyle: 'minimal'
  }
}

export function useAIVariant(): { variant: AIVariant; config: AIVariantConfig | null; hasAI: boolean } {
  const pathname = usePathname()
  
  // Determine variant based on route (only 3 pages have AI)
  const getVariant = (): AIVariant => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname === '/planner') return 'planner'
    if (pathname === '/focus') return 'focus'
    return null // No AI on other pages
  }
  
  const variant = getVariant()
  
  return {
    variant,
    config: variant ? { variant, ...AI_CONFIGS[variant] } : null,
    hasAI: variant !== null
  }
}