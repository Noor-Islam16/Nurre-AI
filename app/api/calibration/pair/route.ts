// POST /api/calibration/pair
// Logs a single A/B pair response with behavioural signals and tells the
// browser which pair to play next.
// Body: { session_id, pair_response: PairBehaviourData }
//
// The SERVER owns the decision tree:
//   • track ids are derived from the tree, never trusted from the client
//   • pairs must be submitted in order, matching the path the tree would show
//   • the response contains only the next pair's clip ids (or null when done)

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import {
  MAX_PAIRS,
  getExpectedPair,
  getNextPair,
} from "@/lib/calibration/server-flow";
import { getNextNode } from "@/lib/scoringEngine";

const MINUTE_MS = 60_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    const bucket = rateLimit({
      key: `calibration:pair:minute:${user.id}`,
      limit: 60,
      windowMs: MINUTE_MS,
    });
    if (!bucket.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const session_id = body?.session_id;
    const pair = body?.pair_response;

    if (typeof session_id !== "string" || !UUID_RE.test(session_id) || !pair) {
      return NextResponse.json(
        { error: "session_id and pair_response are required" },
        { status: 400 },
      );
    }

    const pairIndex = clampInt(pair.pair_index, 1, MAX_PAIRS);
    const finalChoice = pair.final_choice;
    const decisionMs = clampInt(pair.decision_time_ms, 0, 60 * 60 * 1000);
    const replays = clampInt(pair.replay_count_total, 0, 1000);
    const switches = clampInt(pair.switch_count, 0, 1000);

    if (
      pairIndex === null ||
      (finalChoice !== "A" && finalChoice !== "B") ||
      decisionMs === null ||
      replays === null ||
      switches === null
    ) {
      return NextResponse.json(
        { error: `Invalid pair_response (pair_index must be 1–${MAX_PAIRS})` },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify session belongs to this user and is still open
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

    // Rebuild the path so far from what is stored (not from the client)
    const { data: existing, error: existingError } = await supabase
      .from("calibration_pair_responses")
      .select("pair_index, final_choice")
      .eq("session_id", session_id)
      .order("pair_index", { ascending: true });

    if (existingError) {
      console.error("[pair] fetch existing error:", existingError);
      return NextResponse.json(
        { error: "Failed to record pair" },
        { status: 500 },
      );
    }

    const prior = (existing ?? []).filter((r) => r.pair_index < pairIndex);
    const contiguous = prior.every((r, i) => r.pair_index === i + 1);
    if (!contiguous || prior.length !== pairIndex - 1) {
      return NextResponse.json(
        { error: "Pairs must be submitted in order" },
        { status: 409 },
      );
    }

    const priorChoices = prior.map((r) => r.final_choice as "A" | "B");

    // The pair the tree says the user should be answering right now
    const expected = getExpectedPair(priorChoices);
    if (!expected) {
      return NextResponse.json(
        { error: "Calibration already complete" },
        { status: 409 },
      );
    }

    // Drop this index and anything after it (safe retry / re-submission),
    // so the stored path can never diverge from the tree.
    await supabase
      .from("calibration_pair_responses")
      .delete()
      .eq("session_id", session_id)
      .gte("pair_index", pairIndex);

    const { error: insertError } = await supabase
      .from("calibration_pair_responses")
      .upsert(
        {
          session_id,
          user_id: user.id,
          pair_index: pairIndex,
          // Server-derived — client-supplied track ids are ignored
          track_a_id: expected.track_a_id,
          track_b_id: expected.track_b_id,
          final_choice: finalChoice,
          decision_time_ms: decisionMs,
          replay_count_total: replays,
          switch_count: switches,
        },
        { onConflict: "session_id,pair_index" },
      );

    if (insertError) {
      console.error("[pair] upsert error:", insertError);
      return NextResponse.json(
        { error: "Failed to record pair" },
        { status: 500 },
      );
    }

    const choices = [...priorChoices, finalChoice as "A" | "B"];
    const isComplete = getNextNode(choices) === null;

    return NextResponse.json(
      {
        pair_index: pairIndex,
        recorded: true,
        pairs_submitted: choices.length,
        is_complete: isComplete,
        next_pair: isComplete ? null : getNextPair(choices),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message === "Unauthorized" ? message : "Failed to record pair" },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}