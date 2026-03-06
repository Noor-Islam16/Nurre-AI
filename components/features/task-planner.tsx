'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTaskStore } from '@/store/task-store'
import { useTimerStore } from '@/store/timer-store'
import { useVoiceChat } from '@/hooks/use-voice-chat'
import { toast } from '@/components/ui/use-toast'
import { TaskItem } from './task-item'
import { CaptureBar } from './tasks/capture-bar'
import { TaskDatePicker } from '@/components/ui/task-date-picker'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TaskSkeleton } from '@/components/ui/skeleton-loader'
import type { RecurringPattern } from '@/types/database'
import { isOverdue, isDueToday } from '@/lib/utils/task-priority'

type FilterType = 'today' | 'upcoming' | 'all' | 'completed'
type SortType = 'priority' | 'time' | 'recent'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if date is today
 */
function isToday(date: Date | undefined): boolean {
  if (!date) return false
  const today = new Date()
  const compareDate = new Date(date)
  return compareDate.toDateString() === today.toDateString()
}

/**
 * Check if date is in the future
 */
function isFuture(date: Date | undefined): boolean {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate > today
}

/**
 * Heuristic to determine if input should be treated as a task or AI query
 */
function isTaskInput(input: string): boolean {
  const trimmed = input.trim()

  // Check if starts with task-creating verbs
  const taskVerbs = ['add', 'create', 'make', 'do', 'finish', 'complete', 'write', 'call', 'email', 'buy', 'schedule']
  const startsWithTaskVerb = taskVerbs.some(verb =>
    trimmed.toLowerCase().startsWith(verb + ' ')
  )

  // Check if short and no punctuation (likely a task)
  const hasMinimalPunctuation = !trimmed.includes('?') && !trimmed.includes('how') && !trimmed.includes('what')
  const isShort = trimmed.length < 90

  return startsWithTaskVerb || (hasMinimalPunctuation && isShort)
}

/**
 * Parse task input and extract title and time estimate
 * Handles patterns like "add task in 25 minutes" or "call dentist in 30 min"
 */
function parseTaskInput(input: string): { title: string; timeEstimate?: number } {
  let text = input.trim()

  // Remove task verbs if present
  const taskVerbs = ['add', 'create', 'make']
  for (const verb of taskVerbs) {
    if (text.toLowerCase().startsWith(verb + ' ')) {
      text = text.substring(verb.length + 1).trim()
      break
    }
  }

  // Check for time pattern: "task name in N minutes"
  const timePattern = /^(.+?)\s+in\s+(\d+)\s+(?:min|mins|minute|minutes)$/i
  const match = text.match(timePattern)

  if (match) {
    return {
      title: match[1].trim(),
      timeEstimate: parseInt(match[2])
    }
  }

  return { title: text }
}

/**
 * Calculate today's task counts
 */
function getTodayCounts(tasks: any[]): { activeCount: number; todayCompletedCount: number } {
  const activeCount = tasks.filter(t => !t.completed).length
  const todayCompletedCount = tasks.filter(t =>
    t.completed && t.completedAt && isToday(new Date(t.completedAt))
  ).length

  return { activeCount, todayCompletedCount }
}

/**
 * Filter tasks by segment (today, upcoming, all, completed)
 */
function filterTasksBySegment(tasks: any[], segment: FilterType): any[] {
  switch (segment) {
    case 'today':
      // Show tasks that are due today OR overdue (stricter than before)
      return tasks.filter(t =>
        !t.completed && (isDueToday(t.dueDate) || isOverdue(t.dueDate))
      )
    case 'upcoming':
      return tasks.filter(t =>
        !t.completed && t.dueDate && isFuture(t.dueDate)
      )
    case 'completed':
      return tasks.filter(t => t.completed)
    case 'all':
    default:
      return tasks
  }
}

/**
 * Apply search filter to tasks
 */
function applySearchFilter(tasks: any[], searchQuery: string): any[] {
  if (!searchQuery.trim()) return tasks

  const query = searchQuery.toLowerCase()
  return tasks.filter(t =>
    t.title.toLowerCase().includes(query)
  )
}

