'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

export function SplashLoaderProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true)
  const [progress, setProgress] = useState(0)
  const [fadeExit, setFadeExit] = useState(false)

  useEffect(() => {
    // Check if the site was already loaded in this session
    const isLoaded = sessionStorage.getItem('nuree_site_loaded')
    if (isLoaded === 'true') {
      setShowSplash(false)
      return
    }

    // Incremental progress simulation for loading bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        // Random incremental steps
        return prev + Math.floor(Math.random() * 15) + 5
      })
    }, 150)

    // Complete loading after 2.2 seconds, trigger fadeout
    const exitTimer = setTimeout(() => {
      setFadeExit(true)
      const removeTimer = setTimeout(() => {
        setShowSplash(false)
        sessionStorage.setItem('nuree_site_loaded', 'true')
      }, 500) // 500ms fade transition duration

      return () => clearTimeout(removeTimer)
    }, 2200)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(exitTimer)
    }
  }, [])

  if (!showSplash) {
    return <>{children}</>
  }

  return (
    <>
      <div 
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 transition-all duration-500 ease-in-out ${
          fadeExit ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        {/* Animated Background Glows */}
        <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-sky-500/10 blur-[120px] animate-pulse duration-[6000ms]" />

        <div className="relative flex flex-col items-center max-w-sm px-6 w-full text-center">
          {/* Logo container with pulse ring */}
          <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/5 border border-white/10 p-4 shadow-2xl backdrop-blur-xl animate-bounce duration-[2000ms]">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-emerald-500/20 blur-[16px] animate-pulse" />
            <Image 
              src="/logo-notext.png" 
              alt="Nuree AI Logo" 
              width={64} 
              height={64}
              priority
              className="object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold tracking-tight text-white mb-2 font-sans">
            NureeAI
          </h1>
          <p className="text-xs text-slate-400 mb-8 font-medium tracking-wide">
            PREPARING YOUR FOCUS SPACE
          </p>

          {/* Loading Progress Bar Container */}
          <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 overflow-hidden mb-3">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-sky-500 h-full rounded-full transition-all duration-200 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Loading percent text */}
          <span className="text-[10px] font-mono tracking-widest text-slate-500">
            {Math.min(progress, 100)}%
          </span>
        </div>
      </div>
      {/* Pre-render children in background (invisible/inactive until splash is gone to optimize load) */}
      <div className="opacity-0 pointer-events-none absolute inset-0 -z-50 overflow-hidden h-0 w-0">
        {children}
      </div>
    </>
  )
}
