import { useState, useCallback, useRef, useEffect } from 'react'
import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { useChatHandler } from '@/hooks/use-chat-handler'
import { pageContexts } from '@/lib/ai/page-contexts'
import { ToolExecutor } from '@/lib/ai/tool-executor'
import { getToolStatusManager, ToolStatus } from '@/lib/ai/tool-status-manager'

export interface UseAIAssistantOptions {
  variant: 'dashboard' | 'focus' | 'planner' | 'chat' | 'dashboard-hero'
  conversationId?: string  // Keep for backward compatibility, maps to sessionId internally
  sessionId?: string  // New preferred prop
  persistMessages?: boolean
  onMessageSent?: (message: string) => void
  onToolExecuted?: (tool: string, params: any) => void
  onError?: (error: Error) => void
}

export function useAIAssistant(options: UseAIAssistantOptions) {
  const { 
    variant, 
    conversationId: legacyConversationId,  // Legacy support
    sessionId,  // Preferred
    persistMessages = true,
    onMessageSent, 
    onToolExecuted, 
    onError
  } = options
  
  // Use sessionId if provided, otherwise fall back to conversationId for backward compatibility
  const conversationId = sessionId || legacyConversationId
  
  // Store hooks
  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    clearMessages,
    setContext,
    setSessionId,
    loadSessionMessages
  } = useAIAssistantStore()
  
  // Chat handler for API interactions with persistence
  const {
    handleSend: sendChatMessage,
    isLoading: isChatLoading,
    error: chatError,
    messages: persistedMessages,
    loadConversation,
    clearMessages: clearPersistedMessages,
    setPreviousResponseId
  } = useChatHandler({
    conversationId,
    persistMessages,
    onMessageSent: (message) => {
      // Message already added to store in sendMessage
    },
    onResponseReceived: async (message) => {
      // Execute tool calls if present
      if (message.toolCalls && message.toolCalls.length > 0) {
        console.log('Executing tool calls on client:', message.toolCalls)
        
        const statusManager = getToolStatusManager()
        
        // Execute each tool
        for (const toolCall of message.toolCalls) {
          // Add to status manager for UI feedback
          const executionId = statusManager.addExecution(
            toolCall.function.name,
            { details: `Preparing ${toolCall.function.name}...` }
          )
          
          // Update to executing
          statusManager.updateStatus(executionId, ToolStatus.EXECUTING, {
            details: `Executing ${toolCall.function.name}...`
          })
          
          try {
            if (toolExecutorRef.current) {
              // Execute the tool on client-side
              const result = await toolExecutorRef.current.executeSingleNativeTool(toolCall)
              console.log(`Tool ${toolCall.function.name} executed:`, result)
              
              // Parse result to check success
              const resultObj = JSON.parse(result.content)
              if (resultObj.success) {
                console.log(`✅ Tool ${toolCall.function.name} succeeded`)
                // Update status to success
                statusManager.updateStatus(executionId, ToolStatus.SUCCESS, {
                  details: `${toolCall.function.name} completed successfully`
                })
              } else {
                console.error(`❌ Tool ${toolCall.function.name} failed:`, resultObj.error)
                // Update status to failed
                statusManager.updateStatus(executionId, ToolStatus.FAILED, {
                  error: resultObj.error || 'Tool execution failed'
                })
              }
              
              // Callback for tracking
              onToolExecuted?.(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'))
            } else {
              console.error('ToolExecutor not initialized')
              statusManager.updateStatus(executionId, ToolStatus.FAILED, {
                error: 'ToolExecutor not initialized'
              })
            }
          } catch (error) {
            console.error(`Failed to execute tool ${toolCall.function.name}:`, error)
            
            // Update status to failed
            statusManager.updateStatus(executionId, ToolStatus.FAILED, {
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            
            onError?.(error as Error)
          }
        }
        
        // Clear previousResponseId after tool execution to avoid "tool output not found" errors
        // When tools are executed, the conversation context changes and we shouldn't
        // expect tool outputs on the next user message
        console.log('Clearing previousResponseId after tool execution to reset conversation context')
        setPreviousResponseId(null)
      }
      
      // Add message to store
      addMessage({
        role: 'assistant',
        content: message.content,
        sessionId: conversationId || undefined
      })
    },
    onError
  })
  
  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  
  // Tool executor for client-side execution
  const toolExecutorRef = useRef<ToolExecutor | null>(null)
  
  // Initialize tool executor on mount
  useEffect(() => {
    // Create client-side tool executor
    // This will use Zustand stores since window is defined
    toolExecutorRef.current = new ToolExecutor()
    console.log('ToolExecutor initialized for client-side execution')
    
    return () => {
      toolExecutorRef.current = null
    }
  }, [])
  
  // Get page context for the variant
  const pageContext = pageContexts[variant] || pageContexts.dashboard
  
  // Initialize context and session on mount
  useEffect(() => {
    // Map variant to PageContext (chat uses dashboard context)
    const pageContext = variant === 'chat' ? 'dashboard' : variant
    setContext(pageContext as any)
    
    // Set session ID in store if provided
    if (conversationId) {
      setSessionId(conversationId)
    }
  }, [variant, conversationId, setContext, setSessionId])
  
  // Load session messages on mount if conversationId provided
  useEffect(() => {
    if (conversationId && persistMessages) {
      loadSessionMessages(conversationId)
    }
  }, [conversationId, persistMessages, loadSessionMessages])
  
  // Clean up any lingering state on mount/unmount
  useEffect(() => {
    return () => {
      // Clean up on unmount to prevent memory leaks
      setLoading(false)
    }
  }, [])
  
  // Send message handler
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return
    
    try {
      // Add user message to store immediately for optimistic UI
      addMessage({
        role: 'user',
        content: message,
        sessionId: conversationId || undefined  // Include sessionId
      })
      
      // Callback
      onMessageSent?.(message)
      
      // Set loading
      setLoading(true)
      
      // Send to API with context for personality switching
      await sendChatMessage(message, {
        context: variant  // Pass current variant as context
      })
      
    } catch (error) {
      console.error('Error sending message:', error)
      onError?.(error as Error)
      
      // Add error message
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        sessionId: conversationId || undefined  // Include sessionId
      })
    } finally {
      setLoading(false)
    }
  }, [addMessage, setLoading, sendChatMessage, onMessageSent, onError, conversationId, variant])
  
  // Tool execution is now handled in onResponseReceived using ToolExecutor
  // The old executeTool stub has been removed
  
  // Voice input handlers
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported')
      return
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      sendMessage(transcript)
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [sendMessage])
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [])
  
  // Quick action handler
  const sendQuickAction = useCallback((action: string) => {
    sendMessage(action)
  }, [sendMessage])
  
  // Clear history - now clears session messages
  const clearHistory = useCallback(() => {
    clearMessages()
    if (conversationId && persistMessages) {
      clearPersistedMessages()
      // Clear previousResponseId
      setPreviousResponseId(null)
      console.log('Clearing session messages:', conversationId)
    }
  }, [clearMessages, clearPersistedMessages, conversationId, persistMessages, setPreviousResponseId])
  
  // New conversation - triggers session reset
  const startNewConversation = useCallback(() => {
    clearMessages()
    // Clear previousResponseId
    setPreviousResponseId(null)
    // Trigger session reset (will be handled by parent component)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reset-session'))
    }
  }, [clearMessages, setPreviousResponseId])
  
  return {
    // State
    messages: messages,
    isLoading: isLoading || isChatLoading,
    error: chatError,
    isListening,
    pageContext,
    conversationId,
    
    // Actions
    sendMessage,
    // executeTool removed - tools are now executed automatically in onResponseReceived
    sendQuickAction,
    clearHistory,
    startListening,
    stopListening,
    loadConversation,
    startNewConversation,
    
    // Store functions (for advanced usage)
    addMessage,
  }
}