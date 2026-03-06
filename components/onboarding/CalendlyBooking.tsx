'use client'

import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (config: {
        url: string
        parentElement: HTMLElement | null
        prefill?: Record<string, unknown>
        utm?: Record<string, unknown>
      }) => void
    }
  }
}

type CalendlyBookingProps = {
  url: string
  name: string
  email: string
  claimCode: string
  onScheduled?: () => void
  onReady?: () => void
  className?: string
}

const CALENDLY_SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js"

async function ensureCalendlyScript(): Promise<void> {
  if (typeof window === "undefined") return
  if (window.Calendly) return

  const existing = document.querySelector(`script[src="${CALENDLY_SCRIPT_SRC}"]`)
  if (existing) {
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Failed to load Calendly")), { once: true })
    })
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = CALENDLY_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Calendly"))
    document.body.appendChild(script)
  })
}

export function CalendlyBooking({
  url,
  name,
  email,
  claimCode,
  onScheduled,
  onReady,
  className,
}: CalendlyBookingProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initCalendly = useCallback(() => {
    if (!window.Calendly) return
    window.Calendly.initInlineWidget({
      url,
      parentElement: containerRef.current,
      prefill: {
        name,
        email,
        customAnswers: {
          a1: claimCode,
        },
      },
    })
    onReady?.()
  }, [url, name, email, claimCode, onReady])

  useEffect(() => {
    let mounted = true

    ensureCalendlyScript()
      .then(() => {
        if (!mounted) return
        initCalendly()
      })
      .catch((err) => {
        console.error("Calendly script failed to load", err)
        if (mounted) {
          setError("Unable to load scheduler. Please try again later.")
        }
      })

    return () => {
      mounted = false
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [initCalendly])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin && !event.origin.includes("calendly.com")) return
      if (event.data?.event === "calendly.event_scheduled") {
        onScheduled?.()
      }
    }

    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [onScheduled])

  if (error) {
    return (
      <div className={cn("rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive", className)}>
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className={cn("min-h-[680px] w-full", className)} />
}
