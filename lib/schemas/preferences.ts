import { z } from 'zod'

/**
 * Schema for quiet hours configuration
 */
export const QuietHoursSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  end: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).min(1, 'At least one day must be selected')
})

/**
 * Schema for updating user preferences
 */
export const UpdatePreferencesSchema = z.object({
  quiet_hours: QuietHoursSchema.optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  focus_duration: z.number().min(5).max(90).optional(),
  break_ratio: z.number().min(0.1).max(0.5).optional(),
  notifications: z.boolean().optional(),
  ai_personality: z.enum(['friendly', 'professional', 'balanced', 'minimal', 'supportive']).optional(),
  intervention_cooldown: z.number().min(5).max(60).optional(),
  max_interventions_per_hour: z.number().min(1).max(20).optional()
})

/**
 * Complete preferences schema (for responses)
 */
export const PreferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  quiet_hours: QuietHoursSchema,
  theme: z.enum(['light', 'dark', 'auto']),
  focus_duration: z.number().min(5).max(90),
  break_ratio: z.number().min(0.1).max(0.5),
  notifications: z.boolean(),
  ai_personality: z.enum(['friendly', 'professional', 'balanced', 'minimal', 'supportive']),
  intervention_cooldown: z.number().min(5).max(60),
  max_interventions_per_hour: z.number().min(1).max(20),
  created_at: z.string(),
  updated_at: z.string()
})

export type QuietHours = z.infer<typeof QuietHoursSchema>
export type UpdatePreferences = z.infer<typeof UpdatePreferencesSchema>
export type Preferences = z.infer<typeof PreferencesSchema>