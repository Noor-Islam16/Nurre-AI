// hooks/use-chat-handler.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { useChatStore } from '@/store/chat-store'
import { useToast } from '@/components/ui/use-toast'
import { RateLimitHandler } from '@/lib/client/rate-limit-handler'
import { ResponseIdManager } from '@/lib/ai/response-id-manager'

const REQUEST_TIMEOUT_MS = 60_000

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
  //
  // Reliability notes:
  //  - The user message is added ONCE; retries re-send the same request
  //    (previously a retry re-entered handleSend and duplicated the message).
  //  - Only network errors, timeouts and 5xx responses are retried.
  //  - There is a request timeout so the UI can never spin forever.
  //  - We no longer silently block on `!user`: right after first load the
  //    client user store may not be hydrated yet, which made the first
  //    message do nothing until a refresh. The server enforces auth (401).
  const handleSend = useCallback(async (
    input: string,
    options?: {
      attachments?: File[]
      toolChoice?: string
      context?: string  // Add context for AI personality
    }
  ): Promise<void> => {
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

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      conversationId
    }

    setMessages(prev => [...prev, userMessage])

    if (persistMessages && conversationId) {
      chatStore.addMessageToConversation?.(conversationId, userMessage)
    }

    onMessageSent?.(userMessage)

    const apiMessages = messages.concat(userMessage).map(m => ({
      role: m.role,
      content: m.content
    }))

    const buildBody = (prevId: string | null) => {
      const requestBody = {
        messages: apiMessages,
        conversationId,
        previousResponseId: prevId,
        toolChoice: options?.toolChoice,
        context: options?.context
      }
      if (options?.attachments?.length) {
        const formData = new FormData()
        formData.append('data', JSON.stringify(requestBody))
        options.attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file)
        })
        return { body: formData as BodyInit, headers: {} as Record<string, string> }
      }
      return {
        body: JSON.stringify(requestBody) as BodyInit,
        headers: { 'Content-Type': 'application/json' } as Record<string, string>
      }
    }

    // A non-retryable failure carries this flag
    class FatalChatError extends Error {}

    let usePrevId: string | null = previousResponseId
    let lastError: Error | null = null
    let succeeded = false

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController()
        abortControllerRef.current = controller
        const timeout = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS)

        try {
          const { body, headers } = buildBody(usePrevId)
          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal
          })

          RateLimitHandler.handleResponse(response, endpoint)

          if (!response.ok) {
            let errorDetails = response.statusText
            let errorMessage = 'Chat request failed'
            try {
              const errorBody = await response.json()
              if (errorBody.details && Array.isArray(errorBody.details)) {
                errorDetails = errorBody.details
                  .map((d: any) => `${d.path}: ${d.message}`)
                  .join(', ')
                errorMessage = 'Validation failed'
              } else if (errorBody.error) {
                errorDetails = errorBody.error
              }
            } catch {
              // Response wasn't JSON
            }

            if (response.status === 401) {
              throw new FatalChatError('Authentication required: please sign in again')
            }
            if (response.status === 429) {
              throw new FatalChatError('Rate limit exceeded: please wait a moment')
            }
            if (response.status >= 500) {
              // retryable
              throw new Error(`${errorMessage}: ${errorDetails}`)
            }
            // Other 4xx: if a stale previous response id may be the cause,
            // drop it once and retry without it.
            if (usePrevId && response.status === 400 && attempt < maxRetries) {
              usePrevId = null
              lastError = new Error(`${errorMessage}: ${errorDetails}`)
              continue
            }
            throw new FatalChatError(`${errorMessage}: ${errorDetails}`)
          }

          const data = await response.json()
          handleResponse(data, conversationId)
          succeeded = true
          break
        } catch (err: any) {
          if (err instanceof FatalChatError) {
            lastError = err
            break
          }
          if (err?.name === 'AbortError' && controller.signal.reason !== 'timeout') {
            // Cancelled by the user or unmount — stop quietly
            return
          }
          lastError =
            err?.name === 'AbortError'
              ? new Error('The response took too long. Please try again.')
              : err instanceof Error
                ? err
                : new Error('Network error')
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 600 * (attempt + 1)))
          }
        } finally {
          clearTimeout(timeout)
        }
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      retryCountRef.current = 0
    }

    if (succeeded) return

    const err = lastError ?? new Error('Failed to send message')
    console.error('Chat error:', err)
    setError(err)
    onError?.(err)

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
    toast({ title: toastTitle, description: toastDescription })
    return
  }, [
    isLoading,
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