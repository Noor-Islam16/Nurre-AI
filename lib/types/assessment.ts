// Assessment types and interfaces

export type AssessmentType = 'asrs' | 'phq9' | 'gad7' | 'dass21'

export type SeverityLevel = 
  | 'none' 
  | 'minimal' 
  | 'low' 
  | 'mild' 
  | 'moderate' 
  | 'moderate_severe' 
  | 'severe'

export interface AssessmentQuestion {
  id: number
  section?: string // For multi-section assessments like ASRS
  text: string
  options: string[]
  values: number[]
  subscale?: string // For DASS-21 subscales
}

export interface AssessmentScoringRule {
  scoring_method: 'sum' | 'average' | 'weighted'
  sections?: Record<string, {
    questions: number[]
    threshold?: number
    description: string
  }>
  subscales?: Record<string, {
    questions: number[]
    label: string
  }>
  total_score?: boolean
  total_threshold?: number
  critical_items?: number[] // Questions that require special attention
}

export interface InterpretationRange {
  min: number
  max: number
  level: SeverityLevel | string
  label: string
  description: string
  recommendation: string
  color?: string // For UI display
}

export interface Assessment {
  id: string
  type: AssessmentType
  name: string
  description: string
  version: string
  questions: AssessmentQuestion[]
  scoring_rules: AssessmentScoringRule
  interpretation_guide: {
    ranges: InterpretationRange[]
    subscales?: Record<string, InterpretationRange[]>
  }
  time_estimate: number // in minutes
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentResponse {
  id: string
  user_id: string
  assessment_id: string
  assessment_type: AssessmentType
  responses: Record<number, number> // question_id -> selected value
  scores: {
    total?: number
    sections?: Record<string, number>
    subscales?: Record<string, number>
  }
  severity_level: SeverityLevel | string
  time_taken: number // in seconds
  started_at: string
  completed_at: string
  is_complete: boolean
  notes?: string
  shared_with_provider: boolean
  provider_notes?: string
  created_at: string
  updated_at: string
}

export interface AssessmentProgress {
  id: string
  user_id: string
  assessment_id: string
  current_question_index: number
  responses: Record<number, number> // Partial responses
  started_at: string
  last_updated: string
  expires_at: string
}

// Assessment statistics for dashboard
export interface AssessmentStats {
  assessment_type: AssessmentType
  total_taken: number
  last_taken?: string
  average_score?: number
  trend?: 'improving' | 'stable' | 'worsening'
  scores_over_time: {
    date: string
    score: number
    severity_level: SeverityLevel | string
  }[]
}

// Helper type for assessment results display
export interface AssessmentResult {
  assessment: Assessment
  response: AssessmentResponse
  interpretation: InterpretationRange
  subscale_interpretations?: Record<string, InterpretationRange>
  comparison_to_previous?: {
    score_change: number
    level_change: string
    days_since_last: number
  }
}

// Form state for assessment flow
export interface AssessmentFormState {
  assessment: Assessment
  currentQuestionIndex: number
  responses: Record<number, number>
  startTime: number
  isComplete: boolean
}

// Domain type for filtering and categorization
export type AssessmentDomain = 'attention' | 'mood' | 'anxiety' | 'stress'

// Assessment configuration for different types
export const ASSESSMENT_CONFIG: Record<AssessmentType, {
  displayName: string
  shortName: string
  description: string
  iconName: string
  color: string
  retakeInterval: number // days
  category: 'adhd' | 'mental_health' | 'executive_function'
  // Extended metadata for UI rendering
  code: string // Short code for display (e.g., 'PHQ-9')
  domain: AssessmentDomain // Primary domain for filtering
  tags: string[] // Tags like 'NHS', 'Validated', 'WHO'
  minutes: number // Estimated completion time
  questions: number // Number of questions
  purposeOneLiner: string // Brief purpose description (≤ 90 chars)
}> = {
  asrs: {
    displayName: 'Adult ADHD Self-Report Scale',
    shortName: 'ASRS-v1.1',
    description: 'WHO/Harvard screening tool for adult ADHD',
    iconName: 'Brain',
    color: 'purple',
    retakeInterval: 30,
    category: 'adhd',
    code: 'ASRS-v1.1',
    domain: 'attention',
    tags: ['NHS', 'WHO', 'Validated'],
    minutes: 5,
    questions: 18,
    purposeOneLiner: 'Screen for adult ADHD symptoms including inattention and hyperactivity'
  },
  phq9: {
    displayName: 'Patient Health Questionnaire-9',
    shortName: 'PHQ-9',
    description: 'Depression severity assessment',
    iconName: 'Heart',
    color: 'blue',
    retakeInterval: 14,
    category: 'mental_health',
    code: 'PHQ-9',
    domain: 'mood',
    tags: ['NHS', 'NICE', 'Validated'],
    minutes: 3,
    questions: 9,
    purposeOneLiner: 'Measure depression severity over the last two weeks'
  },
  gad7: {
    displayName: 'Generalized Anxiety Disorder-7',
    shortName: 'GAD-7',
    description: 'Anxiety severity assessment',
    iconName: 'AlertTriangle',
    color: 'amber',
    retakeInterval: 14,
    category: 'mental_health',
    code: 'GAD-7',
    domain: 'anxiety',
    tags: ['NHS', 'NICE', 'Validated'],
    minutes: 2,
    questions: 7,
    purposeOneLiner: 'Assess generalized anxiety disorder symptoms and severity'
  },
  dass21: {
    displayName: 'Depression Anxiety Stress Scales',
    shortName: 'DASS-21',
    description: 'Comprehensive mental health screening',
    iconName: 'BarChart3',
    color: 'teal',
    retakeInterval: 14,
    category: 'mental_health',
    code: 'DASS-21',
    domain: 'stress',
    tags: ['Validated', 'Multi-domain'],
    minutes: 5,
    questions: 21,
    purposeOneLiner: 'Comprehensive screening for depression, anxiety, and stress symptoms'
  }
}

// Validation helpers
export function isValidAssessmentType(type: string): type is AssessmentType {
  return ['asrs', 'phq9', 'gad7', 'dass21'].includes(type)
}

export function getAssessmentConfig(type: AssessmentType) {
  return ASSESSMENT_CONFIG[type]
}

// Score calculation helper types
export interface ScoreCalculationResult {
  total?: number
  sections?: Record<string, number>
  subscales?: Record<string, number>
  severity_level: SeverityLevel | string
  interpretation: InterpretationRange
  subscale_interpretations?: Record<string, InterpretationRange>
}

// Export helpers
export interface AssessmentExport {
  assessment_info: {
    name: string
    date: string
    version: string
  }
  user_info: {
    id: string
    assessment_date: string
  }
  results: {
    scores: AssessmentResponse['scores']
    severity_level: string
    interpretation: string
    recommendations: string
  }
  responses: {
    question: string
    answer: string
  }[]
  disclaimer: string
  verification_code?: string
}