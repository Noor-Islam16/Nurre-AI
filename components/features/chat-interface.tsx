// components/features/chat-interface.tsx
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Mic, MicOff, Loader2, Brain, X } from 'lucide-react'
import { useChatHandler } from '@/hooks/use-chat-handler'
import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'
import { MessageList } from '@/components/ui/message'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  conversationId?: string
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])
  
  const {
    messages,
    isLoading,
    error,
    handleSend,
    cancelRequest,
    clearMessages,
    loadConversation
  } = useChatHandler({
    conversationId,
    persistMessages: true,
    onMessageSent: (message) => {
      console.log('Message sent:', message)
    },
    onResponseReceived: (message) => {
      console.log('Response received:', message)
    },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Load conversation on mount
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId)
    }
  }, [conversationId, loadConversation])
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const message = input
    setInput('') // Clear input immediately
    await handleSend(message)
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as any)
    }
  }
  
  const toggleVoiceInput = async () => {
    if (!isListening) {
      try {
        const recognition = new (window as any).webkitSpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
          setIsListening(false)
        }
        
        recognition.onerror = () => {
          setIsListening(false)
        }
        
        recognition.start()
        setIsListening(true)
      } catch (error) {
        console.error('Speech recognition error:', error)
      }
    } else {
      setIsListening(false)
    }
  }
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-700 to-secondary-600 p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Nuree</h2>
              <p className="text-white/80 text-sm">Your ADHD support companion</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              onClick={clearMessages}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              Clear Chat
            </Button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-700 text-lg">
              Hi! I&apos;m Nuree.
            </p>
            <p className="text-gray-700 mt-2">
              How can I help you today?
            </p>
          </div>
        ) : (
          <MessageList messages={messages as any} showTimestamps />
        )}
        {error && (
          <div className="text-danger-500 text-sm mt-2">
            Error: {error.message}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={onSubmit} className="p-4 border-t">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? "Listening..." : "Type your message..."}
              disabled={isLoading || isListening}
              className={cn(
                "w-full px-4 py-3 pr-12 rounded-lg border resize-none",
                "text-gray-900 placeholder:text-gray-500", // Fix: Added dark text color
                "focus:outline-none focus:ring-2 focus:ring-slate-500",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isListening && "bg-red-50 border-red-200"
              )}
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />
            <Button
              type="button"
              onClick={toggleVoiceInput}
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-2 bottom-3 h-8 w-8",
                isListening 
                  ? "text-danger-500 hover:bg-danger-100" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
              disabled={isLoading}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {isLoading ? (
            <Button
              type="button"
              onClick={cancelRequest}
              variant="outline"
              size="icon"
              className="h-[48px] w-[48px]"
            >
              <X className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() || isListening}
              size="icon"
              className="h-[48px] w-[48px] bg-primary-600 hover:bg-primary-700"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {isLoading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {personality.name} is thinking...
          </div>
        )}
      </form>
    </div>
  )
}