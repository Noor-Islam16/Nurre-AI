import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20
const NOTE_MAX_LENGTH = 4000

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
}

function parsePagination(searchParams: URLSearchParams) {
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0)
  const requestedLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT
  const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT)
  return { offset, limit }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function requireCoach(supabase: SupabaseClient, coachId: string) {
  const { data: coachRow } = await supabase
    .from("coaches")
    .select("id")
    .eq("id", coachId)
    .single()

  return Boolean(coachRow)
}

async function requireLink(supabase: SupabaseClient, coachId: string, userId: string) {
  const { data } = await supabase
    .from("coach_clients")
    .select("coach_id")
    .eq("coach_id", coachId)
    .eq("user_id", userId)
    .limit(1)

  return Boolean(data && data.length)
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

    if (!(await requireCoach(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const userId = (searchParams.get("userId") || "").trim()

    if (!userId || !isUuid(userId)) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    if (!(await requireLink(supabase, user.id, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { offset, limit } = parsePagination(searchParams)

    const { count, error: countError } = await supabase
      .from("coach_notes")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", user.id)
      .eq("user_id", userId)

    if (countError) {
      console.error("Count notes error", countError)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    const total = count ?? 0

    const { data: rows, error } = await supabase
      .from("coach_notes")
      .select("id, body, created_at")
      .eq("coach_id", user.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Fetch notes error", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json({ total, items: rows ?? [] })
  } catch (error) {
    console.error("Coach notes GET error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

type PostBody = {
  userId?: string
  body?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!(await requireCoach(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: PostBody = {}
    try {
      body = (await req.json()) as PostBody
    } catch {
      // ignore parse errors
    }

    const userId = (body.userId ?? "").trim()
    const noteBody = (body.body ?? "").trim()

    if (!userId || !isUuid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 })
    }

    if (!noteBody || noteBody.length > NOTE_MAX_LENGTH) {
      return NextResponse.json({ error: "Note must be between 1 and 4000 characters." }, { status: 400 })
    }

    if (!(await requireLink(supabase, user.id, userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: inserted, error } = await supabase
      .from("coach_notes")
      .insert({
        coach_id: user.id,
        user_id: userId,
        body: noteBody,
      })
      .select("id, created_at")
      .single()

    if (error) {
      console.error("Insert note error", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    // Fire-and-forget event tracking (errors ignored)
    void supabase
      .from("events")
      .insert({
        user_id: user.id,
        type: "coach_note_created",
        data: { userId },
      })

    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    console.error("Coach notes POST error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
