'use client'

import { useEffect, Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { TaskSkeleton } from '@/components/ui/skeleton-loader'

// Dynamic import for new TasksPage component
const TasksPage = dynamicImport(
  () => import('@/components/features/tasks/tasks-page').then(mod => ({ default: mod.TasksPage })),
  {
    loading: () => <TaskPlannerSkeleton />,
    ssr: true
  }
)

// Force dynamic rendering to avoid useSearchParams static generation issues
export const dynamic = 'force-dynamic'

// Task Planner loading skeleton
function TaskPlannerSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 md:px-6 lg:px-8 pt-4 pb-8">
      <div className="w-full max-w-[min(90vw,1600px)] mx-auto space-y-6">
        {/* Hero skeleton */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Capture bar skeleton */}
        <div className="h-16 bg-white rounded-xl border border-gray-200 animate-pulse" />
        {/* Filters skeleton */}
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        {/* Task list skeleton */}
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PlannerPage() {
  const setContext = useAIAssistantStore(state => state.setContext)

  useEffect(() => {
    setContext('planner')
  }, [setContext])

  return (
    <Suspense fallback={<TaskPlannerSkeleton />}>
      <TasksPage />
    </Suspense>
  )
}