'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { useAIVariant } from '@/hooks/use-ai-variant'

interface CoachDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'setup' | 'running'
  sessionId?: string | null
}

/**
 * CoachDrawer Component
 *
 * Slide-out drawer containing the AI Coach (text-based).
 * Opens from the right side of the screen.
 *
 * Features:
 * - AI chat via AIAssistant component
 * - Mode-aware placeholder text
 * - Clean header with close button
 */
export function CoachDrawer({
  open,
  onOpenChange,
  mode,
  sessionId
}: CoachDrawerProps) {
  const { config } = useAIVariant()
  const placeholder = mode === 'running'
    ? 'Quick notes or questions...'
    : 'Ask about your focus session...'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] max-w-[90vw] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-lg font-semibold text-gray-900">
            Focus Coach
          </SheetTitle>
          <SheetDescription className="text-sm text-gray-500">
            {mode === 'running'
              ? 'I\'m here to help you stay focused'
              : 'Get help planning your focus session'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {config && (
            <AIAssistant
              variant="focus"
              config={config}
              sessionId={sessionId}
              layout="minimal"
              showHeader={false}
              showQuickActions={false}
              showHistory={true}
              maxHeight="100%"
              placeholder={placeholder}
              containerClassName="h-full border-0 shadow-none rounded-none"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
