'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useRewardsStore } from '@/store/rewards-store'

export function RewardsWidget() {
  const router = useRouter()
  const { totalPoints } = useRewardsStore()

  return (
    <Card className={cn(
      "bg-transparent border-0 shadow-none",
      "h-[8rem] xl:h-[10rem] 2xl:h-[12rem] overflow-hidden",
      "hover:bg-white/20 transition-all duration-300 rounded-xl",
      "group cursor-pointer"
    )}
    onClick={() => router.push('/profile?tab=rewards')}
    >
      <CardContent className="p-4 xl:p-5 2xl:p-6 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm xl:text-base 2xl:text-lg">
              Rewards
            </h3>
            <p className="text-xs xl:text-sm 2xl:text-base text-gray-600 mt-0.5 xl:mt-1">
              {totalPoints > 0 ? `${totalPoints} points earned` : "Let's earn your first points!"}
            </p>
          </div>
          <div className="p-1.5 xl:p-2 2xl:p-2.5 rounded-lg xl:rounded-xl bg-pink-50">
            <Trophy className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-rose-600" />
          </div>
        </div>

        {/* Single-line hint */}
        <div className="flex items-start gap-2 xl:gap-3 p-2.5 xl:p-3 2xl:p-4 rounded-lg xl:rounded-xl bg-emerald-50/50 backdrop-blur-sm">
          <Zap className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs xl:text-sm 2xl:text-base text-emerald-800 leading-relaxed">
            +5 pts if you start a 15‑min focus now.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
