'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProposalBarV2 } from './proposal-bar-v2'
import { NudgesPanel } from './nudges-panel'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { AIVariantConfig } from '@/hooks/use-ai-variant'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'

interface CoachPanelProps {
  mode: 'setup' | 'running' | 'wrapup'
  duration: number
  taskTitle?: string | null
  sessionId?: string | null
  config: AIVariantConfig
  onStartNow: () => void
  onAdjust: () => void
  // Running state props
  progress?: number
  timeRemaining?: number
  isPaused?: boolean
}

/**
 * CoachPanel Component
 *
 * Right-side coach panel for Focus Page v2.
 * Shows Proposal Bar in setup mode and persistent AI Assistant.
 *
 * Features:
 * - ProposalBar in setup mode with recommendations
 * - AIAssistant kept mounted across states (no remount)
 * - Collapsible chat region with smooth transitions
 * - In running mode, can show quick notes input or nudges
 */
export function CoachPanel({
  mode,
  duration,
  taskTitle,
  sessionId,
  config,
  onStartNow,
  onAdjust,
  progress = 0,
  timeRemaining = 0,
  isPaused = false
}: CoachPanelProps) {
  const [isChatExpanded, setIsChatExpanded] = useState(false)

  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])

  const handleAskNuree = () => {
    setIsChatExpanded(true)
  }

  const handleToggleChat = () => {
    setIsChatExpanded(!isChatExpanded)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          {mode === 'setup' ? 'Coach Assist' : 'Focus Coach'}
        </h2>
        <p className="text-sm text-gray-500">
          {mode === 'setup'
            ? `Get ${personality.name}'s recommendations for your focus session`
            : `${personality.name} is here to help you stay focused`
          }
        </p>
      </header>

      {/* Proposal Bar - Only in setup mode */}
      {mode === 'setup' && (
        <div className="rounded-lg bg-violet-50/20 backdrop-blur-sm p-4">
          <ProposalBarV2
            duration={duration}
            taskTitle={taskTitle}
            onStartNow={onStartNow}
            onAdjust={onAdjust}
            onAskNuree={handleAskNuree}
            coachName={personality.name}
          />
        </div>
      )}

      {/* Chat Region - Always mounted, collapsible */}
      <div className="space-y-2">
        {/* Toggle Button */}
        <Button
          onClick={handleToggleChat}
          variant="ghost"
          size="sm"
          className="w-full justify-between text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
        >
          <span className="text-sm font-medium">
            {isChatExpanded ? 'Hide Chat' : `Chat with ${personality.name}`}
          </span>
          {isChatExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {/* AI Assistant - Always mounted, visibility controlled by AnimatePresence */}
        <AnimatePresence initial={false}>
          {isChatExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <AIAssistant
                  variant="focus"
                  config={config}
                  sessionId={sessionId}
                  layout="minimal"
                  showHeader={false}
                  showQuickActions={false}
                  showHistory={true}
                  maxHeight="400px"
                  placeholder={mode === 'running' ? 'Quick notes or questions...' : 'Ask about your focus session...'}
                  containerClassName="rounded-lg bg-white/40 backdrop-blur-md"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed State Helper */}
        {!isChatExpanded && (
          <p className="text-xs text-center text-gray-500 py-2">
            Click above to chat with {personality.name}
          </p>
        )}
      </div>

      {/* Running State Nudges */}
      {mode === 'running' && !isChatExpanded && (
        <NudgesPanel
          progress={progress}
          timeRemaining={timeRemaining}
          isPaused={isPaused}
        />
      )}
    </div>
  )
}
