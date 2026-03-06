'use client'

import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

// =============================================================================
// Modern Message Component - 2024/2025 Design
// =============================================================================
// Clean, minimal design inspired by modern chat interfaces
// - No harsh gradients or heavy shadows
// - Subtle color differentiation
// - Smooth animations
// - Works for both voice transcript and text chat
// =============================================================================

export interface ModernMessageProps {
  role: 'user' | 'assistant'
  content: string
  id?: string
  timestamp?: Date | string
  isLatest?: boolean
  isPending?: boolean
  variant?: 'default' | 'compact' | 'subtitle'
  showTimestamp?: boolean
  assistantName?: string
  className?: string
}

export const ModernMessage = forwardRef<HTMLDivElement, ModernMessageProps>(
  function ModernMessage(
    {
      role,
      content,
      id,
      timestamp,
      isLatest = false,
      isPending = false,
      variant = 'default',
      showTimestamp = false,
      assistantName,
      className,
    },
    ref
  ) {
    const isUser = role === 'user'
    const isSubtitle = variant === 'subtitle'
    const isCompact = variant === 'compact'

    // Strip XML-like voice tags (e.g. <farin>...</farin>) that ElevenLabs multi-voice can inject
    const cleanContent = content.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*>/g, '')

    // Subtitle variant - centered, more prominent
    if (isSubtitle) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'w-full max-w-[90%] lg:max-w-xl mx-auto',
            className
          )}
        >
          <div
            className={cn(
              'relative px-5 py-4 lg:px-6 lg:py-5 rounded-2xl',
              'bg-white/90 backdrop-blur-sm',
              'border border-gray-100',
              'shadow-sm overflow-hidden',
              isPending && 'animate-pulse'
            )}
          >
            {/* Subtle AI indicator */}
            {!isUser && (
              <div className="absolute -top-2 left-4 px-2 py-0.5 bg-violet-50 rounded-full">
                <span className="text-[10px] lg:text-xs font-medium text-violet-600 uppercase tracking-wide">
                  {assistantName || 'Nuree'}
                </span>
              </div>
            )}

            <p className={cn(
              'text-sm lg:text-base leading-relaxed text-gray-800',
              'text-center line-clamp-3',
              isUser && 'italic text-gray-600'
            )}>
              {cleanContent}
            </p>
          </div>
        </motion.div>
      )
    }

    // Default and compact variants - conversation bubbles
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'flex w-full',
          isUser ? 'justify-end' : 'justify-start',
          isCompact ? 'py-0.5' : 'py-1 lg:py-1.5',
          className
        )}
      >
        <div
          className={cn(
            'relative max-w-[85%] group',
            isCompact ? 'max-w-[90%]' : 'max-w-[85%]'
          )}
        >
          {/* Message bubble */}
          <div
            className={cn(
              'relative overflow-hidden',
              isCompact ? 'px-3 py-1.5 lg:px-4 lg:py-2' : 'px-4 py-2.5 lg:px-5 lg:py-3',
              // User messages - clean white with subtle shadow
              isUser && cn(
                'bg-white',
                'text-gray-800',
                'rounded-2xl rounded-br-md',
                'shadow-sm',
                'border border-gray-100'
              ),
              // AI messages - soft violet tint
              !isUser && cn(
                'bg-gradient-to-br from-violet-50/80 to-violet-100/50',
                'text-gray-800',
                'rounded-2xl rounded-bl-md',
                'border border-violet-100/60'
              ),
              // Pending state
              isPending && 'opacity-70',
              // Latest message highlight
              isLatest && !isUser && 'ring-1 ring-violet-200/50'
            )}
          >
            {/* Content */}
            <p className={cn(
              'whitespace-pre-wrap break-words',
              isCompact ? 'text-sm lg:text-base leading-snug' : 'text-[15px] lg:text-base leading-relaxed'
            )}>
              {cleanContent}
            </p>

            {/* Pending indicator */}
            {isPending && (
              <span className="inline-block ml-1 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-violet-400 rounded-full animate-pulse" />
            )}
          </div>

          {/* Timestamp - shows on hover for default, always for compact with showTimestamp */}
          {timestamp && (showTimestamp || !isCompact) && (
            <div
              className={cn(
                'absolute -bottom-4 text-[10px] lg:text-xs text-gray-400',
                'transition-opacity duration-200',
                isUser ? 'right-1' : 'left-1',
                !showTimestamp && 'opacity-0 group-hover:opacity-100'
              )}
            >
              {formatTime(timestamp)}
            </div>
          )}
        </div>
      </motion.div>
    )
  }
)

// =============================================================================
// Modern Message List - Scrollable conversation history
// =============================================================================

export interface ModernMessageListProps {
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp?: Date | string
  }>
  variant?: 'default' | 'compact'
  className?: string
  emptyMessage?: string
}

export function ModernMessageList({
  messages,
  variant = 'default',
  className,
  emptyMessage = 'No messages yet'
}: ModernMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className={cn(
        'flex items-center justify-center h-full',
        'text-sm text-gray-400',
        className
      )}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {messages.map((message, index) => (
          <ModernMessage
            key={message.id}
            {...message}
            variant={variant}
            isLatest={index === messages.length - 1}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// Voice History Panel - Left sidebar for conversation history
// =============================================================================

export interface VoiceHistoryPanelProps {
  transcript: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp?: Date | string
  }>
  pendingUserTranscript?: string
  pendingAssistantTranscript?: string
  className?: string
  maxHeight?: string
}

export function VoiceHistoryPanel({
  transcript,
  pendingUserTranscript,
  pendingAssistantTranscript,
  className,
}: VoiceHistoryPanelProps) {
  const hasContent = transcript.length > 0 || pendingUserTranscript || pendingAssistantTranscript

  if (!hasContent) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Conversation
        </span>
      </div>

      {/* Scrollable message area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden pr-2 min-h-0 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300"
      >
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {transcript.map((item) => (
              <ModernMessage
                key={item.id}
                {...item}
                variant="compact"
              />
            ))}

            {/* Pending user message */}
            {pendingUserTranscript && (
              <ModernMessage
                key="pending-user"
                id="pending-user"
                role="user"
                content={pendingUserTranscript}
                variant="compact"
                isPending
              />
            )}

            {/* Pending assistant message */}
            {pendingAssistantTranscript && (
              <ModernMessage
                key="pending-assistant"
                id="pending-assistant"
                role="assistant"
                content={pendingAssistantTranscript}
                variant="compact"
                isPending
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// Current Subtitle - Shows the latest/current message prominently
// =============================================================================

export interface CurrentSubtitleProps {
  content: string
  role: 'user' | 'assistant'
  isPending?: boolean
  assistantName?: string
  className?: string
}

export function CurrentSubtitle({
  content,
  role,
  isPending = false,
  assistantName,
  className
}: CurrentSubtitleProps) {
  return (
    <ModernMessage
      id="current-subtitle"
      role={role}
      content={content}
      variant="subtitle"
      isPending={isPending}
      assistantName={assistantName}
      className={className}
    />
  )
}

// =============================================================================
// Typing Indicator - Modern dots animation
// =============================================================================

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'flex items-center gap-1 px-4 py-3',
        'bg-gradient-to-br from-violet-50/80 to-violet-100/50',
        'rounded-2xl rounded-bl-md',
        'border border-violet-100/60',
        'w-fit',
        className
      )}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-400"
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut'
          }}
        />
      ))}
    </motion.div>
  )
}

// =============================================================================
// Utilities
// =============================================================================

function formatTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
