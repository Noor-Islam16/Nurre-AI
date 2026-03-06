'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useTaskStore } from '@/store/task-store'
import { cn } from '@/lib/utils'
import { Clock, Check, X } from 'lucide-react'

interface TaskSelectorV2Props {
  selectedTaskId: string | null
  onSelectTask: (taskId: string, meta?: { title?: string; estimate?: number }) => void
  onInputChange?: (value: string) => void
  onUnlink: () => void
  placeholder?: string
}

interface ListedTask {
  id: string
  title: string
  timeEstimate?: number
  priority: number
}

type DropdownSection = 'today' | 'all'

const SECTION_TITLES: Record<DropdownSection, string> = {
  today: 'Today',
  all: 'All tasks'
}

export function TaskSelectorV2({
  selectedTaskId,
  onSelectTask,
  onInputChange,
  onUnlink,
  placeholder = 'Pick a task or type a one-off'
}: TaskSelectorV2Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)

  const tasks = useTaskStore(state => state.tasks)
  const fetchTasks = useTaskStore(state => state.fetchTasks)

  const activeTasks = useMemo(() => tasks.filter(task => !task.completed), [tasks])

  const selectedTask = useMemo(
    () => activeTasks.find(task => task.id === selectedTaskId) ?? null,
    [activeTasks, selectedTaskId]
  )

  useEffect(() => {
    if (selectedTask) {
      setInput(selectedTask.title)
    }
  }, [selectedTask])

  useEffect(() => {
    if (tasks.length === 0) {
      fetchTasks().catch(() => {})
    }
  }, [tasks.length, fetchTasks])

  const topToday = useMemo(() => {
    const sorted = [...activeTasks].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      if (a.timeEstimate && !b.timeEstimate) return -1
      if (!a.timeEstimate && b.timeEstimate) return 1
      return a.title.localeCompare(b.title)
    })
    return sorted.slice(0, 3)
  }, [activeTasks])

  const filteredAll = useMemo(() => {
    if (!input.trim()) {
      return activeTasks
    }
    const term = input.toLowerCase()
    return activeTasks
      .filter(task => task.title.toLowerCase().includes(term))
      .sort((a, b) => {
        if (a.timeEstimate && !b.timeEstimate) return -1
        if (!a.timeEstimate && b.timeEstimate) return 1
        return a.title.localeCompare(b.title)
      })
  }, [activeTasks, input])

  const sections: Array<{ key: DropdownSection; items: ListedTask[] }> = useMemo(() => {
    if (!showDropdown) return []

    const seenIds = new Set<string>()
    const todayItems = topToday.map(task => {
      seenIds.add(task.id)
      return task
    })

    const allItems = filteredAll.filter(task => !seenIds.has(task.id))

    const result: Array<{ key: DropdownSection; items: ListedTask[] }> = []
    if (todayItems.length > 0) {
      result.push({ key: 'today', items: todayItems })
    }
    if (allItems.length > 0) {
      result.push({ key: 'all', items: allItems })
    }

    return result
  }, [filteredAll, topToday, showDropdown])

  const flatItems = useMemo(() => sections.flatMap(section => section.items), [sections])

  useEffect(() => {
    if (highlightIndex !== null && flatItems[highlightIndex]) {
      const el = dropdownRef.current?.querySelector<HTMLElement>(`[data-index="${highlightIndex}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex, flatItems])

  const handleSelect = useCallback(
    (task: ListedTask) => {
      setShowDropdown(false)
      setHighlightIndex(null)
      onSelectTask(task.id, { title: task.title, estimate: task.timeEstimate })
    },
    [onSelectTask]
  )

  const handleInputChange = (value: string) => {
    setInput(value)
    onInputChange?.(value)
    if (!value && selectedTaskId) {
      onUnlink()
    }
    setShowDropdown(true)
    setHighlightIndex(null)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setShowDropdown(true)
      setHighlightIndex(0)
      return
    }

    if (!showDropdown) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightIndex(prev => {
          const next = prev === null ? 0 : Math.min(flatItems.length - 1, prev + 1)
          return next
        })
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightIndex(prev => {
          const next = prev === null ? flatItems.length - 1 : Math.max(0, prev - 1)
          return next
        })
        break
      case 'Enter':
        if (highlightIndex !== null && flatItems[highlightIndex]) {
          event.preventDefault()
          handleSelect(flatItems[highlightIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setHighlightIndex(null)
        break
    }
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n') return

      // Don't trigger if a modal is open
      const hasOpenModal = document.querySelector('[role="dialog"][data-state="open"]') !== null
      if (hasOpenModal) return

      const active = document.activeElement as HTMLElement | null
      if (active && (active.tagName === 'INPUT' || active.isContentEditable)) {
        return
      }
      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
      setShowDropdown(true)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Listen for focus-task-selector event from Adjust button
  useEffect(() => {
    const handleFocusEvent = () => {
      inputRef.current?.focus()
      inputRef.current?.select()
      setShowDropdown(true)
    }

    window.addEventListener('focus-task-selector', handleFocusEvent)
    return () => window.removeEventListener('focus-task-selector', handleFocusEvent)
  }, [])

  useEffect(() => {
    const handleVoice = (event: Event) => {
      const detail = (event as CustomEvent<{ transcript: string }>).detail
      if (!detail?.transcript) return
      const transcript = detail.transcript.trim()
      if (!transcript) return

      const lower = transcript.toLowerCase()
      const match = activeTasks.find(task => task.title.toLowerCase().includes(lower) || lower.includes(task.title.toLowerCase()))

      if (match) {
        handleSelect(match)
        setInput(match.title)
      } else {
        setInput(transcript)
        onInputChange?.(transcript)
        setShowDropdown(true)
      }
    }

    window.addEventListener('voice-transcript', handleVoice as EventListener)
    return () => window.removeEventListener('voice-transcript', handleVoice as EventListener)
  }, [activeTasks, handleSelect, onInputChange])

  const renderBadge = (task: ListedTask) => {
    if (!task.timeEstimate) return null
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        {task.timeEstimate}m
      </span>
    )
  }

  return (
    <div className="space-y-3 lg:space-y-4">
      <div>
        <label className="block text-sm lg:text-base font-medium text-gray-700 mb-2">Task</label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={event => handleInputChange(event.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => {
              setTimeout(() => setShowDropdown(false), 150)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200/50 bg-white/50 backdrop-blur-sm px-3 py-2 lg:px-4 lg:py-3 lg:text-base text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />
          {showDropdown && sections.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-20 mt-1 w-full rounded-lg bg-white/95 backdrop-blur-md shadow-lg max-h-64 overflow-y-auto"
              role="listbox"
            >
              {sections.map(section => (
                <div key={section.key}>
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                    {SECTION_TITLES[section.key]}
                  </div>
                  {section.items.map((task, index) => {
                    const itemIndex = sections
                      .slice(0, sections.indexOf(section))
                      .reduce((acc, curr) => acc + curr.items.length, 0) + index
                    const isHighlighted = highlightIndex === itemIndex
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm',
                          isHighlighted ? 'bg-emerald-50' : 'hover:bg-gray-50'
                        )}
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => handleSelect(task)}
                        data-index={itemIndex}
                        role="option"
                        aria-selected={selectedTaskId === task.id}
                      >
                        <span className="truncate text-gray-900">{task.title}</span>
                        {renderBadge(task)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            <Check className="h-3.5 w-3.5" />
            Linked to: <span className="font-medium">{selectedTask.title}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onUnlink()
              setInput('')
              setShowDropdown(false)
              onInputChange?.('')
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-3 w-3" />
            Unlink
          </button>
        </div>
      )}
    </div>
  )
}
