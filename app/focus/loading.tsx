import { SkeletonCard } from '@/components/ui/skeleton-loader'

export default function FocusLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center pt-16">
      <div className="w-full max-w-4xl mx-auto p-6">
        <SkeletonCard className="h-96" />
        
        <div className="mt-6 grid grid-cols-3 gap-4">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
      </div>
    </div>
  )
}