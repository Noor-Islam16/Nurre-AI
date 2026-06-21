// ============================================================
// Nuree Calibrator – Random Scoring Engine (Variant B)
// Standalone — does NOT modify the tree-based scoringEngine
// ============================================================
// @/lib/randomScoringEngine

import type {
  PairBehaviourData,
  CalibrationOutputs,
  BrainMode,
  CalibrationFlag,
  LoopState,
} from "../types/calibration";

import { TRACK_IDS } from "../types/calibration";

export const RANDOM_MODEL_VERSION = "nuree_random_v1";
export const KEY_VERSION = "key_v1";

// All 14 track IDs as flat array
export const ALL_TRACK_IDS: string[] = Object.values(TRACK_IDS);

// Energy score per track (1=lowest, 10.5=highest)
const TRACK_ENERGY: Record<string, number> = {
  [TRACK_IDS.clip_1]: 1,
  [TRACK_IDS.clip_2]: 2,
  [TRACK_IDS.clip_2_5]: 2.5,
  [TRACK_IDS.clip_3]: 3,
  [TRACK_IDS.clip_4]: 4,
  [TRACK_IDS.clip_5]: 5,
  [TRACK_IDS.clip_6]: 6,
  [TRACK_IDS.clip_7]: 7,
  [TRACK_IDS.clip_8]: 8,
  [TRACK_IDS.clip_9]: 9,
  [TRACK_IDS.clip_9_5]: 9.5,
  [TRACK_IDS.clip_9_7]: 9.7,
  [TRACK_IDS.clip_10]: 10,
  [TRACK_IDS.clip_10_5]: 10.5,
};

/**
 * Generate 5 random non-repeating pairs from the 14 clips.
 * Called server-side on session start.
 */
export function generateRandomPairs(): Array<{
  track_a_id: string;
  track_b_id: string;
}> {
  const tracks = [...ALL_TRACK_IDS];

  // Fisher-Yates shuffle
  for (let i = tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  }

  const pairs: Array<{ track_a_id: string; track_b_id: string }> = [];
  for (let i = 0; i + 1 < tracks.length && pairs.length < 5; i += 2) {
    pairs.push({ track_a_id: tracks[i], track_b_id: tracks[i + 1] });
  }
  return pairs;
}

/**
 * Score random variant — weighted average energy of chosen tracks
 * maps to brain mode via energy bands.
 */
export function runRandomCalibration(
  pairs: PairBehaviourData[],
): CalibrationOutputs {
  let totalWeight = 0;
  let weightedEnergy = 0;

  for (const pair of pairs) {
    const chosenTrack =
      pair.final_choice === "A" ? pair.track_a_id : pair.track_b_id;
    const energy = TRACK_ENERGY[chosenTrack] ?? 5;

    const T = Math.min(Math.max((pair.decision_time_ms - 1200) / 4800, 0), 1);
    const R = Math.min(pair.replay_count_total / 6, 1);
    const S = Math.min(pair.switch_count / 3, 1);
    const friction = 0.45 * T + 0.35 * R + 0.2 * S;
    const strength = 0.15 + 0.85 * (1 - friction);

    weightedEnergy += energy * strength;
    totalWeight += strength;
  }

  const avg = totalWeight > 0 ? weightedEnergy / totalWeight : 5;

  let brain_mode: BrainMode;
  let flag: CalibrationFlag = null;

  if (avg <= 2.5) {
    brain_mode = "Reset";
    if (avg > 2) flag = "Delayed Reward";
  } else if (avg <= 4) {
    brain_mode = "Start";
    if (avg > 3.5) flag = "Groove";
  } else if (avg <= 6) {
    brain_mode = "Ground";
    if (avg > 5.5) flag = "Groove";
  } else if (avg <= 8) {
    brain_mode = "Deep Focus";
    if (avg < 7) flag = "Deep Reset Mode";
  } else {
    brain_mode = "Flow";
    if (avg < 9.2) flag = "No-Pulse";
    else if (avg < 9.8) flag = "Delayed Reward";
    else if (avg > 10.2) flag = "Groove";
  }

  const path = pairs.map(
    (p) =>
      TRACK_ENERGY[p.final_choice === "A" ? p.track_a_id : p.track_b_id] ?? 0,
  );

  return {
    brain_mode,
    flag,
    assigned_loop: brain_mode as LoopState,
    path,
    path_length: pairs.length,
    model_version: RANDOM_MODEL_VERSION,
    key_version: KEY_VERSION,
  };
}
