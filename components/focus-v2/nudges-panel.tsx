'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MicroGoal {
  id: string
  text: string
  done: boolean
}

interface NudgesPanelProps {
  progress: number // 0-100
  timeRemaining: number // seconds
  isPaused: boolean
  microGoals?: MicroGoal[]
}

interface QuickNote {
  id: string
  text: string
  timestamp: Date
}

/**
 * NudgesPanel Component
 *
 * Provides supportive nudges during running state based on progress.
 * Includes Quick Notes input and optional Micro-Goals checklist.
 *
 * Features:
 * - Progress-based nudges (early, midpoint, last 5 min)
 * - Quick Notes: text input + Add button (ephemeral, console logged)
 * - Micro-Goals: checkable list populated from AI planning
 * - Neutral layout without heavy color blocks
 */
export function NudgesPanel({
  progress,
  timeRemaining,
  isPaused,
  microGoals: initialMicroGoals = []
}: NudgesPanelProps) {
  const [noteInput, setNoteInput] = useState('')
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [microGoals, setMicroGoals] = useState<MicroGoal[]>(initialMicroGoals)

  // Determine nudge message based on progress and time
  const nudgeMessage = (() => {
    if (isPaused) {
      return 'Timer paused. Resume when you\'re ready.'
    }

    // Last 5 minutes
    if (timeRemaining <= 5 * 60) {
      return 'Almost done! Stay focused for the final push.'
    }

    // Midpoint (45-55%)
    if (progress >= 45 && progress < 55) {
      return 'You\'re halfway there! You\'re doing great.'
    }

    // Early stage (< 25%)
    if (progress < 25) {
      return 'Strong start! Keep your momentum going.'
    }

    // Default
    return 'Stay focused. You\'re making progress.'
  })()

  const handleAddNote = () => {
    const trimmed = noteInput.trim()
    if (!trimmed) return

    const note: QuickNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: trimmed,
      timestamp: new Date()
    }

    setNotes([...notes, note])
    console.log('[Quick Note Added]', note)
    setNoteInput('')
  }

  const handleToggleMicroGoal = (id: string) => {
    setMicroGoals(prev =>
      prev.map(goal =>
        goal.id === id ? { ...goal, done: !goal.done } : goal
      )
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  return (
    <div className="space-y-4">
      {/* Nudge Message */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-700">{nudgeMessage}</p>
        </div>
      </div>

      {/* Quick Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Quick Notes
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jot down a quick thought..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <Button
            onClick={handleAddNote}
            disabled={!noteInput.trim()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Notes List */}
        {notes.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {notes.map(note => (
              <div
                key={note.id}
                className="rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <p className="text-sm text-gray-700">{note.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {note.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Micro-Goals (Optional) */}
      {microGoals.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Micro-Goals
          </label>
          <div className="space-y-1">
            {microGoals.map(goal => (
              <button
                key={goal.id}
                type="button"
                onClick={() => handleToggleMicroGoal(goal.id)}
                className={cn(
                  'w-full flex items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                  goal.done
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                {goal.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    goal.done
                      ? 'text-gray-500 line-through'
                      : 'text-gray-700'
                  )}
                >
                  {goal.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
