'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useTimerStore } from '@/store/timer-store'
import { useTaskStore } from '@/store/task-store'
import { useMusicPlayer } from '@/components/music/Player'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AnimatedMusicIcon,
  MusicTrackInfo,
  MusicPlayPauseButton,
  MusicVolumeControl,
  MusicProgressBar,
  MusicLoopButton,
} from '@/components/music/music-controls'

/**
 * Sticky Focus Controller
 *
 * Global sticky bar that appears at the top when a focus session is running.
 * Visible across all routes to allow quick access to timer controls.
 *
 * Features:
 * - Shows elapsed time with pulsing indicator
 * - Displays current task name (hidden on small screens)
 * - Pause/Resume and End buttons
 * - Yellow paused state indicator
 * - Emerald green color scheme matching Focus Timer feature
 * - Integrated music player display when music is playing alongside focus timer
 *
 * Music Integration:
 * - When music is playing during focus session, shows compact music controls
 * - Music section appears below focus timer section with divider
 * - Height expands from h-14 to h-24 when music is integrated
 * - Displays: animated music icon, track info, play/pause, volume, progress bar
 * - Responsive: hides less critical info on smaller screens
 *
 * QA Notes:
 * - Should appear when timer starts (isRunning = true)
 * - Should disappear when timer stops (isRunning = false)
 * - Spacer (h-14 or h-24) prevents content overlap with fixed position bar
 * - Mobile responsive: task name hidden on small screens, button labels hidden on mobile
 * - Animations: slides down on appear, slides up on disappear
 * - Does not conflict with mobile/desktop headers
 * - Pause state: yellow indicator appears, shows status text on mobile
 * - Music integration: smooth height transition when music starts/stops
 */

export function StickyFocusController() {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentTaskId,
    pauseTimer,
    resumeTimer,
    stopTimer
  } = useTimerStore()

  const { tasks } = useTaskStore()
  const { currentTrack, isPlaying: isMusicPlaying, stop: stopMusic } = useMusicPlayer()
  const [elapsedTime, setElapsedTime] = useState(0)
  const pathname = usePathname()

  // Get current task details
  const currentTask = currentTaskId
    ? tasks.find(t => t.id === currentTaskId)
    : null

  // Don't show music integration on /calm page (music controls are on the page itself)
  const onCalmPage = pathname === '/calm'

  // Check if music is also playing (but not when on calm page - controls are there)
  const showMusicIntegration = currentTrack !== null && !onCalmPage

  // Calculate elapsed time
  const duration = useTimerStore(state => state.duration)
  const totalSeconds = duration * 60
  const elapsed = totalSeconds - timeRemaining

  useEffect(() => {
    setElapsedTime(elapsed)
  }, [elapsed])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handlePauseResume = () => {
    if (isPaused) {
      resumeTimer()
    } else {
      pauseTimer()
    }
  }

  const handleEnd = async () => {
    await stopTimer(false)
  }

  return (
    <>
      <AnimatePresence>
        {isRunning && (
          <motion.div
            key="sticky-focus-bar"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              "fixed top-0 left-0 right-0 z-50",
              "bg-gradient-to-r from-emerald-500 to-emerald-600",
              "shadow-lg border-b border-emerald-700"
            )}
          >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Focus Timer Section */}
          <div className={cn(
            "flex items-center justify-between gap-4",
            showMusicIntegration ? "h-12 border-b border-emerald-400/30" : "h-14"
          )}>
            {/* Left: Timer and Task Info */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              {/* Elapsed Time */}
              <div className="flex items-center gap-2 shrink-0">
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isPaused ? "bg-yellow-300" : "bg-white"
                )} />
                <span className="text-white font-mono text-lg md:text-xl font-semibold">
                  {formatTime(elapsedTime)}
                </span>
              </div>

              {/* Task Name - Hide on small screens if too long */}
              {currentTask && (
                <>
                  <div className="hidden sm:block w-px h-6 bg-emerald-400" />
                  <span className="text-white text-sm md:text-base font-medium truncate">
                    {currentTask.title}
                  </span>
                </>
              )}
            </div>

            {/* Right: Control Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Pause/Resume Button */}
              <Button
                size="sm"
                onClick={handlePauseResume}
                className={cn(
                  "h-8 px-3 gap-1.5",
                  "bg-white/20 hover:bg-white/30 text-white border-white/30",
                  "transition-all duration-200"
                )}
                variant="outline"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                )}
              </Button>

              {/* End Button */}
              <Button
                size="sm"
                onClick={handleEnd}
                className={cn(
                  "h-8 px-3 gap-1.5",
                  "bg-red-500 hover:bg-red-600 text-white border-red-600",
                  "transition-all duration-200"
                )}
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End</span>
              </Button>
            </div>
          </div>

          {/* Music Player Section - Only when music is playing */}
          {showMusicIntegration && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-12 flex items-center justify-between gap-4"
            >
              {/* Left: Music icon + Track info */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <AnimatedMusicIcon isPlaying={isMusicPlaying} className="shrink-0" />

                <div className="h-4 w-px bg-emerald-400/50 hidden sm:block" />

                <MusicTrackInfo
                  showCategory={true}
                  showHzLabel={false}
                  compact={true}
                  className="hidden sm:flex"
                />
              </div>

              {/* Right: Progress + Controls */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Progress bar - Desktop only */}
                <div className="hidden lg:flex items-center min-w-[150px] max-w-[200px]">
                  <MusicProgressBar showTime={false} size="sm" />
                </div>

                <div className="h-4 w-px bg-emerald-400/50 hidden lg:block" />

                {/* Volume - Tablet and up */}
                <div className="hidden md:block">
                  <MusicVolumeControl size="sm" useDropdown={true} />
                </div>

                <div className="h-4 w-px bg-emerald-400/50 hidden md:block" />

                {/* Loop */}
                <MusicLoopButton size="sm" showLabel={false} />

                {/* Play/Pause */}
                <MusicPlayPauseButton size="sm" showLabel={false} />

                <div className="h-4 w-px bg-emerald-400/50" />

                {/* Close music */}
                <Button
                  onClick={stopMusic}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 px-2 h-8"
                  title="Close music player"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Status Text - Mobile Only */}
        {isPaused && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500/20 border-t border-yellow-400/30"
          >
            <div className="max-w-7xl mx-auto px-4 py-1.5">
              <p className="text-white text-xs text-center">
                Timer paused - Click Resume to continue
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
