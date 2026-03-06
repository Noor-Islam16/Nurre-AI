import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { hashClaimCode } from "@/lib/hash"
import { rateLimit } from "@/lib/rateLimit"

type Body = { code?: string }

const MINUTE_MS = 60_000
const REDEEM_LIMIT = 10

function buildRateLimitResponse(reset: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  const response = NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 })
  response.headers.set("Retry-After", retryAfterSeconds.toString())
  return response
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

    // Ensure the caller is a coach
    const { data: coachRow, error: coachErr } = await supabase
      .from("coaches")
      .select("id")
      .eq("id", user.id)
      .single()

    if (coachErr || !coachRow) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const limitResult = rateLimit({
      key: `coach:${user.id}:redeem`,
      limit: REDEEM_LIMIT,
      windowMs: MINUTE_MS,
    })

    if (!limitResult.success) {
      return buildRateLimitResponse(limitResult.reset)
    }

    let body: Body = {}
    try {
      body = (await req.json()) as Body
    } catch {
      // ignore
    }

    const raw = (body.code ?? "").trim()
    if (!raw) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    const hashed = hashClaimCode(raw)

    // Call RPC to redeem; returns user_id on success
    const { data: redeemedUserId, error: rpcError } = await supabase
      .rpc("redeem_claim_code", { p_coach_id: user.id, p_code_hash: hashed })

    if (rpcError) {
      // Log failure event per M5 Phase 5 spec
      // Fire-and-forget event tracking (errors ignored)
      void supabase
        .from("events")
        .insert({
          user_id: user.id,
          type: "claim_code_failed",
          data: { coachId: user.id },
        })

      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    // Return minimal user profile for UI display
    // Note: Success event already logged by RPC as 'claim_code_redeemed'
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", redeemedUserId)
      .single()

    if (userErr || !userRow) {
      return NextResponse.json({ userId: redeemedUserId, name: null, email: null })
    }

    return NextResponse.json({ userId: userRow.id, name: userRow.name, email: userRow.email })
  } catch (error) {
    console.error("Coach redeem error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
