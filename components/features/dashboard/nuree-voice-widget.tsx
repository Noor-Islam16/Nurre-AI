'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function NureeVoiceWidget() {
  const router = useRouter()
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Simulated waveform animation
  useEffect(() => {
    if (!isListening) return

    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100)
    }, 100)

    return () => clearInterval(interval)
  }, [isListening])

  const handleVoiceClick = () => {
    // For now, navigate to chat or toggle listening
    router.push('/calm?mode=voice')
  }

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "h-[8rem] overflow-hidden",
      "hover:bg-white/20 transition-all duration-300 rounded-xl",
      "group cursor-pointer"
    )}
    onClick={handleVoiceClick}
    >
      <CardContent className="p-3 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Start voice chat
            </h3>
          </div>
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            isListening ? "bg-violet-100" : "bg-violet-50"
          )}>
            {isListening ? (
              <MicOff className="w-4 h-4 text-violet-600" />
            ) : (
              <Mic className="w-4 h-4 text-violet-500" />
            )}
          </div>
        </div>

        {/* Waveform Visualization */}
        <div className="flex items-center justify-center gap-1 my-2">
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-violet-300 rounded-full"
              animate={{
                height: isListening
                  ? `${Math.max(8, audioLevel * 0.3 + i * 5)}px`
                  : "8px",
              }}
              transition={{
                duration: 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button
          size="sm"
          variant="ghost"
          className="w-full h-7 bg-violet-50 hover:bg-violet-100 text-violet-700 group-hover:bg-violet-100"
          onClick={(e) => {
            e.stopPropagation()
            handleVoiceClick()
          }}
        >
          <Volume2 className="w-3 h-3 mr-1.5" />
          Start Voice Chat
        </Button>
      </CardContent>
    </Card>
  )
}
