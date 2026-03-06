'use client'

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Mail, FileText, UserCircle } from "lucide-react"

type ClientRow = {
  userId: string
  name: string | null
  email: string | null
  linkedAt: string
  lastNoteAt: string | null
}

type ApiResponse = {
  total: number
  items: ClientRow[]
}

const PAGE_SIZE = 20

export function MyClients() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [offset, setOffset] = useState(() => Number(searchParams.get("offset")) || 0)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchClients() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/coach/clients?offset=${offset}&limit=${PAGE_SIZE}`, { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const json = (await res.json()) as ApiResponse
        if (mounted) setData(json)
      } catch (err: any) {
        console.error("Failed to load clients", err)
        if (mounted) setError("Failed to load clients. Try again.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchClients()
    return () => {
      mounted = false
    }
  }, [offset])

  useEffect(() => {
    if (searchParams.get("tab") !== "clients") return

    const search = new URLSearchParams(Array.from(searchParams.entries()))
    search.set("offset", String(offset))
    router.replace(`/coach?${search.toString()}`, { scroll: false })
  }, [offset, router, searchParams])

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  }, [data])

  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset])

  const handleRowClick = (row: ClientRow) => {
    const search = new URLSearchParams()
    search.set("tab", "notes")
    search.set("userId", row.userId)
    router.push(`/coach?${search.toString()}`)
  }

  return (
    <Card className="bg-card shadow-md border-violet-100">
      <CardContent className="py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">My Clients</h2>
              <p className="text-sm text-muted-foreground">Sorted by last activity. Unlinking isn&apos;t available in MVP.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-6 text-sm text-violet-700">
            Loading clients…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/20 p-8 text-center">
            <UserCircle className="h-12 w-12 text-violet-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No clients yet. Add a client using a claim code.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-violet-100">
            <table className="min-w-full divide-y divide-violet-100 text-sm">
              <thead className="bg-violet-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-violet-900">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      Name
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-violet-900">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-violet-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Linked
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-violet-900">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Last note
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100 bg-white">
                {data.items.map((row) => (
                  <tr
                    key={row.userId}
                    className="cursor-pointer transition hover:bg-violet-50/50"
                    onClick={() => handleRowClick(row)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name ?? "Client"}</td>
                    <td className="px-4 py-3 text-gray-600">{row.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(row.linkedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.lastNoteAt ? new Date(row.lastNoteAt).toLocaleString() : "No notes yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > PAGE_SIZE ? (
          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
                className="border-violet-200 text-violet-700 hover:bg-violet-50 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
