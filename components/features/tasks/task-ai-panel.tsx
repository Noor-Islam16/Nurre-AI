'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Sparkles, X, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  sessionId?: string
}

interface TaskAIPanelProps {
  messages: Message[]
  isLoading: boolean
  onClose: () => void
  className?: string
}

export function TaskAIPanel({
  messages,
  isLoading,
  onClose,
  className
}: TaskAIPanelProps) {
  const shouldReduceMotion = useReducedMotion()
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Only show the last 10 messages to keep panel compact
  const recentMessages = messages.slice(-10)

  // Filter out system messages for display
  const displayMessages = recentMessages.filter(m => m.role !== 'system')

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
      className={cn(
        "bg-violet-50/50 border border-violet-100 rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-violet-100 bg-white/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-violet-900">Nuree</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-violet-400 hover:text-violet-600 hover:bg-violet-100 transition-colors"
          aria-label="Close AI panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="px-4 py-3 max-h-64 overflow-y-auto space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {displayMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
              className={cn(
                "flex gap-2",
                message.role === 'user' && "justify-end"
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-violet-700" />
                </div>
              )}

              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                  message.role === 'assistant'
                    ? "bg-white text-gray-800 border border-violet-100"
                    : "bg-violet-600 text-white"
                )}
              >
                <MessageContent content={message.content} />
              </div>

              {message.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-violet-700" />
            </div>
            <div className="bg-white text-gray-800 border border-violet-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// Component to render message content with basic markdown support
function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering for numbered lists
  const lines = content.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Check for numbered list items
        const listMatch = line.match(/^(\d+)\.\s+(.+)$/)
        if (listMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="font-medium text-violet-600 flex-shrink-0">
                {listMatch[1]}.
              </span>
              <span>{listMatch[2]}</span>
            </div>
          )
        }

        // Check for bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-600 flex-shrink-0">-</span>
              <span>{line.slice(2)}</span>
            </div>
          )
        }

        // Regular text
        if (line.trim()) {
          return <p key={i}>{line}</p>
        }

        // Empty line
        return <div key={i} className="h-2" />
      })}
    </div>
  )
}
