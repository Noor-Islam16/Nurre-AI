// ============================================================
// Nuree Calibrator – Client State Store (Zustand)
// ============================================================
// The decision tree is NOT in the browser. The server tells us which pair to
// play next (see /api/calibration/start and /api/calibration/pair), and what
// the final result is. This store only holds what is needed to render the UI.

import { create } from "zustand";
import type {
  PublicCalibrationOutputs,
  PublicPair,
  LoopState,
  CalibrationFlag,
} from "@/types/calibration";

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

  // The pair currently being shown (clip ids only — supplied by the server)
  current_pair: PublicPair | null;
  pair_sequence_index: number; // 1-based display index (1, 2, 3, 4)

  // Final outputs (brain mode / flag / loop only)
  outputs: PublicCalibrationOutputs | null;

  // Focus mode
  focus_session_id: string | null;

  // Last user-facing error (shown on the calibrator page)
  error: string | null;

  // Actions
  startCalibration: (session_id: string, first_pair: PublicPair) => void;
  advanceToPair: (next_pair: PublicPair) => void;
  setProcessing: () => void;
  setResult: (outputs: PublicCalibrationOutputs) => void;
  startFocus: (focus_session_id: string) => void;
  failCalibration: (message: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  session_id: null,
  step: "idle" as CalibrationStep,
  current_pair: null as PublicPair | null,
  pair_sequence_index: 1,
  outputs: null as PublicCalibrationOutputs | null,
  focus_session_id: null as string | null,
  error: null as string | null,
};

export const useCalibrationStore = create<CalibrationStore>((set) => ({
  ...INITIAL_STATE,

  // Every new check-in starts from the default state — nothing from a previous
  // run (result, focus session, error) is carried over.
  startCalibration: (session_id, first_pair) =>
    set({
      ...INITIAL_STATE,
      session_id,
      step: "pair",
      current_pair: first_pair,
    }),

  advanceToPair: (next_pair) =>
    set((state) => ({
      current_pair: next_pair,
      pair_sequence_index: state.pair_sequence_index + 1,
    })),

  setProcessing: () => set({ step: "processing" }),

  setResult: (outputs) => set({ outputs, step: "result", error: null }),

  startFocus: (focus_session_id) => set({ focus_session_id, step: "focus" }),

  failCalibration: (message) =>
    set({ ...INITIAL_STATE, error: message }),

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
  "Deep Reset Mode": {
    label: "Deep Reset Mode",
    suggestion:
      "Start with a short reset to discharge, then transition into Deep Focus when you feel ready.",
  },
  "Deep Reset Bridge": {
    label: "Deep Reset Mode",
    suggestion:
      "Start with a short reset to discharge, then transition into Deep Focus when you feel ready.",
  },
};