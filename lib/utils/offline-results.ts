// lib/utils/offline-results.ts
//
// Manages assessment results that were calculated locally when the network
// was unavailable (or Supabase returned a persistent error).  Results are
// stored in localStorage under STORAGE_KEY and synced to the backend the
// next time the user has connectivity.

import type { AssessmentResponse, AssessmentType } from "@/lib/types/assessment";

const STORAGE_KEY = "nuree:pending-offline-results";

// ── Extended type — adds the _offline sentinel ────────────────────────────────
export interface OfflineResult {
  id: string;               // client-generated uuid (crypto.randomUUID)
  user_id: string;
  assessment_id: string;
  assessment_type: AssessmentType;
  responses: Record<number, number>;
  scores: AssessmentResponse["scores"];
  severity_level: string;
  time_taken: number;       // seconds
  started_at: string;       // ISO
  completed_at: string;     // ISO
  is_complete: true;
  shared_with_provider: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  _offline: true;           // sentinel — distinguishes local-only responses
}

// ── Read ──────────────────────────────────────────────────────────────────────
export function getPendingOfflineResults(): OfflineResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineResult[];
  } catch {
    return [];
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────
export function saveOfflineResult(result: OfflineResult): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getPendingOfflineResults();
    // Avoid duplicates (idempotent)
    if (!existing.find((r) => r.id === result.id)) {
      existing.push(result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    }
  } catch (err) {
    console.error("[OfflineResults] Failed to save offline result:", err);
  }
}

// ── Remove after successful sync ──────────────────────────────────────────────
export function removeOfflineResult(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getPendingOfflineResults().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("[OfflineResults] Failed to remove offline result:", err);
  }
}

// ── Convert to AssessmentResponse shape ───────────────────────────────────────
// The rest of the UI (ResultsList, InsightsPanel, AssessmentResults) all
// consume AssessmentResponse.  An OfflineResult is structurally compatible
// — this cast lets us use it everywhere without branching.
export function toAssessmentResponse(
  offline: OfflineResult,
): AssessmentResponse & { _offline: true } {
  return offline as unknown as AssessmentResponse & { _offline: true };
}

// ── Generate a client-side ID ─────────────────────────────────────────────────
export function generateOfflineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `offline_${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
