import { create } from 'zustand'

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended'

export type VoiceMode = 'floating' | 'dashboard' | 'immersive'

export interface TranscriptItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isFinal: boolean
}

interface VoiceState {
  // Session state
  status: VoiceStatus
  sessionId: string | null
  mode: VoiceMode

  // Audio levels (0-1 range)
  userAudioLevel: number
  assistantAudioLevel: number

  // Transcript (only visible when mode is 'dashboard')
  transcript: TranscriptItem[]
  pendingUserTranscript: string
  pendingAssistantTranscript: string

  // Mute state
  isMuted: boolean

  // Session timing
  sessionStartTime: number | null
  elapsed: number

  // Error state
  micPermissionError: string | null

  // Actions
  setStatus: (status: VoiceStatus) => void
  setSessionId: (sessionId: string | null) => void
  setMode: (mode: VoiceMode) => void
  setUserAudioLevel: (level: number) => void
  setAssistantAudioLevel: (level: number) => void
  setIsMuted: (muted: boolean) => void
  setMicPermissionError: (error: string | null) => void
  setElapsed: (elapsed: number) => void

  // Transcript actions
  addTranscriptItem: (item: TranscriptItem) => void
  setPendingUserTranscript: (text: string) => void
  setPendingAssistantTranscript: (text: string) => void
  clearTranscript: () => void

  // Session actions
  startSession: (sessionId: string, mode: VoiceMode) => void
  endSession: () => void
  switchToDashboard: () => void
  switchToFloating: () => void
  switchToImmersive: () => void

  // Reset
  reset: () => void
}

const initialState = {
  status: 'idle' as VoiceStatus,
  sessionId: null,
  mode: 'floating' as VoiceMode,
  userAudioLevel: 0,
  assistantAudioLevel: 0,
  transcript: [],
  pendingUserTranscript: '',
  pendingAssistantTranscript: '',
  isMuted: false,
  sessionStartTime: null,
  elapsed: 0,
  micPermissionError: null,
}

export const useVoiceStore = create<VoiceState>((set) => ({
  ...initialState,

  // Simple setters
  setStatus: (status) => set({ status }),
  setSessionId: (sessionId) => set({ sessionId }),
  setMode: (mode) => set({ mode }),
  setUserAudioLevel: (userAudioLevel) => set({ userAudioLevel }),
  setAssistantAudioLevel: (assistantAudioLevel) => set({ assistantAudioLevel }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setMicPermissionError: (micPermissionError) => set({ micPermissionError }),
  setElapsed: (elapsed) => set({ elapsed }),

  // Transcript actions
  addTranscriptItem: (item) => set((state) => ({
    transcript: [...state.transcript, item]
  })),

  setPendingUserTranscript: (text) => set({ pendingUserTranscript: text }),

  setPendingAssistantTranscript: (text) => set({ pendingAssistantTranscript: text }),

  clearTranscript: () => set({
    transcript: [],
    pendingUserTranscript: '',
    pendingAssistantTranscript: ''
  }),

  // Session actions
  startSession: (sessionId, mode) => set({
    sessionId,
    mode,
    status: 'connecting',
    sessionStartTime: Date.now(),
    elapsed: 0,
    transcript: [],
    pendingUserTranscript: '',
    pendingAssistantTranscript: '',
    micPermissionError: null,
  }),

  endSession: () => set({
    status: 'ended',
    sessionId: null,
    userAudioLevel: 0,
    assistantAudioLevel: 0,
    pendingUserTranscript: '',
    pendingAssistantTranscript: '',
    // Keep transcript for reference, but mark as ended
  }),

  switchToDashboard: () => set((state) => {
    // When switching to dashboard, keep session active but change mode
    // Transcript becomes visible
    return {
      mode: 'dashboard'
    }
  }),

  switchToFloating: () => set((state) => {
    // When switching to floating, keep session active but change mode
    // Transcript hidden in floating UI
    return {
      mode: 'floating'
    }
  }),

  switchToImmersive: () => set((state) => {
    // When switching to immersive, keep session active but change mode
    // Full-screen distraction-free experience
    return {
      mode: 'immersive'
    }
  }),

  // Reset everything
  reset: () => set(initialState),
}))
