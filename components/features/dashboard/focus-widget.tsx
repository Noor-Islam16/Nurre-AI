'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Play, Pause, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const quickTimes = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
]

export function FocusWidget() {
  const router = useRouter()
  const [selectedTime, setSelectedTime] = useState(30)
  const [isActive, setIsActive] = useState(false)

  const handleStartFocus = (minutes?: number) => {
    router.push(`/focus?duration=${minutes || selectedTime}`)
  }

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "h-[8rem] xl:h-[10rem] 2xl:h-[12rem] overflow-hidden",
      "transition-all duration-300",
      "group"
    )}>
      <CardContent className="p-3 xl:p-4 2xl:p-5 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm xl:text-base 2xl:text-lg">
              {isActive ? 'Session active' : 'Start focusing'}
            </h3>
          </div>
          <div className="p-1.5 xl:p-2 2xl:p-2.5 rounded-lg xl:rounded-xl bg-emerald-50">
            <Clock className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-emerald-600" />
          </div>
        </div>

        {/* Quick Time Buttons */}
        <div className="flex gap-1.5 xl:gap-2 2xl:gap-3 my-2 xl:my-3">
          {quickTimes.map((time) => (
            <Button
              key={time.label}
              size="sm"
              variant="ghost"
              className={cn(
                "flex-1 h-6 xl:h-8 2xl:h-10 text-xs xl:text-sm 2xl:text-base",
                "bg-white/30 hover:bg-white/50 backdrop-blur-sm",
                "text-gray-700",
                selectedTime === time.minutes && "bg-emerald-50 text-emerald-700"
              )}
              onClick={() => handleStartFocus(time.minutes)}
            >
              {time.label}
            </Button>
          ))}
        </div>

        {/* Action Button */}
        <Button
          size="sm"
          className="w-full h-7 xl:h-9 2xl:h-11 text-sm xl:text-base 2xl:text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => handleStartFocus()}
        >
          <Play className="w-3 h-3 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 mr-1.5 xl:mr-2" />
          Start Custom Session
        </Button>
      </CardContent>
    </Card>
  )
}