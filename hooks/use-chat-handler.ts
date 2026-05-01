// hooks/use-chat-handler.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { useChatStore } from '@/store/chat-store'
import { useToast } from '@/components/ui/use-toast'
import { RateLimitHandler } from '@/lib/client/rate-limit-handler'
import { ResponseIdManager } from '@/lib/ai/response-id-manager'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  conversationId?: string
  toolCalls?: any[]
}

export interface UseChatHandlerOptions {
  conversationId?: string
  onMessageSent?: (message: ChatMessage) => void
  onResponseReceived?: (message: ChatMessage) => void
  onError?: (error: Error) => void
  persistMessages?: boolean
  maxRetries?: number
}

export function useChatHandler(options: UseChatHandlerOptions = {}) {
  const {
    conversationId,
    onMessageSent,
    onResponseReceived,
    onError,
    persistMessages = true,
    maxRetries = 2
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<Error | null>(null)
  
  // Initialize previousResponseId from storage
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(() => {
    if (conversationId) {
      try {
        return ResponseIdManager.getLastResponseId(conversationId)
      } catch (error) {
        console.warn('Failed to load previous response ID:', error)
        return null
      }
    }
    return null
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)
  
  const { user } = useUser()
  const chatStore = useChatStore()
  const { toast } = useToast()
  
  // Update stored response ID when it changes
  useEffect(() => {
    if (conversationId && previousResponseId) {
      try {
        ResponseIdManager.saveResponseId(conversationId, previousResponseId)
      } catch (error) {
        console.warn('Failed to save response ID to storage:', error)
        // Continue - this is not critical for functionality
      }
    }
  }, [conversationId, previousResponseId])
  
  // Clean up on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Abort any active requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Handle sending a message
  const handleSend = useCallback(async (
    input: string,
    options?: {
      attachments?: File[]
      toolChoice?: string
      context?: string  // Add context for AI personality
    }
  ) => {
    // Validation
    if (!input?.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter a message'
      })
      return
    }

    if (isLoading) {
      toast({
        title: 'Please wait',
        description: 'Previous message is still being processed'
      })
      return
    }

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to continue'
      })
      return
    }

    // Check rate limit
    const endpoint = '/api/ai/chat'
    if (!RateLimitHandler.canMakeRequest(endpoint)) {
      const waitTime = RateLimitHandler.getWaitTime(endpoint)
      toast({
        title: 'Rate limit exceeded',
        description: `Please wait ${waitTime} seconds before sending another message`
      })
      return
    }

    setIsLoading(true)
    setError(null)

    // Create user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      conversationId
    }

    // Add to messages
    setMessages(prev => [...prev, userMessage])
    
    // Persist if enabled
    if (persistMessages && conversationId) {
      chatStore.addMessageToConversation?.(conversationId, userMessage)
    }

    // Callback
    onMessageSent?.(userMessage)

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      // Prepare messages for API
      const apiMessages = messages.concat(userMessage).map(m => ({
        role: m.role,
        content: m.content
      }))

      // Prepare request
      const requestBody = {
        messages: apiMessages,
        conversationId,
        previousResponseId,
        toolChoice: options?.toolChoice,
        context: options?.context  // Pass context to API
      }

      // Add attachments if provided
      let formData: FormData | undefined
      if (options?.attachments?.length) {
        formData = new FormData()
        formData.append('data', JSON.stringify(requestBody))
        options.attachments.forEach((file, index) => {
          formData!.append(`attachment_${index}`, file)
        })
      }

      // Make request
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: formData ? {} : {
          'Content-Type': 'application/json'
        },
        body: formData || JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      })

      // Handle rate limit
      RateLimitHandler.handleResponse(response, endpoint)

      if (!response.ok) {
        // Try to extract detailed error information
        let errorDetails = response.statusText
        let errorMessage = 'Chat request failed'
        
        try {
          const errorBody = await response.json()
          
          // Check for validation error details
          if (errorBody.details && Array.isArray(errorBody.details)) {
            errorDetails = errorBody.details.map((d: any) => 
              `${d.path}: ${d.message}`
            ).join(', ')
            errorMessage = 'Validation failed'
          } else if (errorBody.error) {
            errorDetails = errorBody.error
          }
          
          // Log detailed error in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Chat API error details:', {
              status: response.status,
              statusText: response.statusText,
              error: errorBody.error,
              details: errorBody.details
            })
          }
        } catch {
          // Response wasn't JSON or couldn't be parsed
          console.warn('Could not parse error response body')
        }
        
        throw new Error(`${errorMessage}: ${errorDetails}`)
      }

      // Handle response
      const data = await response.json()
      
      // Check if tools need execution (new field from task 099)
      if (data.requires_tool_execution) {
        console.log('Response requires tool execution:', data.tool_calls)
      }
      
      handleResponse(data, conversationId)

      // Reset retry count on success
      retryCountRef.current = 0

    } catch (err: any) {
      console.error('Chat error:', err)
      
      // Handle abort
      if (err.name === 'AbortError') {
        console.log('Chat request cancelled')
        return
      }

      // Retry logic
      if (retryCountRef.current < maxRetries && !err.message.includes('Rate limit')) {
        retryCountRef.current++
        console.log(`Retrying... Attempt ${retryCountRef.current} of ${maxRetries}`)
        setTimeout(() => handleSend(input, options), 1000 * retryCountRef.current)
        return
      }

      setError(err)
      onError?.(err)
      
      // Provide more specific error messages in toasts
      let toastTitle = 'Failed to send message'
      let toastDescription = err.message || 'Please try again'
      
      if (err.message?.includes('Validation failed')) {
        toastTitle = 'Invalid message format'
        toastDescription = err.message.replace('Validation failed: ', '')
      } else if (err.message?.includes('Authentication')) {
        toastTitle = 'Authentication required'
        toastDescription = 'Please sign in to continue'
      } else if (err.message?.includes('Rate limit')) {
        toastTitle = 'Too many requests'
        toastDescription = 'Please wait a moment before trying again'
      }
      
      toast({
        title: toastTitle,
        description: toastDescription
      })
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [
    isLoading,
    user,
    conversationId,
    previousResponseId,
    persistMessages,
    maxRetries,
    messages,
    onMessageSent,
    onError,
    toast,
    chatStore
  ])

  // Handle API response
  const handleResponse = useCallback((
    data: any,
    convId?: string
  ) => {
    // Extract message from response based on API format
    let messageContent = ''
    let messageId = data.id || crypto.randomUUID()
    // Preserve tool calls from API response (supports both toolCalls and tool_calls)
    // These will be executed client-side by useAIAssistant (Task 101)
    let toolCalls = data.toolCalls || data.tool_calls
    
    // Handle different response formats
    if (data.choices && data.choices[0]) {
      // Chat Completions format
      const choice = data.choices[0]
      messageContent = choice.message?.content || ''
      toolCalls = choice.message?.tool_calls || toolCalls
    } else if (data.content) {
      // Direct content format
      messageContent = data.content
    } else if (data.message) {
      // Message format
      messageContent = data.message
    }
    
    const assistantMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: messageContent,
      timestamp: new Date(),
      conversationId: convId,
      toolCalls
    }

    setMessages(prev => [...prev, assistantMessage])
    
    // Update previous response ID
    const responseId = data.response_id || data.id
    if (responseId) {
      setPreviousResponseId(responseId)
      
      // Also save to storage immediately
      if (convId) {
        try {
          ResponseIdManager.saveResponseId(convId, responseId)
        } catch (error) {
          console.warn('Failed to save response ID:', error)
        }
      }
    }

    if (persistMessages && convId) {
      chatStore.addMessageToConversation?.(convId, assistantMessage)
    }

    // Log tool calls for debugging (task 100)
    if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0) {
      console.log('Assistant message with tool calls:', {
        hasToolCalls: !!assistantMessage.toolCalls,
        toolCallCount: assistantMessage.toolCalls.length,
        toolNames: assistantMessage.toolCalls.map(tc => tc.function?.name)
      })
    }

    onResponseReceived?.(assistantMessage)
  }, [persistMessages, onResponseReceived, chatStore])

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }, [])

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setPreviousResponseId(null)
    setError(null)
    
    // Clear from storage
    if (conversationId) {
      try {
        ResponseIdManager.clearResponseId(conversationId)
      } catch (error) {
        console.warn('Failed to clear response ID:', error)
      }
      
      if (persistMessages) {
        chatStore.clearConversation?.(conversationId)
      }
    }
  }, [conversationId, persistMessages, chatStore])

  // Load conversation history
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const history = chatStore.getConversation?.(convId, 50) || []
      setMessages(history)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }, [chatStore])

  return {
    // State
    messages,
    isLoading,
    error,
    previousResponseId,
    
    // Actions
    handleSend,
    cancelRequest,
    clearMessages,
    loadConversation,
    
    // Setters for external control
    setMessages,
    setPreviousResponseId
  }
}