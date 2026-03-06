import { TaskSkeleton } from '@/components/ui/skeleton-loader'

export default function PlannerLoading() {
  return (
    <div className="min-h-screen">
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <TaskSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}