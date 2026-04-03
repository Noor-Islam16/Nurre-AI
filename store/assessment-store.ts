// store/assessment-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Assessment,
  AssessmentResponse,
  AssessmentFormState,
  AssessmentType,
  AssessmentStats,
} from "@/lib/types/assessment";
import { AssessmentService } from "@/lib/services/assessment-service";
import { useUserStore } from "./user-store";
import { getPendingOfflineResults, toAssessmentResponse } from "@/lib/utils/offline-results";

interface AssessmentStore {
  assessments: Assessment[];
  loadingAssessments: boolean;
  currentAssessment: AssessmentFormState | null;
  assessmentHistory: AssessmentResponse[];
  assessmentStats: Map<AssessmentType, AssessmentStats>;

  fetchAssessments: () => Promise<void>;
  startAssessment: (assessment: Assessment, resume?: boolean) => void;
  answerQuestion: (questionId: number, value: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  saveProgress: () => Promise<void>;
  completeAssessment: () => Promise<AssessmentResponse | null>;
  clearCurrentAssessment: () => Promise<void>;
  fetchUserHistory: (userId: string) => Promise<void>;
  fetchAssessmentStats: (userId: string, type: AssessmentType) => Promise<void>;
  syncOfflineResults: () => Promise<void>;
}

const assessmentService = new AssessmentService();

// Small helper — waits ms milliseconds (used for retry back-off)
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export const useAssessmentStore = create<AssessmentStore>()(
  persist(
    (set, get) => ({
      assessments: [],
      loadingAssessments: false,
      currentAssessment: null,
      assessmentHistory: [],
      assessmentStats: new Map(),

      fetchAssessments: async () => {
        set({ loadingAssessments: true });
        try {
          const assessments = await assessmentService.getAssessments();
          set({ assessments, loadingAssessments: false });
        } catch (error) {
          console.error("Error fetching assessments:", error);
          set({ loadingAssessments: false });
        }
      },

      // ── startAssessment ────────────────────────────────────────────────────
      // resume=true  → load saved localStorage progress (user clicked Resume)
      // resume=false → always start completely fresh (user clicked Start)
      //
      // Previously the function always tried to load localStorage, so a
      // returning user who had stale progress from a prior completed attempt
      // would have their old responses loaded and appear to be mid-assessment.
      startAssessment: (assessment: Assessment, resume = false) => {
        const user = useUserStore.getState().user;

        let index = 0;
        let responses: Record<number, number> = {};
        let startTime = Date.now();

        if (resume && user) {
          // Only load saved progress when the user explicitly wants to resume
          try {
            const progressKey = `assessment-progress:${user.id}:${assessment.type}`;
            const savedProgress = localStorage.getItem(progressKey);
            if (savedProgress) {
              const progress = JSON.parse(savedProgress);
              index = progress.index || 0;
              responses = progress.responses || {};
              startTime = progress.startTime || Date.now();
            }
          } catch (error) {
            console.error("Error loading progress from localStorage:", error);
          }
        } else if (user) {
          // Starting fresh — wipe any stale localStorage progress for this type
          // so it can never bleed into this new attempt
          try {
            const progressKey = `assessment-progress:${user.id}:${assessment.type}`;
            localStorage.removeItem(progressKey);
          } catch (error) {
            console.error("Error clearing stale localStorage progress:", error);
          }
        }

        set({
          currentAssessment: {
            assessment,
            currentQuestionIndex: index,
            responses,
            startTime,
            isComplete: false,
          },
        });
      },

      answerQuestion: (questionId: number, value: number) => {
        const state = get().currentAssessment;
        if (!state) return;

        set({
          currentAssessment: {
            ...state,
            responses: {
              ...state.responses,
              [questionId]: value,
            },
          },
        });
      },

      nextQuestion: () => {
        const state = get().currentAssessment;
        if (!state) return;

        const nextIndex = state.currentQuestionIndex + 1;
        const isComplete = nextIndex >= state.assessment.questions.length;

        set({
          currentAssessment: {
            ...state,
            currentQuestionIndex: isComplete
              ? state.currentQuestionIndex
              : nextIndex,
            isComplete,
          },
        });
      },

      previousQuestion: () => {
        const state = get().currentAssessment;
        if (!state || state.currentQuestionIndex === 0) return;

        set({
          currentAssessment: {
            ...state,
            currentQuestionIndex: state.currentQuestionIndex - 1,
            isComplete: false,
          },
        });
      },

      saveProgress: async () => {
        const state = get().currentAssessment;
        if (!state) return;

        const user = useUserStore.getState().user;
        if (!user) return;

        try {
          await assessmentService.saveProgress(
            user.id,
            state.assessment.id,
            state.currentQuestionIndex,
            state.responses,
          );

          const progressKey = `assessment-progress:${user.id}:${state.assessment.type}`;
          localStorage.setItem(
            progressKey,
            JSON.stringify({
              index: state.currentQuestionIndex,
              responses: state.responses,
              startTime: state.startTime,
              ts: Date.now(),
            }),
          );
        } catch (error) {
          console.error("[Assessment] Error saving progress:", error);
        }
      },

      completeAssessment: async () => {
        // Re-read state directly from the store every time to avoid stale
        // closures. The isComplete flag may not have propagated to the React
        // component's closure yet on slower/older devices, but Zustand's
        // internal state is always up-to-date when calling get() here.
        const state = get().currentAssessment;
        if (!state) return null;

        // Guard: must have at least one response. We intentionally do NOT
        // strictly require isComplete=true here because the caller
        // (handleNext in the page) already called nextQuestion() which sets
        // isComplete — on slow devices that write may not have been observed
        // yet by a stale closure, so we trust the caller's intent and verify
        // that real answers exist instead.
        if (Object.keys(state.responses).length === 0) return null;

        const user = useUserStore.getState().user;
        if (!user) return null;

        // ── Retry up to 3 times ──────────────────────────────────────────
        // On Supabase Free the pooled connection can return a transient error
        // on the INSERT — a short retry makes results reliably appear.
        // We also handle network-level errors (TypeError: Failed to fetch)
        // the same way so flaky mobile / client connections are covered.
        let response: import("@/lib/types/assessment").AssessmentResponse | null = null;
        let lastErr: unknown = null;
        let attempts = 0;
        while (!response && attempts < 3) {
          attempts++;
          try {
            response = await assessmentService.completeAssessment(
              user.id,
              state.assessment,
              state.responses,
              state.startTime,
            );
          } catch (err) {
            lastErr = err;
            console.error(`[Assessment] attempt ${attempts} failed:`, err);
          }
          if (!response && attempts < 3) {
            await delay(1000 * attempts); // 1s, 2s back-off
          }
        }

        if (response) {
          set((prev) => ({
            assessmentHistory: [response!, ...prev.assessmentHistory],
          }));
          get().clearCurrentAssessment();
          return response;
        }

        // ── All retries failed — fall back to offline calculation ────────
        // The user MUST see their result. We compute it locally using the
        // exact same scoring logic and persist it to localStorage so it
        // survives a page refresh and shows in the My Results tab.
        console.warn(
          "[Assessment] All network attempts failed. Saving result offline.",
          lastErr,
        );
        const offlineResponse = assessmentService.completeAssessmentOffline(
          user.id,
          state.assessment,
          state.responses,
          state.startTime,
        );
        set((prev) => ({
          assessmentHistory: [offlineResponse, ...prev.assessmentHistory],
        }));
        get().clearCurrentAssessment();
        return offlineResponse;
      },

      clearCurrentAssessment: async () => {
        const state = get().currentAssessment;

        if (state) {
          try {
            const user = useUserStore.getState().user;
            if (user) {
              const progressKey = `assessment-progress:${user.id}:${state.assessment.type}`;
              localStorage.removeItem(progressKey);
            }
          } catch (error) {
            console.error("Error clearing progress from localStorage:", error);
          }
        }

        set({ currentAssessment: null });
      },

      fetchUserHistory: async (userId: string) => {
        try {
          const history =
            await assessmentService.getUserAssessmentHistory(userId);
          set({ assessmentHistory: history });
        } catch (error) {
          console.error("Error fetching assessment history:", error);
        }
      },

      fetchAssessmentStats: async (userId: string, type: AssessmentType) => {
        try {
          const stats = await assessmentService.getAssessmentStats(
            userId,
            type,
          );
          if (stats) {
            set((prev) => {
              const newStats = new Map(prev.assessmentStats);
              newStats.set(type, stats);
              return { assessmentStats: newStats };
            });
          }
        } catch (error) {
          console.error("Error fetching assessment stats:", error);
        }
      },

      syncOfflineResults: async () => {
        try {
          const synced = await assessmentService.syncPendingOfflineResults();
          if (synced.length > 0) {
            // Replace offline versions in the history with the server records
            set((prev) => {
              const withoutOld = prev.assessmentHistory.filter(
                (r) => !(r as any)._offline ||
                  !synced.find((s) => s.assessment_type === (r as any).assessment_type &&
                    s.user_id === (r as any).user_id)
              );
              return { assessmentHistory: [...synced, ...withoutOld] };
            });
            console.info(`[Assessment] Synced ${synced.length} offline result(s) to backend.`);
          }
        } catch (err) {
          console.warn("[Assessment] syncOfflineResults error:", err);
        }
      },
    }),
    {
      name: "assessment-storage",
      // On rehydration from localStorage, merge any persisted offline history
      // back into the live assessmentHistory so the My Results tab is
      // populated even before the backend responds.
      merge: (persisted: any, current) => {
        const offlineHistory: AssessmentResponse[] = persisted?.offlineHistory ?? [];
        const pendingFromStorage = getPendingOfflineResults().map(toAssessmentResponse);

        // Build a de-duped set: pending localStorage + persisted offline store entries
        const offlineById = new Map<string, AssessmentResponse>();
        [...offlineHistory, ...pendingFromStorage].forEach((r) => offlineById.set(r.id, r));

        return {
          ...current,
          currentAssessment: persisted?.currentAssessment ?? current.currentAssessment,
          assessmentHistory: [...offlineById.values()],
        };
      },
      partialize: (state) => ({
        currentAssessment: state.currentAssessment,
        // Only persist offline-flagged entries (server records are fetched fresh)
        offlineHistory: state.assessmentHistory.filter((r) => (r as any)._offline),
      }),
    },
  ),
);
