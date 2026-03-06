'use client'

import { useEffect, useRef, ReactNode, useState } from 'react'
import { Brain, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AIMessages } from './shared/ai-messages'
import { AIInput } from './shared/ai-input'
import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { useAIAssistant } from '@/hooks/useAIAssistant'
import { AIVariantConfig } from '@/hooks/use-ai-variant'
import { pageContexts } from '@/lib/ai/page-contexts'
import { useSearchParams, useRouter } from 'next/navigation'
import { focusChatInput, clearNavigationContext, getNavigationContext } from '@/lib/utils/chat-focus'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// Variant-specific configurations
export type AIAssistantVariant = 'dashboard' | 'focus' | 'planner' | 'chat'

export interface AIAssistantProps {
  variant: AIAssistantVariant
  config: AIVariantConfig
  sessionId?: string | null  // Add session ID prop
  className?: string
  
  // Layout customization
  layout?: 'card' | 'bar' | 'minimal' | 'full' | 'custom'
  showHeader?: boolean
  showQuickActions?: boolean
  showTools?: boolean
  showHistory?: boolean
  
  // Content customization
  title?: string | ReactNode
  subtitle?: string | ReactNode
  placeholder?: string
  welcomeMessage?: string
  emptyStateMessage?: string
  
  // Style customization
  maxHeight?: string
  containerClassName?: string
  headerClassName?: string
  messagesClassName?: string
  inputClassName?: string
  
  // Custom renderers for maximum flexibility
  renderHeader?: (props: HeaderRenderProps) => ReactNode
  renderMessages?: (props: MessagesRenderProps) => ReactNode
  renderInput?: (props: InputRenderProps) => ReactNode
  renderQuickActions?: (props: QuickActionsRenderProps) => ReactNode
  renderWrapper?: (children: ReactNode) => ReactNode
  
  // Additional props
  onSendMessage?: (message: string) => void
  onQuickAction?: (action: string) => void
  customActions?: Array<{ 
    label: string; 
    action: string; 
    icon?: ReactNode; 
    onClick?: () => void;  // Optional custom click handler
  }>
}

interface HeaderRenderProps {
  variant: AIAssistantVariant
  title?: string | ReactNode
  subtitle?: string | ReactNode
  isLoading: boolean
  messageCount: number
}

interface MessagesRenderProps {
  messages: any[]
  variant: AIAssistantVariant
  isLoading: boolean
}

interface InputRenderProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  placeholder?: string
  isLoading: boolean
  variant: AIAssistantVariant
}

interface QuickActionsRenderProps {
  actions: Array<{ label: string; action: string; icon?: ReactNode }>
  onAction: (action: string) => void
  variant: AIAssistantVariant
}

// Default variant configurations
const variantConfigs: Record<AIAssistantVariant, Partial<AIAssistantProps>> = {
  dashboard: {
    layout: 'card',
    showHeader: true,
    showQuickActions: true,
    title: (
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5" />
        <span>Nuree</span>
      </div>
    ),
    subtitle: "How can I help you today?",
    maxHeight: '400px',
    containerClassName: 'rounded-lg shadow-md',
    headerClassName: '',
  },
  focus: {
    layout: 'card',
    showHeader: true,
    showQuickActions: false,
    title: (
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-secondary-500" />
        <span>Focus Assistant</span>
      </div>
    ),
    subtitle: "Stay in the zone",
    maxHeight: '300px',
    containerClassName: 'rounded-xl shadow-lg',
    headerClassName: 'bg-gradient-to-r from-secondary-50 to-warning-50',
  },
  planner: {
    layout: 'bar',
    showHeader: false,
    showQuickActions: true,
    placeholder: "Ask about your tasks or get planning help...",
    maxHeight: '200px',
    containerClassName: 'border-t border-gray-200',
  },
  chat: {
    layout: 'full',
    showHeader: true,
    showQuickActions: false,
    showHistory: true,
    title: "Nuree",
    maxHeight: '100%',
    containerClassName: 'h-full flex flex-col',
  },
}

