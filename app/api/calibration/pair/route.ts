// POST /api/calibration/pair
// Logs a single A/B pair response with behavioural signals.
// Body: { session_id, pair_response: PairBehaviourData }

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";
import type { PairBehaviourData } from "@/types/calibration";

// Max pairs for any calibration path
const MAX_PAIRS = 4;
const MIN_PAIRS = 3;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    const body = await request.json();
    const { session_id, pair_response } = body as {
      session_id: string;
      pair_response: PairBehaviourData;
    };

    if (!session_id || !pair_response) {
      return NextResponse.json(
        { error: "session_id and pair_response are required" },
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
        { error: `Session is ${session.status}` },
        { status: 409 },
      );
    }

    if (pair_response.pair_index < 1 || pair_response.pair_index > MAX_PAIRS) {
      return NextResponse.json(
        { error: `pair_index must be 1–${MAX_PAIRS}` },
        { status: 400 },
      );
    }

    // Upsert (allows re-submission within same session)
    const { error: upsertError } = await supabase
      .from("calibration_pair_responses")
      .upsert(
        {
          session_id,
          user_id: user.id,
          pair_index: pair_response.pair_index,
          track_a_id: pair_response.track_a_id,
          track_b_id: pair_response.track_b_id,
          final_choice: pair_response.final_choice,
          decision_time_ms: pair_response.decision_time_ms,
          replay_count_total: pair_response.replay_count_total,
          switch_count: pair_response.switch_count,
        },
        { onConflict: "session_id,pair_index" },
      );

    if (upsertError) {
      console.error("[pair] upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to record pair" },
        { status: 500 },
      );
    }

    const { count } = await supabase
      .from("calibration_pair_responses")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session_id);

    const pairs_submitted = count ?? 0;
    const is_complete =
      pairs_submitted >= MIN_PAIRS && pairs_submitted <= MAX_PAIRS;

    return NextResponse.json({
      pair_index: pair_response.pair_index,
      recorded: true,
      pairs_submitted,
      is_complete,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
