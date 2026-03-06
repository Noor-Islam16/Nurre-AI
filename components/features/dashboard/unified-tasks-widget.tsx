'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  Plus,
  ChevronRight,
  Square,
  CheckSquare as CheckedSquare,
  Clock,
  MoreVertical,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useTaskStore } from '@/store/task-store'
import { useTimerStore } from '@/store/timer-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UnifiedTasksWidget() {
  const router = useRouter()
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const highlightTimeoutRef = useRef<number | null>(null)
  const quickAddInputRef = useRef<HTMLInputElement>(null)

  const {
    tasks,
    fetchTasks,
    addTask,
    toggleComplete,
    breakDownTask,
    snoozeTask,
    isLoading
  } = useTaskStore()

  const {
    isRunning: isFocusActive,
    currentTaskId: activeTaskId,
    timeRemaining
  } = useTimerStore()

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for open-add-task keyboard shortcut event
  useEffect(() => {
    const handleOpenAddTask = () => {
      setShowQuickAdd(true)
    }

    window.addEventListener('open-add-task', handleOpenAddTask)

    return () => {
      window.removeEventListener('open-add-task', handleOpenAddTask)
    }
  }, [])

  // Auto-focus quick add input when it appears
  useEffect(() => {
    if (showQuickAdd && quickAddInputRef.current) {
      quickAddInputRef.current.focus()
    }
  }, [showQuickAdd])

  // Listen for voice-transcript custom events for highlighting
  useEffect(() => {
    const handleVoiceTranscript = (event: CustomEvent) => {
      const { transcript } = event.detail
      if (!transcript) return

      // Find task that matches the transcript
      const matchingTask = tasks?.find(t =>
        !t.completed && transcript.toLowerCase().includes(t.title.toLowerCase())
      )

      if (matchingTask) {
        setHighlightedTaskId(matchingTask.id)

        // Clear previous timeout
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current)
        }

        // Remove highlight after 3 seconds
        highlightTimeoutRef.current = window.setTimeout(() => {
          setHighlightedTaskId(null)
        }, 3000)
      }
    }

    window.addEventListener('voice-transcript' as any, handleVoiceTranscript)

    return () => {
      window.removeEventListener('voice-transcript' as any, handleVoiceTranscript)
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [tasks])

  const pendingTasks = tasks?.filter(t => !t.completed) || []

  // Sort tasks: active task first, then rest
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    if (a.id === activeTaskId) return -1
    if (b.id === activeTaskId) return 1
    return 0
  })

  const displayTasks = sortedTasks.slice(0, 3)

  const completedToday = tasks?.filter(t =>
    t.completed &&
    t.completedAt &&
    new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length || 0

  const totalTasks = pendingTasks.length
  const totalMinutes = completedToday * 25 // Rough estimate: 25 min per completed task
  const dailyGoalMinutes = 120 // 2 hours goal
  const progressPercent = Math.min(100, Math.round((totalMinutes / dailyGoalMinutes) * 100))

  const handleToggleTask = async (taskId: string) => {
    await toggleComplete(taskId)
    fetchTasks()
  }

  const handleBreakDown = async (taskId: string) => {
    const result = await breakDownTask(taskId)
    if (result.success) {
      // Could show a success message or toast
      fetchTasks()
    }
  }

  const handleSnooze = async (taskId: string) => {
    await snoozeTask(taskId)
    // Could show a success message
  }

  const handleMarkDone = async (taskId: string) => {
    await toggleComplete(taskId)
    fetchTasks()
  }

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newTaskTitle.trim()) {
      setShowQuickAdd(false)
      return
    }

    await addTask({
      title: newTaskTitle.trim(),
      completed: false,
      priority: 1
    })

    setNewTaskTitle('')
    setShowQuickAdd(false)
    fetchTasks()
  }

  const handleQuickAddCancel = () => {
    setNewTaskTitle('')
    setShowQuickAdd(false)
  }

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "min-h-[12rem]",
      "transition-all duration-300"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50">
              <CheckSquare className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Today&apos;s Action Items
              </h3>
            </div>
          </div>

          {/* Daily Progress Ring */}
          {progressPercent > 0 && (
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-teal-100"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercent / 100)}`}
                  className="text-teal-600 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-teal-700">
                  {totalMinutes}m
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Task List */}
        <div className="space-y-2 mb-3">
          <AnimatePresence mode="popLayout">
            {displayTasks.map((task, index) => {
              const isActive = task.id === activeTaskId && isFocusActive
              const isHighlighted = task.id === highlightedTaskId

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isHighlighted ? 1.02 : 1
                  }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg transition-all",
                    "bg-white/30 backdrop-blur-sm",
                    isActive && "bg-emerald-50/50",
                    !isActive && "hover:bg-white/50",
                    isHighlighted && "ring-2 ring-violet-400 ring-opacity-50"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="text-teal-700 hover:text-teal-800 transition-colors shrink-0"
                  >
                    {task.completed ? (
                      <CheckedSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm text-gray-900 font-medium truncate",
                      task.completed && "line-through text-gray-500"
                    )}>
                      {task.title}
                    </p>
                  </div>

                  {/* Duration Chip or Timer */}
                  {isActive ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold shrink-0"
                    >
                      <Clock className="w-3 h-3" />
                      {formatTimeRemaining(timeRemaining)}
                    </motion.div>
                  ) : task.timeEstimate ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium shrink-0">
                      <Clock className="w-3 h-3" />
                      {task.timeEstimate}m
                    </div>
                  ) : null}

                  {/* Focus Now Button */}
                  {!isActive && !task.completed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-7 px-2.5 text-xs shrink-0 transition-all",
                        isHighlighted
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/focus?taskId=${task.id}`)
                      }}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Focus now
                    </Button>
                  )}

                  {/* Kebab Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => handleBreakDown(task.id)}
                        className="cursor-pointer"
                      >
                        Break down
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSnooze(task.id)}
                        className="cursor-pointer"
                      >
                        Snooze
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMarkDone(task.id)}
                        className="cursor-pointer"
                      >
                        Mark done
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Empty State */}
          {pendingTasks.length === 0 && !isLoading && (
            <div className="text-center py-6 px-4 bg-white/20 backdrop-blur-sm rounded-lg">
              <p className="text-sm text-gray-600">
                No tasks yet. Say &quot;add write intro paragraph&quot; or tap{' '}
                <span className="font-medium text-teal-700">+ Add Task</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100">
          {showQuickAdd ? (
            /* Quick Add Form */
            <form onSubmit={handleQuickAddSubmit} className="flex gap-2">
              <input
                ref={quickAddInputRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onBlur={() => {
                  // Delay to allow click on buttons
                  setTimeout(() => {
                    if (showQuickAdd && !newTaskTitle.trim()) {
                      handleQuickAddCancel()
                    }
                  }, 200)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleQuickAddCancel()
                  }
                }}
                placeholder="Task title..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-teal-600 hover:bg-teal-700 text-white"
              >
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleQuickAddCancel}
                className="h-9"
              >
                Cancel
              </Button>
            </form>
          ) : (
            /* Normal Footer Buttons */
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickAdd(true)}
                className="h-8 px-3 text-teal-700 hover:bg-teal-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Task
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/planner')}
                className="h-8 px-3 text-gray-700 hover:bg-gray-50"
              >
                View all tasks
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
