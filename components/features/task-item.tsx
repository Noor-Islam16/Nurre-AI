'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Edit2, Trash2, ChevronDown, MoreVertical, Check, X, Timer, Play, Calendar, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/store/task-store'
import { useTimerStore } from '@/store/timer-store'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TaskDatePicker } from '@/components/ui/task-date-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  isOverdue,
  formatDueDate,
  getDueDateColorClass,
  getTaskBorderColor
} from '@/lib/utils/task-priority'

type Priority = 1 | 2 | 3

const PRIORITY_CONFIG: { value: Priority; label: string; colors: { active: string; inactive: string } }[] = [
  {
    value: 1,
    label: 'Low',
    colors: {
      active: 'bg-green-100 border-green-300 text-green-700',
      inactive: 'border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-50'
    }
  },
  {
    value: 2,
    label: 'Medium',
    colors: {
      active: 'bg-amber-100 border-amber-300 text-amber-700',
      inactive: 'border-gray-200 text-gray-600 hover:border-amber-200 hover:bg-amber-50'
    }
  },
  {
    value: 3,
    label: 'High',
    colors: {
      active: 'bg-red-100 border-red-300 text-red-700',
      inactive: 'border-gray-200 text-gray-600 hover:border-red-200 hover:bg-red-50'
    }
  }
]

interface TaskItemProps {
  task: any
}

