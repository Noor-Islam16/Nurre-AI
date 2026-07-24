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
import { useCalibrationStore } from '@/store/calibrationStore'
import { useMusicPlayer, type MusicTrack } from '@/components/music/Player'
import { apiGetProfile } from '@/lib/calibrationApi'

type FocusSound = 'none' | 'brown' | 'rain' | 'calibrated'

const SOUND_LABELS: Record<FocusSound, string> = {
  none: 'None',
  brown: 'Brown Noise',
  rain: 'Rain',
  calibrated: 'Calibrated Soundscape'
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SOUNDSCAPE_FILES = {
  Reset: "Soundscape - Reset Mode_voicechange.mp3",
  Start: "Soundscape - Start Mode.mp3",
  "Deep Focus": "Soundscape - Deep Focus Mode - 3 min Loop.mp3",
  Flow: "Soundscape - Flow Mode Mode - 3 min Loop.mp3",
  Ground: "Soundscape - Ground Mode - 3 min Loop.mp3",
};

function resolveLoopUrl(loop: string, flag: string | null): string {
  if (flag === "Deep Reset Mode") {
    return `${SUPABASE_URL}/storage/v1/object/public/focus-loops/${encodeURIComponent("Soundscape - Deep Reset Mode.mp3")}`;
  }
  const filename = SOUNDSCAPE_FILES[loop as keyof typeof SOUNDSCAPE_FILES];
  return `${SUPABASE_URL}/storage/v1/object/public/focus-loops/${encodeURIComponent(filename || "Soundscape - Start Mode.mp3")}`;
}

interface SoundsPopoverProps {
  disabled?: boolean
  onSoundChange?: (sound: FocusSound) => void
}

export function SoundsPopover({ disabled = false, onSoundChange }: SoundsPopoverProps) {
  const preferences = usePreferenceStore(state => state.preferences)
  const setLastFocusSound = usePreferenceStore(state => state.setLastFocusSound)
  const [sound, setSound] = useState<FocusSound>('none')

  const setResult = useCalibrationStore(state => state.setResult)
  const outputs = useCalibrationStore(state => state.outputs)
  const { play: playMusic, pause: pauseMusic, currentTrack } = useMusicPlayer()

  // Load user profile on mount to sync calibration outcomes
  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await apiGetProfile()
        if (data.has_profile && data.profile) {
          setResult({
            brain_mode: data.profile.brain_mode,
            flag: data.profile.flag ?? null,
            assigned_loop: data.profile.assigned_loop,
            path: data.profile.path,
            path_length: data.profile.path.length,
            model_version: data.profile.model_version,
            key_version: data.profile.key_version,
          })
        }
      } catch (err) {
        console.error('Failed to load profile in sounds popover:', err)
      }
    }
    if (!outputs) {
      loadProfile()
    }
  }, [outputs, setResult])

  // Load initial sound from localStorage or preferences
  useEffect(() => {
    const stored = window.localStorage.getItem('nuree:lastFocusSound') as FocusSound | null
    if (stored && ['none', 'brown', 'rain', 'calibrated'].includes(stored)) {
      setSound(stored)
    } else if (preferences.lastFocusSound) {
      setSound(preferences.lastFocusSound as FocusSound)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save sound changes and dispatch events
  useEffect(() => {
    window.localStorage.setItem('nuree:lastFocusSound', sound)
    onSoundChange?.(sound)

    setLastFocusSound(sound === 'calibrated' ? 'none' : sound)

    if (sound === 'calibrated') {
      // 1. Stop background noise
      const event = new CustomEvent('background-noise-control', {
        detail: { type: null }
      })
      window.dispatchEvent(event)

      // 2. Play calibrated soundscape
      if (outputs) {
        const loop = outputs.assigned_loop
        const flag = outputs.flag
        const trackToPlay: MusicTrack = {
          id: `calibrated-${loop}`,
          title: (flag === 'Deep Reset Mode' || flag === 'Deep Reset Bridge') ? 'Deep Reset Mode' : `${loop} Mode`,
          url: resolveLoopUrl(loop, flag),
          category: 'focus',
          producer_name: 'Nuree AI',
          brain_modes: [loop]
        }
        playMusic(trackToPlay).catch(err => {
          console.error('Failed to play calibrated soundscape:', err)
        })
      }
    } else {
      // If we switched away from calibrated, pause the music
      if (currentTrack?.id.startsWith('calibrated-')) {
        pauseMusic()
      }

      // Dispatch background noise control
      const event = new CustomEvent('background-noise-control', {
        detail: { type: sound === 'none' ? null : (sound as 'brown' | 'rain') }
      })
      window.dispatchEvent(event)
    }
  }, [sound, onSoundChange, setLastFocusSound, outputs, playMusic, pauseMusic, currentTrack])

  const currentLabel = useMemo(() => {
    if (sound === 'calibrated' && outputs) {
      if (outputs.flag === 'Deep Reset Mode' || outputs.flag === 'Deep Reset Bridge') {
        return 'Deep Reset Mode'
      }
      return `${outputs.assigned_loop} Mode`
    }
    return SOUND_LABELS[sound]
  }, [sound, outputs])

  const options = useMemo(() => {
    const base: FocusSound[] = ['none', 'brown', 'rain']
    if (outputs) {
      return ['calibrated', ...base] as FocusSound[]
    }
    return base as FocusSound[]
  }, [outputs])

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
        <DropdownMenuContent align="start" className="w-48 p-1">
          {options.map(option => (
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
              <span>
                {option === 'calibrated' && outputs
                  ? (outputs.flag === 'Deep Reset Mode' || outputs.flag === 'Deep Reset Bridge'
                      ? 'Deep Reset Mode'
                      : `${outputs.assigned_loop} Mode`)
                  : SOUND_LABELS[option]}
              </span>
              {sound === option && <span className="text-xs font-medium">Selected</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
