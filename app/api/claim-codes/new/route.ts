import { NextRequest, NextResponse } from "next/server"

import { rateLimit } from "@/lib/rateLimit"
import { createClient } from "@/lib/supabase/server"
import {
  issueClaimCode,
  sanitizeAllowedUses,
} from "@/lib/coaching/claim-codes"

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

function buildRateLimitResponse(reset: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
  const response = NextResponse.json({ error: "Too many requests" }, { status: 429 })
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

    const minuteBucket = rateLimit({
      key: `claim-code:new:minute:${user.id}`,
      limit: 1,
      windowMs: MINUTE_MS,
    })

    if (!minuteBucket.success) {
      return buildRateLimitResponse(minuteBucket.reset)
    }

    const dailyBucket = rateLimit({
      key: `claim-code:new:day:${user.id}`,
      limit: 5,
      windowMs: DAY_MS,
    })

    if (!dailyBucket.success) {
      return buildRateLimitResponse(dailyBucket.reset)
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch (error) {
      body = {}
    }

    const allowedUses = sanitizeAllowedUses(body?.allowedUses)

    const { code, expiresAt } = await issueClaimCode(
      supabase,
      user.id,
      allowedUses,
      "claim_code_generated",
    )

    return NextResponse.json(
      {
        code,
        expiresAt,
        allowedUses,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Failed to create claim code", error)
    return NextResponse.json({ error: "Failed to create claim code" }, { status: 500 })
  }
}
