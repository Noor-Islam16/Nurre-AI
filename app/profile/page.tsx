'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Trophy, ClipboardList, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/skeleton-loader'
import { ProfileInfoTab } from '@/components/profile/profile-info-tab'

// Dynamic imports for heavy components
const AssessmentsTab = dynamicImport(
  () => import('@/components/profile/assessments-tab').then(mod => ({ default: mod.AssessmentsTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: true
  }
)

const RewardsTab = dynamicImport(
  () => import('@/components/profile/rewards-tab').then(mod => ({ default: mod.RewardsTab })),
  {
    loading: () => <TabSkeleton />,
    ssr: true
  }
)

// Tab skeleton loader
function TabSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard className="h-64" />
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-32" />
    </div>
  )
}

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Get tab from URL or default to 'info'
  const initialTab = searchParams.get('tab') || 'info'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Update URL when tab changes
  useEffect(() => {
    const newTab = searchParams.get('tab') || 'info'
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`/profile?${params.toString()}`, { scroll: false })
  }

  // Listen for toast events from child components
  useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      showToast(event.detail.message, event.detail.type)
    }

    window.addEventListener('show-toast', handleShowToast as EventListener)
    return () => window.removeEventListener('show-toast', handleShowToast as EventListener)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="min-h-screen relative">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm border ${
            toast.type === 'success'
              ? 'bg-green-50/95 border-green-200 text-green-700'
              : toast.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-700'
              : 'bg-blue-50/95 border-blue-200 text-blue-700'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary-200 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-[min(90vw,1600px)] mx-auto px-4 md:px-6 lg:px-8 pt-2 pb-6 relative z-10">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 to-secondary-500 bg-clip-text text-transparent mb-8">
          My Profile
        </h1>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-gray-100">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary-700 text-gray-600 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Profile Info
            </TabsTrigger>
            <TabsTrigger
              value="assessments"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary-700 text-gray-600 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              Assessments
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary-700 text-gray-600 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <ProfileInfoTab />
          </TabsContent>

          <TabsContent value="assessments">
            <Suspense fallback={<TabSkeleton />}>
              <AssessmentsTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="rewards">
            <Suspense fallback={<TabSkeleton />}>
              <RewardsTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
