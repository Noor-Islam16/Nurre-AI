"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { HelpCircle, Sparkles } from "lucide-react"
import { Assessment } from "@/lib/types/assessment"
import { cn } from "@/lib/utils"

interface StartHereStripProps {
  recommended: Assessment | null
  onStart: (assessment: Assessment) => void
  reason: string
}

export function StartHereStrip({ recommended, onStart, reason }: StartHereStripProps) {
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false)
      }
    }

    if (showPopover) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showPopover])

  if (!recommended) return null

  const questionCount = recommended.questions?.length || 0
  const timeEstimate = recommended.time_estimate || 5

  return (
    <div className="relative mb-6 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Recommended for you</p>
            <p className="text-lg font-semibold text-gray-900">
              {recommended.name}{" "}
              <span className="text-sm font-normal text-gray-600">
                ({timeEstimate} min, {questionCount} Q)
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              ref={buttonRef}
              variant="ghost"
              size="sm"
              onClick={() => setShowPopover(!showPopover)}
              className="text-gray-600 hover:text-gray-900"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Why this?
            </Button>

            {showPopover && (
              <div
                ref={popoverRef}
                className={cn(
                  "absolute right-0 top-full mt-2 z-50",
                  "w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg",
                  "text-sm text-gray-700"
                )}
              >
                {reason}
                <div className="absolute -top-2 right-4 h-4 w-4 rotate-45 border-l border-t border-gray-200 bg-white" />
              </div>
            )}
          </div>

          <Button
            onClick={() => onStart(recommended)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Start
          </Button>
        </div>
      </div>
    </div>
  )
}
