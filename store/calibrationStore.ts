// ============================================================
// Nuree Calibrator – Client State Store (Zustand)
// Tree-based model — 3 or 4 pairs, stops when leaf reached
// ============================================================

import { create } from "zustand";
import type {
  PairBehaviourData,
  CalibrationOutputs,
  LoopState,
  BrainMode,
  CalibrationFlag,
} from "@/types/calibration";
import {
  CALIBRATION_TREE,
  getNextNode,
  isCalibrationResult,
} from "@/lib/scoringEngine";
import type { TreeNode } from "@/types/calibration";

export type CalibrationStep =
  | "idle"
  | "intro"
  | "pair"
  | "processing"
  | "result"
  | "focus";

interface CalibrationStore {
  // Session
  session_id: string | null;
  step: CalibrationStep;

  // Tree traversal state
  choices: Array<"A" | "B">; // choices so far
  current_node: TreeNode | null; // node currently being shown
  pair_sequence_index: number; // 1-based display index (1, 2, 3, 4)

  // Submitted pairs (for DB)
  submitted_pairs: PairBehaviourData[];

  // Final outputs
  outputs: CalibrationOutputs | null;

  // Focus mode
  focus_session_id: string | null;

  // Actions
  startCalibration: (session_id: string) => void;
  recordChoice: (choice: "A" | "B", pair: PairBehaviourData) => void;
  setProcessing: () => void;
  setResult: (outputs: CalibrationOutputs) => void;
  startFocus: (focus_session_id: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  session_id: null,
  step: "idle" as CalibrationStep,
  choices: [] as Array<"A" | "B">,
  current_node: null as TreeNode | null,
  pair_sequence_index: 1,
  submitted_pairs: [] as PairBehaviourData[],
  outputs: null,
  focus_session_id: null,
};

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
  ...INITIAL_STATE,

  startCalibration: (session_id) =>
    set({
      session_id,
      step: "pair",
      choices: [],
      current_node: CALIBRATION_TREE,
      pair_sequence_index: 1,
      submitted_pairs: [],
    }),

  recordChoice: (choice, pair) => {
    const state = get();
    const newChoices = [...state.choices, choice];
    const newSubmitted = [...state.submitted_pairs, pair];
    const nextNode = getNextNode(newChoices);

    if (nextNode === null) {
      // Tree is at a leaf — move to processing
      set({
        choices: newChoices,
        submitted_pairs: newSubmitted,
        pair_sequence_index: state.pair_sequence_index + 1,
        step: "processing",
      });
    } else {
      set({
        choices: newChoices,
        submitted_pairs: newSubmitted,
        current_node: nextNode,
        pair_sequence_index: state.pair_sequence_index + 1,
      });
    }
  },

  setProcessing: () => set({ step: "processing" }),

  setResult: (outputs) => set({ outputs, step: "result" }),

  startFocus: (focus_session_id) => set({ focus_session_id, step: "focus" }),

  reset: () => set({ ...INITIAL_STATE }),
}));

// ─── Loop metadata ───────────────────────────────────────────

export const LOOP_META: Record<
  LoopState,
  { label: string; description: string; color: string }
> = {
  "Deep Focus": {
    label: "Deep Focus",
    description:
      "You are in a great state for deep work. Let's tackle your most important task.",
    color: "#9B7EB8",
  },
  Ground: {
    label: "Ground",
    description:
      "Having trouble focusing? Let's do a quick sound reset to get back on track.",
    color: "#8A9EC2",
  },
  Reset: {
    label: "Reset",
    description:
      "You seem overwhelmed. Let's take a deep breath together or talk it out.",
    color: "#C2A87E",
  },
  Start: {
    label: "Start",
    description:
      "Feeling restless? It might be a good time for a quick movement break.",
    color: "#8FA87E",
  },
  Flow: {
    label: "Flow",
    description: "Energy feeling low? Let's start with something very simple.",
    color: "#7EB8A4",
  },
};

export const FLAG_META: Record<
  Exclude<CalibrationFlag, null>,
  { label: string; suggestion: string }
> = {
  "Delayed Reward": {
    label: "Delayed Reward",
    suggestion:
      "You can tolerate complexity and delayed payoff. Take on something layered — a strategy problem, creative arc, or multi-step task.",
  },
  Groove: {
    label: "Groove",
    suggestion:
      "Your body wants to move. Try walking, stretching, or a short physical reset before settling into focused work.",
  },
  "No-Pulse": {
    label: "No-Pulse",
    suggestion:
      "You're in a cerebral, open state. Lean into writing, planning, conceptual thinking, or design work.",
  },
  "Deep Reset Bridge": {
    label: "Deep Reset Bridge",
    suggestion:
      "Start with a short reset to discharge, then transition into Deep Focus when you feel ready.",
  },
};
