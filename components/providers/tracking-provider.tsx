'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { eventTracker, EventType } from '@/lib/tracking/events'
import { contextEngine } from '@/lib/ai/context-engine'
import { useUser } from '@/hooks/use-user'

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const [isTrackerInitialized, setIsTrackerInitialized] = useState(false)
  
  useEffect(() => {
    if (user?.id && !isTrackerInitialized) {
      // Initialize only once with user ID
      eventTracker.initialize(user.id)
      contextEngine.initialize(user.id)
      setIsTrackerInitialized(true)
    }
    
    return () => {
      // Cleanup on unmount
      if (isTrackerInitialized) {
        eventTracker.cleanup()
        contextEngine.cleanup()
        setIsTrackerInitialized(false)
      }
    }
  }, [user?.id, isTrackerInitialized])
  
  useEffect(() => {
    // Only track page views if initialized
    if (isTrackerInitialized && pathname) {
      eventTracker.track(EventType.PAGE_VIEW, { path: pathname })
    }
  }, [pathname, isTrackerInitialized])
  
  return <>{children}</>
}