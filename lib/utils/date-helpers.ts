/**
 * Date formatting utilities for Supabase queries
 */

/**
 * Converts a Date to ISO string without milliseconds
 * Supabase has issues with milliseconds in date filters
 * @param date - Date to format
 * @returns ISO string without milliseconds (YYYY-MM-DDTHH:mm:ssZ)
 */
export function toISOStringNoMs(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z'
}

/**
 * Gets current timestamp without milliseconds
 * @returns Current ISO string without milliseconds
 */
export function nowISOStringNoMs(): string {
  return toISOStringNoMs(new Date())
}

/**
 * Gets start of day in ISO format without milliseconds
 * @param date - Optional date (defaults to today)
 * @returns Start of day ISO string without milliseconds
 */
export function startOfDayISO(date: Date = new Date()): string {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return toISOStringNoMs(start)
}

/**
 * Gets end of day in ISO format without milliseconds
 * @param date - Optional date (defaults to today)
 * @returns End of day ISO string without milliseconds
 */
export function endOfDayISO(date: Date = new Date()): string {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return toISOStringNoMs(end)
}