export function TaskItem({ task }: TaskItemProps) {
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [editedDescription, setEditedDescription] = useState(task.description || '')
  const [editedTimeEstimate, setEditedTimeEstimate] = useState(task.timeEstimate?.toString() || '')
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>(task.dueDate ? new Date(task.dueDate) : undefined)
  const [editedPriority, setEditedPriority] = useState<Priority>((task.priority || 2) as Priority)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const { toggleComplete, deleteTask, updateTask } = useTaskStore()
  const { isRunning, currentTaskId } = useTimerStore()

  // Check if this task is currently running
  const isActiveTask = isRunning && currentTaskId === task.id

  // Check if task is overdue
  const isTaskOverdue = isOverdue(task.dueDate)

  // Get border color based on priority and overdue status
  const borderColor = getTaskBorderColor(task.priority, isTaskOverdue)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditing])

  // Reset edited values when task changes
  useEffect(() => {
    setEditedTitle(task.title)
    setEditedDescription(task.description || '')
    setEditedTimeEstimate(task.timeEstimate?.toString() || '')
    setEditedDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
    setEditedPriority((task.priority || 2) as Priority)
  }, [task.title, task.description, task.timeEstimate, task.dueDate, task.priority])

  const handleComplete = () => {
    toggleComplete(task.id)

    // Celebrate completion
    if (!task.completed) {
      window.dispatchEvent(new CustomEvent('task-completed', {
        detail: { task }
      }))
    }
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setIsExpanded(true) // Expand when editing
    setEditedTitle(task.title)
    setEditedDescription(task.description || '')
    setEditedTimeEstimate(task.timeEstimate?.toString() || '')
    setEditedDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
    setEditedPriority((task.priority || 2) as Priority)
  }

  const handleSaveEdit = async () => {
    // Validate title is not empty
    if (!editedTitle.trim()) {
      // Reset to original title if empty
      setEditedTitle(task.title)
      return
    }

    // Update the task
    await updateTask(task.id, {
      title: editedTitle.trim(),
      description: editedDescription.trim(),
      timeEstimate: editedTimeEstimate ? parseInt(editedTimeEstimate) : undefined,
      dueDate: editedDueDate,
      priority: editedPriority
    })

    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedTitle(task.title)
    setEditedDescription(task.description || '')
    setEditedTimeEstimate(task.timeEstimate?.toString() || '')
    setEditedDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
    setEditedPriority((task.priority || 2) as Priority)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleFocusNow = () => {
    router.push(`/focus?taskId=${task.id}`)
  }

  const handleDelete = async () => {
    await deleteTask(task.id)
  }

  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        "transition-all",
        task.completed && "opacity-60"
      )}
    >
      <Card className={cn(
        "border-l-4 border-0 shadow-none bg-white/25 backdrop-blur-sm hover:bg-white/40 transition-all duration-200",
        borderColor,
        task.completed && "bg-white/15",
        isActiveTask && "ring-2 ring-emerald-400 bg-white/40",
        isTaskOverdue && !task.completed && "bg-red-50/30"
      )}>
        <CardContent className={cn(
          "p-3",
          isEditing && "p-4"
        )}>
          {isEditing ? (
            // EDIT MODE - matches task creation form layout
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Task Title
                </label>
                <Input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-9 text-sm text-gray-900 border-gray-200"
                  placeholder="Task title (required)"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Description (optional)
                </label>
                <Input
                  type="text"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-9 text-sm text-gray-900 border-gray-200"
                  placeholder="Add more details..."
                />
              </div>

              {/* Due Date, Time Estimate, Priority Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Due Date */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Due Date
                  </label>
                  <TaskDatePicker
                    date={editedDueDate}
                    onDateChange={setEditedDueDate}
                    placeholder="Set due date"
                    className="w-full"
                  />
                </div>

                {/* Time Estimate */}
                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Time (minutes)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={editedTimeEstimate}
                      onChange={(e) => setEditedTimeEstimate(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. 30"
                      className="h-9 pl-9 text-sm text-gray-900 border-gray-200"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Priority
                  </label>
                  <div className="flex gap-1.5">
                    {PRIORITY_CONFIG.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditedPriority(p.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm font-medium border transition-all",
                          editedPriority === p.value
                            ? p.colors.active
                            : p.colors.inactive
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSaveEdit}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white h-8"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="ghost"
                  className="h-8"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // DEFAULT / EXPANDED MODE
            <div className="space-y-2">
              {/* Row 1: Compact default view */}
              <div className="flex items-center gap-3">
                {/* Active timer chip (if running) */}
                {isActiveTask && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"
                  >
                    <Timer className="w-3 h-3 animate-pulse" />
                    Active
                  </motion.div>
                )}

                {/* Overdue badge */}
                {isTaskOverdue && !task.completed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold"
                  >
                    <AlertCircle className="w-3 h-3" />
                    OVERDUE
                  </motion.div>
                )}

                {/* Title - truncate in collapsed mode */}
                <h3
                  onClick={() => !isActiveTask && setIsExpanded(!isExpanded)}
                  className={cn(
                    "font-medium text-gray-800 flex-1",
                    task.completed && "line-through",
                    !isExpanded && "truncate cursor-pointer hover:text-gray-600"
                  )}
                >
                  {task.title}
                </h3>

                {/* Due date chip */}
                {task.dueDate && !isTaskOverdue && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium shrink-0",
                    getDueDateColorClass(task.dueDate).includes('red') && "bg-red-100 text-red-700",
                    getDueDateColorClass(task.dueDate).includes('amber') && "bg-amber-100 text-amber-700",
                    getDueDateColorClass(task.dueDate).includes('teal') && "bg-teal-100 text-teal-700",
                    getDueDateColorClass(task.dueDate).includes('gray') && "bg-gray-100 text-gray-700"
                  )}>
                    <Calendar className="w-3 h-3" />
                    {formatDueDate(task.dueDate)}
                  </div>
                )}

                {/* Time chip */}
                {task.timeEstimate && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium shrink-0",
                    task.timeEstimate <= 15 ? "bg-green-100 text-green-700" :
                    task.timeEstimate <= 30 ? "bg-blue-100 text-blue-700" :
                    task.timeEstimate <= 60 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    <Clock className="w-3 h-3" />
                    {task.timeEstimate}m
                  </div>
                )}

                {/* Focus now button (primary action) */}
                {!task.completed && (
                  <Button
                    onClick={handleFocusNow}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 shrink-0"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Focus now
                  </Button>
                )}

                {/* Kebab menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={handleStartEdit}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleComplete}>
                      <Check className="w-4 h-4 mr-2" />
                      {task.completed ? 'Mark incomplete' : 'Mark complete'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Expanded view: Description and AI subtasks */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 pt-2 border-t border-gray-100"
                  >
                    {/* Description */}
                    {task.description && (
                      <p className="text-sm text-gray-700">
                        {task.description}
                      </p>
                    )}

                    {/* AI Subtasks */}
                    {task.aiSubtasks && task.aiSubtasks.length > 0 && (
                      <div className="pl-3 border-l-2 border-violet-200 bg-violet-50/50 rounded-l-md py-2 pr-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ChevronDown className="w-3 h-3 text-violet-600" />
                          <span className="text-xs font-medium text-violet-700 uppercase tracking-wide">
                            AI-Generated Steps
                          </span>
                        </div>
                        <ol className="space-y-1.5">
                          {task.aiSubtasks.map((step: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 flex gap-2">
                              <span className="font-medium text-violet-700 shrink-0">
                                {i + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Full-width Mark Complete button in expanded view */}
                    {!task.completed && (
                      <Button
                        onClick={handleComplete}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white h-9"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
