// POST /api/calibration/start
// Creates a new calibration session. Abandons any prior in-progress session.

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    // Abandon any existing in-progress sessions
    await supabase
      .from("calibration_sessions")
      .update({ status: "abandoned" })
      .eq("user_id", user.id)
      .eq("status", "in_progress");

    // Create new session
    const { data: session, error } = await supabase
      .from("calibration_sessions")
      .insert({
        user_id: user.id,
        status: "in_progress",
        model_version: "nuree_cal_v1",
        key_version: "key_v1",
      })
      .select("id, started_at")
      .single();

    if (error || !session) {
      console.error("[start] insert error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      session_id: session.id,
      started_at: session.started_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
