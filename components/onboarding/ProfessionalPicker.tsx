'use client'

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Professional = {
  id: string
  name: string | null
  specialties: string[]
  scheduler_link: string | null
}

type ProfessionalPickerProps = {
  maxSelected?: number
  value?: string[]
  defaultValue?: string[]
  onChange?: (selection: { ids: string[]; professionals: Professional[] }) => void
  className?: string
}

function normalizeMaxSelected(maxSelected?: number) {
  if (!maxSelected || maxSelected <= 0) return 1
  return Math.min(10, Math.floor(maxSelected))
}

export function ProfessionalPicker({
  maxSelected,
  value,
  defaultValue = [],
  onChange,
  className,
}: ProfessionalPickerProps) {
  const cappedMaxSelected = normalizeMaxSelected(maxSelected ?? Number(process.env.NEXT_PUBLIC_MAX_PROFESSIONALS ?? 3))

  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [internalSelection, setInternalSelection] = useState<string[]>(defaultValue)

  const selectedIds = value ?? internalSelection

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/coaches/available", {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data: Professional[] = await response.json()
        setProfessionals(data ?? [])
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Failed to load professionals", err)
        setError("Unable to load professionals. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (value) {
      setInternalSelection(value)
    }
  }, [value])

  useEffect(() => {
    if (!onChange) return
    const selectedProfessionals = professionals.filter((coach) => selectedIds.includes(coach.id))
    onChange({ ids: selectedIds, professionals: selectedProfessionals })
  }, [selectedIds, professionals, onChange])

  const remaining = Math.max(0, cappedMaxSelected - selectedIds.length)

  const handleToggle = (id: string) => {
    setInternalSelection((prev) => {
      const current = value ?? prev
      const isSelected = current.includes(id)

      if (isSelected) {
        return current.filter((item) => item !== id)
      }

      if (current.length >= cappedMaxSelected) {
        return current
      }

      return [...current, id]
    })
  }

  const disabledIds = useMemo(() => {
    if (selectedIds.length < cappedMaxSelected) return new Set<string>()
    return new Set(selectedIds)
  }, [selectedIds, cappedMaxSelected])

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Select up to {cappedMaxSelected} professionals</span>
        <span>
          {selectedIds.length}/{cappedMaxSelected} selected
        </span>
      </div>

      {loading ? (
        <div className="rounded-md border border-muted bg-muted/40 p-4 text-sm text-muted-foreground">
          Loading professionals…
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : professionals.length === 0 ? (
        <div className="rounded-md border border-muted bg-muted/40 p-4 text-sm text-muted-foreground">
          No professionals available yet. Please check back later.
        </div>
      ) : (
        <div className="grid gap-3">
          {professionals.map((coach) => {
            const checked = selectedIds.includes(coach.id)
            const disableToggle = !checked && selectedIds.length >= cappedMaxSelected

            return (
              <label
                key={coach.id}
                className={cn(
                  "group block cursor-pointer rounded-lg border p-4 transition",
                  checked
                    ? "border-primary bg-primary/5"
                    : disableToggle
                      ? "cursor-not-allowed opacity-60"
                      : "border-muted hover:border-primary/60",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  disabled={disableToggle}
                  onChange={() => handleToggle(coach.id)}
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-foreground">
                      {coach.name ?? "Professional"}
                    </div>
                    {coach.scheduler_link && (
                      <div className="mt-1 text-xs text-muted-foreground break-all">
                        {coach.scheduler_link}
                      </div>
                    )}
                    {coach.specialties?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {coach.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {checked ? "Selected" : disableToggle ? "Max reached" : "Select"}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {remaining === 0
          ? "Maximum selections reached. Deselect someone to choose a different professional."
          : `${remaining} selection${remaining === 1 ? "" : "s"} remaining.`}
      </div>
    </div>
  )
}

export type { Professional as ProfessionalOption }
