import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

type Query = {
  offset?: string
  limit?: string
}

function parsePagination(searchParams: URLSearchParams) {
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0)
  const requestedLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT)
  return { offset, limit }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: coachRow } = await supabase
      .from("coaches")
      .select("id")
      .eq("id", user.id)
      .single()

    if (!coachRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const { offset, limit } = parsePagination(searchParams)

    const { data: rows, error } = await supabase.rpc("coach_clients_with_last_note", {
      p_coach_id: user.id,
      p_offset: offset,
      p_limit: limit,
    })

    if (error) {
      console.error("Fetch clients error", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    const items = (rows ?? []).map((row: any) => ({
      userId: row.user_id,
      name: row.name,
      email: row.email,
      linkedAt: row.linked_at,
      lastNoteAt: row.last_note_at,
    }))

    const total = rows?.[0]?.total_count ?? 0

    return NextResponse.json({ total, items })
  } catch (error) {
    console.error("Coach clients API error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
