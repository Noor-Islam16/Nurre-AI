'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TaskItem } from '@/components/features/task-item'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  timeEstimate?: number
  priority: number
  completed: boolean
  aiSubtasks?: string[]
  dueDate?: Date
  createdAt: Date
  completedAt?: Date
}

interface TaskListProps {
  tasks: Task[]
  className?: string
}

export function TaskList({ tasks, className }: TaskListProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
      className={cn("space-y-3", className)}
    >
      <AnimatePresence mode="popLayout">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, x: -100 }}
            transition={shouldReduceMotion ? { duration: 0 } : {
              duration: 0.2,
              delay: index * 0.05
            }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.01, y: -1 }}
          >
            <TaskItem task={task} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
