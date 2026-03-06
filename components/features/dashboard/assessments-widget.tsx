'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function AssessmentsWidget() {
  const router = useRouter()

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "h-[8rem] overflow-hidden",
      "transition-all duration-300"
    )}>
      <CardContent className="p-4 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Quick Assessment
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Track your progress and patterns
            </p>
          </div>
          <div className="p-1.5 rounded-lg bg-indigo-50">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
          </div>
        </div>

        {/* CTA Button */}
        <Button
          size="sm"
          onClick={() => router.push('/profile?tab=assessments')}
          className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
        >
          Start quick assessment
        </Button>
      </CardContent>
    </Card>
  )
}
