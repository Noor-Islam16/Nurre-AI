// GET  /api/calibration/profile  – fetch active sound profile
// DELETE /api/calibration/profile – reset for re-calibration
//
// GET returns ONLY what the UI needs. The calibration path, model version and
// key version stay in the database and are never sent to the browser.

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
      .from("user_sound_profiles")
      .select("session_id, brain_mode, flag, assigned_loop, calibrated_at")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ has_profile: false });
    }
    if (error || !profile) {
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        has_profile: true,
        profile: {
          session_id: profile.session_id ?? null,
          brain_mode: profile.brain_mode,
          flag: profile.flag ?? null,
          assigned_loop: profile.assigned_loop,
          calibrated_at: profile.calibrated_at,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message === "Unauthorized" ? message : "Failed to fetch profile" },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function DELETE() {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    await supabase.from("user_sound_profiles").delete().eq("user_id", user.id);

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message === "Unauthorized" ? message : "Failed to delete profile" },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}