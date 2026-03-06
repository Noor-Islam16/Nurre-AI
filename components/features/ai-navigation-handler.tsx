'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

/**
 * Handles AI-triggered navigation events
 * Listens for custom events and performs navigation with smooth transitions
 */
export function AINavigationHandler() {
  const router = useRouter()
  // Removed useSearchParams as it's not actually used in the component
  const { toast } = useToast()

  useEffect(() => {
    const handleNavigation = (event: CustomEvent) => {
      const { route, page, section, highlight, smooth, preserveState } = event.detail

      // Show navigation feedback
      toast({
        title: `Navigating to ${page}`,
        description: section ? `Opening ${section} section` : undefined,
        duration: 2000,
      })

      // Perform navigation with optional smooth scrolling
      if (smooth) {
        // Add transition class to body for smooth page transition
        document.body.classList.add('page-transitioning')
        setTimeout(() => {
          document.body.classList.remove('page-transitioning')
        }, 500)
      }

      // Navigate to the route
      router.push(route)

      // Handle post-navigation actions
      if (highlight || section) {
        // Wait for navigation to complete
        setTimeout(() => {
          // Scroll to section if specified
          if (section) {
            const sectionElement = document.getElementById(section)
            if (sectionElement) {
              sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              // Add highlight effect
              sectionElement.classList.add('ai-highlighted')
              setTimeout(() => {
                sectionElement.classList.remove('ai-highlighted')
              }, 3000)
            }
          }

          // Highlight specific element if specified
          if (highlight) {
            const highlightElement = document.querySelector(`[data-highlight="${highlight}"]`)
            if (highlightElement) {
              highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              highlightElement.classList.add('ai-highlighted')
              setTimeout(() => {
                highlightElement.classList.remove('ai-highlighted')
              }, 3000)
            }
          }
        }, 1000)
      }
    }

    // Listen for navigation events
    window.addEventListener('navigate-to-page', handleNavigation as EventListener)

    return () => {
      window.removeEventListener('navigate-to-page', handleNavigation as EventListener)
    }
  }, [router, toast])

  return null
}