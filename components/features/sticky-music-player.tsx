'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useMusicPlayer } from '@/components/music/Player'
import { useTimerStore } from '@/store/timer-store'
import {
  AnimatedMusicIcon,
  MusicTrackInfo,
  MusicPlayPauseButton,
  MusicVolumeControl,
  MusicProgressBar,
  MusicLoopButton,
} from '@/components/music/music-controls'

/**
 * Standalone music player banner that appears at the top of the screen
 * when music is playing but no focus timer is active.
 *
 * Integrates with focus timer - only shows when focus timer is not running.
 */
export function StickyMusicPlayer() {
  const { currentTrack, isPlaying, stop } = useMusicPlayer()
  const isRunning = useTimerStore((state) => state.isRunning)
  const pathname = usePathname()

  // Don't show on /calm page (music controls are on the page itself)
  const onCalmPage = pathname === '/calm'

  // Only show when music is playing AND focus timer is NOT active AND not on calm page
  const shouldShow = currentTrack !== null && !isRunning && !onCalmPage

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-sky-500 to-sky-600 border-b border-sky-700 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
            {/* Left side: Animated icon + Track info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <AnimatedMusicIcon isPlaying={isPlaying} />

              <div className="h-6 w-px bg-sky-400 hidden sm:block" />

              <MusicTrackInfo
                showCategory={true}
                showHzLabel={true}
                compact={false}
              />
            </div>

            {/* Right side: Progress bar + Controls */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Progress bar with time display */}
              <div className="hidden lg:flex items-center gap-2 min-w-[200px] max-w-[300px]">
                <MusicProgressBar showTime={true} size="sm" />
              </div>

              <div className="h-6 w-px bg-sky-400 hidden lg:block" />

              {/* Volume control */}
              <div className="hidden md:block">
                <MusicVolumeControl size="sm" showSlider={true} />
              </div>

              <div className="h-6 w-px bg-sky-400 hidden md:block" />

              {/* Loop button */}
              <MusicLoopButton size="sm" showLabel={false} />

              {/* Play/Pause button */}
              <MusicPlayPauseButton size="sm" showLabel={false} />

              <div className="h-6 w-px bg-sky-400" />

              {/* Close button */}
              <Button
                onClick={stop}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 px-2"
                title="Close music player"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile progress bar (below main content) */}
          <div className="lg:hidden px-4 pb-2">
            <MusicProgressBar showTime={true} size="sm" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
