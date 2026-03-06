import { SkeletonCard } from '@/components/ui/skeleton-loader'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto p-6">
        <div className="h-10 bg-gray-200 rounded-lg w-48 mb-8 animate-pulse"></div>

        <div className="space-y-6">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    </div>
  )
}
