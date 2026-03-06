'use client'

import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { cn } from '@/lib/utils'
import { MessageList, MessageLoading, type MessageProps } from '@/components/ui/message'

interface AIMessagesProps {
  messages?: any[]  // Allow passing messages directly
  isLoading?: boolean  // Allow passing loading state directly
  variant?: string  // Allow passing variant for styling
  maxMessages?: number
  className?: string
  compact?: boolean
}

export function AIMessages({
  messages: propMessages,  // Accept messages from props
  isLoading: propIsLoading,  // Accept loading state from props
  variant,  // Accept variant for potential future styling
  maxMessages = 10,
  className,
  compact = false
}: AIMessagesProps) {
  // Use prop values if provided, otherwise fall back to store
  const storeMessages = useAIAssistantStore(state => state.messages)
  const storeIsLoading = useAIAssistantStore(state => state.isLoading)

  const messages = propMessages || storeMessages
  const isLoading = propIsLoading !== undefined ? propIsLoading : storeIsLoading
  
  // Get only the last N messages
  const displayMessages = maxMessages ? messages.slice(-maxMessages) : messages
  
  // Transform messages to MessageProps format
  const formattedMessages: MessageProps[] = displayMessages.map(message => ({
    ...message,
    showAvatar: true,
    showTimestamp: false,
    onActionClick: (action: any) => {
      // Handle action click
      if (action.type === 'start-focus') {
        window.dispatchEvent(new CustomEvent('start-focus-timer'))
      } else if (action.type === 'break') {
        window.dispatchEvent(new CustomEvent('show-break'))
      } else if (action.type === 'simplify-task') {
        window.dispatchEvent(new CustomEvent('simplify-task', { detail: action }))
      }
    }
  }))
  
  // Removed streaming message handling - no longer needed
  
  return (
    <div className={cn(
      "flex flex-col overflow-y-auto",
      compact ? "p-2" : "py-2",
      className
    )}>
      <MessageList
        messages={formattedMessages}
        compact={compact}
        showAvatars={true}
        showTimestamps={false}
      />
      {isLoading && (
        <MessageLoading compact={compact} />
      )}
    </div>
  )
}