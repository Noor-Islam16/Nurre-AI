'use client'

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText, AlertCircle, Clock, Inbox } from "lucide-react"

type NoteRow = {
  id: string
  body: string
  created_at: string
}

type NotesResponse = {
  total: number
  items: NoteRow[]
}

const LIMIT = 20
const MAX_LENGTH = 4000

export function NotesPanel({ userId }: { userId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const resetState = () => {
    setNotes([])
    setTotal(0)
    setOffset(0)
    setError(null)
  }

  useEffect(() => {
    resetState()
  }, [userId])

  useEffect(() => {
    let mounted = true
    async function loadNotes(currentOffset: number) {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/coach/notes?userId=${userId}&offset=${currentOffset}&limit=${LIMIT}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const data = (await res.json()) as NotesResponse
        if (!mounted) return
        if (currentOffset === 0) {
          setNotes(data.items)
        } else {
          setNotes((prev) => [...prev, ...data.items])
        }
        setTotal(data.total)
      } catch (err) {
        console.error("Failed to load notes", err)
        if (mounted) setError("Failed to load notes. Try again.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadNotes(offset)
    return () => {
      mounted = false
    }
  }, [userId, offset])

  useEffect(() => {
    const search = new URLSearchParams(Array.from(searchParams.entries()))
    search.set("tab", "notes")
    search.set("userId", userId)
    router.replace(`/coach?${search.toString()}`, { scroll: false })
  }, [router, searchParams, userId])

  const remaining = useMemo(() => Math.max(0, total - notes.length), [total, notes.length])

  const handleLoadMore = () => {
    if (notes.length >= total) return
    setOffset((prev) => prev + LIMIT)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const trimmed = body.trim()
    if (!trimmed) {
      setSubmitError("Note must be between 1 and 4000 characters.")
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setSubmitError("Note must be between 1 and 4000 characters.")
      return
    }

    const confirmFirst = window.confirm("Submit note?")
    if (!confirmFirst) return
    const confirmSecond = window.confirm("This note will be permanent and cannot be edited or deleted.")
    if (!confirmSecond) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/coach/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, body: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Failed with status ${res.status}`)
      }
      const payload = (await res.json()) as NoteRow
      setNotes((prev) => [payload, ...prev])
      setTotal((prev) => prev + 1)
      setBody("")
      setOffset(0)
    } catch (err: any) {
      console.error("Note submit error", err)
      setSubmitError(err?.message ?? "Failed to submit note")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="bg-card shadow-md border-violet-100">
      <CardContent className="space-y-6 py-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-violet-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Notes</h2>
            <p className="text-sm text-muted-foreground">Newest notes appear first.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">All notes are final and cannot be edited or deleted.</p>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a note about this client..."
            rows={4}
            maxLength={MAX_LENGTH}
            className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
          />
          {submitError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {submitError}
            </div>
          )}
          <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700 text-white">
            {submitting ? "Saving…" : "Save note"}
          </Button>
        </form>

        {loading && notes.length === 0 ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-6 text-sm text-violet-700">
            Loading notes…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/20 p-8 text-center">
            <Inbox className="h-12 w-12 text-violet-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notes yet. Leave the first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-violet-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium mb-2">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(note.created_at).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{note.body}</p>
              </div>
            ))}
            {remaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                {loading ? "Loading…" : `Load more (${remaining} remaining)`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

