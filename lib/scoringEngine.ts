// ============================================================
// Nuree Calibrator – Scoring Engine
// Implements the full deterministic scoring model from spec
// ============================================================

import type {
  PairBehaviourData,
  PairScoreResult,
  RegulationVector,
  CalibrationOutputs,
  LoopState,
} from "../types/calibration";

// ─── Constants ──────────────────────────────────────────────

const MODEL_VERSION = "nuree_cal_v1";
const KEY_VERSION = "key_v1";

// Pair direction mapping (spec §5)
// A = +1 means choosing A gives positive axis value
const PAIR_DIRECTION_MAP: Record<
  number,
  { A: 1 | -1; B: 1 | -1; label: string }
> = {
  1: { A: 1, B: -1, label: "Rhythm" },
  2: { A: -1, B: 1, label: "Density" },
  3: { A: -1, B: 1, label: "Brightness" },
  4: { A: -1, B: 1, label: "Width" },
  5: { A: 1, B: -1, label: "Grounding" },
};

// ─── Helpers ────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

// ─── Step 1: Score a single pair ────────────────────────────
// Spec §4 – Scoring Model

export function scorePair(pair: PairBehaviourData): PairScoreResult {
  // Normalise behaviour signals
  const T = clamp((pair.decision_time_ms - 1200) / 4800, 0, 1);
  const R = clamp(pair.replay_count_total / 6, 0, 1);
  const S = clamp(pair.switch_count / 3, 0, 1);

  // Behavioural friction
  const F = 0.45 * T + 0.35 * R + 0.2 * S;

  // Decision strength
  const strength = 0.15 + 0.85 * (1 - F);

  // Direction × strength = axis value (spec §5)
  const direction = PAIR_DIRECTION_MAP[pair.pair_index][pair.final_choice];
  const axis_value = direction * strength;

  return {
    pair_index: pair.pair_index,
    friction: round4(F),
    strength: round4(strength),
    axis_value: round4(axis_value),
  };
}

// ─── Step 2: Build regulation vector ────────────────────────
// Spec §5 – Regulation Vector Construction

export function buildRegulationVector(
  pairScores: PairScoreResult[],
): RegulationVector {
  // Sort by pair_index to guarantee ordering
  const sorted = [...pairScores].sort((a, b) => a.pair_index - b.pair_index);

  if (sorted.length !== 5) {
    throw new Error(`Expected 5 pair scores, received ${sorted.length}`);
  }

  return {
    x1: sorted[0].axis_value,
    x2: sorted[1].axis_value,
    x3: sorted[2].axis_value,
    x4: sorted[3].axis_value,
    x5: sorted[4].axis_value,
  };
}

// ─── Step 3: Functional Sound State (FSS) ───────────────────
// Developer pack §4

export function computeFSS(
  vector: RegulationVector,
  pairScores: PairScoreResult[],
): string {
  const sorted = [...pairScores].sort((a, b) => a.pair_index - b.pair_index);

  // Direction bits: 1 if axis > 0, else 0
  const axes = [vector.x1, vector.x2, vector.x3, vector.x4, vector.x5];
  const directionBits = axes.map((x) => (x > 0 ? "1" : "0")).join("");

  // Confidence bins from strength
  const strengthToBin = (s: number): number => {
    if (s <= 0.35) return 0;
    if (s <= 0.6) return 1;
    if (s <= 0.8) return 2;
    return 3;
  };

  const confidenceBins = sorted
    .map((ps) => strengthToBin(ps.strength))
    .join("");

  return `${directionBits}-${confidenceBins}`;
}

// ─── Step 4: Gravity Level (GL) ─────────────────────────────
// Developer pack §5

export function computeGL(vector: RegulationVector): number {
  const G =
    0.3 * vector.x1 +
    0.25 * vector.x5 +
    0.2 * vector.x4 +
    0.15 * vector.x2 +
    0.1 * vector.x3;

  if (G <= -0.35) return 1;
  if (G <= -0.1) return 2;
  if (G <= 0.1) return 3;
  if (G <= 0.35) return 4;
  return 5;
}

// ─── Step 5: Calibration Fit Index (CFI) ────────────────────
// Developer pack §6

export function computeCFI(
  pairScores: PairScoreResult[],
  pairs: PairBehaviourData[],
): number {
  const F_avg =
    pairScores.reduce((sum, ps) => sum + ps.friction, 0) / pairScores.length;

  const switch_total = pairs.reduce((sum, p) => sum + p.switch_count, 0);

  const cfi = 100 * (1 - (0.75 * F_avg + 0.25 * clamp(switch_total / 6, 0, 1)));

  return Math.round(cfi * 100) / 100;
}

// ─── Step 6: Loop Assignment ─────────────────────────────────
// Spec §7 / Developer pack §7

export function assignLoop(gl: number, vector: RegulationVector): LoopState {
  const { x1, x3, x4, x5 } = vector;

  // Priority order matters — check conditions top-to-bottom
  if (gl >= 5 && x1 > 0.25 && x4 > 0.15 && x5 > 0.25) {
    return "Deep Focus";
  }

  if (gl >= 4 && (x4 > 0.2 || x5 > 0.2)) {
    return "Ground";
  }

  if (x3 < -0.35 && x1 < 0 && gl <= 2) {
    return "Reset";
  }

  if (gl <= 2 && x1 > 0.1) {
    return "Start";
  }

  return "Flow";
}

// ─── Master: Run full calibration ───────────────────────────

export function runCalibration(pairs: PairBehaviourData[]): CalibrationOutputs {
  if (pairs.length !== 5) {
    throw new Error(
      `Calibration requires exactly 5 pairs, received ${pairs.length}`,
    );
  }

  // Validate all pair indices are present
  const indices = new Set(pairs.map((p) => p.pair_index));
  for (let i = 1; i <= 5; i++) {
    if (!indices.has(i as 1 | 2 | 3 | 4 | 5)) {
      throw new Error(`Missing pair_index ${i}`);
    }
  }

  // Score each pair
  const pairScores = pairs.map(scorePair);

  // Build regulation vector
  const vector = buildRegulationVector(pairScores);

  // Compute outputs
  const fss = computeFSS(vector, pairScores);
  const gl = computeGL(vector);
  const cfi = computeCFI(pairScores, pairs);
  const assigned_loop = assignLoop(gl, vector);

  return {
    fss,
    gl,
    cfi,
    assigned_loop,
    regulation_vector: vector,
    model_version: MODEL_VERSION,
    key_version: KEY_VERSION,
  };
}

// ─── Utility: Pair track mapping ────────────────────────────
// Fixed A/B track IDs per calibration step

export const CALIBRATION_PAIR_TRACKS: Record<
  number,
  { track_a_id: string; track_b_id: string }
> = {
  1: { track_a_id: "track_01", track_b_id: "track_02" },
  2: { track_a_id: "track_03", track_b_id: "track_04" },
  3: { track_a_id: "track_05", track_b_id: "track_06" },
  4: { track_a_id: "track_07", track_b_id: "track_08" },
  5: { track_a_id: "track_09", track_b_id: "track_10" },
};
