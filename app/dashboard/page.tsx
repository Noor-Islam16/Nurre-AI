'use client'

import { useEffect, Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { useAIAssistantStore } from '@/store/ai-assistant-store'
import { useSharedSession } from '@/hooks/use-shared-session'
import { DashboardCardSkeleton } from '@/components/ui/skeleton-loader'

// Dynamic import for the Dashboard component with loading skeleton
const Dashboard = dynamicImport(
  () => import('@/components/features/dashboard').then(mod => ({ default: mod.Dashboard })),
  {
    loading: () => <DashboardSkeleton />,
    ssr: true
  }
)

// Force dynamic rendering to avoid useSearchParams static generation issues
export const dynamic = 'force-dynamic'

// Dashboard loading skeleton
function DashboardSkeleton() {
  return (
    <div className="w-full max-w-[min(90vw,1600px)] mx-auto px-4 md:px-6 lg:px-8 pt-2 pb-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const setContext = useAIAssistantStore(state => state.setContext)
  const { sessionId } = useSharedSession()
  
  useEffect(() => {
    setContext('dashboard')
  }, [setContext])

  return (
    <div className="min-h-screen">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard sessionId={sessionId} />
      </Suspense>
    </div>
  )
}