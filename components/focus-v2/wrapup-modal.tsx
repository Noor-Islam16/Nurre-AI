'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Sparkles, AlertCircle } from 'lucide-react'
import { useTimerStore } from '@/store/timer-store'
import { useTaskStore } from '@/store/task-store'
import { cn } from '@/lib/utils'

interface WrapupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId?: string
  taskTitle?: string
  timeSpent: number // in minutes
  onComplete: (action?: 'done' | 'snooze' | 'breakdown') => void // Called after any action completes to return to setup
}

type MoodOption = 'excellent' | 'good' | 'neutral' | 'challenging'

const MOOD_OPTIONS: Array<{ value: MoodOption; emoji: string; label: string }> = [
  { value: 'excellent', emoji: '🌟', label: 'Excellent' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Okay' },
  { value: 'challenging', emoji: '😓', label: 'Challenging' }
]

/**
 * WrapupModal Component
 *
 * Shown when user ends a focus session.
 * Displays session summary and provides next action options.
 *
 * Features:
 * - Session summary (time spent, task title)
 * - Mood quick pick (emoji radio buttons)
 * - Points earned display (placeholder)
 * - Action buttons: Done, Snooze 25m, Break into subtasks
 * - Optional "Start another" button
 * - Clean state transitions without CLS
 */
export function WrapupModal({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  timeSpent,
  onComplete
}: WrapupModalProps) {
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopTimer = useTimerStore(state => state.stopTimer)
  const toggleComplete = useTaskStore(state => state.toggleComplete)
  const breakDownTask = useTaskStore(state => state.breakDownTask)
  const snoozeTask = useTaskStore(state => state.snoozeTask)

  // Calculate points earned (placeholder - 10 points per minute)
  const pointsEarned = Math.round(timeSpent * 10)

  const handleDone = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Mark task complete if there is one
      if (taskId) {
        await toggleComplete(taskId)
        console.log('[Wrapup] Task marked complete:', taskId)
      }

      // Stop timer
      await stopTimer(true)
      console.log('[Wrapup] Timer stopped (completed)')

      // Log mood if selected
      if (selectedMood) {
        console.log('[Wrapup] Mood logged:', selectedMood)
        // Future: Save mood to database
      }

      // Log points
      console.log('[Wrapup] Points earned:', pointsEarned)
      // Future: Save points to rewards system

      // Close modal and return to setup
      onOpenChange(false)
      onComplete('done')
    } catch (err) {
      setError('Failed to complete task. Please try again.')
      console.error('[Wrapup] Error in handleDone:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSnooze = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Snooze task if there is one
      if (taskId) {
        const snoozeUntil = new Date(Date.now() + 25 * 60 * 1000) // 25 minutes from now
        await snoozeTask(taskId, snoozeUntil)
        console.log('[Wrapup] Task snoozed for 25 minutes:', taskId)
      }

      // Stop timer
      await stopTimer(false)
      console.log('[Wrapup] Timer stopped (snoozed)')

      // Log mood if selected
      if (selectedMood) {
        console.log('[Wrapup] Mood logged:', selectedMood)
      }

      // Close modal and return to setup with duration=25
      onOpenChange(false)
      onComplete('snooze')
    } catch (err) {
      setError('Failed to snooze task. Please try again.')
      console.error('[Wrapup] Error in handleSnooze:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBreakDown = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Break task into subtasks if there is one
      if (taskId) {
        const result = await breakDownTask(taskId)
        if (result.success) {
          console.log('[Wrapup] Task broken down into subtasks:', result.steps)
          // Future: Populate Micro-Goals store with these steps
        } else {
          throw new Error(result.error || 'Failed to break down task')
        }
      }

      // Stop timer
      await stopTimer(false)
      console.log('[Wrapup] Timer stopped (break down)')

      // Log mood if selected
      if (selectedMood) {
        console.log('[Wrapup] Mood logged:', selectedMood)
      }

      // Close modal and return to setup
      onOpenChange(false)
      onComplete('breakdown')
    } catch (err) {
      setError('Failed to break down task. Please try again.')
      console.error('[Wrapup] Error in handleBreakDown:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetModal = () => {
    setSelectedMood(null)
    setError(null)
    setIsProcessing(false)
  }

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Session Complete! 🎉
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Great work on your focus session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Session Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium">Time spent:</span>
              <span className="text-sm font-semibold">{timeSpent} minutes</span>
            </div>

            {taskTitle && (
              <div className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">Task:</span>
                  <p className="text-sm font-semibold truncate">{taskTitle}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium">Points earned:</span>
              <span className="text-sm font-semibold text-violet-600">+{pointsEarned}</span>
            </div>
          </div>

          {/* Mood Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              How was your focus?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedMood(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-3 transition-all',
                    selectedMood === option.value
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-xs text-gray-600">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center">What would you like to do?</p>

            <Button
              onClick={handleDone}
              disabled={isProcessing}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {taskTitle ? 'Mark Task Done' : 'Complete Session'}
            </Button>

            {taskId && (
              <>
                <Button
                  onClick={handleSnooze}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full h-12 gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Snooze for 25 minutes
                </Button>

                <Button
                  onClick={handleBreakDown}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full h-12 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Break into smaller tasks
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
