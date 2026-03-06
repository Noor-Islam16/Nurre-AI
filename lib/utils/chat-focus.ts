'use client'

import { PageContext } from '@/store/ai-assistant-store'

export interface ChatPageInfo {
  hasChat: boolean
  chatId?: string
  inputSelector?: string
}

export interface FocusOptions {
  replyToIntervention?: boolean
  interventionId?: string
  scrollBehavior?: ScrollBehavior
}

// Detect if current page has chat and return its info
export const getChatAvailability = (pathname: string): ChatPageInfo => {
  const chatPages: Record<string, ChatPageInfo> = {
    '/dashboard': { 
      hasChat: true, 
      chatId: 'dashboard-assistant',
      inputSelector: '[data-chat-id="dashboard-assistant"] textarea'
    },
    '/planner': { 
      hasChat: true, 
      chatId: 'planner-assistant',
      inputSelector: '[data-chat-id="planner-assistant"] input'
    },
    '/focus': { 
      hasChat: true, 
      chatId: 'focus-assistant',
      inputSelector: '[data-chat-id="focus-assistant"] textarea, [data-chat-id="focus-assistant"] input'
    },
  }
  
  return chatPages[pathname] || { hasChat: false }
}

// Focus chat input with options
export const focusChatInput = (chatId: string, options?: FocusOptions): boolean => {
  // Try multiple selectors to find the input
  const selectors = [
    `[data-chat-id="${chatId}"] textarea`,
    `[data-chat-id="${chatId}"] input[type="text"]`,
    `[data-chat-id="${chatId}"] input`,
    // Fallback selectors if data-chat-id not present
    '.ai-assistant-input textarea',
    '.ai-assistant-input input',
  ]
  
  let input: HTMLInputElement | HTMLTextAreaElement | null = null
  
  for (const selector of selectors) {
    input = document.querySelector(selector)
    if (input) break
  }
  
  if (input instanceof HTMLElement) {
    // First, ensure the chat container is visible
    const chatContainer = input.closest('[data-chat-id]') || input.closest('.ai-assistant-container')
    
    if (chatContainer instanceof HTMLElement) {
      // Scroll chat into view
      chatContainer.scrollIntoView({ 
        behavior: options?.scrollBehavior || 'smooth', 
        block: 'center' 
      })
    }
    
    // Focus with slight delay for smooth UX
    setTimeout(() => {
      input.focus()
      
      // Add reply context if provided
      if (options?.replyToIntervention && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
        // Clear existing text and add mention
        input.value = '@Nuree '
        // Place cursor after the @mention
        const cursorPosition = input.value.length
        input.setSelectionRange(cursorPosition, cursorPosition)
        
        // Trigger input event to update React state
        const event = new Event('input', { bubbles: true })
        input.dispatchEvent(event)
      }
      
      // Visual feedback - highlight the input
      highlightElement(input)
    }, 300)
    
    return true
  }
  
  return false
}

// Highlight chat area with animation
export const highlightChatArea = (chatId: string): void => {
  const chatContainer = document.querySelector(`[data-chat-id="${chatId}"]`) || 
                        document.querySelector('.ai-assistant-container')
  
  if (chatContainer instanceof HTMLElement) {
    // Add highlight class
    chatContainer.classList.add('highlight-pulse')
    
    // Remove after animation
    setTimeout(() => {
      chatContainer.classList.remove('highlight-pulse')
    }, 2000)
  }
}

// Highlight specific element
export const highlightElement = (element: HTMLElement): void => {
  // Store original styles
  const originalBoxShadow = element.style.boxShadow
  const originalTransition = element.style.transition
  
  // Apply highlight
  element.style.transition = 'box-shadow 0.3s ease-in-out'
  element.style.boxShadow = '0 0 0 3px rgba(43, 53, 68, 0.4)'
  
  // Remove highlight after delay
  setTimeout(() => {
    element.style.transition = 'box-shadow 0.3s ease-in-out'
    element.style.boxShadow = originalBoxShadow || ''
    
    // Clean up transition after animation
    setTimeout(() => {
      element.style.transition = originalTransition || ''
    }, 300)
  }, 1500)
}

// Store navigation context for cross-page navigation
export interface NavigationContext {
  interventionId: string
  interventionMessage: string
  timestamp: Date
  sourcePage: string
}

export const preserveNavigationContext = (intervention: {
  id: string
  message: string
}): void => {
  const context: NavigationContext = {
    interventionId: intervention.id,
    interventionMessage: intervention.message,
    timestamp: new Date(),
    sourcePage: window.location.pathname
  }
  
  sessionStorage.setItem('intervention_nav_context', JSON.stringify(context))
}

export const getNavigationContext = (): NavigationContext | null => {
  const stored = sessionStorage.getItem('intervention_nav_context')
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export const clearNavigationContext = (): void => {
  sessionStorage.removeItem('intervention_nav_context')
}

// Get the appropriate page context from pathname
export const getPageContext = (pathname: string): PageContext | null => {
  const contextMap: Record<string, PageContext> = {
    '/dashboard': 'dashboard',
    '/planner': 'planner',
    '/focus': 'focus',
  }
  
  return contextMap[pathname] || null
}