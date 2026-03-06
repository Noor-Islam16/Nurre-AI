'use client'

import { useMemo } from 'react'
import { useChatHandler } from '@/hooks/use-chat-handler'
import { Card } from '@/components/ui/card'
import { ChatInput } from '@/components/ai/shared/ai-input'
import { Message as MessageBubble } from '@/components/ui/message'
import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'

export function AIAssistantSection() {
  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])
  const {
    messages,
    isLoading,
    handleSend,
    clearMessages
  } = useChatHandler({
    persistMessages: false, // Don't persist for this component
    onResponseReceived: (message) => {
      // Handle any special logic for this component
      if (message.toolCalls?.length) {
        console.log('Tool calls executed:', message.toolCalls)
      }
    }
  })

  return (
    <Card className="h-[400px] flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">{personality.name}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Start a conversation with {personality.name}
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              {...message}
              showAvatar={true}
              showTimestamp={false}
            />
          ))
        )}
      </div>
      
      <div className="p-4 border-t">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          placeholder={`Ask ${personality.name}...`}
        />
      </div>
    </Card>
  )
}