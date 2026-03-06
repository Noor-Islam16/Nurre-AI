'use client'

import { useGrowthPointsListener } from '@/hooks/use-growth-points-listener'

export function GrowthPointsProvider({ children }: { children: React.ReactNode }) {
  useGrowthPointsListener()
  return <>{children}</>
}
