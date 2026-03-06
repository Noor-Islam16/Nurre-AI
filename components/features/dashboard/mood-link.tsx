'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyMoodModal } from '@/components/features/daily-mood-modal'

export function MoodLink() {
  const [showMoodModal, setShowMoodModal] = useState(false)

  return (
    <>
      <Card className={cn(
        "bg-white border-gray-200",
        "h-[8rem] overflow-hidden",
        "hover:shadow-md transition-all duration-300"
      )}>
        <CardContent className="p-4 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                How are you feeling?
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Track your mood and energy
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-purple-50">
              <Heart className="w-4 h-4 text-purple-600" />
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="sm"
            onClick={() => setShowMoodModal(true)}
            className="w-full h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs"
          >
            Check in
          </Button>
        </CardContent>
      </Card>

      {/* Mood Modal */}
      <DailyMoodModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        onComplete={() => setShowMoodModal(false)}
      />
    </>
  )
}
