// Onboarding-specific type definitions

// Presentation types
export type ADHDPresentation = 'combined' | 'inattentive' | 'hyperactive' | 'borderline' | 'negative'

// Legacy persona type (for migration)
export type ADHDPersona = 'planner' | 'sprinter' | 'multitasker' | 'motivation' | 'perfectionist'

// Question types
export type QuestionType = 'gender' | 'age' | 'multiselect' | 'likert' | 'frequency' | 'binary' | 'onset'

// Response format based on question type
export type QuestionResponse = 
  | string           // gender, age, onset
  | number           // likert, frequency, binary
  | string[]         // multiselect

// Form data structure
export interface OnboardingFormData {
  [questionId: number]: QuestionResponse
}

// API response types
export interface SubmitAssessmentRequest {
  responses: Array<{
    questionNumber: number
    response: QuestionResponse
  }>
  results?: ScoringResult // Optional pre-calculated results
}

export interface SubmitAssessmentResponse {
  success: boolean
  results: ScoringResult
  message: string
}

export interface SaveProgressRequest {
  responses: Array<{
    questionNumber: number
    response: QuestionResponse
  }>
  currentSection?: number
}

export interface SaveProgressResponse {
  success: boolean
  savedCount: number
  message: string
}

export interface GetProgressResponse {
  success: boolean
  formData: OnboardingFormData
  currentSection: number
  savedCount: number
}

// Scoring result (from scoring engine)
export interface ScoringResult {
  counts: {
    inattEndorsed: number
    hyperEndorsed: number
    totalEndorsed: number
  }
  severity: {
    inatt: number
    hyper: number
  }
  gates: {
    onsetChildhood: boolean
    impairment: boolean
  }
  screen: ADHDPresentation
  routing: {
    topSignals: string[]
  }
  profileData?: {
    task_types: string[]
    focus_time: string
    distraction_pattern: string
    phone_app: string
    adhd_pattern: string
    motivation_style: string
    overwhelm_support: string
    avatar_tone: string
    work_environment: string
    sensory_preference: string
  }
}

// Presentation metadata
export interface PresentationInfo {
  type: ADHDPresentation
  label: string
  description: string
  focusAreas: string[]
  interventionStyle: string
  timerDefaults: {
    work: number
    break: number
  }
}

// Migration mapping
export const PERSONA_TO_PRESENTATION: Record<ADHDPersona, ADHDPresentation> = {
  'planner': 'inattentive',
  'sprinter': 'hyperactive',
  'multitasker': 'combined',
  'motivation': 'inattentive',
  'perfectionist': 'inattentive'
}

// Presentation configurations
export const PRESENTATION_CONFIG: Record<ADHDPresentation, PresentationInfo> = {
  'inattentive': {
    type: 'inattentive',
    label: 'Primarily Inattentive',
    description: 'Difficulties with focus, organization, and task completion',
    focusAreas: ['organization', 'reminders', 'task_breakdown', 'sustained_attention'],
    interventionStyle: 'structured_gentle',
    timerDefaults: {
      work: 25,
      break: 5
    }
  },
  'hyperactive': {
    type: 'hyperactive',
    label: 'Primarily Hyperactive-Impulsive',
    description: 'High energy, restlessness, and impulsive decision-making',
    focusAreas: ['energy_channeling', 'movement_breaks', 'quick_tasks', 'impulse_control'],
    interventionStyle: 'dynamic_engaging',
    timerDefaults: {
      work: 15,
      break: 3
    }
  },
  'combined': {
    type: 'combined',
    label: 'Combined Type',
    description: 'Significant symptoms of both inattention and hyperactivity-impulsivity',
    focusAreas: ['balanced_approach', 'flexible_structure', 'varied_strategies'],
    interventionStyle: 'adaptive',
    timerDefaults: {
      work: 20,
      break: 5
    }
  },
  'borderline': {
    type: 'borderline',
    label: 'Borderline Symptoms',
    description: 'Some ADHD traits present but below clinical threshold',
    focusAreas: ['preventive_strategies', 'light_support', 'productivity_tips'],
    interventionStyle: 'minimal_proactive',
    timerDefaults: {
      work: 30,
      break: 5
    }
  },
  'negative': {
    type: 'negative',
    label: 'No Significant ADHD Symptoms',
    description: 'No clinically significant ADHD symptoms detected',
    focusAreas: ['general_productivity', 'optional_features'],
    interventionStyle: 'optional',
    timerDefaults: {
      work: 25,
      break: 5
    }
  }
}

// Question structure for the assessment
export interface Question {
  id: number
  section: string
  type: QuestionType
  text: string
  options?: string[]
  labels?: string[]
  description?: string
  multiSelect?: boolean
  required: boolean
}

// Assessment validation helpers
export function isValidPresentation(value: string): value is ADHDPresentation {
  return ['combined', 'inattentive', 'hyperactive', 'borderline', 'negative'].includes(value)
}

export function isValidPersona(value: string): value is ADHDPersona {
  return ['planner', 'sprinter', 'multitasker', 'motivation', 'perfectionist'].includes(value)
}

export function getPresentationInfo(presentation: ADHDPresentation): PresentationInfo {
  return PRESENTATION_CONFIG[presentation]
}

export function mapPersonaToPresentation(persona: ADHDPersona): ADHDPresentation {
  return PERSONA_TO_PRESENTATION[persona]
}