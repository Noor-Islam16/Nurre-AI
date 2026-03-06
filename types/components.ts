// Component prop type definitions

import type { Question, QuestionResponse, ScoringResult, OnboardingFormData } from './onboarding'

// Onboarding component props
export interface OnboardingPageProps {
  initialData?: OnboardingFormData
  onComplete?: (results: ScoringResult) => void
  onSaveProgress?: (data: OnboardingFormData) => Promise<void>
}

export interface QuestionRendererProps {
  question: Question
  value: QuestionResponse | undefined
  onChange: (value: QuestionResponse) => void
  disabled?: boolean
  error?: string
}

export interface LikertScaleProps {
  value?: number
  onChange: (value: number) => void
  labels?: string[]
  disabled?: boolean
  className?: string
}

export interface ProgressIndicatorProps {
  currentSection: number
  totalSections: number
  currentQuestion: number
  totalQuestions: number
  completedQuestions?: number
}

export interface ResultsDisplayProps {
  results: ScoringResult
  onContinue: () => void
  onExport?: () => void
  onRetake?: () => void
  loading?: boolean
}

// Section component props
export interface SectionProps {
  sectionNumber: number
  title: string
  description?: string
  questions: Question[]
  formData: OnboardingFormData
  onValueChange: (questionId: number, value: QuestionResponse) => void
  errors?: Record<number, string>
  disabled?: boolean
}

// Navigation component props
export interface NavigationButtonsProps {
  onPrevious?: () => void
  onNext?: () => void
  onSubmit?: () => void
  canGoBack: boolean
  canGoNext: boolean
  isLastSection: boolean
  isSubmitting?: boolean
  submitText?: string
}

// Response display props
export interface ResponseItemProps {
  question: Question
  response: QuestionResponse
  editable?: boolean
  onEdit?: (value: QuestionResponse) => void
}

// Summary component props
export interface SummaryViewProps {
  formData: OnboardingFormData
  questions: Question[]
  onEdit?: (questionId: number) => void
  readOnly?: boolean
}

// Severity display props
export interface SeverityMeterProps {
  label: string
  value: number
  maxValue?: number
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'purple'
  showPercentage?: boolean
  description?: string
}

// Presentation card props
export interface PresentationCardProps {
  presentation: 'combined' | 'inattentive' | 'hyperactive' | 'borderline' | 'negative'
  severity?: {
    inatt: number
    hyper: number
  }
  isSelected?: boolean
  onClick?: () => void
  showDetails?: boolean
}

// Export button props
export interface ExportButtonProps {
  results: ScoringResult
  format?: 'pdf' | 'json' | 'csv'
  onExport?: (data: Blob, filename: string) => void
  disabled?: boolean
  className?: string
}

// Timer default display props
export interface TimerDefaultsProps {
  workDuration: number
  breakDuration: number
  editable?: boolean
  onChange?: (work: number, breakTime: number) => void
}

// Alert/modal props for onboarding
export interface OnboardingAlertProps {
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

// Progress save indicator props
export interface ProgressSaveIndicatorProps {
  isSaving: boolean
  lastSaved?: Date
  error?: string
  onRetry?: () => void
}

// Multi-select component props
export interface MultiSelectProps {
  options: string[]
  value?: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  maxSelections?: number
  className?: string
}

// Age input props
export interface AgeInputProps {
  value?: string
  onChange: (value: string) => void
  min?: number
  max?: number
  placeholder?: string
  disabled?: boolean
  error?: string
}

// Gender select props
export interface GenderSelectProps {
  value?: string
  onChange: (value: string) => void
  options?: Array<{ value: string; label: string }>
  includeOther?: boolean
  disabled?: boolean
  error?: string
}

// Binary choice props
export interface BinaryChoiceProps {
  value?: number
  onChange: (value: number) => void
  yesLabel?: string
  noLabel?: string
  disabled?: boolean
  className?: string
}

// Frequency scale props
export interface FrequencyScaleProps {
  value?: number
  onChange: (value: number) => void
  labels?: string[]
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  showLabels?: boolean
  className?: string
}

// Skip/unclear button props
export interface SkipButtonProps {
  onSkip: () => void
  skipText?: string
  disabled?: boolean
  className?: string
}

// Disclaimer props
export interface DisclaimerProps {
  type: 'assessment' | 'results' | 'export'
  onAccept?: () => void
  onDecline?: () => void
  showActions?: boolean
}