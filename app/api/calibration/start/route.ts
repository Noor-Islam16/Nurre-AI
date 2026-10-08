// POST /api/calibration/start
// Creates a NEW calibration session and returns the first pair to play.
//
// Every call starts from a clean default state:
//   • any previous in-progress session is abandoned (never resumed)
//   • the first pair comes from the server — the browser never holds the tree

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { getFirstPair } from "@/lib/calibration/server-flow";

const HOUR_MS = 60 * 60 * 1000;

export async function POST() {
  try {
    const user = await getAuthUser();

    // A genuine user does a handful of check-ins a day. Capping session
    // creation also makes it impractical to walk the tree by brute force
    // to reverse-engineer the clip → brain-mode mapping.
    const bucket = rateLimit({
      key: `calibration:start:hour:${user.id}`,
      limit: 30,
      windowMs: HOUR_MS,
    });
    if (!bucket.success) {
      const retryAfter = Math.max(1, Math.ceil((bucket.reset - Date.now()) / 1000));
      const res = NextResponse.json(
        { error: "Too many check-ins. Please try again later." },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    const supabase = createAdminClient();

    // Abandon any existing in-progress sessions — a new check-in always
    // starts from the default/reset state, never from a previous attempt.
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

    return NextResponse.json(
      {
        session_id: session.id,
        started_at: session.started_at,
        first_pair: getFirstPair(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message === "Unauthorized" ? message : "Failed to start" },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}