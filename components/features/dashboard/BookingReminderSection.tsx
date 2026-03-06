'use client'

import { useCallback, useEffect, useMemo, useState } from "react"

import { BookingReminderCard } from "@/components/coaching/BookingReminderCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ProfileResponse = {
  hasBookedCoaching: boolean
  lastClaimCodeAt: string | null
}

type StoredCode = { code: string; expiresAt?: string; updatedAt?: number }

export function BookingReminderSection() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [storedCode, setStoredCode] = useState<StoredCode | null>(null)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [regenLoading, setRegenLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const response = await fetch("/api/profile/me", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }
        const data = (await response.json()) as ProfileResponse
        if (mounted) setProfile(data)
      } catch (err: any) {
        if (mounted) setError(err)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const loadStoredCode = useCallback(() => {
    try {
      const raw = localStorage.getItem("nuree.latestClaimCode")
      if (!raw) return null
      const parsed = JSON.parse(raw) as StoredCode
      return parsed
    } catch {
      return null
    }
  }, [])

  const handleShow = useCallback(() => {
    setStoredCode(loadStoredCode())
    setShowModal(true)
  }, [loadStoredCode])

  const handleRegenerate = useCallback(async () => {
    setRegenError(null)
    setRegenLoading(true)
    try {
      const res = await fetch("/api/claim-codes/regenerate", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Failed with ${res.status}`)
      }
      const payload = (await res.json()) as { code: string; expiresAt?: string }
      try {
        localStorage.setItem(
          "nuree.latestClaimCode",
          JSON.stringify({ code: payload.code, expiresAt: payload.expiresAt, updatedAt: Date.now() })
        )
      } catch {}
      setStoredCode({ code: payload.code, expiresAt: payload.expiresAt, updatedAt: Date.now() })
      setShowModal(true)
      // refresh profile metadata (lastClaimCodeAt)
      const prof = await fetch("/api/profile/me", { cache: "no-store" }).then((r) => r.json())
      setProfile(prof)
    } catch (e: any) {
      setRegenError(e?.message ?? "Failed to regenerate code")
    } finally {
      setRegenLoading(false)
    }
  }, [])

  if (error || !profile?.hasBookedCoaching) return null

  return (
    <>
      <BookingReminderCard
        hasClaimCode={Boolean(profile.lastClaimCodeAt)}
        onShowCode={handleShow}
        onRegenerate={handleRegenerate}
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your claim code</DialogTitle>
          </DialogHeader>
          {storedCode ? (
            <div className="space-y-2">
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3">
                <div className="text-sm text-muted-foreground">Share this with your coach</div>
                <div className="text-xl font-semibold tracking-wide">{storedCode.code}</div>
                {storedCode.expiresAt && (
                  <div className="mt-1 text-xs text-muted-foreground">Expires {new Date(storedCode.expiresAt).toLocaleString()}</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                This code is also included in your calendar invite. For privacy, we only keep it on this device.
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>No saved claim code found on this device.</div>
              <div>You can regenerate a fresh code below, or check your calendar invite.</div>
              <Button onClick={handleRegenerate} disabled={regenLoading}>
                {regenLoading ? "Regenerating…" : "Regenerate code"}
              </Button>
              {regenError && <div className="text-destructive">{regenError}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
