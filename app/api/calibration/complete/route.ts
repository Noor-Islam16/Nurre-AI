// POST /api/calibration/complete
// Runs the full scoring engine and saves the user's sound profile.
// Body: { session_id }

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";
import { runCalibration } from "@/lib/scoringEngine";
import type {
  PairBehaviourData,
  CalibrationPairResponseRow,
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

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from("calibration_sessions")
      .select("id, status")
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
    if (!pairRows || pairRows.length !== 5) {
      return NextResponse.json(
        { error: `Incomplete: ${pairRows?.length ?? 0}/5 pairs submitted` },
        { status: 422 },
      );
    }

    // Map to scoring engine input
    const pairs: PairBehaviourData[] = (
      pairRows as CalibrationPairResponseRow[]
    ).map((row) => ({
      pair_index: row.pair_index as 1 | 2 | 3 | 4 | 5,
      track_a_id: row.track_a_id,
      track_b_id: row.track_b_id,
      final_choice: row.final_choice,
      decision_time_ms: row.decision_time_ms,
      replay_count_total: row.replay_count_total,
      switch_count: row.switch_count,
    }));

    // Run scoring engine
    const outputs = runCalibration(pairs);
    const vectorArray = [
      outputs.regulation_vector.x1,
      outputs.regulation_vector.x2,
      outputs.regulation_vector.x3,
      outputs.regulation_vector.x4,
      outputs.regulation_vector.x5,
    ];

    // Update session to completed
    await supabase
      .from("calibration_sessions")
      .update({
        status: "completed",
        fss: outputs.fss,
        gl: outputs.gl,
        cfi: outputs.cfi,
        assigned_loop: outputs.assigned_loop,
        regulation_vector: vectorArray,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    // Upsert user sound profile (used by Focus Mode)
    await supabase.from("user_sound_profiles").upsert(
      {
        user_id: user.id,
        session_id,
        fss: outputs.fss,
        gl: outputs.gl,
        cfi: outputs.cfi,
        assigned_loop: outputs.assigned_loop,
        regulation_vector: vectorArray,
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
