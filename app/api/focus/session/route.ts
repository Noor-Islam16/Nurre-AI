// POST  /api/focus/session – start a Focus Mode session
// PATCH /api/focus/session – end a Focus Mode session

import { NextResponse } from "next/server";
import { getAuthUser, createAdminClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from("user_sound_profiles")
      .select("id, assigned_loop")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "No calibration profile found. Please calibrate first." },
        { status: 404 },
      );
    }

    // Close any open focus sessions
    await supabase
      .from("focus_session")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("ended_at", null);

    const { data: focusSession, error } = await supabase
      .from("focus_session")
      .insert({
        user_id: user.id,
        profile_id: profile.id,
        assigned_loop: profile.assigned_loop,
      })
      .select("id, assigned_loop, started_at")
      .single();

    if (error || !focusSession) {
      return NextResponse.json(
        { error: "Failed to start focus session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      focus_session_id: focusSession.id,
      assigned_loop: focusSession.assigned_loop,
      started_at: focusSession.started_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    const supabase = createAdminClient();
    const { focus_session_id } = await request.json();

    if (!focus_session_id) {
      return NextResponse.json(
        { error: "focus_session_id is required" },
        { status: 400 },
      );
    }

    const { data: updated, error } = await supabase
      .from("focus_session")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", focus_session_id)
      .eq("user_id", user.id)
      .is("ended_at", null)
      .select("id, duration_ms, assigned_loop")
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: "Session not found or already ended" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      focus_session_id: updated.id,
      duration_ms: updated.duration_ms,
      assigned_loop: updated.assigned_loop,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
