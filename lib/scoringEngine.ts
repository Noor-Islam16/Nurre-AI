// ============================================================
// Nuree Calibrator – Scoring Engine  (tree-based)
// Deterministic path → brain mode mapping per doc spec
// ============================================================
// @/lib/scoringEngine

import type {
  PairBehaviourData,
  CalibrationOutputs,
  CalibrationResult,
  TreeNode,
  BrainMode,
  CalibrationFlag,
  LoopState,
} from "../types/calibration";

import { TRACK_IDS, isCalibrationResult } from "../types/calibration";

export const MODEL_VERSION = "nuree_tree_v1";
export const KEY_VERSION = "key_v1";

// ─── Helpers ────────────────────────────────────────────────

function leaf(
  brain_mode: BrainMode,
  flag: CalibrationFlag,
  path: number[],
): CalibrationResult {
  const loop = brainModeToLoop(brain_mode);
  return { brain_mode, flag, assigned_loop: loop, path };
}

function brainModeToLoop(mode: BrainMode): LoopState {
  // 1:1 mapping — LoopState names match BrainMode names
  return mode as LoopState;
}

// ─── Calibration Decision Tree ──────────────────────────────
//
// Paths from doc:
//
// LOW branch  (chose clip_1 = A in pair 1):
//   → clip_2 vs clip_5
//     → chose clip_2 (A):  clip_2 vs clip_2.5
//         → chose clip_2   (A): Reset
//         → chose clip_2.5 (B): Reset + Delayed Reward
//     → chose clip_5 (B):  clip_3 vs clip_5
//         → chose clip_3 (A): clip_3 vs clip_4
//             → chose clip_3 (A): Start
//             → chose clip_4 (B): Start + Groove
//         → chose clip_5 (B): clip_5 vs clip_6
//             → chose clip_5 (A): Ground
//             → chose clip_6 (B): Ground + Groove
//
// HIGH branch (chose clip_10 = B in pair 1):
//   → clip_7 vs clip_9
//     → chose clip_7 (A):  clip_7 vs clip_8
//         → chose clip_7 (A): Deep Focus + Deep Reset Bridge
//         → chose clip_8 (B): Deep Focus
//     → chose clip_9 (B):  clip_9 vs clip_10
//         → chose clip_9  (A): Flow + No-Pulse
//         → chose clip_10 (B): clip_9.7 vs clip_10.5
//             → chose clip_9.7  (A): Flow + Delayed Reward
//             → chose clip_10.5 (B): Flow + Groove

export const CALIBRATION_TREE: TreeNode = {
  label: "Energy level",
  track_a_id: TRACK_IDS.clip_1,
  track_b_id: TRACK_IDS.clip_10,

  // ── LOW branch ──────────────────────────────────────────
  on_A: {
    label: "Reset vs Ground range",
    track_a_id: TRACK_IDS.clip_2,
    track_b_id: TRACK_IDS.clip_5,

    // Reset range
    on_A: {
      label: "Reset clarity",
      track_a_id: TRACK_IDS.clip_2,
      track_b_id: TRACK_IDS.clip_2_5,
      on_A: leaf("Reset", null, [1, 2, 2]),
      on_B: leaf("Reset", "Delayed Reward", [1, 2, 2.5]),
    },

    // Ground/Start range
    on_B: {
      label: "Start vs Ground",
      track_a_id: TRACK_IDS.clip_3,
      track_b_id: TRACK_IDS.clip_5,

      // Start range
      on_A: {
        label: "Start groove check",
        track_a_id: TRACK_IDS.clip_3,
        track_b_id: TRACK_IDS.clip_4,
        on_A: leaf("Start", null, [1, 5, 3, 3]),
        on_B: leaf("Start", "Groove", [1, 5, 3, 4]),
      },

      // Ground range
      on_B: {
        label: "Ground groove check",
        track_a_id: TRACK_IDS.clip_5,
        track_b_id: TRACK_IDS.clip_6,
        on_A: leaf("Ground", null, [1, 5, 5, 5]),
        on_B: leaf("Ground", "Groove", [1, 5, 5, 6]),
      },
    },
  },

  // ── HIGH branch ─────────────────────────────────────────
  on_B: {
    label: "Deep Focus vs Flow range",
    track_a_id: TRACK_IDS.clip_7,
    track_b_id: TRACK_IDS.clip_9,

    // Deep Focus range
    on_A: {
      label: "Deep Focus clarity",
      track_a_id: TRACK_IDS.clip_7,
      track_b_id: TRACK_IDS.clip_8,
      on_A: leaf("Deep Focus", "Deep Reset Bridge", [10, 7, 7]),
      on_B: leaf("Deep Focus", null, [10, 7, 8]),
    },

    // Flow range
    on_B: {
      label: "Flow pulse check",
      track_a_id: TRACK_IDS.clip_9,
      track_b_id: TRACK_IDS.clip_10,
      on_A: leaf("Flow", "No-Pulse", [10, 9, 9]),
      // Flow confirmed — check for flag
      on_B: {
        label: "Flow flavour",
        track_a_id: TRACK_IDS.clip_9_7,
        track_b_id: TRACK_IDS.clip_10_5,
        on_A: leaf("Flow", "Delayed Reward", [10, 9, 10, 9.7]),
        on_B: leaf("Flow", "Groove", [10, 9, 10, 10.5]),
      },
    },
  },
};

// ─── Walk tree given ordered choices ────────────────────────

export function walkTree(choices: Array<"A" | "B">): {
  node: TreeNode | CalibrationResult;
  depth: number;
} {
  let node: TreeNode | CalibrationResult = CALIBRATION_TREE;
  let depth = 0;

  for (const choice of choices) {
    if (isCalibrationResult(node)) break;
    node = choice === "A" ? node.on_A : node.on_B;
    depth++;
  }

  return { node, depth };
}

/**
 * Get the next TreeNode to show given choices so far.
 * Returns null if calibration is already complete.
 */
export function getNextNode(choices: Array<"A" | "B">): TreeNode | null {
  const { node } = walkTree(choices);
  if (isCalibrationResult(node)) return null;
  return node;
}

/**
 * Resolve final result from completed choices.
 * Throws if tree not yet at a leaf.
 */
export function resolveResult(choices: Array<"A" | "B">): CalibrationResult {
  const { node } = walkTree(choices);
  if (!isCalibrationResult(node)) {
    throw new Error("Calibration not complete — more pairs needed");
  }
  return node;
}

// ─── Build CalibrationOutputs from submitted pairs ──────────

export function runCalibration(pairs: PairBehaviourData[]): CalibrationOutputs {
  // Reconstruct choices array from submitted pairs (ordered by pair_index)
  const sorted = [...pairs].sort((a, b) => a.pair_index - b.pair_index);
  const choices = sorted.map((p) => p.final_choice);

  const result = resolveResult(choices);

  return {
    brain_mode: result.brain_mode,
    flag: result.flag,
    assigned_loop: result.assigned_loop,
    path: result.path,
    path_length: pairs.length,
    model_version: MODEL_VERSION,
    key_version: KEY_VERSION,
  };
}

// ─── Re-export for convenience ───────────────────────────────
export { isCalibrationResult, TRACK_IDS };
