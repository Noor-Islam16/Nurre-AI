'use client'

import * as React from 'react'
import { Plus, Sparkles, Send, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TaskDatePicker } from '@/components/ui/task-date-picker'
import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'

type InputMode = 'task' | 'ai'
type Priority = 1 | 2 | 3

export interface TaskData {
  title: string
  description: string
  dueDate?: Date
  timeEstimate?: number
  priority: Priority
}

interface TaskCaptureBarProps {
  mode: InputMode
  onModeChange: (mode: InputMode) => void
  value: string
  onChange: (value: string) => void
  // Task data for expanded form
  taskData: TaskData
  onTaskDataChange: (data: Partial<TaskData>) => void
  // Expand state
  isExpanded: boolean
  onExpandChange: (expanded: boolean) => void
  onSubmit: () => void
  isLoading?: boolean
  className?: string
}

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

export function TaskCaptureBar({
  mode,
  onModeChange,
  value,
  onChange,
  taskData,
  onTaskDataChange,
  isExpanded,
  onExpandChange,
  onSubmit,
  isLoading = false,
  className
}: TaskCaptureBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const shouldReduceMotion = useReducedMotion()

  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = React.useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !isLoading) {
      onSubmit()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Placeholder text based on mode
  const placeholder = mode === 'task'
    ? "What needs to get done?"
    : `Ask ${personality.name} for help...`

  // Submit button text and color based on mode
  const submitText = mode === 'task' ? 'Add Task' : 'Ask'
  const submitDisabled = !value.trim() || isLoading

  return (
    <div
      className={cn(
        "bg-white/30 backdrop-blur-sm rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Main Input Row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 p-4">
        {/* Mode Toggle */}
        <div className="flex gap-0.5 p-1 bg-gray-100 rounded-lg flex-shrink-0">
          <button
            type="button"
            onClick={() => onModeChange('task')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'task'
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Task</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('ai')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
              mode === 'ai'
                ? "bg-violet-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200"
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{personality.name}</span>
          </button>
        </div>

        {/* Input Field */}
        <div className="flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "h-10 text-gray-900",
              "placeholder:text-gray-400",
              "border-gray-200",
              mode === 'task'
                ? "focus-visible:ring-teal-500 focus-visible:border-teal-500"
                : "focus-visible:ring-violet-500 focus-visible:border-violet-500"
            )}
            aria-label={mode === 'task' ? 'Task input' : 'AI question input'}
          />
        </div>

        {/* Expand Button (Task mode only) */}
        {mode === 'task' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onExpandChange(!isExpanded)}
            className="h-10 w-10 p-0 shrink-0 text-gray-500 hover:text-teal-600"
            aria-label={isExpanded ? 'Collapse form' : 'Expand form'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          size="sm"
          disabled={submitDisabled}
          className={cn(
            "h-10 px-4 shrink-0",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors",
            mode === 'task'
              ? "bg-teal-600 hover:bg-teal-700 text-white"
              : "bg-violet-600 hover:bg-violet-700 text-white"
          )}
          aria-label={submitText}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-1.5 sm:hidden" />
              <span className="hidden sm:inline">{submitText}</span>
              <Send className="w-4 h-4 sm:hidden" />
            </>
          )}
        </Button>
      </form>

      {/* Expanded Form (Task mode only) */}
      <AnimatePresence>
        {mode === 'task' && isExpanded && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 pt-3 space-y-4">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Description (optional)
                </label>
                <Input
                  type="text"
                  value={taskData.description}
                  onChange={(e) => onTaskDataChange({ description: e.target.value })}
                  placeholder="Add more details..."
                  className="h-9 text-sm text-gray-900 border-gray-200"
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
                    date={taskData.dueDate}
                    onDateChange={(date) => onTaskDataChange({ dueDate: date })}
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
                      value={taskData.timeEstimate || ''}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined
                        onTaskDataChange({ timeEstimate: val })
                      }}
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
                        onClick={() => onTaskDataChange({ priority: p.value })}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm font-medium border transition-all",
                          taskData.priority === p.value
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
