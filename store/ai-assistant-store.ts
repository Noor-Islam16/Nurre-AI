// store/ai-assistant-store.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { ResponseIdManager } from '@/lib/ai/response-id-manager'

type AIResponseV2 = any

export type PageContext = 'dashboard' | 'planner' | 'focus'
export type AIMode = 'coach' | 'helper' | 'planner' | 'motivator'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  sessionId?: string
  context?: PageContext
}

interface Suggestion {
  id: string
  text: string
  action?: () => void
}

interface AIAssistantState {
  // CHANGE: Replace Map with single array
  messages: Message[]  // All messages in current session
  sessionId: string | null  // Current session ID
  lastResponseId: string | null  // Track last response ID
  
  // Keep existing fields
  currentContext: PageContext | null
  mode: AIMode
  suggestions: Suggestion[]
  isLoading: boolean
  inputValue: string
  lastInteraction: Date | null
  error: string | null
  
  // Mood check request state
  moodCheckRequested: boolean
  moodCheckContext: string | null
  
  // Feature tour state
  activeTour: string | null
  toursCompleted: string[]
  
  // Updated Actions
  setSessionId: (sessionId: string) => void
  setContext: (context: PageContext) => void
  setMode: (mode: AIMode) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  clearMessages: () => void
  setSuggestions: (suggestions: Suggestion[]) => void
  setInputValue: (value: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastResponseId: (responseId: string | null) => void
  
  // New unified methods
  getSessionMessages: () => Message[]
  loadSessionMessages: (sessionId: string) => Promise<void>
  getContextMessages: (context: PageContext) => Message[]  // Keep for backward compatibility
  
  // Keep existing methods
  handleV2Response: (response: AIResponseV2, context?: PageContext) => void
  
  // Mood check request methods
  requestMoodCheck: (context: string) => void
  clearMoodCheckRequest: () => void
  
  // Feature tour methods
  startTour: (tourId: string) => void
  completeTour: (tourId: string) => void
  skipTour: () => void
  hasCompletedTour: (tourId: string) => boolean
}

const supabase = createClient()

// Listen for session reset events and initialize tour state
if (typeof window !== 'undefined') {
  window.addEventListener('session-reset', (event: any) => {
    const newSessionId = event.detail?.newSessionId
    if (newSessionId) {
      // Clear current state and set new session
      useAIAssistantStore.getState().clearMessages()
      useAIAssistantStore.getState().setSessionId(newSessionId)
    }
  })
  
  // Initialize tour state from localStorage
  setTimeout(() => {
    const store = useAIAssistantStore.getState()
    const completedTours = localStorage.getItem('toursCompleted')
    const activeTour = localStorage.getItem('activeTour')
    
    if (completedTours) {
      try {
        const tours = JSON.parse(completedTours)
        useAIAssistantStore.setState({ toursCompleted: tours })
      } catch (e) {
        console.error('Failed to parse completed tours', e)
      }
    }
    
    if (activeTour) {
      useAIAssistantStore.setState({ activeTour })
    }
  }, 0)
}

export const useAIAssistantStore = create<AIAssistantState>((set, get) => ({
  messages: [],
  sessionId: null,
  lastResponseId: null,
  currentContext: null,
  mode: 'coach',
  suggestions: [],
  isLoading: false,
  inputValue: '',
  lastInteraction: null,
  error: null,
  moodCheckRequested: false,
  moodCheckContext: null,
  activeTour: null,
  toursCompleted: [],
  
  setSessionId: async (sessionId) => {
    set({ sessionId })
    // Load messages for this session asynchronously
    // Using setTimeout to avoid race condition
    setTimeout(() => {
      get().loadSessionMessages(sessionId)
    }, 0)
  },
  
  setContext: (context) => {
    const state = get()
    
    // Determine mode based on context (keep existing logic)
    let mode: AIMode = 'coach'
    switch (context) {
      case 'dashboard':
        mode = 'coach'
        break
      case 'planner':
        mode = 'planner'
        break
      case 'focus':
        mode = 'motivator'
        break
    }
    
    set({
      currentContext: context,
      mode,
      isLoading: false,
      error: null
    })
  },
  
  setMode: (mode) => set({ mode }),
  
  addMessage: (message) => {
    const state = get()
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: state.sessionId || undefined,
      context: message.context || state.currentContext || undefined
    }
    
    set({
      messages: [...state.messages, newMessage],
      lastInteraction: new Date()
    })
  },
  
  clearMessages: () => {
    set({
      messages: [],
      isLoading: false,
      error: null
    })
  },
  
  setSuggestions: (suggestions) => set({ suggestions }),
  
  setInputValue: (value) => set({ inputValue: value }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setLastResponseId: (responseId) => {
    set({ lastResponseId: responseId })
  },
  
  getSessionMessages: () => {
    return get().messages
  },
  
  loadSessionMessages: async (sessionId: string) => {
    try {
      // Load messages from database for this session
      const { data: messages, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error loading session messages:', error)
        // Set error state so UI can show feedback
        set({ error: 'Failed to load conversation history. Please refresh the page.' })
        return
      }
      
      if (messages && messages.length > 0) {
        // Find last assistant message with response_id
        const lastAssistantMessage = messages
          .filter(m => m.role === 'assistant' && m.response_id)
          .pop()
        
        if (lastAssistantMessage?.response_id) {
          set({ lastResponseId: lastAssistantMessage.response_id })
          
          // Also save to ResponseIdManager
          try {
            ResponseIdManager.saveResponseId(sessionId, lastAssistantMessage.response_id)
          } catch (error) {
            console.warn('Failed to save response ID to manager:', error)
          }
        }
        
        const formattedMessages: Message[] = messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content || '',
          timestamp: new Date(msg.created_at),
          sessionId: msg.session_id,
          context: msg.metadata?.context,
        }))
        
        set({ messages: formattedMessages })
      }
    } catch (error) {
      console.error('Failed to load session messages:', error)
      // Set error state for UI feedback
      set({ error: 'Unable to connect to database. Please check your connection.' })
    }
  },
  
