// ============================================================
// Nuree Calibrator – Server-side flow helpers
// ============================================================
// SERVER ONLY. Never import this file (or "@/lib/scoringEngine") from a
// client component or a client store. Doing so would ship the proprietary
// decision tree (clip → brain-mode mapping) to every visitor's browser.
//
// The browser is only ever told:
//   • which two clips to play next   → toPublicPair()
//   • the final result               → toPublicOutputs()

import { getNextNode } from "@/lib/scoringEngine";
import type {
  CalibrationOutputs,
  PublicCalibrationOutputs,
  PublicPair,
  TreeNode,
} from "@/types/calibration";

/** Longest path through the tree (pairs shown). */
export const MAX_PAIRS = 4;
/** Shortest path through the tree (pairs shown). */
export const MIN_PAIRS = 3;

/** Strip a tree node down to what the browser needs to play audio. */
export function toPublicPair(node: TreeNode): PublicPair {
  return {
    track_a_id: node.track_a_id,
    track_b_id: node.track_b_id,
  };
}

/** Strip outputs down to what the browser is allowed to display. */
export function toPublicOutputs(
  outputs: Pick<CalibrationOutputs, "brain_mode" | "flag" | "assigned_loop">,
): PublicCalibrationOutputs {
  return {
    brain_mode: outputs.brain_mode,
    flag: outputs.flag ?? null,
    assigned_loop: outputs.assigned_loop,
  };
}

/** The pair shown at the very start of every calibration. */
export function getFirstPair(): PublicPair {
  const root = getNextNode([]);
  if (!root) {
    // Cannot happen with a non-empty tree, but fail loudly rather than
    // silently starting a broken session.
    throw new Error("Calibration tree is empty");
  }
  return toPublicPair(root);
}

/**
 * Given the choices made so far, return the next pair to play,
 * or null if the calibration has reached a result.
 */
export function getNextPair(choices: Array<"A" | "B">): PublicPair | null {
  const node = getNextNode(choices);
  return node ? toPublicPair(node) : null;
}

/**
 * Given the choices made BEFORE a pair, return the pair the server expects
 * the user to be answering. Used to validate submissions so a client can never
 * report listening to (or choosing between) clips the tree would not have
 * shown it.
 */
export function getExpectedPair(
  priorChoices: Array<"A" | "B">,
): PublicPair | null {
  return getNextPair(priorChoices);
}