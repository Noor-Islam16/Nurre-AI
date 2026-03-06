'use client'

import * as React from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { format, addDays, addWeeks, startOfToday } from 'date-fns'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatDueDate, getDueDateColorClass } from '@/lib/utils/task-priority'
import type { RecurringPattern } from '@/types/database'

interface TaskDatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  recurringPattern?: RecurringPattern
  onRecurringPatternChange?: (pattern: RecurringPattern | undefined) => void
  placeholder?: string
  className?: string
}

export function TaskDatePicker({
  date,
  onDateChange,
  recurringPattern,
  onRecurringPatternChange,
  placeholder = 'Set due date',
  className,
}: TaskDatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [showRecurring, setShowRecurring] = React.useState(false)

  const handleQuickSelect = (days: number) => {
    const newDate = addDays(startOfToday(), days)
    onDateChange(newDate)
    setIsOpen(false)
  }

  const handleClearDate = () => {
    onDateChange(undefined)
    if (onRecurringPatternChange) {
      onRecurringPatternChange(undefined)
    }
    setIsOpen(false)
  }

  const handleRecurringChange = (type: 'daily' | 'weekly' | 'monthly') => {
    if (onRecurringPatternChange) {
      onRecurringPatternChange({
        type,
        interval: 1,
      })
    }
    setShowRecurring(false)
  }

  const handleClearRecurring = () => {
    if (onRecurringPatternChange) {
      onRecurringPatternChange(undefined)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal border-teal-200 hover:bg-teal-50 hover:text-teal-900',
              !date && 'text-gray-600'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-teal-600" />
            {date ? (
              <span className={getDueDateColorClass(date)}>
                {formatDueDate(date)}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
            {date && (
              <X
                className="ml-auto h-4 w-4 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearDate()
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            {/* Quick action buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickSelect(0)}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickSelect(1)}
              >
                Tomorrow
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickSelect(7)}
              >
                Next Week
              </Button>
            </div>

            {/* Calendar */}
            <div className="border-t pt-3">
              <style jsx global>{`
                .rdp-day_button[aria-selected="true"] {
                  background-color: rgb(20 184 166) !important;
                  color: white !important;
                  border-radius: 0.375rem !important;
                }
                .rdp-day_button[aria-selected="true"]:hover {
                  background-color: rgb(13 148 136) !important;
                }
                .rdp-day_button {
                  width: 2.25rem !important;
                  height: 2.25rem !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                }
                .rdp-day_button:disabled {
                  color: rgb(209 213 219) !important;
                  cursor: not-allowed !important;
                }
                .rdp-disabled .rdp-day_button {
                  color: rgb(209 213 219) !important;
                  cursor: not-allowed !important;
                }
                /* Hide hover/focus on empty cells and outside days */
                .rdp-day.rdp-outside .rdp-day_button,
                .rdp-day:empty,
                .rdp-hidden {
                  background: transparent !important;
                  pointer-events: none !important;
                }
                .rdp-day.rdp-outside .rdp-day_button:hover,
                .rdp-day.rdp-outside .rdp-day_button:focus {
                  background: transparent !important;
                }
              `}</style>
              <DayPicker
                mode="single"
                selected={date}
                onSelect={(selectedDate) => {
                  onDateChange(selectedDate)
                  if (selectedDate) {
                    setIsOpen(false)
                  }
                }}
                disabled={(date) => date < startOfToday()}
                className="p-0"
                classNames={{
                  months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                  month: 'space-y-4',
                  caption: 'flex justify-center pt-1 relative items-center',
                  caption_label: 'text-sm font-medium',
                  nav: 'space-x-1 flex items-center',
                  nav_button: cn(
                    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
                  ),
                  nav_button_previous: 'absolute left-1',
                  nav_button_next: 'absolute right-1',
                  table: 'w-full border-collapse space-y-1',
                  head_row: 'flex',
                  head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
                  row: 'flex w-full mt-2',
                  cell: 'text-center text-sm p-0 relative',
                  day: cn(
                    'h-9 w-9 p-0 font-normal hover:bg-gray-100 rounded-md'
                  ),
                  day_selected: '',
                  day_today: 'bg-gray-100 font-semibold',
                  day_outside: 'text-transparent pointer-events-none [&>button]:bg-transparent [&>button]:cursor-default',
                  day_disabled: 'text-gray-300 cursor-not-allowed',
                  disabled: 'text-gray-300 cursor-not-allowed',
                  day_range_middle: '',
                  day_hidden: 'invisible pointer-events-none',
                }}
              />
            </div>

            {/* Recurring options */}
            {onRecurringPatternChange && (
              <div className="border-t pt-3 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs justify-start"
                  onClick={() => setShowRecurring(!showRecurring)}
                >
                  {recurringPattern ? '✓ Recurring' : 'Make Recurring'}
                </Button>

                {showRecurring && (
                  <div className="pl-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs justify-start"
                      onClick={() => handleRecurringChange('daily')}
                    >
                      Daily
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs justify-start"
                      onClick={() => handleRecurringChange('weekly')}
                    >
                      Weekly
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs justify-start"
                      onClick={() => handleRecurringChange('monthly')}
                    >
                      Monthly
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Clear button */}
            {date && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-red-500"
                onClick={handleClearDate}
              >
                Clear due date
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display recurring pattern if set */}
      {recurringPattern && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded">
            Repeats {recurringPattern.type}
          </span>
          <button
            onClick={handleClearRecurring}
            className="hover:text-red-500"
            aria-label="Remove recurring"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
