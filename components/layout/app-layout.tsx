'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Navigation } from './navigation'
import { useTimerStore } from '@/store/timer-store'
import { useMusicPlayer } from '@/components/music/Player'
import { useVoiceStore } from '@/store/voice-store'
import { AchievementNotification } from '@/components/features/achievement-notification'
import { AINavigationHandler } from '@/components/features/ai-navigation-handler'
import { ReminderNotification } from '@/components/features/reminder-notification'
import { AIBackgroundNoiseController } from '@/components/features/ai-background-noise-controller'
import { MoodCheckListener } from '@/components/features/mood-check-listener'
import { FeatureTourListener } from '@/components/features/feature-tour-listener'
import { StickyFocusController } from '@/components/features/sticky-focus-controller'
import { StickyMusicPlayer } from '@/components/features/sticky-music-player'
import { FloatingMicButton } from '@/components/features/floating-mic-button'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // Default to collapsed nav width on first load
  const [navWidth, setNavWidth] = useState(80)
  const [isClient, setIsClient] = useState(false)
  const { isRunning, duration, stopTimer } = useTimerStore()
  const { currentTrack } = useMusicPlayer()

  // Check voice store for floating widget visibility
  const voiceMode = useVoiceStore(state => state.mode)
  const voiceStatus = useVoiceStore(state => state.status)
  const isDashboardVoiceActive = voiceMode === 'dashboard' && voiceStatus !== 'idle' && voiceStatus !== 'ended'

  // Calculate dynamic spacer height based on active features
  // - Focus + Music: h-24 (expanded for both)
  // - Focus only OR Music only: h-14 (single banner)
  // - Neither: no spacer needed
  const hasFocusBanner = isRunning
  const hasMusicBanner = currentTrack !== null && !isRunning // Music banner only shows when focus is NOT running
  const bannerHeight = hasFocusBanner && currentTrack ? 'h-24' : (hasFocusBanner || hasMusicBanner) ? 'h-14' : 'h-0'

  // Set client flag after mount to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Load navigation collapsed state
  useEffect(() => {
    const checkNavState = () => {
      const savedState = localStorage.getItem('nav-collapsed')
      if (savedState !== null) {
        setNavWidth(JSON.parse(savedState) ? 80 : 256)
      } else {
        // No stored preference yet — default to collapsed
        setNavWidth(80)
      }
    }
    
    checkNavState()
    // Listen for cross-tab storage changes
    window.addEventListener('storage', checkNavState)

    // Listen for same-tab nav changes (dispatched from navigation.tsx)
    const handleNavChanged = (e: Event) => {
      const collapsed = (e as CustomEvent<boolean>).detail
      setNavWidth(collapsed ? 80 : 256)
    }
    window.addEventListener('nav-collapsed-changed', handleNavChanged)

    return () => {
      window.removeEventListener('storage', checkNavState)
      window.removeEventListener('nav-collapsed-changed', handleNavChanged)
    }
  }, [])

  // Debounce ref for spacebar toggle
  const lastSpaceToggleRef = useRef<number>(0)
  const TOGGLE_DEBOUNCE_MS = 500

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if focus is in an input-like element
      const target = event.target as HTMLElement
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Space: Tap-to-toggle voice (not hold)
      if (event.code === 'Space' && !isInputFocused && !event.repeat) {
        event.preventDefault()

        // Debounce to prevent rapid toggles
        const now = Date.now()
        if (now - lastSpaceToggleRef.current < TOGGLE_DEBOUNCE_MS) {
          return
        }
        lastSpaceToggleRef.current = now

        // Dashboard and Planner: Dispatch toggle event for local voice integration
        if (pathname === '/dashboard') {
          window.dispatchEvent(new CustomEvent('voice-toggle'))
        } else {
          // Other pages: Toggle floating voice
          window.dispatchEvent(new CustomEvent('floating-voice-toggle'))
        }
      }

      // Cmd/Ctrl+F: Start/End Focus
      if ((event.metaKey || event.ctrlKey) && event.code === 'KeyF' && !isInputFocused) {
        event.preventDefault()

        if (isRunning) {
          // Session is running - confirm and stop
          if (window.confirm('End focus session now?')) {
            stopTimer(false)
          }
        } else {
          // No session running
          if (pathname === '/focus') {
            // Already on focus page - dispatch event to start with current settings
            window.dispatchEvent(new CustomEvent('start-focus'))
          } else {
            // Navigate to focus page with last duration
            const savedDuration = localStorage.getItem('nuree-focus-duration')
            const lastDuration = savedDuration ? parseInt(savedDuration) : duration
            router.push(`/focus?duration=${lastDuration}`)
          }
        }
      }

      // Cmd/Ctrl+T: Add task
      if ((event.metaKey || event.ctrlKey) && event.code === 'KeyT' && !isInputFocused) {
        event.preventDefault()

        if (pathname === '/dashboard') {
          // On dashboard - dispatch custom event to open quick add in UnifiedTasksWidget
          window.dispatchEvent(new CustomEvent('open-add-task'))
        } else {
          // On other pages - navigate to planner with add parameter
          router.push('/planner?add=1')
        }
      }

      // N: Focus task combobox on Focus page
      if (event.code === 'KeyN' && !isInputFocused && pathname === '/focus') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-task-combobox'))
      }

      // Cmd/Ctrl+Shift+F: Toggle Immersive Coach Mode (only on dashboard)
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'KeyF' && !isInputFocused) {
        event.preventDefault()
        if (pathname === '/dashboard') {
          window.dispatchEvent(new CustomEvent('toggle-immersive-coach'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [pathname, router, isRunning, duration, stopTimer])

  // Auth pages and admin pages that should not show navigation
  const isAuthPage = pathname?.startsWith('/login') ||
                     pathname?.startsWith('/signup') ||
                     pathname?.startsWith('/auth') ||
                     pathname?.startsWith('/confirm-email') ||
                     pathname?.startsWith('/forgot-password') ||
                     pathname?.startsWith('/reset-password') ||
                     pathname?.startsWith('/onboarding') ||
                     pathname?.startsWith('/admin') ||
                     pathname?.startsWith('/coach') ||
                     pathname === '/'
  
  if (isAuthPage) {
    return <>{children}</>
  }
  
  // Determine margin class based on nav width
  const marginClass = !isClient 
    ? 'md:ml-20' // Default margin for SSR (collapsed by default)
    : navWidth === 80 
      ? 'md:ml-20' // Collapsed nav margin
      : 'md:ml-64' // Expanded nav margin
  
  return (
    <div className="flex min-h-screen">
      {/* Navigation - only shown on non-auth pages */}
      <div className="hidden md:block">
        <Navigation />
      </div>
      
      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${marginClass}`}>
        <div className="md:hidden h-16" /> {/* Spacer for mobile header */}
        <div className={`${bannerHeight} transition-all duration-300`} /> {/* Dynamic spacer for sticky banners - prevents layout shifts */}
        {children}
      </main>

      {/* Global Components */}
      <StickyFocusController />
      <StickyMusicPlayer />
      <AchievementNotification />
      <AINavigationHandler />
      <ReminderNotification />
      <AIBackgroundNoiseController />
      <MoodCheckListener />
      <FeatureTourListener />
      {/* Floating Mic Button - Hidden on dashboard OR when dashboard voice is active */}
      {pathname !== '/dashboard' && !isDashboardVoiceActive && <FloatingMicButton />}
    </div>
  )
}
