// ============================================================
// Nuree Calibrator – API Client (browser-side)
// ============================================================
// @/lib/calibrationApi

import type {
  PairBehaviourData,
  CalibrationOutputs,
  GetProfileResponse,
} from "@/types/calibration";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data as T;
}

// ─── Calibration ────────────────────────────────────────────

export async function apiStartSession(): Promise<{
  session_id: string;
  started_at: string;
}> {
  return apiFetch("/api/calibration/start", { method: "POST" });
}

export async function apiSubmitPair(
  session_id: string,
  pair_response: PairBehaviourData,
): Promise<{
  pair_index: number;
  recorded: boolean;
  pairs_submitted: number;
  is_complete: boolean;
}> {
  return apiFetch("/api/calibration/pair", {
    method: "POST",
    body: JSON.stringify({ session_id, pair_response }),
  });
}

export async function apiCompleteCalibration(
  session_id: string,
): Promise<{ session_id: string; outputs: CalibrationOutputs }> {
  return apiFetch("/api/calibration/complete", {
    method: "POST",
    body: JSON.stringify({ session_id }),
  });
}

export async function apiGetProfile(): Promise<GetProfileResponse> {
  return apiFetch("/api/calibration/profile");
}

export async function apiDeleteProfile(): Promise<{ deleted: boolean }> {
  return apiFetch("/api/calibration/profile", { method: "DELETE" });
}

// ─── Focus Mode ──────────────────────────────────────────────

export async function apiStartFocusSession(): Promise<{
  focus_session_id: string;
  assigned_loop: string;
  started_at: string;
}> {
  return apiFetch("/api/focus/session", { method: "POST" });
}

export async function apiEndFocusSession(
  focus_session_id: string,
): Promise<{ focus_session_id: string; duration_ms: number }> {
  return apiFetch("/api/focus/session", {
    method: "PATCH",
    body: JSON.stringify({ focus_session_id }),
  });
}

// ─── Track URLs ──────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * trackId = filename without .wav extension
 * e.g. "Nuree Calibration - 1 Below Reset Mode - 1 min"
 */
export function getTrackUrl(trackId: string): string {
  const encoded = encodeURIComponent(`${trackId}.wav`);
  return `${SUPABASE_URL}/storage/v1/object/public/calibration-tracks/${encoded}`;
}

export function getLoopUrl(loopName: string): string {
  const slug = loopName.toLowerCase().replace(/\s+/g, "_");
  return `${SUPABASE_URL}/storage/v1/object/public/focus-loops/loop_${slug}.wav`;
}