  // Keep for backward compatibility - returns all messages now
  getContextMessages: (context) => {
    // In the unified model, we return all messages regardless of context
    // The context filtering can be done by the UI if needed
    return get().messages
  },
  
  // V2 Response handler
  handleV2Response: (response: AIResponseV2, context?: PageContext) => {
    const state = get()
    const targetContext = context || state.currentContext || 'dashboard'
    
    switch (response.status) {
      case 'ok':
        // V2 guarantees message when status is 'ok'
        if (response.message) {
          const newMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            sessionId: state.sessionId || undefined,
            context: targetContext,
          }
          
          // Add to messages
          get().addMessage(newMessage)
          
          // If there are actions, trigger execution
          if (response.actions && response.actions.length > 0) {
            // Dispatch event for action execution
            window.dispatchEvent(new CustomEvent('v2-actions-received', { 
              detail: { actions: response.actions, context: targetContext }
            }))
          }
        }
        break
        
      case 'refusal':
        get().addMessage({
          role: 'assistant',
          content: response.message || 'I cannot help with that request.',
          context: targetContext,
        })
        break

      case 'error':
        get().addMessage({
          role: 'assistant',
          content: response.error?.message || 'An error occurred. Please try again.',
          context: targetContext,
        })
        break
    }
    
    set({ isLoading: false, error: null })
  },
  
  requestMoodCheck: (context: string) => set({
    moodCheckRequested: true,
    moodCheckContext: context
  }),
  
  clearMoodCheckRequest: () => set({
    moodCheckRequested: false,
    moodCheckContext: null
  }),
  
  startTour: (tourId: string) => {
    set({ activeTour: tourId })
    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('toursCompleted')
      const tours = completed ? JSON.parse(completed) : []
      localStorage.setItem('activeTour', tourId)
    }
  },
  
  completeTour: (tourId: string) => {
    set(state => {
      const newCompleted = [...state.toursCompleted, tourId]
      // Save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('toursCompleted', JSON.stringify(newCompleted))
        localStorage.removeItem('activeTour')
      }
      return {
        activeTour: null,
        toursCompleted: newCompleted
      }
    })
  },
  
  skipTour: () => {
    set({ activeTour: null })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeTour')
    }
  },
  
  hasCompletedTour: (tourId: string) => {
    const state = get()
    return state.toursCompleted.includes(tourId)
  }
}))