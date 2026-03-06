'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'
import { DailyMoodModal } from '@/components/features/daily-mood-modal'
import { eventTracker, EventType } from '@/lib/tracking/events'

interface DailyMoodProviderProps {
  children: React.ReactNode
}

const STORAGE_KEY = 'nuree_daily_mood_last_shown'
const SHOW_DELAY_MS = 2000
const AUTH_ROUTES = ['/login', '/signup', '/reset-password']

export function DailyMoodProvider({ children }: DailyMoodProviderProps) {
  const { user, loading: userLoading } = useUser()
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasCheckedToday, setHasCheckedToday] = useState(true)
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true)

  const getTodayDateString = () => {
    return new Date().toLocaleDateString('en-CA')
  }

  const checkIfShouldShowModal = useCallback(async () => {
    // User state validation
    if (!user?.id || !user?.email || userLoading) {
      setIsCheckingDatabase(false)
      return false
    }

    try {
      const today = getTodayDateString()

      // Check localStorage cache first — avoids DB query on every navigation
      const lastShownDate = localStorage.getItem(STORAGE_KEY)
      if (lastShownDate === today) {
        setIsCheckingDatabase(false)
        return false
      }

      const supabase = createClient()

      // Session Validation
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsCheckingDatabase(false)
        return false
      }

      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const { data: todaysMoodEntries, error } = await supabase
        .from('mood_entries')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfToday.toISOString())
        .limit(1)

      if (error) {
        console.error('Error checking mood entries:', error)
        setIsCheckingDatabase(false)
        return false
      }

      const shouldShow = !todaysMoodEntries || todaysMoodEntries.length === 0

      // Cache the result — if mood already exists, skip DB next time
      if (!shouldShow) {
        localStorage.setItem(STORAGE_KEY, today)
      }

      setIsCheckingDatabase(false)
      return shouldShow
    } catch (error) {
      console.error('Error in checkIfShouldShowModal:', error)
      setIsCheckingDatabase(false)
      return false
    }
  }, [user, userLoading])

  const markAsShownToday = () => {
    const today = getTodayDateString()
    localStorage.setItem(STORAGE_KEY, today)
    setHasCheckedToday(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    markAsShownToday()
    
    eventTracker.track(EventType.MOOD_CHECK, {
      action: 'dismissed',
      date: getTodayDateString()
    })
  }

  const handleModalComplete = () => {
    setTimeout(() => {
      setIsModalOpen(false)
      markAsShownToday()
    }, 1500)
    
    eventTracker.track(EventType.MOOD_CHECK, {
      action: 'completed',
      date: getTodayDateString()
    })
  }

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue === getTodayDateString()) {
        setHasCheckedToday(true)
        setIsModalOpen(false)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useEffect(() => {
    const initializeCheck = async () => {
      // Early return for auth routes
      if (AUTH_ROUTES.some(route => pathname?.startsWith(route))) {
        return
      }

      if (!user || userLoading || !isCheckingDatabase) {
        return
      }

      const shouldShow = await checkIfShouldShowModal()
      
      if (shouldShow) {
        setHasCheckedToday(false)
        
        const timer = setTimeout(() => {
          setIsModalOpen(true)
          eventTracker.track(EventType.MOOD_CHECK, {
            action: 'shown',
            date: getTodayDateString()
          })
        }, SHOW_DELAY_MS)

        return () => clearTimeout(timer)
      } else {
        setHasCheckedToday(true)
      }
    }

    initializeCheck()
  }, [user, userLoading, checkIfShouldShowModal, isCheckingDatabase])

  useEffect(() => {
    const checkNewDay = () => {
      // Don't check on auth routes
      if (AUTH_ROUTES.some(route => pathname?.startsWith(route))) {
        return
      }

      const today = getTodayDateString()
      const lastShownDate = localStorage.getItem(STORAGE_KEY)
      
      if (lastShownDate !== today && user?.id && user?.email && !userLoading) {
        setHasCheckedToday(false)
        setIsCheckingDatabase(true)
      }
    }

    const interval = setInterval(checkNewDay, 60000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkNewDay()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, userLoading])

  return (
    <>
      {children}
      <DailyMoodModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onComplete={handleModalComplete}
      />
    </>
  )
}