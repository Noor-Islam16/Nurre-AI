import { SkeletonCard } from '@/components/ui/skeleton-loader'

export default function SettingsLoading() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mb-8" />
      
      <div className="mb-6">
        <div className="flex space-x-4 mb-6">
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-6">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-32" />
      </div>
    </div>
  )
}