/**
 * Sort tasks by the specified sort mode
 */
function sortTasks(tasks: any[], sortMode: SortType): any[] {
  return [...tasks].sort((a, b) => {
    switch (sortMode) {
      case 'priority':
        // Priority desc (3 > 2 > 1)
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        break
      case 'time':
        // Time asc (smaller first)
        if (a.timeEstimate !== undefined && b.timeEstimate !== undefined) {
          if (a.timeEstimate !== b.timeEstimate) {
            return a.timeEstimate - b.timeEstimate
          }
        } else if (a.timeEstimate !== undefined) {
          return -1
        } else if (b.timeEstimate !== undefined) {
          return 1
        }
        break
      case 'recent':
        // Recently added desc (newer first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    // Fallback to createdAt desc
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/**
 * Pin active task to top of list
 */
function pinActiveTask(tasks: any[], currentTaskId: string | null): any[] {
  if (!currentTaskId) return tasks

  const activeIndex = tasks.findIndex(t => t.id === currentTaskId)
  if (activeIndex > 0) {
    const result = [...tasks]
    const activeTask = result.splice(activeIndex, 1)[0]
    result.unshift(activeTask)
    return result
  }

  return tasks
}

export function TaskPlanner() {
  // Feature flag: Check if new capture bar UI should be enabled
  const enableNewUI = process.env.NEXT_PUBLIC_PLANNER_CAPTURE_BAR_V1 !== 'false'

  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [captureValue, setCaptureValue] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState(1)
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined)
  const [newTaskRecurring, setNewTaskRecurring] = useState<RecurringPattern | undefined>(undefined)
  const [filter, setFilter] = useState<FilterType>('today')
  const [sort, setSort] = useState<SortType>('priority')
  const [searchQuery, setSearchQuery] = useState('')

  const { tasks, isLoading, fetchTasks, addTask, breakDownTask } = useTaskStore()
  const { isRunning, currentTaskId } = useTimerStore()

  // Voice chat integration
  const remoteAudioElementRef = useRef<HTMLAudioElement>(null)
  const prevUserTranscriptRef = useRef('')
  const {
    status: voiceStatus,
    userAudioLevel,
    pendingUserTranscript,
    startSession: startVoiceSession,
    stopSession: stopVoiceSession,
    remoteAudioRef,
  } = useVoiceChat({
    mode: 'balanced',
    autoSaveTranscript: false
  })

  // Connect audio element ref
  useEffect(() => {
    if (remoteAudioRef) {
      remoteAudioRef.current = remoteAudioElementRef.current
    }
  }, [remoteAudioRef])

  // Handle tap-to-toggle events from Space key
  useEffect(() => {
    const handleVoiceToggle = () => {
      // Toggle: if idle/ended start, otherwise stop
      if (voiceStatus === 'idle' || voiceStatus === 'ended') {
        startVoiceSession()
      } else {
        stopVoiceSession()
      }
    }

    window.addEventListener('voice-toggle', handleVoiceToggle)

    return () => {
      window.removeEventListener('voice-toggle', handleVoiceToggle)
    }
  }, [voiceStatus, startVoiceSession, stopVoiceSession])

  // Dispatch voice transcript events + handle planner-specific logic
  useEffect(() => {
    // When pendingUserTranscript changes from non-empty to empty, it means it was finalized
    if (prevUserTranscriptRef.current && !pendingUserTranscript) {
      const finalizedTranscript = prevUserTranscriptRef.current

      // Dispatch custom event for task highlighting
      window.dispatchEvent(new CustomEvent('voice-transcript', {
        detail: { transcript: finalizedTranscript }
      }))

      // Handle planner-specific intent parsing
      handleVoiceTranscript(finalizedTranscript)
    }
    // Update ref to current value for next comparison
    prevUserTranscriptRef.current = pendingUserTranscript
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUserTranscript])

  // Listen for voice-transcript events (could come from this component or others)
  useEffect(() => {
    const handleVoiceTranscriptEvent = (event: CustomEvent) => {
      const transcript = event.detail?.transcript
      if (transcript) {
        handleVoiceTranscript(transcript)
      }
    }

    window.addEventListener('voice-transcript', handleVoiceTranscriptEvent as EventListener)
    return () => {
      window.removeEventListener('voice-transcript', handleVoiceTranscriptEvent as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calculate counters using helper
  const { activeCount, todayCompletedCount } = getTodayCounts(tasks)

  // Filter and sort tasks using helpers
  const filteredTasks = useMemo(() => {
    // Apply segment filter
    let filtered = filterTasksBySegment(tasks, filter)

    // Apply search
    filtered = applySearchFilter(filtered, searchQuery)

    // Apply sorting
    let sorted = sortTasks(filtered, sort)

    // Pin active task to top
    sorted = pinActiveTask(sorted, isRunning && currentTaskId ? currentTaskId : null)

    return sorted
  }, [tasks, filter, searchQuery, sort, isRunning, currentTaskId])

  // Voice transcript handler with intent parsing and task highlighting
  const handleVoiceTranscript = (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim()

    // Pattern 1: "add [task name] in [N] minutes"
    const addPatternWithTime = /^(?:add|create|make)\s+(.+?)\s+in\s+(\d+)\s+(?:min|mins|minute|minutes)$/i
    const matchWithTime = lowerTranscript.match(addPatternWithTime)

    if (matchWithTime) {
      const taskTitle = matchWithTime[1].trim()
      const timeEstimate = matchWithTime[2]

      // Prefill form and open it
      setCaptureValue(taskTitle)
      setNewTaskTitle(taskTitle)
      setNewTaskTime(timeEstimate)
      setShowAddForm(true)
      return
    }

    // Pattern 2: "add [task name]" without time
    const addPattern = /^(?:add|create|make)\s+(.+)$/i
    const matchAdd = lowerTranscript.match(addPattern)

    if (matchAdd) {
      const taskTitle = matchAdd[1].trim()

      // Prefill capture bar and open form
      setCaptureValue(taskTitle)
      setNewTaskTitle(taskTitle)
      setShowAddForm(true)
      return
    }

    // Pattern 3: Fuzzy match against existing task titles
    // Simple fuzzy matching: check if transcript contains task title words
    const matchedTasks = filteredTasks.filter(task => {
      const taskWords = task.title.toLowerCase().split(/\s+/)
      const transcriptWords = lowerTranscript.split(/\s+/)

      // If at least 50% of task words are in transcript, it's a match
      const matchingWords = taskWords.filter((word: string) =>
        transcriptWords.some((tw: string) => tw.includes(word) || word.includes(tw))
      )
      return matchingWords.length >= Math.ceil(taskWords.length / 2)
    })

    if (matchedTasks.length > 0) {
      // Highlight the first matched task by focusing it
      const firstMatchId = matchedTasks[0].id
      const element = document.getElementById(`task-${firstMatchId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add highlight class temporarily
        element.classList.add('ring-2', 'ring-violet-400', 'ring-offset-2')
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-violet-400', 'ring-offset-2')
        }, 2000)
      }
      return
    }

    // Pattern 4: No match - treat as general input for capture bar
    setCaptureValue(transcript)
  }

  const handleCaptureSubmit = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    if (isTaskInput(trimmed)) {
      // Parse task input using helper
      const { title, timeEstimate } = parseTaskInput(trimmed)

      const newTask = await addTask({
        title,
        timeEstimate,
        completed: false,
        priority: 1,
      })

      setCaptureValue('')
      fetchTasks()

      // Show toast with action button to break down task
      if (newTask) {
        toast({
          title: 'Nice. Want me to break it into 3 steps?',
          action: (
            <Button
              onClick={async () => {
                const result = await breakDownTask(newTask.id)
                if (result.success) {
                  toast({
                    title: 'Task broken down!',
                    description: 'Check the task card to see the steps.'
                  })
                } else {
                  toast({
                    title: 'Failed to break down task',
                    description: result.error || 'An error occurred'
                  })
                }
              }}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              Break it down
            </Button>
          ),
          duration: 7000  // Longer duration for action toast
        })
      }
    } else {
      // Route to AI (now via Calm page placeholder)
      router.push(`/calm?prompt=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleToggleForm = () => {
    setShowAddForm(!showAddForm)
    if (!showAddForm) {
      // Pre-fill from capture bar if there's text
      if (captureValue.trim()) {
        setNewTaskTitle(captureValue.trim())
      }
    }
  }

  const handleChipAction = async (action: 'breakdown' | 'prioritize' | 'estimate') => {
    switch (action) {
      case 'breakdown':
        if (captureValue.trim()) {
          // If there's a task typed, route to AI with breakdown request
          const taskTitle = captureValue.trim()
          router.push(`/calm?prompt=${encodeURIComponent(`Break down this task into ADHD-friendly steps: "${taskTitle}"`)}`)
          setCaptureValue('')
        } else {
          // No task, prefill AI prompt
          router.push('/calm?prompt=Help me break down my current task into smaller steps')
        }
        break

      case 'prioritize':
        router.push('/calm?prompt=Which tasks should I prioritize today?')
        break

      case 'estimate':
        // Prefill time estimate to 25 in the form
        setNewTaskTime('25')
        setShowAddForm(true)
        if (captureValue.trim()) {
          setNewTaskTitle(captureValue.trim())
        }
        break
    }
  }

  const handleAddTask = async (e: React.FormEvent, breakdown = false) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const taskTitle = newTaskTitle

    const newTask = await addTask({
      title: taskTitle,
      timeEstimate: newTaskTime ? parseInt(newTaskTime) : undefined,
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      recurringPattern: newTaskRecurring,
    })

    setNewTaskTitle('')
    setNewTaskTime('')
    setNewTaskPriority(1)
    setNewTaskDueDate(undefined)
    setNewTaskRecurring(undefined)
    setShowAddForm(false)
    setCaptureValue('')
    fetchTasks()

    // Show toast with action button to break down task (only if not already breaking down)
    if (newTask && !breakdown) {
      toast({
        title: 'Nice. Want me to break it into 3 steps?',
        action: (
          <Button
            onClick={async () => {
              const result = await breakDownTask(newTask.id)
              if (result.success) {
                toast({
                  title: 'Task broken down!',
                  description: 'Check the task card to see the steps.'
                })
              } else {
                toast({
                  title: 'Failed to break down task',
                  description: result.error || 'An error occurred'
                })
              }
            }}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
          >
            Break it down
          </Button>
        ),
        duration: 7000  // Longer duration for action toast
      })
    }

    // If breakdown requested via AI Breakdown button, route to AI chat
    if (breakdown) {
      router.push(`/calm?prompt=${encodeURIComponent(`Break down this task into ADHD-friendly steps: "${taskTitle}"`)}`)
    }
  }

  // Voice mic toggle handler
  const handleMicToggle = () => {
    const isListening = voiceStatus === 'listening' || voiceStatus === 'thinking' || voiceStatus === 'speaking'
    if (isListening) {
      stopVoiceSession()
    } else {
      startVoiceSession()
    }
  }

  const isVoiceListening = voiceStatus !== 'idle' && voiceStatus !== 'ended'

  // Simplified fallback UI when feature flag is disabled
  if (!enableNewUI) {
    return (
      <div className="max-w-7xl mx-auto px-6 pt-2 pb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="text-amber-900 font-semibold mb-2">Legacy Mode</h3>
          <p className="text-amber-800 text-sm">
            The new planner UI is disabled. Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_PLANNER_CAPTURE_BAR_V1=true</code> to enable the redesigned interface with capture bar, voice integration, and advanced filtering.
          </p>
        </div>

        {/* Simple task list without advanced features */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
            <div className="text-sm text-gray-600">
              Active: <span className="font-semibold">{activeCount}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <TaskSkeleton />
              <TaskSkeleton />
              <TaskSkeleton />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-700">
              No tasks yet. Enable the new UI to add tasks.
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // New UI with capture bar, voice, and advanced features
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Hidden Audio Element for Voice Chat */}
      <audio ref={remoteAudioElementRef} className="hidden" />

      {/* CaptureBar - Unified Add/Ask */}
      <CaptureBar
        value={captureValue}
        onChange={setCaptureValue}
        onToggleForm={handleToggleForm}
        onSubmit={handleCaptureSubmit}
        onChip={handleChipAction}
        isListening={isVoiceListening}
        audioLevel={userAudioLevel}
        onMicToggle={handleMicToggle}
      />

      {/* Inline Add Task Form (shown when + is clicked) */}
      {showAddForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddTask}
          className="bg-white rounded-lg border border-gray-300 p-3 mb-4 shadow-sm"
        >
          {/* Row 1: Title */}
          <div className="mb-3">
            <Input
              id="taskTitle"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title (required)"
              className="text-gray-900 h-10"
              autoFocus
              required
            />
          </div>

          {/* Row 2: Time + Priority Segmented */}
          <div className="flex gap-3 mb-3">
            <div className="w-32">
              <Input
                id="taskTime"
                type="number"
                value={newTaskTime}
                onChange={(e) => setNewTaskTime(e.target.value)}
                placeholder="Time (min)"
                className="text-gray-900 h-10"
              />
            </div>

            <div className="flex-1 flex gap-1 p-1 bg-gray-100 rounded-lg">
              {[
                { label: 'P1', value: 3 },
                { label: 'P2', value: 2 },
                { label: 'P3', value: 1 },
              ].map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setNewTaskPriority(priority.value)}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                    newTaskPriority === priority.value
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Due Date Picker */}
          <div className="mb-3">
            <TaskDatePicker
              date={newTaskDueDate}
              onDateChange={setNewTaskDueDate}
              recurringPattern={newTaskRecurring}
              onRecurringPatternChange={setNewTaskRecurring}
              placeholder="Set due date (optional)"
            />
          </div>

          {/* Row 4: Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="bg-teal-600 text-white hover:bg-teal-700 h-9 px-4"
            >
              Add
            </Button>

            <Button
              type="button"
              onClick={(e) => handleAddTask(e as any, true)}
              variant="outline"
              className="border-violet-200 text-violet-700 hover:bg-violet-50 h-9 px-4"
            >
              AI Breakdown
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewTaskTitle('')
                setNewTaskTime('')
                setNewTaskPriority(1)
              }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {/* Toolbar: Filters, Counters, Sort, Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
        {/* Top Row: Segmented Control + Counters */}
        <div className="flex items-center justify-between mb-3">
          {/* Segmented Control */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {(['today', 'upcoming', 'all', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize",
                  filter === f
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-200"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Counters */}
          <div className="text-sm text-gray-600">
            {todayCompletedCount === 0 ? (
              <span className="text-gray-500 italic">
                Let&apos;s get your first win—try a 10‑min focus.
              </span>
            ) : (
              <span>
                Active <span className="font-semibold text-gray-900">{activeCount}</span>
                {' • '}
                Today <span className="font-semibold text-gray-900">{todayCompletedCount}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Search + Sort */}
        <div className="flex gap-3">
          {/* Search Field */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-9 text-sm text-gray-900"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="h-9 pl-3 pr-8 text-sm text-gray-900 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="priority">Priority</option>
              <option value="time">Time</option>
              <option value="recent">Recently added</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          <div className="space-y-4">
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-gray-700"
          >
            {searchQuery ? (
              <>No tasks match &quot;{searchQuery}&quot;</>
            ) : filter === 'completed' ? (
              "No completed tasks yet. Keep going!"
            ) : filter === 'today' ? (
              "No tasks for today yet. Add one to get started!"
            ) : filter === 'upcoming' ? (
              "No upcoming tasks. Set due dates to see them here."
            ) : (
              "No tasks yet. Add one to get started!"
            )}
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
