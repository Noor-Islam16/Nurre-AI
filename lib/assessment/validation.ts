import { differenceInDays } from 'date-fns'

export function canRetakeAssessment(lastAssessment: Date | null): boolean {
  if (!lastAssessment) return true
  
  const daysSinceLastAssessment = differenceInDays(new Date(), lastAssessment)
  return daysSinceLastAssessment >= 90
}

export function getNextAssessmentDate(lastAssessment: Date | null): Date | null {
  if (!lastAssessment) return null
  
  const nextDate = new Date(lastAssessment)
  nextDate.setDate(nextDate.getDate() + 90)
  return nextDate
}

export function formatTimeUntilNextAssessment(lastAssessment: Date | null): string {
  if (!lastAssessment) return 'Available now'
  
  const nextDate = getNextAssessmentDate(lastAssessment)
  if (!nextDate) return 'Available now'
  
  const daysRemaining = differenceInDays(nextDate, new Date())
  
  if (daysRemaining <= 0) return 'Available now'
  if (daysRemaining === 1) return '1 day remaining'
  if (daysRemaining < 7) return `${daysRemaining} days remaining`
  if (daysRemaining < 30) {
    const weeks = Math.floor(daysRemaining / 7)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} remaining`
  }
  
  const months = Math.floor(daysRemaining / 30)
  return `${months} ${months === 1 ? 'month' : 'months'} remaining`
}