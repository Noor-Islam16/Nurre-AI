'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckSquare, Plus, Calendar, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FilterType = 'today' | 'upcoming' | 'all' | 'completed'

interface TaskEmptyStateProps {
  filter: FilterType
  onQuickTask: (title: string) => void
  onFocusInput: () => void
  className?: string
}

// Quick-start suggestions for ADHD-friendly micro-tasks
const QUICK_SUGGESTIONS = [
  "Reply to an email",
  "Tidy my desk",
  "Read for 10 minutes",
  "Take a short walk"
]

// Filter-specific messages
const EMPTY_MESSAGES: Record<FilterType, { title: string; description: string }> = {
  today: {
    title: "Ready to get things done?",
    description: "Start with something small \u2013 it\u2019s easier than you think!"
  },
  upcoming: {
    title: "Nothing scheduled ahead",
    description: "Add tasks with due dates to see them here."
  },
  all: {
    title: "Your task list is clear!",
    description: "Add a new task to get started."
  },
  completed: {
    title: "No completed tasks yet",
    description: "Complete some tasks to see them here!"
  }
}

export function TaskEmptyState({ filter, onQuickTask, onFocusInput, className }: TaskEmptyStateProps) {
  const shouldReduceMotion = useReducedMotion()
  const { title, description } = EMPTY_MESSAGES[filter]

  // Choose icon based on filter
  const Icon = filter === 'completed' ? Check : filter === 'upcoming' ? Calendar : CheckSquare

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
      className={cn("text-center py-12 px-6", className)}
    >
      {/* Icon */}
      <motion.div
        initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 15, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 bg-teal-50 rounded-2xl flex items-center justify-center"
      >
        <Icon className="w-10 h-10 text-teal-500" />
      </motion.div>

      {/* Headline */}
      <motion.h3
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.15 }}
        className="text-xl font-semibold text-gray-900 mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 }}
        className="text-gray-600 mb-6 max-w-sm mx-auto"
      >
        {description}
      </motion.p>

      {/* Quick-start suggestions (only show for today/all filters) */}
      {(filter === 'today' || filter === 'all') && (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25 }}
          className="flex flex-wrap gap-2 justify-center mb-6"
        >
          {QUICK_SUGGESTIONS.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 + index * 0.05 }}
              onClick={() => onQuickTask(suggestion)}
              className={cn(
                "px-4 py-2 bg-white border border-gray-200 rounded-full",
                "text-sm text-gray-700 font-medium",
                "hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700",
                "active:scale-95 transition-all"
              )}
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* CTA Button */}
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.35 }}
      >
        <Button
          onClick={onFocusInput}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add your first task
        </Button>
      </motion.div>
    </motion.div>
  )
}
