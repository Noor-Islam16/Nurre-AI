import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("users")
      .select("has_booked_coaching, last_claim_code_at")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Failed to fetch profile info", error)
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
    }

    return NextResponse.json({
      hasBookedCoaching: data?.has_booked_coaching ?? false,
      lastClaimCodeAt: data?.last_claim_code_at,
    })
  } catch (error) {
    console.error("Profile endpoint error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
