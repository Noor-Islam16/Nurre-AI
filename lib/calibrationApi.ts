// ============================================================
// Nuree Calibrator – API Client (browser-side)
// ============================================================
// @/lib/calibrationApi
//
// NOTE: this file runs in the browser. It must never import
// "@/lib/scoringEngine" — the decision tree lives on the server only.

import type {
  PairBehaviourData,
  StartSessionResponse,
  SubmitPairResponse,
  CompleteCalibrationResponse,
  GetProfileResponse,
} from "@/types/calibration";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // Be defensive: a gateway error can return HTML instead of JSON
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || `API error ${res.status}`);
  }
  return data as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Calibration ────────────────────────────────────────────

export async function apiStartSession(): Promise<StartSessionResponse> {
  return apiFetch("/api/calibration/start", { method: "POST" });
}

export async function apiSubmitPair(
  session_id: string,
  pair_response: PairBehaviourData,
): Promise<SubmitPairResponse> {
  return apiFetch("/api/calibration/pair", {
    method: "POST",
    body: JSON.stringify({ session_id, pair_response }),
  });
}

export async function apiCompleteCalibration(
  session_id: string,
): Promise<CompleteCalibrationResponse> {
  return apiFetch("/api/calibration/complete", {
    method: "POST",
    body: JSON.stringify({ session_id }),
  });
}

/**
 * Completing a calibration is the last step of the flow, so a single dropped
 * request should not throw the user's whole check-in away. Retries transient
 * failures (network / 5xx) a couple of times with a short backoff.
 */
export async function apiCompleteCalibrationWithRetry(
  session_id: string,
  attempts = 3,
): Promise<CompleteCalibrationResponse> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await apiCompleteCalibration(session_id);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : "";
      // Don't retry errors a retry can't fix
      if (/Unauthorized|not found|already|not complete|Too many/i.test(message)) {
        break;
      }
      if (i < attempts - 1) await sleep(600 * (i + 1));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not finish your check-in. Please try again.");
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