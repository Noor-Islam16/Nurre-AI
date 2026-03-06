import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Assessment,
  AssessmentResponse,
  AssessmentFormState,
  AssessmentType,
  AssessmentStats
} from '@/lib/types/assessment'
import { AssessmentService } from '@/lib/services/assessment-service'
import { useUserStore } from './user-store'

interface AssessmentStore {
  // Available assessments
  assessments: Assessment[]
  loadingAssessments: boolean
  
  // Current assessment state
  currentAssessment: AssessmentFormState | null
  
  // User's assessment history
  assessmentHistory: AssessmentResponse[]
  assessmentStats: Map<AssessmentType, AssessmentStats>
  
  // Actions
  fetchAssessments: () => Promise<void>
  startAssessment: (assessment: Assessment, startingIndex?: number) => void
  answerQuestion: (questionId: number, value: number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  saveProgress: () => Promise<void>
  completeAssessment: () => Promise<AssessmentResponse | null>
  clearCurrentAssessment: () => Promise<void>
  fetchUserHistory: (userId: string) => Promise<void>
  fetchAssessmentStats: (userId: string, type: AssessmentType) => Promise<void>
}

const assessmentService = new AssessmentService()

export const useAssessmentStore = create<AssessmentStore>()(
  persist(
    (set, get) => ({
      assessments: [],
      loadingAssessments: false,
      currentAssessment: null,
      assessmentHistory: [],
      assessmentStats: new Map(),

      fetchAssessments: async () => {
        set({ loadingAssessments: true })
        try {
          const assessments = await assessmentService.getAssessments()
          set({ assessments, loadingAssessments: false })
        } catch (error) {
          console.error('Error fetching assessments:', error)
          set({ loadingAssessments: false })
        }
      },

      startAssessment: async (assessment: Assessment, startingIndex?: number) => {
        const user = useUserStore.getState().user

        let index = startingIndex ?? 0
        let responses: Record<number, number> = {}
        let startTime = Date.now()

        // If resuming from localStorage, load saved progress
        if (user && startingIndex === undefined) {
          try {
            const progressKey = `assessment-progress:${user.id}:${assessment.type}`
            const savedProgress = localStorage.getItem(progressKey)
            if (savedProgress) {
              const progress = JSON.parse(savedProgress)
              index = progress.index || 0
              responses = progress.responses || {}
              startTime = progress.startTime || Date.now()
            }
          } catch (error) {
            console.error('Error loading progress from localStorage:', error)
          }
        } else if (startingIndex !== undefined) {
          index = startingIndex
        }

        set({
          currentAssessment: {
            assessment,
            currentQuestionIndex: index,
            responses,
            startTime,
            isComplete: false
          }
        })
      },

      answerQuestion: (questionId: number, value: number) => {
        const state = get().currentAssessment
        if (!state) return

        const newResponses = {
          ...state.responses,
          [questionId]: value
        }

        set({
          currentAssessment: {
            ...state,
            responses: newResponses
          }
        })
      },

      nextQuestion: () => {
        const state = get().currentAssessment
        if (!state) return

        const nextIndex = state.currentQuestionIndex + 1
        const isComplete = nextIndex >= state.assessment.questions.length

        set({
          currentAssessment: {
            ...state,
            currentQuestionIndex: isComplete ? state.currentQuestionIndex : nextIndex,
            isComplete
          }
        })
      },

      previousQuestion: () => {
        const state = get().currentAssessment
        if (!state || state.currentQuestionIndex === 0) return

        set({
          currentAssessment: {
            ...state,
            currentQuestionIndex: state.currentQuestionIndex - 1,
            isComplete: false
          }
        })
      },

      saveProgress: async () => {
        const state = get().currentAssessment
        if (!state) return

        const user = useUserStore.getState().user
        if (!user) return

        try {
          await assessmentService.saveProgress(
            user.id,
            state.assessment.id,
            state.currentQuestionIndex,
            state.responses
          )

          const progressKey = `assessment-progress:${user.id}:${state.assessment.type}`
          const progress = {
            index: state.currentQuestionIndex,
            responses: state.responses,
            startTime: state.startTime,
            ts: Date.now()
          }
          localStorage.setItem(progressKey, JSON.stringify(progress))
        } catch (error) {
          console.error('[Assessment] Error saving progress:', error)
        }
      },

      completeAssessment: async () => {
        const state = get().currentAssessment
        if (!state || !state.isComplete) return null

        const user = useUserStore.getState().user
        if (!user) return null

        try {
          const response = await assessmentService.completeAssessment(
            user.id,
            state.assessment,
            state.responses,
            state.startTime
          )

          if (response) {
            set(prev => ({
              assessmentHistory: [response, ...prev.assessmentHistory]
            }))
            get().clearCurrentAssessment()
          }

          return response
        } catch (error) {
          console.error('[Assessment] Error completing assessment:', error)
          return null
        }
      },

      clearCurrentAssessment: async () => {
        const state = get().currentAssessment

        // Clear localStorage progress when assessment is cleared
        if (state) {
          try {
            const user = useUserStore.getState().user
            if (user) {
              const progressKey = `assessment-progress:${user.id}:${state.assessment.type}`
              localStorage.removeItem(progressKey)
            }
          } catch (error) {
            console.error('Error clearing progress from localStorage:', error)
          }
        }

        set({ currentAssessment: null })
      },

      fetchUserHistory: async (userId: string) => {
        try {
          const history = await assessmentService.getUserAssessmentHistory(userId)
          set({ assessmentHistory: history })
        } catch (error) {
          console.error('Error fetching assessment history:', error)
        }
      },

      fetchAssessmentStats: async (userId: string, type: AssessmentType) => {
        try {
          const stats = await assessmentService.getAssessmentStats(userId, type)
          if (stats) {
            set(prev => {
              const newStats = new Map(prev.assessmentStats)
              newStats.set(type, stats)
              return { assessmentStats: newStats }
            })
          }
        } catch (error) {
          console.error('Error fetching assessment stats:', error)
        }
      }
    }),
    {
      name: 'assessment-storage',
      partialize: (state) => ({
        currentAssessment: state.currentAssessment
      })
    }
  )
)