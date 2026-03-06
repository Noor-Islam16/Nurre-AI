/**
 * Examples of custom AI Assistant implementations
 * These demonstrate the maximum flexibility of the unified AIAssistant component
 */

import { AIAssistant } from '@/components/ai/ai-assistant'
import { Brain, Sparkles, Zap, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

// Example 1: Completely custom minimalist design
export function MinimalistAIAssistant({ config }: any) {
  return (
    <AIAssistant
      variant="dashboard"
      config={config}
      layout="custom"
      renderWrapper={(children) => (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-10 blur-xl" />
          <div className="relative bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-2">
            {children}
          </div>
        </div>
      )}
      renderHeader={() => null} // No header
      renderInput={({ value, onChange, onSend, placeholder, isLoading }) => (
        <div className="flex items-center gap-2 p-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-600"
          />
          <button
            onClick={onSend}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Zap className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      )}
    />
  )
}

// Example 2: Gaming-themed AI assistant with animations
export function GamingAIAssistant({ config }: any) {
  return (
    <AIAssistant
      variant="focus"
      config={config}
      layout="custom"
      containerClassName="relative overflow-hidden"
      renderWrapper={(children) => (
        <motion.div
          className="relative bg-black rounded-xl border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          animate={{
            boxShadow: [
              "0 0 30px rgba(168,85,247,0.5)",
              "0 0 50px rgba(168,85,247,0.7)",
              "0 0 30px rgba(168,85,247,0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 animate-gradient" />
          </div>
          
          {/* Content */}
          <div className="relative z-10 p-4">
            {children}
          </div>
          
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-purple-500" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-purple-500" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-500" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-purple-500" />
        </motion.div>
      )}
      renderHeader={() => (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-5 w-5 text-purple-400" />
            </motion.div>
            <span className="text-purple-300 font-bold text-lg tracking-wider">
              AI COMPANION
            </span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse delay-75" />
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse delay-150" />
          </div>
        </div>
      )}
      messagesClassName="text-green-400 font-mono"
      inputClassName="bg-purple-900/50 border-purple-500 text-purple-100"
    />
  )
}

// Example 3: Medical/Health themed assistant
export function HealthAIAssistant({ config }: any) {
  return (
    <AIAssistant
      variant="dashboard"
      config={config}
      layout="card"
      containerClassName="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200"
      headerClassName="bg-white/80 backdrop-blur"
      title={
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 animate-pulse" />
          <span className="text-green-700 font-semibold">Health Coach</span>
        </div>
      }
      subtitle="Your wellness companion"
      customActions={[
        { label: "Daily check-in", action: "How are you feeling today?" },
        { label: "Breathing exercise", action: "Guide me through a breathing exercise" },
        { label: "Medication reminder", action: "Set up my medication reminders" },
      ]}
      renderMessages={({ messages }) => (
        <div className="space-y-2 p-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-blue-100 ml-auto max-w-[80%]'
                  : 'bg-green-100 mr-auto max-w-[80%]'
              }`}
            >
              <div className="text-sm text-gray-700">{msg.content}</div>
            </div>
          ))}
        </div>
      )}
    />
  )
}

// Example 4: Retro terminal style
export function TerminalAIAssistant({ config }: any) {
  return (
    <AIAssistant
      variant="planner"
      config={config}
      layout="custom"
      renderWrapper={(children) => (
        <div className="bg-black rounded p-4 font-mono">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-400 text-xs ml-2">ai-terminal v1.0.0</span>
          </div>
          <div className="text-green-400">
            {children}
          </div>
        </div>
      )}
      renderInput={({ value, onChange, onSend }) => (
        <div className="flex items-center text-green-400">
          <span className="mr-2">$</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSend()}
            className="flex-1 bg-transparent border-none outline-none"
            placeholder="Enter command..."
          />
          <span className="animate-pulse">_</span>
        </div>
      )}
      renderMessages={({ messages }) => (
        <div className="space-y-1 mb-2 max-h-[200px] overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="text-xs">
              <span className="text-gray-400">
                [{new Date(msg.timestamp).toLocaleTimeString()}]
              </span>{' '}
              <span className={msg.role === 'user' ? 'text-cyan-400' : 'text-green-400'}>
                {msg.role === 'user' ? '>' : '<'} {msg.content}
              </span>
            </div>
          ))}
        </div>
      )}
    />
  )
}

// Example 5: Completely custom render with no wrapper
export function CustomRenderAIAssistant({ config }: any) {
  return (
    <AIAssistant
      variant="chat"
      config={config}
      layout="custom"
      renderWrapper={(children) => {
        // You can completely replace the structure
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-100 rounded-lg p-4">
              <h3 className="font-bold mb-2">AI Responses</h3>
              {children}
            </div>
            <div className="bg-blue-100 rounded-lg p-4">
              <h3 className="font-bold mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full p-2 bg-white rounded hover:bg-gray-50">
                  Action 1
                </button>
                <button className="w-full p-2 bg-white rounded hover:bg-gray-50">
                  Action 2
                </button>
              </div>
            </div>
          </div>
        )
      }}
    />
  )
}