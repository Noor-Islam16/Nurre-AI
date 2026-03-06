'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTaskStore } from '@/store/task-store'
import { useRewardsStore } from '@/store/rewards-store'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { useSharedSession } from '@/hooks/use-shared-session'
import { TasksHero } from './tasks-hero'
import { TaskCaptureBar, TaskData } from './task-capture-bar'
import { TaskAIPanel } from './task-ai-panel'
import { TaskFilters } from './task-filters'
import { TaskList } from './task-list'
import { TaskEmptyState } from './task-empty-state'

type InputMode = 'task' | 'ai'
type FilterType = 'today' | 'upcoming' | 'all' | 'completed'
type SortType = 'priority' | 'time' | 'recent'

export function TasksPage() {
  const shouldReduceMotion = useReducedMotion()

  // Input mode state
  const [mode, setMode] = React.useState<InputMode>('task')
  const [inputValue, setInputValue] = React.useState('')

  // Expanded form state
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [taskData, setTaskData] = React.useState<TaskData>({
    title: '',
    description: '',
    dueDate: undefined,
    timeEstimate: undefined,
    priority: 2
  })

  // Filter/sort/search state
  const [filter, setFilter] = React.useState<FilterType>('today')
  const [sort, setSort] = React.useState<SortType>('priority')
  const [search, setSearch] = React.useState('')

  // Task store
  const { tasks, isLoading: isLoadingTasks, fetchTasks, addTask } = useTaskStore()

  // Rewards store for streak
  const { currentStreak, fetchRewards } = useRewardsStore()

  // Session for AI persistence
  const { sessionId } = useSharedSession()

  // AI assistant for inline chat
  const {
    messages,
    isLoading: isAILoading,
    sendMessage,
    clearHistory
  } = useAIAssistant({
    variant: 'planner',
    sessionId: sessionId || undefined,
    persistMessages: true
  })

  // Fetch tasks and rewards on mount
  React.useEffect(() => {
    fetchTasks()
    fetchRewards()
  }, [fetchTasks, fetchRewards])

  // Filter and sort tasks
  const filteredTasks = React.useMemo(() => {
    let result = [...tasks]

    // Apply filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    switch (filter) {
      case 'today':
        result = result.filter(t => {
          if (t.completed) return false
          if (!t.dueDate) return true // Tasks without due date show in Today
          const due = new Date(t.dueDate)
          return due < tomorrow
        })
        break
      case 'upcoming':
        result = result.filter(t => {
          if (t.completed) return false
          if (!t.dueDate) return false
          const due = new Date(t.dueDate)
          return due >= tomorrow && due < weekFromNow
        })
        break
      case 'all':
        result = result.filter(t => !t.completed)
        break
      case 'completed':
        result = result.filter(t => t.completed)
        break
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      )
    }

    // Apply sort
    switch (sort) {
      case 'priority':
        result.sort((a, b) => (b.priority || 0) - (a.priority || 0))
        break
      case 'time':
        result.sort((a, b) => (a.timeEstimate || 0) - (b.timeEstimate || 0))
        break
      case 'recent':
        result.sort((a, b) => {
          const aDate = new Date(a.createdAt).getTime()
          const bDate = new Date(b.createdAt).getTime()
          return bDate - aDate
        })
        break
    }

    return result
  }, [tasks, filter, sort, search])

  // Count completed tasks today
  const todayCompletedCount = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tasks.filter(t => {
      if (!t.completed || !t.completedAt) return false
      const completedDate = new Date(t.completedAt)
      return completedDate >= today
    }).length
  }, [tasks])

  // Handle task data changes
  const handleTaskDataChange = React.useCallback((data: Partial<TaskData>) => {
    setTaskData(prev => ({ ...prev, ...data }))
  }, [])

  // Handle submit
  const handleSubmit = React.useCallback(async () => {
    if (!inputValue.trim()) return

    if (mode === 'task') {
      // Create task with all fields
      await addTask({
        title: inputValue.trim(),
        description: taskData.description || undefined,
        dueDate: taskData.dueDate,
        timeEstimate: taskData.timeEstimate,
        priority: taskData.priority,
        completed: false
      })
      // Reset form
      setInputValue('')
      setTaskData({
        title: '',
        description: '',
        dueDate: undefined,
        timeEstimate: undefined,
        priority: 2
      })
      setIsExpanded(false)
    } else {
      // Send to AI
      await sendMessage(inputValue.trim())
      setInputValue('')
    }
  }, [mode, inputValue, taskData, addTask, sendMessage])

  // Handle quick task creation from empty state
  const handleQuickTask = React.useCallback(async (title: string) => {
    await addTask({
      title,
      priority: 2,
      completed: false
    })
  }, [addTask])

  // Handle AI panel close
  const handleCloseAI = React.useCallback(() => {
    setMode('task')
  }, [])

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4 xl:pt-6 2xl:pt-8 pb-8 xl:pb-10 2xl:pb-12"
    >
      <div className="w-full max-w-[min(92vw,2200px)] mx-auto space-y-6 xl:space-y-8 2xl:space-y-10">
        {/* Progress Hero */}
        <TasksHero
          completedCount={todayCompletedCount}
          dailyGoal={3}
          currentStreak={currentStreak}
        />

        {/* Capture Bar */}
        <TaskCaptureBar
          mode={mode}
          onModeChange={setMode}
          value={inputValue}
          onChange={setInputValue}
          taskData={taskData}
          onTaskDataChange={handleTaskDataChange}
          isExpanded={isExpanded}
          onExpandChange={setIsExpanded}
          onSubmit={handleSubmit}
          isLoading={mode === 'ai' && isAILoading}
        />

        {/* AI Panel (shown when in AI mode and has messages) */}
        {mode === 'ai' && messages.length > 0 && (
          <TaskAIPanel
            messages={messages}
            isLoading={isAILoading}
            onClose={handleCloseAI}
          />
        )}

        {/* Filters */}
        <TaskFilters
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
        />

        {/* Task List or Empty State */}
        {isLoadingTasks ? (
          <div className="space-y-3 xl:space-y-4 2xl:space-y-5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-20 xl:h-24 2xl:h-28 bg-white rounded-xl xl:rounded-2xl border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <TaskList tasks={filteredTasks} />
        ) : (
          <TaskEmptyState
            filter={filter}
            onQuickTask={handleQuickTask}
            onFocusInput={() => setMode('task')}
          />
        )}
      </div>
    </motion.div>
  )
}
