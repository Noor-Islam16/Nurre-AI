'use client'

import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProfessionalPicker, ProfessionalOption } from "@/components/onboarding/ProfessionalPicker"
import { CalendlyBooking } from "@/components/onboarding/CalendlyBooking"

type ClaimCodeResponse = {
  code: string
  expiresAt: string
  allowedUses: number
}

type BookingClientProps = {
  defaultName: string
  defaultEmail: string
}

export function BookingClient({ defaultName, defaultEmail }: BookingClientProps) {
  const router = useRouter()
  const [selectedProfessionals, setSelectedProfessionals] = useState<ProfessionalOption[]>([])
  const [generatingCode, setGeneratingCode] = useState(false)
  const [claimCode, setClaimCode] = useState<ClaimCodeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCalendlyId, setActiveCalendlyId] = useState<string | null>(null)

  const selectionIds = useMemo(() => selectedProfessionals.map((pro) => pro.id), [selectedProfessionals])

  const handleSelectionChange = useCallback((selection: { ids: string[]; professionals: ProfessionalOption[] }) => {
    setSelectedProfessionals(selection.professionals)
  }, [])

  const handleGenerateCode = useCallback(async () => {
    if (selectionIds.length === 0) {
      setError("Select at least one professional before booking.")
      return
    }

    setGeneratingCode(true)
    setError(null)

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [
          {
            type: "booking_started",
            data: { source: "calendly", professionalsRequested: selectionIds.length },
          },
        ],
      }),
    }).catch((err) => {
      console.warn("Failed to log booking_started", err)
    })

    try {
      const response = await fetch("/api/claim-codes/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedUses: selectionIds.length }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error ?? "Failed to generate a claim code.")
      }

      const payload: ClaimCodeResponse = await response.json()
      setClaimCode(payload)
      try {
        localStorage.setItem(
          "nuree.latestClaimCode",
          JSON.stringify({ code: payload.code, expiresAt: payload.expiresAt, updatedAt: Date.now() })
        )
      } catch (e) {
        // ignore storage errors
      }
      setActiveCalendlyId(selectionIds[0])
    } catch (err: any) {
      console.error("Claim code generation failed", err)
      setError(err?.message ?? "Unable to generate code. Please try again later.")
    } finally {
      setGeneratingCode(false)
    }
  }, [selectionIds])

  const handleScheduled = useCallback(async () => {
    try {
      await fetch("/api/coaching/booked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalsSelected: selectionIds.length }),
      })
    } catch (err) {
      console.error("Failed to mark booking as complete", err)
    }

    const remaining = selectionIds.filter((id) => id !== activeCalendlyId)
    if (remaining.length > 0) {
      setActiveCalendlyId(remaining[0] ?? null)
    } else if (claimCode) {
      router.push(`/onboarding/success?code=${encodeURIComponent(claimCode.code)}&expiresAt=${encodeURIComponent(claimCode.expiresAt)}`)
    } else {
      router.push("/onboarding/success")
    }
  }, [selectionIds, activeCalendlyId, claimCode, router])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Book your sessions</h1>
        <p className="text-sm text-muted-foreground">
          Choose up to three professionals that you’d like to meet with. We’ll generate a single claim code you can share with each booking.
        </p>
      </div>

      <Card className="border-dashed border-violet-200 bg-violet-50/40">
        <CardContent className="space-y-3 py-4">
          <h2 className="text-lg font-semibold">Not ready to book?</h2>
          <p className="text-sm text-muted-foreground">
            You can skip this step for now and return to your dashboard. You can always book a coach later from the Coach Booking section.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await fetch("/api/users/onboarding/complete", { method: "POST" })
              } catch (error) {
                console.error("Failed to mark onboarding complete", error)
              }
              router.push("/dashboard")
            }}
          >
            Skip and go to dashboard
          </Button>
        </CardContent>
      </Card>

      <Card className="p-6">
        <ProfessionalPicker onChange={handleSelectionChange} />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerateCode} disabled={generatingCode || selectionIds.length === 0}>
            {generatingCode ? "Generating…" : claimCode ? "Regenerate code" : "Generate claim code"}
          </Button>

          {claimCode && (
            <div className="text-sm text-muted-foreground">
              Claim code: <span className="font-semibold text-foreground">{claimCode.code}</span> (expires {new Date(claimCode.expiresAt).toLocaleString()})
            </div>
          )}
        </div>

        {error && <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      </Card>

      {claimCode && activeCalendlyId && (
        <Card className="p-6">
          <div className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold">Schedule with {selectedProfessionals.find((pro) => pro.id === activeCalendlyId)?.name ?? "your selected professional"}</h2>
            <p className="text-sm text-muted-foreground">
              We’ll pre-fill your claim code so it appears in the calendar invite. Book each professional one at a time.
            </p>
          </div>

          <CalendlyBooking
            url={selectedProfessionals.find((pro) => pro.id === activeCalendlyId)?.scheduler_link ?? ""}
            name={defaultName}
            email={defaultEmail}
            claimCode={claimCode.code}
            onScheduled={handleScheduled}
          />

          {selectionIds.length > 1 && (
            <div className="mt-4 flex gap-2">
              {selectionIds.map((id) => (
                <Button
                  key={id}
                  variant={id === activeCalendlyId ? "default" : "outline"}
                  onClick={() => setActiveCalendlyId(id)}
                  size="sm"
                >
                  {selectedProfessionals.find((pro) => pro.id === id)?.name ?? "Professional"}
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
