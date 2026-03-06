'use client'

import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useMusicPlayer, MusicCategory } from './Player'
import { cn } from '@/lib/utils'

interface MusicHeroProps {
  className?: string
}

const CATEGORY_GRADIENTS: Record<MusicCategory, string> = {
  focus: 'from-blue-600 via-blue-500 to-cyan-500',
  calm: 'from-cyan-600 via-teal-500 to-emerald-500',
  productivity: 'from-amber-500 via-orange-500 to-red-500',
  sleep: 'from-indigo-600 via-purple-600 to-pink-500'
}

const CATEGORY_ACCENT: Record<MusicCategory, string> = {
  focus: 'bg-blue-400/20',
  calm: 'bg-teal-400/20',
  productivity: 'bg-orange-400/20',
  sleep: 'bg-purple-400/20'
}

export function MusicHero({ className }: MusicHeroProps) {
  const {
    currentTrack,
    isPlaying,
    isLooping,
    volume,
    progress,
    duration,
    pause,
    resume,
    seek,
    setVolume,
    toggleLoop,
    stop
  } = useMusicPlayer()

  if (!currentTrack) return null

  const gradient = CATEGORY_GRADIENTS[currentTrack.category]
  const accent = CATEGORY_ACCENT[currentTrack.category]

  const handlePlayPause = async () => {
    if (isPlaying) {
      pause()
    } else {
      await resume()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (values: number[]) => {
    const newProgress = (values[0] / 100) * duration
    seek(newProgress)
  }

  const handleVolumeChange = (values: number[]) => {
    setVolume(values[0] / 100)
  }

  const percentComplete = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br',
        gradient,
        className
      )}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn('absolute -top-20 -right-20 w-64 h-64 rounded-full', accent)}
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn('absolute -bottom-32 -left-32 w-80 h-80 rounded-full', accent)}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8">
        {/* Hz Frequency - Visual Hero */}
        <div className="text-center mb-6">
          {currentTrack.hz_label ? (
            <>
              <motion.div
                key={currentTrack.hz_label}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl md:text-6xl font-bold text-white/90 tracking-tight"
              >
                {currentTrack.hz_label.replace('Hz', '').trim()}
                <span className="text-3xl md:text-4xl ml-1">Hz</span>
              </motion.div>
              <p className="text-white/60 text-sm mt-1">Frequency</p>
            </>
          ) : (
            <div className="h-20 flex items-center justify-center">
              <motion.div
                animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"
              >
                {isPlaying ? (
                  <div className="flex items-end gap-1 h-6">
                    <div className="w-1.5 bg-white rounded-full animate-music-bar-1" style={{ height: '40%' }} />
                    <div className="w-1.5 bg-white rounded-full animate-music-bar-2" style={{ height: '70%' }} />
                    <div className="w-1.5 bg-white rounded-full animate-music-bar-3" style={{ height: '50%' }} />
                  </div>
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" />
                )}
              </motion.div>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center mb-6">
          <h3 className="text-lg md:text-xl font-semibold text-white truncate px-4">
            {currentTrack.title}
          </h3>
          {currentTrack.producer_name && (
            <p className="text-white/60 text-sm mt-0.5">
              by{' '}
              {currentTrack.producer_url ? (
                <a
                  href={currentTrack.producer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white hover:underline"
                >
                  {currentTrack.producer_name}
                </a>
              ) : (
                <span>{currentTrack.producer_name}</span>
              )}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-white/70 text-sm capitalize">
              {currentTrack.category}
            </p>
            {currentTrack.has_voice && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                Guided
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Slider
            value={[percentComplete]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            variant="seeker"
            className="w-full cursor-pointer music-hero-seeker"
          />
          <div className="flex justify-between mt-2 text-xs text-white/70 font-mono">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              variant="volume"
              className="w-20 hidden sm:flex music-hero-volume"
            />
          </div>

          {/* Main Play/Pause Button */}
          <Button
            onClick={handlePlayPause}
            size="lg"
            className={cn(
              'w-14 h-14 rounded-full',
              'bg-white hover:bg-white/90 text-gray-900',
              'shadow-lg hover:shadow-xl transition-all'
            )}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </Button>

          {/* Stop Button */}
          <Button
            onClick={stop}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/20"
          >
            <span className="text-xs">Stop</span>
          </Button>

          {/* Loop Button */}
          <Button
            onClick={toggleLoop}
            variant="ghost"
            size="sm"
            className={cn(
              'transition-all duration-200',
              isLooping
                ? 'text-white bg-white/30 hover:bg-white/40 ring-2 ring-white/50'
                : 'text-white/60 hover:text-white hover:bg-white/20'
            )}
            title={isLooping ? 'Loop is ON - click to turn off' : 'Loop is OFF - click to turn on'}
          >
            <Repeat className={cn('w-4 h-4', isLooping && 'drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]')} />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
