// ============================================================
// Nuree Calibrator – Client State Store (Zustand)
// ============================================================

import { create } from "zustand";
import type {
  PairBehaviourData,
  CalibrationOutputs,
  LoopState,
} from "@/types/calibration";

export type CalibrationStep =
  | "idle" // not started
  | "intro" // intro screen
  | "pair" // active A/B comparison (pair 1–5)
  | "processing" // scoring in progress
  | "result" // showing FSS / GL / CFI / loop
  | "focus"; // focus mode active

export interface PairState {
  pair_index: 1 | 2 | 3 | 4 | 5;
  track_a_id: string;
  track_b_id: string;
  track_a_url: string;
  track_b_url: string;
  // Behaviour signals (tracked live)
  started_at: number | null; // timestamp when pair was shown
  replay_count_total: number;
  switch_count: number;
  current_playing: "A" | "B" | null;
  final_choice: "A" | "B" | null;
}

interface CalibrationStore {
  // Session
  session_id: string | null;
  step: CalibrationStep;
  current_pair_index: number; // 1–5

  // Per-pair live state
  pair_state: PairState | null;

  // Submitted pairs (accumulated)
  submitted_pairs: PairBehaviourData[];

  // Final outputs
  outputs: CalibrationOutputs | null;

  // Focus mode
  focus_session_id: string | null;

  // Actions
  startCalibration: (session_id: string) => void;
  setPairState: (pair: PairState) => void;
  setCurrentPlaying: (track: "A" | "B") => void;
  incrementReplay: () => void;
  incrementSwitch: (to: "A" | "B") => void;
  confirmChoice: (choice: "A" | "B") => void;
  addSubmittedPair: (pair: PairBehaviourData) => void;
  setProcessing: () => void;
  setResult: (outputs: CalibrationOutputs) => void;
  startFocus: (focus_session_id: string) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  session_id: null,
  step: "idle" as CalibrationStep,
  current_pair_index: 1,
  pair_state: null,
  submitted_pairs: [],
  outputs: null,
  focus_session_id: null,
};

export const useCalibrationStore = create<CalibrationStore>((set, get) => ({
  ...INITIAL_STATE,

  startCalibration: (session_id) =>
    set({
      session_id,
      step: "pair",
      current_pair_index: 1,
      submitted_pairs: [],
    }),

  setPairState: (pair) => set({ pair_state: pair, step: "pair" }),

  setCurrentPlaying: (track) =>
    set((state) => ({
      pair_state: state.pair_state
        ? { ...state.pair_state, current_playing: track }
        : null,
    })),

  incrementReplay: () =>
    set((state) => ({
      pair_state: state.pair_state
        ? {
            ...state.pair_state,
            replay_count_total: state.pair_state.replay_count_total + 1,
          }
        : null,
    })),

  incrementSwitch: (to) =>
    set((state) => ({
      pair_state: state.pair_state
        ? {
            ...state.pair_state,
            switch_count: state.pair_state.switch_count + 1,
            current_playing: to,
          }
        : null,
    })),

  confirmChoice: (choice) =>
    set((state) => ({
      pair_state: state.pair_state
        ? { ...state.pair_state, final_choice: choice }
        : null,
    })),

  addSubmittedPair: (pair) =>
    set((state) => ({
      submitted_pairs: [...state.submitted_pairs, pair],
      current_pair_index: state.current_pair_index + 1,
    })),

  setProcessing: () => set({ step: "processing" }),

  setResult: (outputs) => set({ outputs, step: "result" }),

  startFocus: (focus_session_id) => set({ focus_session_id, step: "focus" }),

  reset: () => set(INITIAL_STATE),
}));

// ─── Pair track config ───────────────────────────────────────

export const PAIR_TRACK_CONFIG = [
  {
    pair_index: 1,
    track_a_id: "track_01",
    track_b_id: "track_02",
    axis: "Rhythm",
  },
  {
    pair_index: 2,
    track_a_id: "track_03",
    track_b_id: "track_04",
    axis: "Density",
  },
  {
    pair_index: 3,
    track_a_id: "track_05",
    track_b_id: "track_06",
    axis: "Brightness",
  },
  {
    pair_index: 4,
    track_a_id: "track_07",
    track_b_id: "track_08",
    axis: "Width",
  },
  {
    pair_index: 5,
    track_a_id: "track_09",
    track_b_id: "track_10",
    axis: "Grounding",
  },
] as const;

export const LOOP_META: Record<
  LoopState,
  { label: string; description: string; color: string }
> = {
  Start: {
    label: "Start",
    description: "A gentle on-ramp into focus — light energy, open space.",
    color: "#7EB8A4",
  },
  Ground: {
    label: "Ground",
    description: "Stable, earthy texture. Steady rhythm for deep work.",
    color: "#8FA87E",
  },
  Reset: {
    label: "Reset",
    description: "Soft, diffuse sound. Helps clear mental noise and recentre.",
    color: "#8A9EC2",
  },
  "Deep Focus": {
    label: "Deep Focus",
    description: "Dense, immersive environment. Maximum concentration support.",
    color: "#9B7EB8",
  },
  Flow: {
    label: "Flow",
    description: "Balanced and adaptive. Moves with your natural rhythm.",
    color: "#C2A87E",
  },
};
