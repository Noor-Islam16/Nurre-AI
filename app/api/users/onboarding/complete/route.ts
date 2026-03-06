import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("users")
      .update({ onboarding_completed: true, onboarding_version: 2 })
      .eq("id", user.id)

    if (error) {
      console.error("Failed to mark onboarding complete", error)
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to mark onboarding complete", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
