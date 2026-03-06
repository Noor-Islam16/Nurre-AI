'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { breathingPatterns } from '@/lib/breathing/patterns'
import { motion } from 'framer-motion'
import { Wind, Heart, Brain, Sparkles } from 'lucide-react'
import { useTimerStore } from '@/store/timer-store'
import { useState } from 'react'
import { useTimerCleanup } from '@/hooks/use-timer-cleanup'

interface BreathingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BreathingModal({ isOpen, onClose }: BreathingModalProps) {
  const { startBreathing } = useTimerStore()
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null)
  
  // Auto cleanup on unmount
  useTimerCleanup()
  
  const handleSelectPattern = (patternId: string) => {
    setSelectedPattern(patternId)
    startBreathing(patternId)
    onClose()
  }
  
  const getPatternIcon = (icon: string) => {
    // Return icon component based on pattern
    switch(icon) {
      case '🌊': return <Wind className="w-6 h-6 text-blue-500" />
      case '⬜': return <Brain className="w-6 h-6 text-green-500" />
      case '✨': return <Sparkles className="w-6 h-6 text-purple-500" />
      case '❤️': return <Heart className="w-6 h-6 text-red-500" />
      default: return <Wind className="w-6 h-6 text-gray-700" />
    }
  }
  
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'easy': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'advanced': return 'text-red-600 bg-red-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-accent-500 to-accent-600 bg-clip-text text-transparent">
            Choose Breathing Exercise
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            Select a breathing pattern to help you relax, focus, and regulate your nervous system
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 mt-6">
          {Object.entries(breathingPatterns).map(([key, pattern]) => (
            <motion.button
              key={key}
              onClick={() => handleSelectPattern(key)}
              className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-accent-500 hover:shadow-lg transition-all text-left group bg-white hover:bg-gradient-to-r hover:from-accent-50 hover:to-accent-100/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gray-50 group-hover:bg-white transition-colors">
                  {getPatternIcon(pattern.icon)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {pattern.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(pattern.difficulty)}`}>
                      {pattern.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    {pattern.description}
                  </p>
                  <p className="text-xs text-gray-700 mb-2">
                    {pattern.recommendedCycles} cycles recommended
                  </p>
                  
                  {/* Phase timing display */}
                  <div className="flex items-center space-x-3 mb-3">
                    {pattern.phases.map((phase, i) => (
                      <div key={i} className="flex items-center">
                        <span className="text-xs bg-[#2B3544] text-white px-2 py-1 rounded font-mono">
                          {phase.duration}s
                        </span>
                        {i < pattern.phases.length - 1 && (
                          <span className="mx-1 text-gray-600">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Benefits */}
                  <div className="flex flex-wrap gap-2">
                    {pattern.benefits.map((benefit, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-accent-100 text-accent-700 rounded-full"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
        
        {/* Tips section */}
        <div className="mt-6 p-4 bg-gradient-to-r from-accent-50 to-accent-100/50 rounded-lg border border-accent-200">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h4 className="font-medium text-accent-800 mb-1">ADHD Pro Tips</h4>
              <ul className="text-sm text-accent-700 space-y-1">
                <li>• Start with shorter patterns like 4-4-4 Simple or Resonance</li>
                <li>• Breathing exercises activate your parasympathetic nervous system</li>
                <li>• Use before tasks to improve focus or when feeling overwhelmed</li>
                <li>• Consistency matters more than perfection - even 3 cycles help!</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Quick start guide */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">How it works:</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                1
              </div>
              <p className="text-xs text-gray-700">Choose a pattern</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                2
              </div>
              <p className="text-xs text-gray-700">Follow the visual cues</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                3
              </div>
              <p className="text-xs text-gray-700">Feel more focused</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}