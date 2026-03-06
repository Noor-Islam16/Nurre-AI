'use client'

import { useState, useEffect } from 'react'
import { Coffee, Zap, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

export function BreakScreen({ duration = 5 }: { duration?: number }) {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          window.dispatchEvent(new CustomEvent('break-complete'))
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  
  const breakActivities = [
    { icon: Coffee, text: "Get a drink of water" },
    { icon: Zap, text: "Do 10 jumping jacks" },
    { icon: Heart, text: "Take 5 deep breaths" },
  ]
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-green-400 to-blue-500 z-50 flex items-center justify-center"
    >
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">Break Time!</h1>
        <div className="text-8xl font-mono mb-8">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        
        <div className="space-y-4 mb-8">
          {breakActivities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.2 }}
              className="flex items-center justify-center space-x-3"
            >
              <activity.icon className="w-6 h-6" />
              <span className="text-xl">{activity.text}</span>
            </motion.div>
          ))}
        </div>
        
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('break-complete'))}
          className="bg-white text-blue-500 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          End Break Early
        </button>
      </div>
    </motion.div>
  )
}