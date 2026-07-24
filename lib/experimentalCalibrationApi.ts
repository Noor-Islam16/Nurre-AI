// ============================================================
// Nuree – Experimental Calibration API Client
// Calls /api/calibration/experimental-* routes only
// Does NOT touch existing calibrationApi.ts
// ============================================================
// @/lib/experimentalCalibrationApi

import type {
  PairBehaviourData,
  CalibrationOutputs,
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

export async function apiExperimentalStartSession(): Promise<{
  session_id: string;
  started_at: string;
  variant: "random";
  random_pairs: Array<{ track_a_id: string; track_b_id: string }>;
}> {
  return apiFetch("/api/calibration/experimental-start", { method: "POST" });
}

export async function apiExperimentalComplete(
  session_id: string,
): Promise<{ session_id: string; outputs: CalibrationOutputs }> {
  return apiFetch("/api/calibration/experimental-complete", {
    method: "POST",
    body: JSON.stringify({ session_id }),
  });
}

// Re-use existing pair submit + profile + focus APIs — they are variant-agnostic
export {
  apiSubmitPair,
  apiGetProfile,
  apiDeleteProfile,
  apiStartFocusSession,
  apiEndFocusSession,
  getTrackUrl,
  getLoopUrl,
} from "@/lib/calibrationApi";
