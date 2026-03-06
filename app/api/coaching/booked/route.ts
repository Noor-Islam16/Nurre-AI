import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type Payload = {
  professionalsSelected?: number
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

    let data: Payload = {}
    try {
      data = (await req.json()) as Payload
    } catch (error) {
      data = {}
    }

    const { error } = await supabase
      .from("users")
      .update({ has_booked_coaching: true, onboarding_completed: true })
      .eq("id", user.id)

    if (error) {
      console.error("Failed to update user booking flag", error)
      return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
    }

    await supabase.from("events").insert({
      user_id: user.id,
      type: "booking_returned",
      data: { source: "calendly", professionalsSelected: data.professionalsSelected ?? null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to mark coaching booked", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
