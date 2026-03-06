import { z } from 'zod'

// Common schemas used across multiple endpoints
export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

export const UUIDSchema = z.string().uuid()

export const DateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
})

// Event tracking schema
export const EventSchema = z.object({
  type: z.string().min(1).max(50),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional()
})

export const EventsArraySchema = z.object({
  events: z.array(EventSchema).min(1).max(100)
})

// Chat request schema
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().uuid().optional(),
  includeContext: z.boolean().default(true)
})

// Task schemas
export const RecurringPatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().min(1).max(365),
  endDate: z.string().datetime().optional()
})

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.number().min(1).max(3).default(1),
  dueDate: z.string().datetime().optional(),
  recurringPattern: RecurringPatternSchema.optional(),
  priorityOverride: z.boolean().default(false),
  parentId: z.string().uuid().optional()
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  priority: z.number().min(1).max(3).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  recurringPattern: RecurringPatternSchema.nullable().optional(),
  priorityOverride: z.boolean().optional(),
  completed: z.boolean().optional(),
  completedAt: z.string().datetime().nullable().optional()
})

// Focus session schemas
export const CreateFocusSessionSchema = z.object({
  taskId: z.string().uuid().optional(),
  duration: z.number().min(5).max(90)
})

export const UpdateFocusSessionSchema = z.object({
  actualDuration: z.number().min(0).optional(),
  completed: z.boolean().optional(),
  effectiveness: z.number().min(0).max(100).optional()
})

// Mood entry schema
export const CreateMoodEntrySchema = z.object({
  mood: z.number().min(1).max(5),
  energy: z.number().min(1).max(5),
  focus: z.number().min(1).max(5),
  notes: z.string().max(500).optional()
})

// AI Brain request schema
export const BrainRequestSchema = z.object({
  type: z.enum(['check', 'analyze', 'suggest']),
  context: z.record(z.any()).optional()
})

// AI Intervention request schema
export const InterventionRequestSchema = z.object({
  type: z.string().min(1).max(50),
  trigger: z.string().min(1).max(100),
  context: z.record(z.any()).optional()
})

// Assessment retake schema
export const AssessmentRetakeSchema = z.object({
  responses: z.record(z.any()),
  timestamp: z.string().datetime().optional()
})

// Admin cleanup schema (for cron jobs)
export const AdminCleanupSchema = z.object({
  cron_secret: z.string(),
  daysToKeep: z.number().min(1).max(365).default(30)
})

// Query parameter schemas
export const TasksQuerySchema = z.object({
  today: z.string().transform(val => val === 'true').optional(),
  completed: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional()
})

export const SessionsQuerySchema = z.object({
  active: z.string().transform(val => val === 'true').optional(),
  today: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional()
})

export const MoodQuerySchema = z.object({
  today: z.string().transform(val => val === 'true').optional(),
  days: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(90)).optional()
})

// Breathing session schemas
export const CreateBreathingSessionSchema = z.object({
  patternId: z.enum(['478', 'box', '444', 'resonance']),
  durationSeconds: z.number().min(1).max(3600),
  cyclesCompleted: z.number().min(1).max(100),
  stressLevelBefore: z.number().min(1).max(10).optional(),
  stressLevelAfter: z.number().min(1).max(10).optional()
})

export const BreathingSessionsQuerySchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  pattern: z.string().optional()
})

// User preferences schema
export const UpdatePreferencesSchema = z.object({
  notifications: z.object({
    enabled: z.boolean(),
    taskReminders: z.boolean(),
    focusBreaks: z.boolean(),
    moodChecks: z.boolean()
  }).optional(),
  quietHours: z.array(z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    label: z.string().max(50)
  })).optional(),
  aiIntervention: z.object({
    enabled: z.boolean(),
    sensitivity: z.enum(['low', 'medium', 'high'])
  }).optional(),
  focusTimer: z.object({
    defaultDuration: z.number().min(5).max(90),
    autoStart: z.boolean(),
    breakReminders: z.boolean()
  }).optional()
})