'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  Bot, User, Sparkles, Check, X, Loader2, CheckCircle, 
  AlertCircle, Brain 
} from 'lucide-react'
import { ChatLoadingDots } from './loading-dots'

export interface MessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
  timestamp?: string | Date
  showAvatar?: boolean
  showTimestamp?: boolean
  status?: 'sending' | 'sent' | 'error'
  error?: string
  className?: string
  compact?: boolean
  
  // Intervention-specific
  messageType?: 'normal' | 'intervention' | 'system' | 'chat'
  interventionData?: {
    type?: string
    accepted?: boolean
    dismissedAt?: string | Date
    actions?: Array<{
      type: string
      label: string
      data?: any
    }> | any[]
    triggerRule?: string
    shownAsPopup?: boolean
    requiresAction?: boolean
  }
  
  // Tool execution
  toolCalls?: Array<{
    id: string
    name: string
    status?: 'pending' | 'success' | 'failed'
  }>
  
  // Removed streaming props - no longer needed
  completedTools?: Array<{ tool: string; success: boolean }>
  
  // Actions
  onActionClick?: (action: any) => void
}

export function Message({
  role,
  content,
  id,
  timestamp,
  showAvatar = true,
  showTimestamp = false,
  status,
  error,
  className,
  compact = false,
  messageType,
  interventionData,
  toolCalls,
  completedTools = [],
  onActionClick
}: MessageProps) {
  const messageEndRef = useRef<HTMLDivElement>(null)
  
  // No streaming animation needed - messages appear instantly
  
  // Auto-scroll
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [content])
  
  const isUser = role === 'user'
  const isIntervention = messageType === 'intervention'
  
  const messageContent = content
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3 w-full animate-fade-in",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      {/* Avatar */}
      {!isUser && showAvatar && (
        <div className={cn(
          "rounded-full flex items-center justify-center flex-shrink-0",
          compact ? "w-6 h-6" : "w-8 h-8",
          isIntervention 
            ? "bg-gradient-to-br from-slate-700 to-slate-600"
            : "bg-primary/10"
        )}>
          {isIntervention ? (
            <Brain className={cn("text-white", compact ? "h-3 w-3" : "h-4 w-4")} />
          ) : (
            <Bot className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          )}
        </div>
      )}
      
      {/* Message bubble */}
      <div className={cn(
        "rounded-lg max-w-[70%] shadow-sm hover:shadow-md transition-shadow duration-200",
        compact ? "px-2 py-1 text-sm" : "px-4 py-3",
        isUser 
          ? "bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-br-sm"
          : isIntervention
          ? "bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-slate-600 rounded-bl-sm"
          : "bg-gradient-to-br from-purple-50 to-blue-50 text-gray-800 border border-purple-100 rounded-bl-sm"
      )}>
        {/* Intervention badge */}
        {isIntervention && (
          <div className="flex items-center gap-1 mb-2">
            <Sparkles className="w-3 h-3 text-slate-700" />
            <span className="text-xs font-medium text-slate-700">
              Proactive Coaching
            </span>
            {interventionData?.accepted && (
              <Check className="w-3 h-3 text-green-500 ml-auto" />
            )}
            {interventionData?.dismissedAt && (
              <X className="w-3 h-3 text-gray-700 ml-auto" />
            )}
          </div>
        )}
        
        {/* Message text */}
        <p className={cn(
          "whitespace-pre-wrap",
          isIntervention && !isUser && "text-gray-700"
        )}>
          {messageContent}
          {/* Removed streaming cursor - no longer needed */}
        </p>
        
        {/* Intervention actions */}
        {interventionData?.actions && interventionData.actions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200/50">
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(interventionData.actions) ? interventionData.actions : []).map((action: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => onActionClick?.(action)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-md transition-colors",
                    "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
                    (interventionData.accepted || interventionData.dismissedAt) && 
                    "opacity-50 cursor-not-allowed"
                  )}
                  disabled={interventionData.accepted || !!interventionData.dismissedAt}
                >
                  {action.label || 'Take Action'}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Tool execution status */}
        {(toolCalls && toolCalls.length > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <p className="text-xs text-gray-700">
              Executed {toolCalls.length} action(s)
            </p>
          </div>
        )}
        
        {/* Pending/completed tools (for streaming) */}
        {(completedTools && completedTools.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pt-2 border-t border-gray-200/50 space-y-1"
          >
            {completedTools.map((tool, index) => (
              <ToolIndicator 
                key={`${tool.tool}-${index}`} 
                tool={tool.tool} 
                status={tool.success ? 'success' : 'failed'} 
              />
            ))}
          </motion.div>
        )}
        
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 pt-2 border-t border-red-200 flex items-center space-x-2 text-red-600"
          >
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs">{error}</span>
          </motion.div>
        )}
        
        {/* Timestamp */}
        {showTimestamp && timestamp && (
          <p className="text-xs text-gray-700 mt-2">
            {new Date(timestamp).toLocaleTimeString()}
            {interventionData?.dismissedAt && (
              <span className="ml-2">
                Dismissed at {new Date(interventionData.dismissedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        )}
      </div>
      
      {/* User avatar */}
      {isUser && showAvatar && (
        <div className={cn(
          "rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0",
          compact ? "w-6 h-6" : "w-8 h-8"
        )}>
          <User className={cn("text-white", compact ? "h-3 w-3" : "h-4 w-4")} />
        </div>
      )}
      
      <div ref={messageEndRef} />
    </motion.div>
  )
}

// Tool execution indicator
function ToolIndicator({ 
  tool, 
  status 
}: { 
  tool: string
  status: 'pending' | 'success' | 'failed' 
}) {
  const toolLabels: Record<string, string> = {
    create_task: 'Creating task',
    update_task: 'Updating task',
    break_down_task: 'Breaking down task',
    start_focus: 'Starting focus session',
    pause_focus: 'Pausing focus',
    end_focus: 'Ending focus session',
    submit_mood: 'Recording mood',
    start_breathing: 'Starting breathing exercise',
    trigger_break: 'Scheduling break',
    navigate_to: 'Navigating',
    show_celebration: 'Celebrating',
    schedule_reminder: 'Setting reminder',
    play_background_noise: 'Playing background noise',
    stop_background_noise: 'Stopping background noise'
  }
  
  const label = toolLabels[tool] || tool
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center space-x-2 text-xs",
        status === 'pending' && "text-gray-700",
        status === 'success' && "text-green-600",
        status === 'failed' && "text-red-600"
      )}
    >
      {status === 'pending' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{label}...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="w-3 h-3" />
          <span>{label} complete</span>
        </>
      )}
      {status === 'failed' && (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>{label} failed</span>
        </>
      )}
    </motion.div>
  )
}

// Message list component for convenience
export interface MessageListProps {
  messages: Array<MessageProps>
  className?: string
  compact?: boolean
  showAvatars?: boolean
  showTimestamps?: boolean
  onActionClick?: (action: any) => void
}

export function MessageList({
  messages,
  className,
  compact = false,
  showAvatars = true,
  showTimestamps = false,
  onActionClick
}: MessageListProps) {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => (
          <Message
            key={message.id || index}
            {...message}
            compact={compact}
            showAvatar={showAvatars}
            showTimestamp={showTimestamps}
            onActionClick={onActionClick}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Loading indicator - replaced with LoadingDots
export function MessageLoading({ compact = false }: { compact?: boolean }) {
  return (
    <ChatLoadingDots className={compact ? "text-sm" : ""} />
  )
}