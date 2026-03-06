'use client'

import { Play, Pause, Volume2, VolumeX, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useMusicPlayer } from './Player'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MusicPlayPauseButtonProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
  showLabel?: boolean
}

export function MusicPlayPauseButton({
  size = 'md',
  variant = 'ghost',
  className,
  showLabel = false,
}: MusicPlayPauseButtonProps) {
  const { isPlaying, pause, resume } = useMusicPlayer()

  const handleClick = async () => {
    if (isPlaying) {
      pause()
    } else {
      await resume()
    }
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size === 'sm' ? 'sm' : 'default'}
      className={cn('text-white hover:bg-white/20', className)}
    >
      {isPlaying ? (
        <>
          <Pause className={iconSize} />
          {showLabel && <span className="ml-2 hidden sm:inline">Pause</span>}
        </>
      ) : (
        <>
          <Play className={iconSize} />
          {showLabel && <span className="ml-2 hidden sm:inline">Play</span>}
        </>
      )}
    </Button>
  )
}

interface MusicVolumeControlProps {
  size?: 'sm' | 'md'
  className?: string
  showSlider?: boolean
  useDropdown?: boolean
}

export function MusicVolumeControl({
  size = 'md',
  className,
  showSlider = true,
  useDropdown = false,
}: MusicVolumeControlProps) {
  const { volume, setVolume } = useMusicPlayer()

  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0] / 100)
  }

  const isMuted = volume === 0
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  // Dropdown version (for compact/integrated mode)
  if (useDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={size === 'sm' ? 'sm' : 'default'}
            className={cn('text-white hover:bg-white/20 px-2', className)}
          >
            {isMuted ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 bg-white/95 backdrop-blur-sm border-emerald-200"
          align="end"
          sideOffset={8}
        >
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Volume</span>
              <span className="text-xs text-gray-500">{Math.round(volume * 100)}%</span>
            </div>
            <Slider
              value={[volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              variant="volume-dropdown"
              className="w-full music-volume-dropdown"
            />
            <div className="flex items-center gap-2 pt-1">
              <Button
                onClick={() => setVolume(isMuted ? 0.7 : 0)}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3 h-3 mr-1" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 mr-1" />
                    Mute
                  </>
                )}
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Inline version (default)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        onClick={() => setVolume(isMuted ? 0.7 : 0)}
        variant="ghost"
        size={size === 'sm' ? 'sm' : 'default'}
        className="text-white hover:bg-white/20 px-2"
      >
        {isMuted ? <VolumeX className={iconSize} /> : <Volume2 className={iconSize} />}
      </Button>
      {showSlider && (
        <Slider
          value={[volume * 100]}
          onValueChange={handleVolumeChange}
          max={100}
          step={1}
          variant="volume"
          className="w-20 md:w-24 music-volume"
        />
      )}
    </div>
  )
}

interface MusicProgressBarProps {
  className?: string
  showTime?: boolean
  size?: 'sm' | 'md'
}

export function MusicProgressBar({
  className,
  showTime = true,
  size = 'md',
}: MusicProgressBarProps) {
  const { progress, duration, percentComplete, seek } = useMusicPlayer()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (values: number[]) => {
    const newProgress = (values[0] / 100) * duration
    seek(newProgress)
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className={cn('flex items-center gap-2 flex-1 min-w-0', className)}>
      {showTime && (
        <span className={cn('text-white/90 font-mono whitespace-nowrap', textSize)}>
          {formatTime(progress)}
        </span>
      )}
      <Slider
        value={[percentComplete * 100]}
        onValueChange={handleSeek}
        max={100}
        step={0.1}
        variant="seeker"
        className="flex-1 cursor-pointer music-seeker"
      />
      {showTime && (
        <span className={cn('text-white/90 font-mono whitespace-nowrap', textSize)}>
          {formatTime(duration)}
        </span>
      )}
    </div>
  )
}

interface MusicTrackInfoProps {
  className?: string
  showCategory?: boolean
  showHzLabel?: boolean
  compact?: boolean
}

export function MusicTrackInfo({
  className,
  showCategory = true,
  showHzLabel = true,
  compact = false,
}: MusicTrackInfoProps) {
  const { currentTrack } = useMusicPlayer()

  if (!currentTrack) return null

  const categoryColors = {
    focus: 'bg-emerald-400/30 text-emerald-100',
    calm: 'bg-blue-400/30 text-blue-100',
    productivity: 'bg-amber-400/30 text-amber-100',
    sleep: 'bg-purple-400/30 text-purple-100',
  }

  const categoryColor = categoryColors[currentTrack.category] || 'bg-gray-400/30 text-gray-100'

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {/* Track Title */}
      <span
        className={cn(
          'text-white font-medium truncate',
          compact ? 'text-sm max-w-[150px] md:max-w-[250px]' : 'text-base max-w-[200px] md:max-w-[350px]'
        )}
        title={currentTrack.title}
      >
        {currentTrack.title}
      </span>

      {/* Category Badge */}
      {showCategory && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap hidden sm:inline-block',
            categoryColor
          )}
        >
          {currentTrack.category.charAt(0).toUpperCase() + currentTrack.category.slice(1)}
        </span>
      )}

      {/* Guided Badge */}
      {currentTrack.has_voice && (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap hidden sm:inline-block bg-violet-400/30 text-violet-100">
          Guided
        </span>
      )}

      {/* Hz Label */}
      {showHzLabel && currentTrack.hz_label && (
        <span className="text-white/70 text-xs whitespace-nowrap hidden md:inline-block">
          {currentTrack.hz_label}
        </span>
      )}
    </div>
  )
}

interface MusicLoopButtonProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
  showLabel?: boolean
}

export function MusicLoopButton({
  size = 'md',
  variant = 'ghost',
  className,
  showLabel = false,
}: MusicLoopButtonProps) {
  const { isLooping, toggleLoop } = useMusicPlayer()

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <Button
      onClick={toggleLoop}
      variant={variant}
      size={size === 'sm' ? 'sm' : 'default'}
      className={cn(
        'transition-all duration-200',
        isLooping
          ? 'text-white bg-white/30 hover:bg-white/40 ring-2 ring-white/50'
          : 'text-white/60 hover:text-white hover:bg-white/20',
        className
      )}
      title={isLooping ? 'Loop is ON - click to turn off' : 'Loop is OFF - click to turn on'}
    >
      <Repeat className={cn(iconSize, isLooping && 'drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]')} />
      {showLabel && (
        <span className={cn('ml-2 hidden sm:inline', isLooping ? 'font-medium' : '')}>
          {isLooping ? 'Loop On' : 'Loop'}
        </span>
      )}
    </Button>
  )
}

interface AnimatedMusicIconProps {
  className?: string
  isPlaying: boolean
}

export function AnimatedMusicIcon({ className, isPlaying }: AnimatedMusicIconProps) {
  return (
    <div className={cn('relative w-5 h-5 flex items-center justify-center', className)}>
      {/* Animated bars when playing */}
      {isPlaying ? (
        <div className="flex items-end gap-0.5 h-4">
          <div className="w-1 bg-white rounded-full animate-music-bar-1" style={{ height: '40%' }} />
          <div className="w-1 bg-white rounded-full animate-music-bar-2" style={{ height: '70%' }} />
          <div className="w-1 bg-white rounded-full animate-music-bar-3" style={{ height: '50%' }} />
        </div>
      ) : (
        /* Static music note when paused */
        <svg
          className="w-4 h-4 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      )}

      {/* Pulsing ring when playing */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/40 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  )
}
