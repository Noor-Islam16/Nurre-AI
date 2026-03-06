/**
 * Simple Pattern Detection Types
 * Lightweight pattern insights using existing data - no complex algorithms
 */

export interface SimplePattern {
  type: 'peak_hours' | 'focus_duration' | 'task_velocity' | 'momentum' | 'procrastination_risk'
  title: string
  insight: string
  confidence: number  // 0-1 confidence score
  recommendation?: string
  trend?: 'up' | 'down' | 'stable'
  icon?: 'zap' | 'clock' | 'trending-up' | 'alert-circle' | 'check-circle'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

export interface PatternResponse {
  patterns: SimplePattern[]
  calculatedAt: string
  userId: string
}

// Pattern type metadata for UI display
export const PATTERN_CONFIG = {
  peak_hours: {
    icon: 'zap' as const,
    color: 'yellow' as const,
    priority: 1
  },
  focus_duration: {
    icon: 'clock' as const,
    color: 'blue' as const,
    priority: 2
  },
  task_velocity: {
    icon: 'trending-up' as const,
    color: 'green' as const,
    priority: 3
  },
  momentum: {
    icon: 'check-circle' as const,
    color: 'purple' as const,
    priority: 4
  },
  procrastination_risk: {
    icon: 'alert-circle' as const,
    color: 'red' as const,
    priority: 5
  }
} as const

// Helper to format time for display
export function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:00 ${period}`
}

// Helper to calculate confidence based on data points
export function calculateConfidence(dataPoints: number, minRequired: number = 5): number {
  if (dataPoints === 0) return 0
  if (dataPoints >= minRequired * 2) return 0.9
  if (dataPoints >= minRequired) return 0.7
  return Math.min(0.5, dataPoints / minRequired)
}