'use client'

import { useEffect, useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePreferenceStore } from '@/store/preference-store'

type FocusSound = 'none' | 'brown' | 'rain'

const SOUND_LABELS: Record<FocusSound, string> = {
  none: 'None',
  brown: 'Brown Noise',
  rain: 'Rain'
}

interface SoundsPopoverProps {
  disabled?: boolean
  onSoundChange?: (sound: FocusSound) => void
}

export function SoundsPopover({ disabled = false, onSoundChange }: SoundsPopoverProps) {
  const preferences = usePreferenceStore(state => state.preferences)
  const setLastFocusSound = usePreferenceStore(state => state.setLastFocusSound)
  const [sound, setSound] = useState<FocusSound>('none')

  // Load initial sound from localStorage or preferences (once on mount)
  useEffect(() => {
    const stored = window.localStorage.getItem('nuree:lastFocusSound') as FocusSound | null
    if (stored && ['none', 'brown', 'rain'].includes(stored)) {
      setSound(stored)
    } else if (preferences.lastFocusSound) {
      setSound(preferences.lastFocusSound)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Save sound changes and dispatch events
  useEffect(() => {
    window.localStorage.setItem('nuree:lastFocusSound', sound)
    onSoundChange?.(sound)

    // Update preference store (only when local sound changes)
    setLastFocusSound(sound)

    const event = new CustomEvent('background-noise-control', {
      detail: { type: sound === 'none' ? null : sound }
    })
    window.dispatchEvent(event)
  }, [sound, onSoundChange, setLastFocusSound])

  const currentLabel = useMemo(() => SOUND_LABELS[sound], [sound])

  const handleSelect = (newSound: FocusSound) => {
    if (disabled) return
    setSound(newSound)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Sounds</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-10 gap-2 rounded-lg border-gray-300 text-sm hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
          >
            <Volume2 className="h-4 w-4 text-emerald-600" />
            <span>{currentLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 p-1">
          {(['none', 'brown', 'rain'] as FocusSound[]).map(option => (
            <DropdownMenuItem
              key={option}
              onSelect={() => handleSelect(option)}
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                sound === option
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
              )}
            >
              <span>{SOUND_LABELS[option]}</span>
              {sound === option && <span className="text-xs font-medium">Selected</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
