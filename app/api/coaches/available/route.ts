import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/admin"

const DEFAULT_LIMIT = 100

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceClient = createServiceClient()

    const { data, error } = await serviceClient
      .from("coaches")
      .select("id, name, specialties, scheduler_link")
      .order("created_at", { ascending: true })
      .limit(DEFAULT_LIMIT)

    if (error) {
      console.error("Failed to fetch coaches", error)
      return NextResponse.json({ error: "Failed to load professionals" }, { status: 500 })
    }

    const coaches = (data ?? []).map((coach) => ({
      id: coach.id,
      name: coach.name,
      specialties: coach.specialties ?? [],
      scheduler_link: coach.scheduler_link ?? null,
    }))

    return NextResponse.json(coaches)
  } catch (error) {
    console.error("Unexpected error loading coaches", error)
    return NextResponse.json({ error: "Failed to load professionals" }, { status: 500 })
  }
}
