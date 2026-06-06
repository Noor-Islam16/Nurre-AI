// ============================================================
// Nuree Calibrator – Core Types  (tree-based model)
// ============================================================

export type BrainMode = "Reset" | "Start" | "Ground" | "Deep Focus" | "Flow";
export type CalibrationFlag =
  | "Delayed Reward"
  | "Groove"
  | "No-Pulse"
  | "Deep Reset Bridge"
  | null;
export type LoopState = "Deep Focus" | "Ground" | "Reset" | "Start" | "Flow";
export type CalibrationStatus = "in_progress" | "completed" | "abandoned";

// ─── Track IDs (match Supabase storage filenames without .wav) ─

export const TRACK_IDS = {
  clip_1: "Nuree Calibration - 1 Below Reset Mode - 1 min",
  clip_2: "Nuree Calibration - 2 Reset Mode - 1 min",
  clip_2_5: "Nuree Calibration - 2.5 Reset Delayed - 1 min",
  clip_3: "Nuree Calibration - 3 Start Mode - 1 min",
  clip_4: "Nuree Calibration - 4 Groovy Start - 1 min",
  clip_5: "Nuree Calibration - 5 Ground Mode - 1 min",
  clip_6: "Nuree Calibration - 6 Ground to Flow Mode - 1 min",
  clip_7: "Nuree Calibration - 7 Deep Reset - 1min",
  clip_8: "Nuree Calibration - 8 Deep Focus - 1 min",
  clip_9: "Nuree Calibration - 9 Flow No Pulse - 1 min",
  clip_9_5: "Nuree Calibration - 9.5 Flow Delayed - TENSION lvl 1 - 1min",
  clip_9_7: "Nuree Calibration - 9.7 Flow Delayed - TENSION lvl 2 - 1 min",
  clip_10: "Nuree Calibration - 10 Flow Mode - 1 min",
  clip_10_5: "Nuree Calibration - 10.5 Groovy Mode - 1min",
} as const;

export type TrackId = (typeof TRACK_IDS)[keyof typeof TRACK_IDS];

// ─── Behaviour Logging ──────────────────────────────────────

export interface PairBehaviourData {
  /** 1-based sequential index of this pair in the session (1–4) */
  pair_index: number;
  track_a_id: string;
  track_b_id: string;
  final_choice: "A" | "B";
  decision_time_ms: number;
  replay_count_total: number;
  switch_count: number;
}

// ─── Tree Node — defines what pair to show next ─────────────

export interface TreeNode {
  /** Human-readable label for the pair (shown in UI) */
  label: string;
  track_a_id: string;
  track_b_id: string;
  /** Result when user picks A */
  on_A: TreeNode | CalibrationResult;
  /** Result when user picks B */
  on_B: TreeNode | CalibrationResult;
}

export function isCalibrationResult(
  node: TreeNode | CalibrationResult,
): node is CalibrationResult {
  return "brain_mode" in node;
}

// ─── Calibration Result (leaf of tree) ─────────────────────

export interface CalibrationResult {
  brain_mode: BrainMode;
  flag: CalibrationFlag;
  assigned_loop: LoopState;
  /** The clip number sequence that led here e.g. [1, 5, 3] */
  path: number[];
}

// ─── Calibration Outputs (stored in DB) ─────────────────────

export interface CalibrationOutputs {
  brain_mode: BrainMode;
  flag: CalibrationFlag;
  assigned_loop: LoopState;
  path: number[]; // e.g. [1, 5, 3]
  path_length: number; // how many pairs were shown
  model_version: string;
  key_version: string;
}

// ─── API Payloads ───────────────────────────────────────────

export interface StartSessionResponse {
  session_id: string;
  started_at: string;
}

export interface SubmitPairResponse {
  pair_index: number;
  recorded: boolean;
  pairs_submitted: number;
  is_complete: boolean;
}

export interface CompleteCalibrationResponse {
  session_id: string;
  outputs: CalibrationOutputs;
}

export interface GetProfileResponse {
  has_profile: boolean;
  profile?: {
    session_id: string;
    brain_mode: BrainMode;
    flag: CalibrationFlag;
    assigned_loop: LoopState;
    path: number[];
    calibrated_at: string;
    model_version: string;
    key_version: string;
  };
}

// ─── Supabase DB Row Types ───────────────────────────────────

export interface CalibrationSessionRow {
  id: string;
  user_id: string;
  brain_mode: BrainMode | null;
  flag: CalibrationFlag | null;
  assigned_loop: LoopState | null;
  path: number[] | null;
  path_length: number | null;
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
  responded_at: string;
  created_at: string;
}

export interface UserSoundProfileRow {
  id: string;
  user_id: string;
  session_id: string | null;
  brain_mode: BrainMode;
  flag: CalibrationFlag;
  assigned_loop: LoopState;
  path: number[];
  model_version: string;
  key_version: string;
  calibrated_at: string;
  created_at: string;
  updated_at: string;
}
