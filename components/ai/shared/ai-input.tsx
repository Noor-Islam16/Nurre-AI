'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string, options?: any) => Promise<void>
  isLoading?: boolean
  placeholder?: string
  allowAttachments?: boolean
  maxLength?: number
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  allowAttachments = false,
  maxLength = 1000
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return
    
    const message = input
    const files = attachments
    
    // Clear input immediately for better UX
    setInput('')
    setAttachments([])
    
    // Send message with attachments if any
    await onSend(message, files.length > 0 ? { attachments: files } : undefined)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files].slice(0, 5)) // Max 5 files
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1"
            >
              <Paperclip className="h-3 w-3" />
              {file.name}
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full min-h-[44px] max-h-32 resize-none px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all shadow-sm"
            rows={1}
          />
        </div>

        <div className="flex gap-1.5 pb-0.5">
          {allowAttachments && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              disabled={isLoading}
              className="relative h-10 w-10 rounded-xl border-gray-200 hover:bg-gray-50"
            >
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Paperclip className="h-4 w-4 text-gray-500" />
            </Button>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
      
      {input.length > maxLength * 0.9 && (
        <p className="text-xs text-muted-foreground">
          {input.length}/{maxLength} characters
        </p>
      )}
    </div>
  )
}

// Alias for backwards compatibility
export const AIInput = ChatInput