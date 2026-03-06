import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import { BookingClient } from "./BookingClient"

export default async function OnboardingBookingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single()

  const defaultName = profile?.name || user.user_metadata?.full_name || user.email || ""
  const defaultEmail = user.email || ""

  return <BookingClient defaultName={defaultName} defaultEmail={defaultEmail} />
}
