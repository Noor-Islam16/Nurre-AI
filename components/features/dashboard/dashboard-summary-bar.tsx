'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useTaskStore } from '@/store/task-store'
import { useRewardsStore } from '@/store/rewards-store'
import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { Star, CheckSquare, Heart, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
  colorClass: string
  onClick: () => void
}

function SummaryItem({ icon, label, value, colorClass, onClick }: SummaryItemProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 lg:gap-3 xl:gap-4 px-3 py-2 lg:px-4 lg:py-2.5 xl:px-5 xl:py-3 2xl:px-6 2xl:py-3.5 rounded-lg xl:rounded-xl",
        "bg-transparent",
        "hover:bg-white/20 transition-all duration-200",
        "group cursor-pointer w-full"
      )}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={cn("p-2 lg:p-2.5 xl:p-3 2xl:p-3.5 rounded-lg xl:rounded-xl", colorClass)}>
        {icon}
      </div>
      <div className="text-left flex-1">
        <p className="text-[10px] lg:text-xs xl:text-sm 2xl:text-base font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-gray-300 group-hover:text-gray-500 transition-colors" />
    </motion.button>
  )
}

export function DashboardSummaryBar() {
  const router = useRouter()

  // Get data from stores
  const tasks = useTaskStore(state => state.tasks)
  const growthPoints = useRewardsStore(state => state.growthPoints)
  const currentLevel = useRewardsStore(state => state.currentLevel)
  const requestMoodCheck = useAIAssistantStore(state => state.requestMoodCheck)

  // Calculate pending tasks
  const pendingTasks = tasks.filter(t => !t.completed).length

  // Format points display
  const ptsDisplay = `${growthPoints.toLocaleString()} pts`

  const handleMoodCheck = () => {
    requestMoodCheck('check_in')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-2 xl:gap-3 2xl:gap-4"
    >
      {/* Growth Points - Rose/Pink (Rewards color) */}
      <SummaryItem
        icon={<Star className="w-4 h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-rose-600" />}
        label={`Level ${currentLevel}`}
        value={ptsDisplay}
        colorClass="bg-rose-50"
        onClick={() => router.push('/rewards')}
      />

      {/* Tasks - Teal (Tasks color) */}
      <SummaryItem
        icon={<CheckSquare className="w-4 h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-teal-600" />}
        label="Tasks"
        value={`${pendingTasks} pending`}
        colorClass="bg-teal-50"
        onClick={() => router.push('/planner')}
      />

      {/* Mood - Violet (AI color) */}
      <SummaryItem
        icon={<Heart className="w-4 h-4 lg:w-5 lg:h-5 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-violet-600" />}
        label="Mood"
        value="Check in"
        colorClass="bg-violet-50"
        onClick={handleMoodCheck}
      />
    </motion.div>
  )
}
