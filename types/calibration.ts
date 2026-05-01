// ============================================================
// Nuree Calibrator – Core Types
// ============================================================

export type LoopState = "Focused" | "Distracted" | "Overwhelmed" | "Restless" | "Low Energy";

export type CalibrationStatus = "in_progress" | "completed" | "abandoned";

// ─── Behaviour Logging ──────────────────────────────────────

export interface PairBehaviourData {
  pair_index: 1 | 2 | 3 | 4 | 5;
  track_a_id: string;
  track_b_id: string;
  final_choice: "A" | "B";
  decision_time_ms: number;
  replay_count_total: number;
  switch_count: number;
}

// ─── Scoring Intermediates ──────────────────────────────────

export interface PairScoreResult {
  pair_index: number;
  friction: number; // F  (0–1)
  strength: number; // S  (0.15–1.0)
  axis_value: number; // x_i (−1 to +1)
}

export interface RegulationVector {
  x1: number; // Rhythm
  x2: number; // Density
  x3: number; // Brightness
  x4: number; // Width
  x5: number; // Grounding
}

// ─── Calibration Outputs ────────────────────────────────────

export interface CalibrationOutputs {
  fss: string; // e.g. "10110-32013"
  gl: number; // 1–5
  cfi: number; // 0–100
  assigned_loop: LoopState;
  regulation_vector: RegulationVector;
  model_version: string;
  key_version: string;
}

// ─── API Payloads ───────────────────────────────────────────

export interface StartSessionPayload {
  user_id: string;
}

export interface StartSessionResponse {
  session_id: string;
  started_at: string;
}

export interface SubmitPairPayload {
  session_id: string;
  pair_response: PairBehaviourData;
}

export interface SubmitPairResponse {
  pair_index: number;
  recorded: boolean;
  pairs_remaining: number;
}

export interface CompleteCalibrationPayload {
  session_id: string;
  pairs: PairBehaviourData[]; // all 5 pairs (can also accept progressively)
}

export interface CompleteCalibrationResponse {
  session_id: string;
  outputs: CalibrationOutputs;
}

export interface GetProfileResponse {
  has_profile: boolean;
  profile?: {
    session_id: string;
    fss: string;
    gl: number;
    cfi: number;
    assigned_loop: LoopState;
    regulation_vector: RegulationVector;
    calibrated_at: string;
    model_version: string;
    key_version: string;
  };
}

// ─── Supabase DB Row Types ───────────────────────────────────

export interface CalibrationSessionRow {
  id: string;
  user_id: string;
  fss: string | null;
  gl: number | null;
  cfi: number | null;
  assigned_loop: LoopState | null;
  regulation_vector: number[] | null;
  status: CalibrationStatus;
  model_version: string;
  key_version: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalibrationPairResponseRow {
  id: string;
  session_id: string;
  user_id: string;
  pair_index: number;
  track_a_id: string;
  track_b_id: string;
  final_choice: "A" | "B";
  decision_time_ms: number;
  replay_count_total: number;
  switch_count: number;
  friction: number | null;
  strength: number | null;
  axis_value: number | null;
  responded_at: string;
  created_at: string;
}

export interface UserSoundProfileRow {
  id: string;
  user_id: string;
  session_id: string | null;
  fss: string;
  gl: number;
  cfi: number;
  assigned_loop: LoopState;
  regulation_vector: number[] | null;
  model_version: string;
  key_version: string;
  calibrated_at: string;
  created_at: string;
  updated_at: string;
}
