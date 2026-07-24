import React from 'react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] w-full p-8 transition-all duration-300">
      {/* Custom keyframes for reverse spin */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 1.2s linear infinite;
        }
      `}} />

      {/* Interactive Glowing Orb and Rings */}
      <div className="relative flex items-center justify-center">
        {/* Glow Effects */}
        <div className="absolute h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl animate-pulse duration-[3000ms]" />
        <div className="absolute h-32 w-32 rounded-full bg-sky-500/10 blur-2xl animate-pulse duration-[4000ms] delay-500" />
        
        {/* Outer Ring - Clockwise */}
        <div className="h-16 w-16 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 border-r-emerald-500/40 animate-spin duration-[1.5s]" />
        
        {/* Inner Ring - Counter-Clockwise */}
        <div className="absolute h-10 w-10 rounded-full border-2 border-sky-500/10 border-b-sky-500 border-l-sky-500/40 animate-spin-reverse" />
        
        {/* Center Pulsing Spark */}
        <div className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
      </div>

      {/* Loading Status Text */}
      <div className="mt-8 text-center flex flex-col items-center">
        <h3 className="text-sm font-semibold tracking-widest text-slate-400 uppercase animate-pulse">
          Enhancing Focus
        </h3>
        <p className="mt-2 text-xs text-slate-500 font-mono tracking-wider max-w-[240px] leading-relaxed">
          Syncing workspace state...
        </p>
      </div>
    </div>
  )
}
