// GET  /api/calibration/profile  – fetch active sound profile
// DELETE /api/calibration/profile – reset for re-calibration

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
      .from("user_sound_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ has_profile: false });
    }
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 },
      );
    }

    const v: number[] = profile.regulation_vector ?? [];

    return NextResponse.json({
      has_profile: true,
      profile: {
        session_id: profile.session_id,
        fss: profile.fss,
        gl: profile.gl,
        cfi: profile.cfi,
        assigned_loop: profile.assigned_loop,
        regulation_vector: { x1: v[0], x2: v[1], x3: v[2], x4: v[3], x5: v[4] },
        calibrated_at: profile.calibrated_at,
        model_version: profile.model_version,
        key_version: profile.key_version,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
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
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
