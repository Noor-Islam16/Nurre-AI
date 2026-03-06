import { create } from 'zustand'

// Native OpenAI Tool Call types
export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolResult {
  tool_call_id: string
  role: 'tool'
  content: string
  success?: boolean
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  // Native tool fields
  tool_calls?: OpenAIToolCall[]  // Native OpenAI tool calls
  tool_results?: ToolResult[]  // Tool execution results
  isExecutingTools?: boolean  // Whether tools are currently executing
}

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  maxMessagesPerConversation: number
  maxTotalMessages: number
  conversations: Map<string, Message[]>
  error: string | null
  
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  clearOldMessages: () => void
  cleanup: () => void
  // Native tool methods
  updateToolExecution: (messageId: string, toolCallId: string, result: ToolResult) => void
  setToolExecuting: (messageId: string, executing: boolean) => void
  addToolCall: (messageId: string, toolCall: OpenAIToolCall) => void
  addToolResult: (messageId: string, result: ToolResult) => void
  // Conversation methods
  addMessageToConversation: (conversationId: string, message: Message) => void
  getConversation: (conversationId: string, limit?: number) => Message[]
  clearConversation: (conversationId: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  maxMessagesPerConversation: 100,
  maxTotalMessages: 500,
  conversations: new Map(),
  error: null,
  
  addMessage: (message) => {
    const newMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    set(state => {
      let newMessages = [...state.messages, newMessage]
      
      // Keep only recent messages
      if (newMessages.length > state.maxMessagesPerConversation) {
        newMessages = newMessages.slice(-state.maxMessagesPerConversation)
      }
      
      return { messages: newMessages }
    })
    return newMessage.id
  },
  
  updateMessage: (messageId, updates) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }))
  },
  
  // Removed streaming functions - no longer needed
  
  setError: (error) => set({ error }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  clearMessages: () => set({ messages: [] }),
  
  clearOldMessages: () => {
    set((state) => {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days
      
      const messages = state.messages.filter(
        msg => msg.timestamp.getTime() > cutoff
      )
      
      const conversations = new Map()
      state.conversations.forEach((msgs, id) => {
        const filtered = msgs.filter(
          msg => msg.timestamp.getTime() > cutoff
        )
        if (filtered.length > 0) {
          conversations.set(id, filtered)
        }
      })
      
      return { messages, conversations }
    })
  },
  
  cleanup: () => {
    const state = get()
    
    // Check total message count
    let totalMessages = state.messages.length
    state.conversations.forEach(msgs => {
      totalMessages += msgs.length
    })
    
    if (totalMessages > state.maxTotalMessages) {
      state.clearOldMessages()
    }
    
    // Limit conversations
    if (state.conversations.size > 10) {
      // Remove oldest conversations
      const sortedConversations = Array.from(state.conversations.entries())
        .sort((a, b) => {
          const aLatest = a[1][a[1].length - 1]?.timestamp.getTime() || 0
          const bLatest = b[1][b[1].length - 1]?.timestamp.getTime() || 0
          return bLatest - aLatest
        })
        .slice(0, 10)
      
      set({ conversations: new Map(sortedConversations) })
    }
  },
  
  // Native tool methods
  updateToolExecution: (messageId, toolCallId, result) => {
    set(state => ({
      messages: state.messages.map(msg => {
        if (msg.id === messageId) {
          const existingResults = msg.tool_results || []
          const updatedResults = existingResults.filter(r => r.tool_call_id !== toolCallId)
          updatedResults.push(result)
          return { ...msg, tool_results: updatedResults }
        }
        return msg
      }),
    }))
  },
  
  setToolExecuting: (messageId, executing) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === messageId ? { ...msg, isExecutingTools: executing } : msg
      ),
    }))
  },
  
  addToolCall: (messageId, toolCall) => {
    set(state => ({
      messages: state.messages.map(msg => {
        if (msg.id === messageId) {
          const existingCalls = msg.tool_calls || []
          return { ...msg, tool_calls: [...existingCalls, toolCall] }
        }
        return msg
      }),
    }))
  },
  
  addToolResult: (messageId, result) => {
    set(state => ({
      messages: state.messages.map(msg => {
        if (msg.id === messageId) {
          const existingResults = msg.tool_results || []
          return { ...msg, tool_results: [...existingResults, result] }
        }
        return msg
      }),
    }))
  },
  
  // Conversation methods
  addMessageToConversation: (conversationId, message) => {
    set(state => {
      const conversations = new Map(state.conversations)
      let messages = conversations.get(conversationId) || []
      
      messages = [...messages, message]
      
      // Limit per conversation
      if (messages.length > state.maxMessagesPerConversation) {
        messages = messages.slice(-state.maxMessagesPerConversation)
      }
      
      conversations.set(conversationId, messages)
      
      // Limit total conversations
      if (conversations.size > 10) {
        // Remove oldest conversation
        const oldestKey = Array.from(conversations.keys())[0]
        conversations.delete(oldestKey)
      }
      
      return { conversations }
    })
  },
  
  getConversation: (conversationId, limit = 50) => {
    const state = get()
    const messages = state.conversations.get(conversationId) || []
    return messages.slice(-limit)
  },
  
  clearConversation: (conversationId) => {
    set(state => {
      const conversations = new Map(state.conversations)
      conversations.delete(conversationId)
      return { conversations }
    })
  },
}))

// Setup periodic cleanup with activity monitoring
if (typeof window !== 'undefined') {
  // Import activity monitor dynamically to avoid SSR issues
  import('@/lib/utils/activity-monitor').then(({ ActivityMonitor }) => {
    const monitor = ActivityMonitor.getInstance()
    let cleanupInterval: NodeJS.Timeout | null = null
    
    const startCleanup = () => {
      if (cleanupInterval) return
      
      cleanupInterval = setInterval(() => {
        // Only cleanup when user is active
        if (monitor.isUserActive()) {
          useChatStore.getState().cleanup()
        }
      }, 5 * 60 * 1000) // Every 5 minutes
    }
    
    const stopCleanup = () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
      }
    }
    
    // Subscribe to activity changes
    monitor.subscribe((status) => {
      if (status === 'active') {
        startCleanup()
      } else {
        stopCleanup()
      }
    })
    
    // Start if initially active
    if (monitor.isUserActive()) {
      startCleanup()
    }
  })
}