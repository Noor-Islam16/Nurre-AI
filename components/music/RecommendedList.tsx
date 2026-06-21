'use client'

import * as React from 'react'
import { Play, Pause, Star, Heart } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MusicTrack, useMusicPlayer } from './Player'
import { formatTrackDuration } from './TrackList'

export type RecommendedListProps = {
  tracks: MusicTrack[]
  title?: string
  description?: string
  onToggleLike?: (track: MusicTrack) => void
}

export function RecommendedList({
  tracks,
  title = 'Recommended for you',
  description = 'Coach-picked tracks to jump back into focus quickly.',
  onToggleLike,
}: RecommendedListProps) {
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
    return null
  }

  return (
    <Card className="border-sky-200 bg-sky-50">
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white">
          <Star className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tracks.map((track) => {
          const isCurrent = currentTrack?.id === track.id
          const isCurrentlyPlaying = isCurrent && isPlaying
          const isResumeState = isCurrent && !isPlaying && progress > 0
          const durationLabel = formatTrackDuration(track.duration_sec)
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
                'group relative flex items-center justify-between gap-4 rounded-md border border-sky-200 bg-background/80 px-4 py-3 transition-colors',
                isCurrent ? 'shadow-inner shadow-sky-200' : 'hover:bg-sky-50'
              )}
            >
              {isCurrent && percentComplete > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-1 rounded-tr-md rounded-tl-md bg-sky-400 transition-all"
                  style={{ width: `${percentComplete * 100}%` }}
                />
              )}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-pressed={isCurrentlyPlaying}
                  aria-label={ariaLabel}
                  onClick={() => handleToggle(track, isCurrent, isCurrentlyPlaying)}
                  className={cn(
                    'hover:bg-sky-100 hover:border-sky-300 hover:text-sky-700 flex-shrink-0',
                    isCurrentlyPlaying && 'bg-sky-500 text-white border-sky-600 hover:bg-sky-600 hover:border-sky-600'
                  )}
                >
                  {isCurrentlyPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-medium text-foreground">{track.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {track.hz_label ? <span>{track.hz_label}</span> : null}
                    {track.hz_label && durationLabel !== '—' ? <span className="mx-2">•</span> : null}
                    {durationLabel !== '—' ? <span>{durationLabel}</span> : null}
                  </p>
                </div>
              </div>
              
              {onToggleLike && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleLike(track)
                  }}
                  className="text-muted-foreground hover:text-rose-500 hover:bg-rose-50/50 flex-shrink-0"
                  title={track.liked ? "Remove from Library" : "Add to Library"}
                >
                  <Heart className={cn("h-5 w-5 transition-all duration-200 active:scale-75", track.liked ? "fill-rose-500 text-rose-500" : "")} />
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

