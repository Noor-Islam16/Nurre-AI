/**
 * Task Priority Calculation Utilities
 *
 * Handles automatic priority calculation based on due dates and user overrides.
 * Priority levels: 1 = Low, 2 = Medium, 3 = High
 */

export type Priority = 1 | 2 | 3

/**
 * Checks if a task is overdue
 * @param dueDate - ISO date string or Date object
 * @returns true if the due date is in the past
 */
export function isOverdue(dueDate: string | Date | undefined): boolean {
  if (!dueDate) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  return due < today
}

/**
 * Checks if a task is due today
 * @param dueDate - ISO date string or Date object
 * @returns true if the due date is today
 */
export function isDueToday(dueDate: string | Date | undefined): boolean {
  if (!dueDate) return false

  const today = new Date()
  const due = new Date(dueDate)

  return today.toDateString() === due.toDateString()
}

/**
 * Calculates the number of days until the due date
 * @param dueDate - ISO date string or Date object
 * @returns Number of days until due (negative if overdue)
 */
export function getDaysUntilDue(dueDate: string | Date | undefined): number | null {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Calculates automatic priority based on due date
 * Algorithm:
 * - Overdue or 0-1 days: High (3)
 * - 2-7 days: Medium (2)
 * - 7+ days or no due date: Low (1)
 *
 * @param dueDate - ISO date string or Date object
 * @returns Priority level (1, 2, or 3)
 */
export function calculateAutoPriority(dueDate: string | Date | undefined): Priority {
  if (!dueDate) return 1 // No due date = Low priority

  const daysUntil = getDaysUntilDue(dueDate)

  if (daysUntil === null) return 1

  // Overdue or due today/tomorrow
  if (daysUntil <= 1) return 3

  // Due within a week
  if (daysUntil <= 7) return 2

  // Due later than a week
  return 1
}

/**
 * Determines the effective priority for a task
 * Respects user's manual priority override, otherwise uses auto-calculation
 *
 * @param dueDate - ISO date string or Date object
 * @param currentPriority - Current priority level
 * @param priorityOverride - Whether user has manually set priority
 * @returns The effective priority level
 */
export function getEffectivePriority(
  dueDate: string | Date | undefined,
  currentPriority: Priority,
  priorityOverride: boolean
): Priority {
  // If user has manually set priority, respect it
  if (priorityOverride) return currentPriority

  // Otherwise, calculate based on due date
  return calculateAutoPriority(dueDate)
}

/**
 * Formats a due date for display
 * @param dueDate - ISO date string or Date object
 * @returns Formatted string like "Today", "Tomorrow", "Apr 15", or "Overdue"
 */
export function formatDueDate(dueDate: string | Date | undefined): string {
  if (!dueDate) return ''

  const due = new Date(dueDate)
  const daysUntil = getDaysUntilDue(dueDate)

  if (daysUntil === null) return ''

  if (daysUntil < 0) return 'Overdue'
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'

  // Format as "Apr 15" or "Apr 15, 2025" if not current year
  const today = new Date()
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

  if (due.getFullYear() !== today.getFullYear()) {
    options.year = 'numeric'
  }

  return due.toLocaleDateString('en-US', options)
}

/**
 * Gets the color class for a due date indicator
 * @param dueDate - ISO date string or Date object
 * @returns Tailwind color class string
 */
export function getDueDateColorClass(dueDate: string | Date | undefined): string {
  if (!dueDate) return 'text-gray-500'

  const daysUntil = getDaysUntilDue(dueDate)

  if (daysUntil === null) return 'text-gray-500'

  if (daysUntil < 0) return 'text-red-600' // Overdue
  if (daysUntil <= 1) return 'text-amber-600' // Due today/tomorrow
  if (daysUntil <= 7) return 'text-teal-600' // Due this week

  return 'text-gray-600' // Due later
}

/**
 * Gets the border color class for a task based on priority and overdue status
 * @param priority - Priority level (1, 2, or 3)
 * @param isOverdue - Whether the task is overdue
 * @returns Tailwind border color class
 */
export function getTaskBorderColor(priority: Priority, isOverdue: boolean): string {
  if (isOverdue) return 'border-l-red-500'

  switch (priority) {
    case 3:
      return 'border-l-amber-500'
    case 2:
      return 'border-l-teal-500'
    case 1:
    default:
      return 'border-l-gray-400'
  }
}

/**
 * Sorts tasks by priority logic:
 * 1. Overdue tasks first
 * 2. Then by priority (High → Medium → Low)
 * 3. Then by due date (soonest first, tasks without due dates last)
 * 4. Then by creation date (newest first)
 *
 * @param tasks - Array of tasks to sort
 * @returns Sorted array of tasks
 */
export function sortTasksByPriority<T extends {
  dueDate?: Date | string
  priority: number
  createdAt: Date | string
}>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a.dueDate)
    const bOverdue = isOverdue(b.dueDate)

    // 1. Overdue tasks come first
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    // 2. Sort by priority (higher priority first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }

    // 3. Sort by due date (soonest first)
    // Tasks with no due date go to the end
    if (a.dueDate && b.dueDate) {
      const aDate = new Date(a.dueDate).getTime()
      const bDate = new Date(b.dueDate).getTime()
      if (aDate !== bDate) return aDate - bDate
    } else if (a.dueDate && !b.dueDate) {
      return -1 // a has due date, b doesn't - a comes first
    } else if (!a.dueDate && b.dueDate) {
      return 1 // b has due date, a doesn't - b comes first
    }

    // 4. Sort by creation date (newest first)
    const aCreated = new Date(a.createdAt).getTime()
    const bCreated = new Date(b.createdAt).getTime()
    return bCreated - aCreated
  })
}
