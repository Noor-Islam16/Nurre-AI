'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionContextType {
  isPending: boolean
  setIsPending: (pending: boolean) => void
}

const PageTransitionContext = createContext<PageTransitionContextType>({
  isPending: false,
  setIsPending: () => {}
})

export const usePageTransition = () => useContext(PageTransitionContext)

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, setIsPending] = useState(false)
  const pathname = usePathname()

  // Clear loading state when pathname changes (navigation completed)
  useEffect(() => {
    setIsPending(false)
  }, [pathname])

  // Custom event listener interface for programmatic transitions
  useEffect(() => {
    const handleStart = () => setIsPending(true)
    const handleStop = () => setIsPending(false)

    window.addEventListener('page-transition-start', handleStart)
    window.addEventListener('page-transition-stop', handleStop)

    return () => {
      window.removeEventListener('page-transition-start', handleStart)
      window.removeEventListener('page-transition-stop', handleStop)
    }
  }, [])

  // Click interceptor for standard Next.js Link / <a> navigations
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      // Skip external, mailto, tel, and anchor/hash links
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        anchor.getAttribute('target') === '_blank'
      ) {
        return
      }

      // Skip modified clicks (e.g. Cmd/Ctrl/Shift + Click)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
        return
      }

      // Skip same-page clicks (unless it changes query parameters)
      const currentPath = window.location.pathname
      const targetPath = href.split('?')[0].split('#')[0]
      if (targetPath === currentPath) {
        const targetSearch = href.includes('?') ? href.substring(href.indexOf('?')) : ''
        if (targetSearch === window.location.search) {
          return
        }
      }

      // Trigger transition loader
      setIsPending(true)
    }

    document.addEventListener('click', handleLinkClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true })
    }
  }, [])

  return (
    <PageTransitionContext.Provider value={{ isPending, setIsPending }}>
      <div className="relative w-full h-full min-h-screen">
        {children}
        {isPending && (
          <div className="fixed md:absolute inset-0 z-[8888] flex flex-col items-center justify-center bg-transparent pointer-events-auto transition-all duration-300 animate-fade-in">
            {/* Custom Keyframes */}
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes spin-reverse {
                from { transform: rotate(360deg); }
                to { transform: rotate(0deg); }
              }
              .animate-spin-reverse {
                animation: spin-reverse 1.2s linear infinite;
              }
              @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
              }
            ` }} />
            
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Double-Ring Spinner */}
              <div className="relative flex items-center justify-center">
                {/* Outer Ring */}
                <div className="h-12 w-12 rounded-full border-2 border-slate-500/10 border-t-emerald-500 border-r-emerald-500/40 animate-spin duration-[1.2s]" />
                {/* Inner Ring */}
                <div className="absolute h-8 w-8 rounded-full border-2 border-slate-500/10 border-b-sky-500 border-l-sky-500/40 animate-spin-reverse" />
              </div>

              {/* Simple Status Text */}
              <span className="text-xs font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase animate-pulse">
                Loading...
              </span>
            </div>
          </div>
        )}
      </div>
    </PageTransitionContext.Provider>
  )
}
