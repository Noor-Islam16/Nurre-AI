'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BreathingCircle } from './breathing-circle'
import { BreathingTimeline } from './breathing-timeline'
import { useCalmBreathing } from '@/hooks/useCalmBreathing'
import { useBreathingSounds } from '@/hooks/useBreathingSounds'
import { useMusicPlayer } from '@/components/music/Player'
import { breathingPatterns } from '@/lib/breathing/patterns'
import { Wind, Sparkles, TrendingDown, X, Volume2, VolumeX, ArrowLeft, Clock, Award } from 'lucide-react'

type ViewState = 'ready' | 'selecting' | 'exercising'

export function CalmBreathing() {
  const {
    isBreathingMode,
    breathingPattern,
    breathingPhase,
    breathingPhaseProgress,
    breathingInstruction,
    breathingCycleCount,
    breathingElapsedTime,
    showStressRating,
    setShowStressRating,
    isPreSession,
    setStressLevelBefore,
    setStressLevelAfter,
    startBreathingExercise,
    stopBreathing,
    saveSession,
  } = useCalmBreathing()

  const { soundEnabled, toggleSound, playPhaseSound } = useBreathingSounds()
  const { isPlaying: isMusicPlaying, pause: pauseMusic, resume: resumeMusic } = useMusicPlayer()
  const [viewState, setViewState] = useState<ViewState>('ready')
  const [isSaving, setIsSaving] = useState(false)
  const musicWasPlayingRef = useRef(false)

  // Sync view state with breathing mode
  useEffect(() => {
    if (isBreathingMode) {
      setViewState('exercising')
    } else if (viewState === 'exercising') {
      setViewState('ready')
    }
  }, [isBreathingMode])

  // Play sound on phase change
  useEffect(() => {
    if (isBreathingMode) {
      playPhaseSound(breathingPhase)
    }
  }, [breathingPhase, isBreathingMode, playPhaseSound])

  // Pause music when breathing starts, resume when it ends
  useEffect(() => {
    if (isBreathingMode) {
      // Breathing started - pause music if playing
      // Only capture and pause on initial transition to breathing mode
      if (isMusicPlaying && !musicWasPlayingRef.current) {
        musicWasPlayingRef.current = true
        pauseMusic()
      }
    } else {
      // Breathing ended - resume music if it was playing before
      if (musicWasPlayingRef.current) {
        musicWasPlayingRef.current = false
        resumeMusic()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBreathingMode])

  // Handle stress rating submission
  const handleStressRating = async (level: number) => {
    if (isPreSession) {
      setStressLevelBefore(level)
    } else {
      setStressLevelAfter(level)
      setIsSaving(true)
      try {
        await saveSession()
      } catch (error) {
        console.error('Failed to save session:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleSkipRating = () => {
    if (isPreSession) {
      setStressLevelBefore(5)
    } else {
      setStressLevelAfter(5)
      saveSession()
    }
  }

  const handlePatternSelect = (patternId: string) => {
    startBreathingExercise(patternId)
  }

  const handleStopBreathing = () => {
    stopBreathing()
    setViewState('ready')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'advanced':
        return 'text-rose-600 bg-rose-50 border-rose-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-white py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Sound Toggle - Top Right */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={toggleSound}
            variant="ghost"
            size="sm"
            className={`rounded-full ${
              soundEnabled
                ? 'bg-orange-50 hover:bg-orange-100 text-orange-600'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Breathing Exercises</h1>
          <p className="text-gray-600">
            Guided breathing to reduce stress, improve focus, and calm your mind
          </p>
        </div>

        {/* View State: Ready */}
        {viewState === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
              <Wind className="w-12 h-12 text-orange-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Ready to breathe?</h2>
            <p className="text-gray-600 mb-8 max-w-md text-center">
              Choose a breathing pattern that fits your needs
            </p>
            <Button
              onClick={() => setViewState('selecting')}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-6"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Breathing Exercise
            </Button>
          </motion.div>
        )}

        {/* View State: Pattern Selection */}
        {viewState === 'selecting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Button
              onClick={() => setViewState('ready')}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(breathingPatterns).map(([key, pattern]) => (
                <motion.button
                  key={key}
                  onClick={() => handlePatternSelect(key)}
                  className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-md transition-all text-left group bg-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{pattern.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {pattern.name}
                        </h3>
                        <p className="text-sm text-gray-600">{pattern.description}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getDifficultyColor(pattern.difficulty)}`}>
                      {pattern.difficulty}
                    </span>
                  </div>

                  {/* Phase timing */}
                  <div className="flex items-center gap-2 mb-3">
                    {pattern.phases.map((phase, i) => (
                      <div key={i} className="flex items-center">
                        <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded font-mono">
                          {phase.duration}s
                        </span>
                        {i < pattern.phases.length - 1 && (
                          <span className="mx-1 text-gray-400">→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Benefits */}
                  <div className="flex flex-wrap gap-2">
                    {pattern.benefits.slice(0, 2).map((benefit, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {benefit}
                      </span>
                    ))}
                  </div>

                  {/* Recommended cycles */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-600">
                    <Repeat className="w-3 h-3" />
                    <span>{pattern.recommendedCycles} cycles recommended</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* View State: Exercising */}
        {viewState === 'exercising' && isBreathingMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Pattern name and progress */}
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                {breathingPattern?.name}
              </h2>
              <p className="text-gray-600">
                Cycle {breathingCycleCount} of {breathingPattern?.recommendedCycles}
              </p>
            </div>

            {/* Breathing Circle */}
            <div className="flex justify-center">
              <BreathingCircle
                phase={breathingPhase}
                phaseProgress={breathingPhaseProgress}
                pattern={breathingPattern}
                instruction={breathingInstruction}
                cycleCount={breathingCycleCount}
                elapsedTime={breathingElapsedTime}
              />
            </div>

            {/* Finish Button */}
            <div className="text-center">
              <Button
                onClick={handleStopBreathing}
                variant="outline"
                size="lg"
                className="border-gray-300 text-gray-900 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Finish Exercise
              </Button>
            </div>

            {/* Timeline */}
            <BreathingTimeline
              pattern={breathingPattern}
              currentPhase={breathingPhase}
              phaseProgress={breathingPhaseProgress}
            />
          </motion.div>
        )}

        {/* Stress Rating Dialog */}
        <Dialog open={showStressRating} onOpenChange={setShowStressRating}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 text-center">
                {isPreSession ? (
                  <>
                    <TrendingDown className="w-7 h-7 mx-auto mb-2 text-orange-600" />
                    How stressed do you feel?
                  </>
                ) : (
                  <>
                    <Sparkles className="w-7 h-7 mx-auto mb-2 text-orange-600" />
                    How do you feel now?
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-center text-gray-600 text-sm mb-4">
                {isPreSession
                  ? 'Rate your stress level from 1 (calm) to 10 (very stressed)'
                  : 'Rate how you feel after the breathing exercise'}
              </p>

              {/* Stress Level Buttons */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <motion.button
                    key={level}
                    onClick={() => handleStressRating(level)}
                    className={`p-3 rounded-lg border-2 font-semibold text-base transition-all ${
                      level <= 3
                        ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        : level <= 6
                        ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                        : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={isSaving}
                  >
                    {level}
                  </motion.button>
                ))}
              </div>

              {/* Labels */}
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>😌 Calm</span>
                <span>😰 Very Stressed</span>
              </div>

              {/* Skip Button */}
              <Button
                onClick={handleSkipRating}
                variant="ghost"
                className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Skip'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function Repeat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  )
}
