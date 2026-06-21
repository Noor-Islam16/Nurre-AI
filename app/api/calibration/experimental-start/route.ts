// POST /api/calibration/experimental-start
// Creates an experimental calibration session — always random variant.
// Separate from /api/calibration/start which remains untouched.

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";
import { generateRandomPairs } from "@/lib/randomScoringEngine";

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

    // Always random for experimental route
    const random_pairs = generateRandomPairs();

    const { data: session, error } = await supabase
      .from("calibration_sessions")
      .insert({
        user_id: user.id,
        status: "in_progress",
        variant: "random",
        random_pairs,
        model_version: "nuree_random_v1",
        key_version: "key_v1",
      })
      .select("id, started_at, random_pairs")
      .single();

    if (error || !session) {
      console.error("[experimental-start] insert error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      session_id: session.id,
      started_at: session.started_at,
      variant: "random",
      random_pairs: session.random_pairs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
