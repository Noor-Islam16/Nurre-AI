'use client'

import { useState, useMemo } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIAssistant } from '@/components/ai/ai-assistant'
import { useAIVariant } from '@/hooks/use-ai-variant'
import { useUserStore } from '@/store/user-store'
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { config } = useAIVariant()

  // Get user's selected personality
  const userProfile = useUserStore(state => state.profile)
  const selectedPersonalityId = (userProfile?.selected_personality as PersonalityId) || 'nur'
  const personality = useMemo(() => getPersonality(selectedPersonalityId), [selectedPersonalityId])
  
  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 z-40 w-96 h-[600px] max-h-[80vh]"
          >
            <div className="relative h-full">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute -top-2 -right-2 z-50 bg-white rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
              {config && (
                <AIAssistant
                  variant="chat"
                  config={config}
                  layout="full"
                  containerClassName="h-full bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
                  headerClassName="bg-gradient-to-r from-primary-700 to-secondary-600 text-white p-4"
                  messagesClassName="flex-1 overflow-y-auto"
                  inputClassName="border-t"
                  title={
                    <div className="text-white font-bold text-lg">
                      {personality.name}
                    </div>
                  }
                  subtitle={
                    <div className="text-white/90 text-sm">
                      How can I help you today?
                    </div>
                  }
                  placeholder="Type your message..."
                  showHistory={true}
                  showTools={true}
                  maxHeight="calc(100% - 120px)"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}