'use client'

import * as React from 'react'
import { Play, Pause } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MusicTrack, useMusicPlayer } from './Player'

export type TrackListItem = MusicTrack

export type TrackListProps = {
  title: string
  tracks: TrackListItem[]
  emptyMessage?: string
}

function formatDuration(duration?: number | null) {
  if (!duration || duration <= 0) {
    return '—'
  }

  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function TrackList({ title, tracks, emptyMessage = 'No tracks found.' }: TrackListProps) {
  const { currentTrack, isPlaying, progress, duration, play, pause, resume } = useMusicPlayer()

  const handleToggle = React.useCallback(async (track: MusicTrack, isCurrent: boolean, isCurrentlyPlaying: boolean) => {
    if (!isCurrent) {
      await play(track)
      return
    }

    if (isCurrentlyPlaying) {
      pause()
    } else {
      await resume()
    }
  }, [pause, play, resume])

  if (!tracks?.length) {
    return (
      <section className="space-y-3">
        <header>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </header>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </header>
      <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card">
        {tracks.map((track) => {
          const isCurrent = currentTrack?.id === track.id
          const isCurrentlyPlaying = isCurrent && isPlaying
          const isResumeState = isCurrent && !isPlaying && progress > 0
          const durationLabel = formatDuration(track.duration_sec)
          const percentComplete = isCurrent && duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0

          const ariaLabel = isCurrentlyPlaying
            ? `Pause ${track.title}`
            : isResumeState
            ? `Resume ${track.title}`
            : `Play ${track.title}`

          return (
            <div
              key={track.id}
              className={cn(
                'group relative flex items-center gap-4 px-4 py-3 transition-colors',
                isCurrent ? 'bg-sky-50' : 'hover:bg-muted/60'
              )}
            >
              {isCurrent && percentComplete > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-1 bg-sky-400 transition-all"
                  style={{ width: `${percentComplete * 100}%` }}
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={ariaLabel}
                aria-pressed={isCurrentlyPlaying}
                onClick={() => handleToggle(track, isCurrent, isCurrentlyPlaying)}
                className={cn(
                  'hover:bg-sky-100 hover:border-sky-300 hover:text-sky-700',
                  isCurrentlyPlaying && 'bg-sky-500 text-white border-sky-600 hover:bg-sky-600 hover:border-sky-600'
                )}
              >
                {isCurrentlyPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                  {track.has_voice && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      Guided
                    </span>
                  )}
                  {isCurrent && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                      {isCurrentlyPlaying ? 'Playing' : 'Selected'}
                    </span>
                  )}
                </div>
                {track.producer_name && (
                  <p className="text-xs text-muted-foreground">
                    by{' '}
                    {track.producer_url ? (
                      <a
                        href={track.producer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.producer_name}
                      </a>
                    ) : (
                      <span>{track.producer_name}</span>
                    )}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {track.hz_label ? <span>{track.hz_label}</span> : null}
                  {track.hz_label && durationLabel !== '—' ? <span className="mx-2">•</span> : null}
                  {durationLabel !== '—' ? <span>{durationLabel}</span> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export const formatTrackDuration = formatDuration
