// Database types based on simplified 7-table schema
// Generated from .claude/Arhitecture/SIMPLIFIED_DATABASE_ARCHITECTURE.md

export interface User {
  id: string
  email: string
  name?: string
  adhd_persona?: 'balanced' | 'planner' | 'sprinter' | 'multitasker' | 'motivation' | 'perfectionist'
  adhd_presentation?: 'combined' | 'inattentive' | 'hyperactive' | 'borderline' | 'negative'
  inatt_severity?: number
  hyper_severity?: number
  onboarding_version?: number
  current_streak: number
  longest_streak: number
  onboarding_completed: boolean
  first_login_after_onboarding?: boolean
  selected_personality?: 'nur' | 'farin' | 'zak' // AI coaching personality
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  parent_id?: string
  title: string
  description?: string
  priority: 1 | 2 | 3 // 1=low, 2=medium, 3=high
  time_estimate?: number // minutes
  completed: boolean
  completed_at?: string
  due_date?: string
  recurring_pattern?: RecurringPattern
  priority_override: boolean // true = user manually set priority, don't auto-update
  ai_subtasks?: AISubtask[]
  order_index: number
  created_at: string
  updated_at: string
}

export interface FocusSession {
  id: string
  user_id: string
  task_id?: string
  duration: number // planned duration in minutes
  actual_duration?: number // actual duration in minutes
  completed: boolean
  effectiveness?: number // 0-100
  interruptions: number
  break_taken: boolean
  notes?: string
  created_at: string
  ended_at?: string
}

export interface MoodEntry {
  id: string
  user_id: string
  mood: 'terrible' | 'bad' | 'okay' | 'good' | 'excellent'
  energy?: number // 1-10
  focus?: number // 1-10
  note?: string
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  session_id?: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: ToolCall
  metadata?: ConversationMetadata
  created_at: string
}

export interface Event {
  id: string
  user_id: string
  type: string // page_view, task_created, task_completed, focus_start, etc.
  data?: Record<string, any>
  page_url?: string
  session_id?: string
  created_at: string
}

export interface Preferences {
  id: string
  user_id: string
  quiet_hours?: QuietHours
  theme: 'light' | 'dark' | 'auto'
  focus_duration: number // 5-90 minutes
  break_ratio: number // 0.1-0.5
  notifications: boolean
  ai_personality: 'supportive' | 'balanced' | 'direct' | 'motivational'
  intervention_cooldown: number // 5-60 minutes
  max_interventions_per_hour: number // 1-20
  planner_config?: PlannerConfig // AI planner state configuration
  created_at: string
  updated_at: string
}

// Supporting Types
export interface AISubtask {
  id?: string
  title: string
  description?: string
  time_estimate?: number // minutes
  completed?: boolean
}

export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly'
  interval: number // e.g., 1 = every day, 2 = every 2 days
  endDate?: string // ISO date string when recurring should stop
}

export interface ToolCall {
  name: string
  arguments: Record<string, any>
  result?: {
    success: boolean
    data?: any
    error?: string
  }
  execution_time?: string
  duration_ms?: number
  lane?: 'chat' | 'planner'
}

export interface ConversationMetadata {
  intervention_type?: string
  intervention_accepted?: boolean
  intervention_id?: string
  message_type?: string
  source?: string
  context?: Record<string, any>
  trigger_context?: any
  tools_config?: Record<string, any>
  user_response?: string
  effectiveness?: number
  responded_at?: string
}

export interface QuietHours {
  start: string // "22:00"
  end: string // "08:00"
  days: string[] // ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
}

export interface PlannerConfig {
  tick_interval_ms?: number // Planner check interval in milliseconds
  next_tick_at?: string // ISO timestamp for next planner execution
  manual_override?: boolean | null // true=on, false=off, null=auto
  is_active?: boolean // Whether planner is currently active
  last_activity_at?: string // ISO timestamp of last planner activity
}

// Database Table Types Map
export type DatabaseTables = {
  users: User
  tasks: Task
  focus_sessions: FocusSession
  mood_entries: MoodEntry
  conversations: Conversation
  events: Event
  preferences: Preferences
  onboarding_responses: OnboardingResponse
  onboarding_results: OnboardingResult
}

// Helper types for database operations
export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>
export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type FocusSessionInsert = Omit<FocusSession, 'id' | 'created_at'>
export type MoodEntryInsert = Omit<MoodEntry, 'id' | 'created_at'>
export type ConversationInsert = Omit<Conversation, 'id' | 'created_at'>
export type EventInsert = Omit<Event, 'id' | 'created_at'>
export type PreferencesInsert = Omit<Preferences, 'id' | 'created_at' | 'updated_at'>
export type OnboardingResponseInsert = Omit<OnboardingResponse, 'id' | 'created_at'>
export type OnboardingResultInsert = Omit<OnboardingResult, 'id'>

// Onboarding-specific interfaces
export interface OnboardingResponse {
  id: string
  user_id: string
  question_number: number
  response: string
  created_at: string
}

export interface OnboardingResult {
  id: string
  user_id: string
  inatt_endorsed: number
  hyper_endorsed: number
  total_endorsed: number
  inatt_severity: number
  hyper_severity: number
  adhd_presentation: 'combined' | 'inattentive' | 'hyperactive' | 'borderline' | 'negative'
  onset_childhood: boolean
  impairment: boolean
  top_signals: string[]
  completed_at: string
  assessment_version: number
}

// Legacy type aliases for backwards compatibility (to be removed later)
export type Profile = User
export type ChatMessage = Conversation
export type UserEvent = Event
export type UserPreferences = Preferences

// Removed types (no longer exist in database)
// - Intervention (embedded in Conversation.metadata)
// - ToolCall (embedded in Conversation.tool_calls) - Now defined as supporting type
// - ContextSnapshot
// - UserPattern
// - PatternPrediction
// - PatternEvent
// - PatternInsight
// - InterventionOutcome
// - InterventionPersonalization
// - AIError
// - PlannerState
// - Reminder