// ============================================================
// Nuree – Experimental Calibration Store (Zustand)
// Random variant — 5 fixed pairs, separate from main store
// ============================================================

import { create } from "zustand";
import type {
  PairBehaviourData,
  CalibrationOutputs,
  LoopState,
  BrainMode,
  CalibrationFlag,
} from "@/types/calibration";

export type CalibrationStep =
  | "idle"
  | "intro"
  | "pair"
  | "processing"
  | "result"
  | "focus";

interface ExperimentalStore {
  session_id: string | null;
  step: CalibrationStep;
  random_pairs: Array<{ track_a_id: string; track_b_id: string }> | null;
  pair_sequence_index: number;
  submitted_pairs: PairBehaviourData[];
  outputs: CalibrationOutputs | null;
  focus_session_id: string | null;

  startCalibration: (
    session_id: string,
    random_pairs: Array<{ track_a_id: string; track_b_id: string }>,
  ) => void;
  recordChoice: (pair: PairBehaviourData) => void;
  setProcessing: () => void;
  setResult: (outputs: CalibrationOutputs) => void;
  startFocus: (focus_session_id: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  session_id: null,
  step: "idle" as CalibrationStep,
  random_pairs: null,
  pair_sequence_index: 1,
  submitted_pairs: [] as PairBehaviourData[],
  outputs: null,
  focus_session_id: null,
};

export const useExperimentalStore = create<ExperimentalStore>((set, get) => ({
  ...INITIAL_STATE,

  startCalibration: (session_id, random_pairs) =>
    set({
      session_id,
      step: "pair",
      random_pairs,
      pair_sequence_index: 1,
      submitted_pairs: [],
    }),

  recordChoice: (pair) => {
    const state = get();
    const newSubmitted = [...state.submitted_pairs, pair];
    const done = newSubmitted.length >= 5;
    set({
      submitted_pairs: newSubmitted,
      pair_sequence_index: state.pair_sequence_index + 1,
      step: done ? "processing" : "pair",
    });
  },

  setProcessing: () => set({ step: "processing" }),
  setResult: (outputs) => set({ outputs, step: "result" }),
  startFocus: (focus_session_id) => set({ focus_session_id, step: "focus" }),
  reset: () => set({ ...INITIAL_STATE }),
}));
