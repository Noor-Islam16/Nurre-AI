// POST /api/calibration/experimental-complete
// Scores using random engine and saves profile.
// Separate from /api/calibration/complete which remains untouched.
// Body: { session_id }

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";
import { runRandomCalibration } from "@/lib/randomScoringEngine";
import type {
  CalibrationPairResponseRow,
  PairBehaviourData,
} from "@/types/calibration";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    const { session_id } = await request.json();
    if (!session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 },
      );
    }

    // Verify session — must be random variant
    const { data: session, error: sessionError } = await supabase
      .from("calibration_sessions")
      .select("id, status, variant")
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.status !== "in_progress") {
      return NextResponse.json(
        { error: `Session already ${session.status}` },
        { status: 409 },
      );
    }
    if (session.variant !== "random") {
      return NextResponse.json(
        { error: "Not an experimental session" },
        { status: 400 },
      );
    }

    // Fetch all 5 pair responses
    const { data: pairRows, error: pairsError } = await supabase
      .from("calibration_pair_responses")
      .select("*")
      .eq("session_id", session_id)
      .order("pair_index", { ascending: true });

    if (pairsError) {
      return NextResponse.json(
        { error: "Failed to fetch pairs" },
        { status: 500 },
      );
    }

    const pairCount = pairRows?.length ?? 0;
    if (pairCount !== 5) {
      return NextResponse.json(
        { error: `Incomplete: ${pairCount}/5 pairs submitted` },
        { status: 422 },
      );
    }

    const pairs: PairBehaviourData[] = (
      pairRows as CalibrationPairResponseRow[]
    ).map((row) => ({
      pair_index: row.pair_index,
      track_a_id: row.track_a_id,
      track_b_id: row.track_b_id,
      final_choice: row.final_choice,
      decision_time_ms: row.decision_time_ms,
      replay_count_total: row.replay_count_total,
      switch_count: row.switch_count,
    }));

    const outputs = runRandomCalibration(pairs);

    // Update session
    await supabase
      .from("calibration_sessions")
      .update({
        status: "completed",
        brain_mode: outputs.brain_mode,
        flag: outputs.flag,
        assigned_loop: outputs.assigned_loop,
        path: outputs.path,
        path_length: outputs.path_length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // Upsert sound profile
    await supabase.from("user_sound_profiles").upsert(
      {
        user_id: user.id,
        session_id,
        brain_mode: outputs.brain_mode,
        flag: outputs.flag,
        assigned_loop: outputs.assigned_loop,
        path: outputs.path,
        model_version: outputs.model_version,
        key_version: outputs.key_version,
        calibrated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return NextResponse.json({ session_id, outputs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