export function AIAssistant({ 
  variant,
  config,
  sessionId,  // Accept session ID
  className,
  layout,
  showHeader,
  showQuickActions,
  showTools,
  showHistory,
  title,
  subtitle,
  placeholder,
  welcomeMessage,
  emptyStateMessage,
  maxHeight,
  containerClassName,
  headerClassName,
  messagesClassName,
  inputClassName,
  renderHeader,
  renderMessages,
  renderInput,
  renderQuickActions,
  renderWrapper,
  onSendMessage,
  onQuickAction,
  customActions,
  ...props
}: AIAssistantProps) {
  
  // Merge default config with props
  const variantConfig = variantConfigs[variant]
  const mergedConfig = {
    ...variantConfig,
    layout: layout ?? variantConfig.layout ?? 'card',
    showHeader: showHeader ?? variantConfig.showHeader ?? true,
    showQuickActions: showQuickActions ?? variantConfig.showQuickActions ?? false,
    showTools: showTools ?? variantConfig.showTools ?? true,
    showHistory: showHistory ?? variantConfig.showHistory ?? false,
    title: title ?? variantConfig.title,
    subtitle: subtitle ?? variantConfig.subtitle,
    placeholder: placeholder ?? variantConfig.placeholder ?? "Type a message...",
    welcomeMessage: welcomeMessage ?? variantConfig.welcomeMessage,
    emptyStateMessage: emptyStateMessage ?? variantConfig.emptyStateMessage ?? "No messages yet",
    maxHeight: maxHeight ?? variantConfig.maxHeight ?? '400px',
    containerClassName: containerClassName ?? variantConfig.containerClassName,
    headerClassName: headerClassName ?? variantConfig.headerClassName,
    messagesClassName: messagesClassName ?? variantConfig.messagesClassName,
    inputClassName: inputClassName ?? variantConfig.inputClassName,
  }
  
  // Use the AI Assistant hook for API integration with session ID
  const {
    messages: currentMessages,
    isLoading,
    sendMessage: sendAIMessage,
    sendQuickAction,
    addMessage,
  } = useAIAssistant({
    variant,
    conversationId: sessionId || undefined,  // Pass session ID
    persistMessages: true,  // Enable persistence with session
    onToolExecuted: (toolName, params) => {
      // Track executing tools for UI feedback (Task 102)
      console.log('Tool executing in UI:', toolName)
      setExecutingTools(prev => [...prev, toolName])
      
      // Clear after a delay
      setTimeout(() => {
        setExecutingTools(prev => prev.filter(t => t !== toolName))
      }, 3000)
    },
    onError: (error) => {
      console.error('AI Assistant error:', error)
    }
  })
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const componentRef = useRef<HTMLDivElement>(null)
  
  // State for tracking executing tools (Task 102)
  const [executingTools, setExecutingTools] = useState<string[]>([])
  
  // Get page context
  const pageContext = pageContexts[variant] || pageContexts.dashboard
  const quickActions = customActions || pageContext.suggestedActions || []
  
  // Handle URL parameters for chat focus
  useEffect(() => {
    const focusChat = searchParams.get('focusChat')
    const interventionId = searchParams.get('interventionId')
    
    if (focusChat === 'true') {
      setTimeout(() => {
        focusChatInput(`${variant}-assistant`, {
          replyToIntervention: true,
          interventionId: interventionId || undefined
        })
        
        const navContext = getNavigationContext()
        if (navContext && navContext.interventionId === interventionId) {
          addMessage({
            role: 'assistant',
            content: (navContext as any).message || "I'm here to help! What can I do for you?"
          })
        }
        
        clearNavigationContext()
        
        const url = new URL(window.location.href)
        url.searchParams.delete('focusChat')
        url.searchParams.delete('interventionId')
        router.replace(url.pathname + url.search)
      }, 100)
    }
  }, [searchParams, router, variant, addMessage])
  
  // Handle session reset events
  useEffect(() => {
    const handleSessionReset = () => {
      // Clear any local state if needed
      // Component will re-render with new session ID from parent
      console.log('AI Assistant received session reset event')
    }
    
    window.addEventListener('reset-session', handleSessionReset)
    
    return () => {
      window.removeEventListener('reset-session', handleSessionReset)
      // Any other cleanup needed when component unmounts
    }
  }, [])
  
  // Handle message sending - now connected to AI API
  const handleSendMessage = async (message: string) => {
    if (onSendMessage) {
      onSendMessage(message)
    } else {
      // Use the AI hook to send message to API
      await sendAIMessage(message)
    }
  }
  
  const handleQuickAction = (action: string) => {
    if (onQuickAction) {
      onQuickAction(action)
    } else {
      sendQuickAction(action)
    }
  }
  
  // Render functions with defaults
  const renderHeaderContent = () => {
    if (renderHeader) {
      return renderHeader({
        variant,
        title: mergedConfig.title,
        subtitle: mergedConfig.subtitle,
        isLoading,
        messageCount: currentMessages.length
      })
    }
    
    if (!mergedConfig.showHeader) return null
    
    return (
      <CardHeader className={cn("px-4 pt-4 pb-3", mergedConfig.headerClassName)}>
        {mergedConfig.title && (
          <div className="text-lg font-semibold">
            {mergedConfig.title}
          </div>
        )}
        {mergedConfig.subtitle && (
          <div className="text-sm text-gray-600 mt-1">
            {mergedConfig.subtitle}
          </div>
        )}
      </CardHeader>
    )
  }
  
  const renderMessagesContent = () => {
    if (renderMessages) {
      return renderMessages({
        messages: currentMessages,
        variant,
        isLoading
      })
    }
    
    // Only show messages if showHistory is true
    if (!mergedConfig.showHistory) {
      // Show empty state or welcome message
      if (mergedConfig.welcomeMessage && currentMessages.length === 0) {
        return (
          <div className={cn("flex items-center justify-center p-8 text-gray-600", mergedConfig.messagesClassName)}>
            <div className="text-center">
              <p className="text-sm">{mergedConfig.welcomeMessage}</p>
            </div>
          </div>
        )
      }
      return null
    }
    
    return (
      <AIMessages 
        maxMessages={20}
        className={mergedConfig.messagesClassName}
      />
    )
  }
  
  const renderInputContent = () => {
    if (renderInput) {
      return renderInput({
        value: '',
        onChange: () => {},
        onSend: () => {},
        placeholder: mergedConfig.placeholder,
        isLoading,
        variant
      })
    }
    
    return (
      <div className="px-4 py-2">
        <AIInput
          placeholder={mergedConfig.placeholder}
          onSend={handleSendMessage}
        />
      </div>
    )
  }
  
  const renderQuickActionsContent = () => {
    if (!mergedConfig.showQuickActions || quickActions.length === 0) return null
    
    if (renderQuickActions) {
      return renderQuickActions({
        actions: quickActions as any,
        onAction: handleQuickAction,
        variant
      })
    }
    
    return (
      <div className="flex flex-wrap gap-2 px-4 pt-2 pb-4 border-t border-gray-200">
        {quickActions.map((action, index) => {
          const isString = typeof action === 'string'
          const label = isString ? action : action.label
          const actionValue = isString ? action : (action.action || action.label)
          const icon = isString ? null : action.icon
          const className = isString ? null : (action as any).className
          const onClick = isString ? null : (action as any).onClick
          
          return (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => {
                // Use custom onClick if provided, otherwise send as message
                if (onClick) {
                  onClick()
                } else {
                  handleQuickAction(actionValue)
                }
              }}
              className={className || "text-xs text-gray-800 font-medium hover:bg-accent/20 hover:text-accent-700"}
            >
              {icon}
              {label}
            </Button>
          )
        })}
      </div>
    )
  }
  
  // Simple inline tool indicator component (Task 102)
  const ToolExecutingIndicator = ({ toolName }: { toolName: string }) => (
    <div className="flex items-center gap-2 text-sm text-gray-600 animate-pulse px-4 py-2">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
      <span>Executing {toolName.replace(/_/g, ' ')}...</span>
    </div>
  )
  
  // Layout renderers
  const renderContent = () => {
    const content = (
      <>
        {renderHeaderContent()}
        {mergedConfig.showHistory && (
          <div className="flex-1 overflow-y-auto">
            {renderMessagesContent()}
            {/* Show executing tools indicator (Task 102) */}
            {executingTools.length > 0 && (
              <div className="space-y-1 border-t">
                {executingTools.map(tool => (
                  <ToolExecutingIndicator key={tool} toolName={tool} />
                ))}
              </div>
            )}
          </div>
        )}
        {!mergedConfig.showHistory && (
          <div className="flex-1 overflow-y-auto">
            {renderMessagesContent()}
          </div>
        )}
        <div className="mt-auto">
          {renderQuickActionsContent()}
          {renderInputContent()}
        </div>
      </>
    )
    
    if (renderWrapper) {
      return renderWrapper(content)
    }
    
    switch (mergedConfig.layout) {
      case 'card':
        return (
          <Card className={cn(mergedConfig.containerClassName, className)} style={{ height: mergedConfig.maxHeight, maxHeight: mergedConfig.maxHeight }}>
            <div className="flex flex-col h-full overflow-hidden">
              {content}
            </div>
          </Card>
        )
      
      case 'bar':
        return (
          <div className={cn("flex items-center gap-3 p-4", mergedConfig.containerClassName, className)}>
            {content}
          </div>
        )
      
      case 'minimal':
        return (
          <div className={cn("space-y-2", mergedConfig.containerClassName, className)}>
            {content}
          </div>
        )
      
      case 'full':
        return (
          <div className={cn("flex flex-col h-full", mergedConfig.containerClassName, className)}>
            {content}
          </div>
        )
      
      case 'custom':
        return (
          <div className={cn(mergedConfig.containerClassName, className)}>
            {content}
          </div>
        )
      
      default:
        return content
    }
  }
  
  return renderContent()
}