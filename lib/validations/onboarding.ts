import { z } from 'zod'

// Presentation type enum
export const presentationSchema = z.enum([
  'combined',
  'inattentive', 
  'hyperactive',
  'borderline',
  'negative'
])

// Legacy persona type enum
export const personaSchema = z.enum([
  'planner',
  'sprinter',
  'multitasker',
  'motivation',
  'perfectionist'
])

// Question response validation
export const questionResponseSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.string())
])

// Individual onboarding response
export const onboardingResponseSchema = z.object({
  questionNumber: z.number().min(1).max(20), // Updated for 20-question version
  response: questionResponseSchema
})

// Submit assessment request validation
export const submitAssessmentSchema = z.object({
  responses: z.array(onboardingResponseSchema).length(20), // Updated for 20-question version
  results: z.object({
    counts: z.object({
      inattEndorsed: z.number().min(0).max(6), // Max 6 for 20-question version
      hyperEndorsed: z.number().min(0).max(6), // Max 6 for 20-question version
      totalEndorsed: z.number().min(0).max(12) // Max 12 for 20-question version
    }),
    severity: z.object({
      inatt: z.number().min(0).max(100),
      hyper: z.number().min(0).max(100)
    }),
    gates: z.object({
      onsetChildhood: z.boolean(),
      impairment: z.boolean()
    }),
    screen: presentationSchema,
    routing: z.object({
      topSignals: z.array(z.string())
    })
  }).optional()
})

// Save progress request validation
export const saveProgressSchema = z.object({
  responses: z.array(onboardingResponseSchema).min(1).max(20),
  currentSection: z.number().min(0).max(3).optional()
})

// Scoring result validation
export const scoringResultSchema = z.object({
  counts: z.object({
    inattEndorsed: z.number().min(0).max(6), // Max 6 for 20-question version
    hyperEndorsed: z.number().min(0).max(6), // Max 6 for 20-question version
    totalEndorsed: z.number().min(0).max(12) // Max 12 for 20-question version
  }),
  severity: z.object({
    inatt: z.number().min(0).max(100),
    hyper: z.number().min(0).max(100)
  }),
  gates: z.object({
    onsetChildhood: z.boolean(),
    impairment: z.boolean()
  }),
  screen: presentationSchema,
  routing: z.object({
    topSignals: z.array(z.string())
  })
})

// Database onboarding response validation
export const dbOnboardingResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  question_number: z.number().min(1).max(20),
  response: z.string(), // Always stored as string in DB
  created_at: z.string().datetime()
})

// Database onboarding result validation
export const dbOnboardingResultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  inatt_endorsed: z.number().min(0).max(6),
  hyper_endorsed: z.number().min(0).max(6),
  total_endorsed: z.number().min(0).max(12),
  inatt_severity: z.number().min(0).max(100),
  hyper_severity: z.number().min(0).max(100),
  adhd_presentation: presentationSchema,
  onset_childhood: z.boolean(),
  impairment: z.boolean(),
  top_signals: z.array(z.string()),
  completed_at: z.string().datetime(),
  assessment_version: z.number().min(1)
})

// User profile update validation
export const userProfileUpdateSchema = z.object({
  adhd_presentation: presentationSchema.optional(),
  inatt_severity: z.number().min(0).max(100).optional(),
  hyper_severity: z.number().min(0).max(100).optional(),
  onboarding_version: z.number().min(1).optional(),
  onboarding_completed: z.boolean().optional()
})

// Form data validation (for client-side)
export const formDataSchema = z.record(
  z.number(),
  questionResponseSchema
)

// Question validation
export const questionSchema = z.object({
  id: z.number(),
  section: z.string(),
  type: z.enum(['gender', 'age', 'multiselect', 'likert', 'frequency', 'binary', 'onset']),
  text: z.string(),
  options: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  description: z.string().optional(),
  multiSelect: z.boolean().optional(),
  required: z.boolean()
})

// Specific response validators
export const genderResponseSchema = z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'])

export const ageResponseSchema = z.string().regex(/^\d+$/).transform(val => {
  const age = parseInt(val, 10)
  if (age < 18 || age > 120) {
    throw new Error('Age must be between 18 and 120')
  }
  return val
})

export const likertResponseSchema = z.number().min(0).max(3) // 0-3 for 4-point scale

export const frequencyResponseSchema = z.number().min(0).max(4) // 0-4 for 5-point scale

export const binaryResponseSchema = z.number().min(0).max(1) // 0 or 1

export const onsetResponseSchema = z.enum(['Before 12', 'After 12', 'Unsure'])

export const multiSelectResponseSchema = z.array(z.string()).min(1)

// Validation helpers
export function validateAssessmentSubmission(data: unknown) {
  return submitAssessmentSchema.safeParse(data)
}

export function validateProgressSave(data: unknown) {
  return saveProgressSchema.safeParse(data)
}

export function validateScoringResult(data: unknown) {
  return scoringResultSchema.safeParse(data)
}

export function validateFormData(data: unknown) {
  return formDataSchema.safeParse(data)
}

// Response validation by question type
export function validateQuestionResponse(type: string, value: unknown) {
  switch (type) {
    case 'gender':
      return genderResponseSchema.safeParse(value)
    case 'age':
      return ageResponseSchema.safeParse(value)
    case 'likert':
      return likertResponseSchema.safeParse(value)
    case 'frequency':
      return frequencyResponseSchema.safeParse(value)
    case 'binary':
      return binaryResponseSchema.safeParse(value)
    case 'onset':
      return onsetResponseSchema.safeParse(value)
    case 'multiselect':
      return multiSelectResponseSchema.safeParse(value)
    default:
      return { success: false, error: new Error(`Unknown question type: ${type}`) }
  }
}

// Check if all required questions are answered
export function validateCompleteness(formData: Record<number, unknown>, totalQuestions: number = 20) {
  const answered = Object.keys(formData).map(Number).filter(id => id >= 1 && id <= totalQuestions)
  return answered.length === totalQuestions
}

// Export types
export type ADHDPresentation = z.infer<typeof presentationSchema>
export type ADHDPersona = z.infer<typeof personaSchema>
export type QuestionResponse = z.infer<typeof questionResponseSchema>
export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>
export type ScoringResult = z.infer<typeof scoringResultSchema>
export type FormData = z.infer<typeof formDataSchema>
export type Question = z.infer<typeof questionSchema>