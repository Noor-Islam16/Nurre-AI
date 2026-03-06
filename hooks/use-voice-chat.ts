'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { VoiceConversation } from '@elevenlabs/client'
import { createClient } from '@/lib/supabase/client'
import { queueEmbeddingJob } from '@/lib/ai/vector/enqueue-embedding-job'
import { useVoiceStore, VoiceMode } from '@/store/voice-store'
import { usePreferenceStore, voiceSpeedToRate } from '@/store/preference-store'
import { conversationManager } from '@/lib/voice/conversation-manager'
import type { VoiceStatus, TranscriptItem } from '@/store/voice-store'

export type { VoiceStatus, TranscriptItem }

type CoachingMode = 'direct' | 'balanced' | 'gentle'
type StoreMode = 'local' | 'global'

interface UseVoiceChatOptions {
  onTranscriptUpdate?: (transcript: TranscriptItem[]) => void
  autoSaveTranscript?: boolean
  mode?: CoachingMode
  storeMode?: StoreMode // 'local' = component state only, 'global' = sync to Zustand store
  voiceMode?: VoiceMode // 'floating' = no transcript UI, 'dashboard' = show transcript
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const {
    onTranscriptUpdate,
    autoSaveTranscript = false,
    mode = 'balanced',
    storeMode = 'local',
    voiceMode = 'dashboard'
  } = options

  // Global store (only used when storeMode is 'global')
  const globalStore = useVoiceStore()

  // Preference store for voice speed setting
  const voiceSpeed = usePreferenceStore(state => state.preferences.communication.voiceSpeed)

  // Local state (used when storeMode is 'local' or as working state for 'global')
  const [localStatus, setLocalStatus] = useState<VoiceStatus>('idle')
  const [localMuted, setLocalMuted] = useState(false)
  const [localElapsed, setLocalElapsed] = useState(0)
  const [localTranscript, setLocalTranscript] = useState<TranscriptItem[]>([])
  const [localPendingUser, setLocalPendingUser] = useState('')
  const [localPendingAssistant, setLocalPendingAssistant] = useState('')
  const [localSessionId, setLocalSessionId] = useState<string | null>(null)
  const [sessionLabel, setSessionLabel] = useState<string | null>(null)
  const [localMicError, setLocalMicError] = useState<string | null>(null)
  const [localUserAudioLevel, setLocalUserAudioLevel] = useState(0)
  const [localAssistantAudioLevel, setLocalAssistantAudioLevel] = useState(0)

  // Determine which state to use based on storeMode
  const isGlobal = storeMode === 'global'
  const status = isGlobal ? globalStore.status : localStatus
  const isMuted = isGlobal ? globalStore.isMuted : localMuted
  const elapsed = isGlobal ? globalStore.elapsed : localElapsed
  const transcript = isGlobal ? globalStore.transcript : localTranscript
  const pendingUserTranscript = isGlobal ? globalStore.pendingUserTranscript : localPendingUser
  const pendingAssistantTranscript = isGlobal ? globalStore.pendingAssistantTranscript : localPendingAssistant
  const sessionId = isGlobal ? globalStore.sessionId : localSessionId
  const micPermissionError = isGlobal ? globalStore.micPermissionError : localMicError
  const userAudioLevel = isGlobal ? globalStore.userAudioLevel : localUserAudioLevel
  const assistantAudioLevel = isGlobal ? globalStore.assistantAudioLevel : localAssistantAudioLevel

  // Refs for stable closures — avoid stale values in event listeners and callbacks
  const transcriptRef = useRef(transcript)
  transcriptRef.current = transcript
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  // Setters that sync to store when in global mode
  const setStatus = useCallback((newStatus: VoiceStatus) => {
    if (isGlobal) {
      globalStore.setStatus(newStatus)
    } else {
      setLocalStatus(newStatus)
    }
  }, [isGlobal, globalStore])

  const setMuted = useCallback((newMuted: boolean | ((prev: boolean) => boolean)) => {
    if (isGlobal) {
      const value = typeof newMuted === 'function' ? newMuted(globalStore.isMuted) : newMuted
      globalStore.setIsMuted(value)
    } else {
      setLocalMuted(newMuted)
    }
  }, [isGlobal, globalStore])

  const setElapsed = useCallback((newElapsed: number | ((prev: number) => number)) => {
    if (isGlobal) {
      const value = typeof newElapsed === 'function' ? newElapsed(globalStore.elapsed) : newElapsed
      globalStore.setElapsed(value)
    } else {
      setLocalElapsed(newElapsed)
    }
  }, [isGlobal, globalStore])

  const setTranscript = useCallback((newTranscript: TranscriptItem[] | ((prev: TranscriptItem[]) => TranscriptItem[])) => {
    if (isGlobal) {
      // IMPORTANT: Use getState() to get LIVE current state, not stale snapshot from render
      // globalStore.transcript would be stale - it's captured at render time
      const currentTranscript = useVoiceStore.getState().transcript
      const value = typeof newTranscript === 'function' ? newTranscript(currentTranscript) : newTranscript

      // Use setState for atomic update (avoids race conditions from clear + add loop)
      useVoiceStore.setState({ transcript: value })
    } else {
      // For local mode, use React's state updater pattern
      setLocalTranscript(newTranscript)
    }
  }, [isGlobal])

  const setPendingUserTranscript = useCallback((text: string) => {
    if (isGlobal) {
      globalStore.setPendingUserTranscript(text)
    } else {
      setLocalPendingUser(text)
    }
  }, [isGlobal, globalStore])

  const setPendingAssistantTranscript = useCallback((text: string) => {
    if (isGlobal) {
      globalStore.setPendingAssistantTranscript(text)
    } else {
      setLocalPendingAssistant(text)
    }
  }, [isGlobal, globalStore])

  const setSessionId = useCallback((id: string | null) => {
    if (isGlobal) {
      globalStore.setSessionId(id)
    } else {
      setLocalSessionId(id)
    }
  }, [isGlobal, globalStore])

  const setMicPermissionError = useCallback((error: string | null) => {
    if (isGlobal) {
      globalStore.setMicPermissionError(error)
    } else {
      setLocalMicError(error)
    }
  }, [isGlobal, globalStore])

  const setUserAudioLevel = useCallback((level: number) => {
    if (isGlobal) {
      globalStore.setUserAudioLevel(level)
    } else {
      setLocalUserAudioLevel(level)
    }
  }, [isGlobal, globalStore])

  const setAssistantAudioLevel = useCallback((level: number) => {
    if (isGlobal) {
      globalStore.setAssistantAudioLevel(level)
    } else {
      setLocalAssistantAudioLevel(level)
    }
  }, [isGlobal, globalStore])

  // ElevenLabs and audio refs
  const conversationRef = useRef<VoiceConversation | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const remoteRAFRef = useRef<number | null>(null)
  const levelRef = useRef<number>(0)
  const remoteLevelRef = useRef<number>(0)
  const lastActivityRef = useRef<number>(Date.now())
  const silenceIntervalRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const lastSavedIndexRef = useRef(0)

  // Attach level meter to track audio levels
  const attachLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const loop = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
        const rms = Math.sqrt(sum / dataArray.length)
        levelRef.current = Math.min(1, rms / 255)
        setUserAudioLevel(levelRef.current)
        if (levelRef.current > 0.02) {
          lastActivityRef.current = Date.now()
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      loop()
    } catch (e) {
      console.warn('Level meter unavailable:', e)
    }
  }, [])

  const stopLevelMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    analyserRef.current?.disconnect()
    analyserRef.current = null
    setUserAudioLevel(0)
  }, [])

  const attachRemoteLevelMeter = useCallback((stream: MediaStream) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      remoteAnalyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const loop = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
        const rms = Math.sqrt(sum / dataArray.length)
        remoteLevelRef.current = Math.min(1, rms / 255)
        setAssistantAudioLevel(remoteLevelRef.current)
        if (remoteLevelRef.current > 0.02) {
          lastActivityRef.current = Date.now()
        }
        remoteRAFRef.current = requestAnimationFrame(loop)
      }
      loop()
    } catch (e) {
      // Remote meter is best-effort only
    }
  }, [])

  const stopRemoteLevelMeter = useCallback(() => {
    if (remoteRAFRef.current) cancelAnimationFrame(remoteRAFRef.current)
    remoteRAFRef.current = null
    remoteAnalyserRef.current?.disconnect()
    remoteAnalyserRef.current = null
    setAssistantAudioLevel(0)
  }, [])

  // Timer management
  useEffect(() => {
    if (status === 'connecting' || (status !== 'idle' && status !== 'ended')) {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsed(e => e + 1)
      }, 1000) as unknown as number
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      if (status === 'idle' || status === 'ended') {
        setElapsed(0)
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [status])

  // Update status based on audio levels
  useEffect(() => {
    if (status !== 'listening' && status !== 'thinking' && status !== 'speaking') return

    const interval = setInterval(() => {
      const userActive = levelRef.current > 0.03
      const assistantActive = remoteLevelRef.current > 0.05

      if (assistantActive && !userActive) {
        setStatus('speaking')
      } else if (userActive && !assistantActive) {
        setStatus('listening')
      } else if (!userActive && !assistantActive) {
        setStatus('thinking')
      }
    }, 100)

    return () => clearInterval(interval)
  }, [status])

  // Notify parent of transcript updates
  useEffect(() => {
    onTranscriptUpdate?.(transcript)
  }, [transcript, onTranscriptUpdate])

  // Save transcript to database
  const saveTranscriptToDatabase = useCallback(async (messages: TranscriptItem[]) => {
    if (!sessionIdRef.current || messages.length === 0) return

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Save each message to conversations table
      const messageIds: string[] = []
      for (const message of messages) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            role: message.role,
            content: message.content,
            source: 'voice',
            created_at: message.timestamp.toISOString()
          })
          .select('id')
          .single()

        if (!error && data) {
          messageIds.push(data.id)
        }
      }

      // Queue embedding job for all saved messages
      if (messageIds.length > 0) {
        await queueEmbeddingJob(messageIds)
      }
    } catch (error) {
      console.error('Failed to save transcript to database:', error)
    }
  }, [])

  const stopSession = useCallback(async () => {
    // IMMEDIATELY update state — don't block on DB operations
    setStatus('ended')
    setPendingUserTranscript('')
    setPendingAssistantTranscript('')
    setSessionLabel(null)

    // End session in global store and stop conversation IMMEDIATELY
    if (isGlobal) {
      globalStore.endSession()
      // Use singleton manager for global mode
      await conversationManager.cleanup()
    } else {
      // Local mode: cleanup component-local resources
      try {
        if (conversationRef.current) {
          await conversationRef.current.endSession()
        }
      } catch {}
      conversationRef.current = null

      localStreamRef.current?.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }

    // Common cleanup
    stopLevelMeter()
    stopRemoteLevelMeter()

    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current)
      silenceIntervalRef.current = null
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause()
      remoteAudioRef.current.srcObject = null
    }

    // Auto-save remaining transcript in BACKGROUND (don't block session end)
    const currentTranscript = transcriptRef.current
    const currentSessionId = sessionIdRef.current
    if (autoSaveTranscript && currentSessionId && currentTranscript.length > lastSavedIndexRef.current) {
      const itemsToSave = currentTranscript.slice(lastSavedIndexRef.current)
      if (itemsToSave.length > 0) {
        lastSavedIndexRef.current = currentTranscript.length
        saveTranscriptToDatabase(itemsToSave).catch(err => {
          console.error('Failed to auto-save transcript:', err)
        })
      }
    }
  }, [stopLevelMeter, stopRemoteLevelMeter, autoSaveTranscript, saveTranscriptToDatabase, isGlobal, globalStore, setStatus, setPendingUserTranscript, setPendingAssistantTranscript])

  // Ref for stable stopSession reference in startSession callbacks (avoids stale closures)
  const stopSessionRef = useRef(stopSession)
  stopSessionRef.current = stopSession

  const startSession = useCallback(async () => {
    try {
      // In global mode, check if session already exists
      if (isGlobal && conversationManager.isActive()) {
        console.log('Global session already active, connecting to existing session')
        // Just update the store mode
        if (voiceMode === 'dashboard') {
          globalStore.switchToDashboard()
        }
        return
      }

      // Initialize global store if in global mode
      if (isGlobal) {
        const tempSessionId = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        globalStore.startSession(tempSessionId, voiceMode)
      } else {
        setStatus('connecting')
        setElapsed(0)
        setTranscript([])
        setPendingUserTranscript('')
        setPendingAssistantTranscript('')
        setMicPermissionError(null)
      }

      lastSavedIndexRef.current = 0

      // Get session credentials from our API
      console.log('[Voice] Fetching session credentials from /api/voice/init-session')
      const initResponse = await fetch('/api/voice/init-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      console.log('[Voice] Init response status:', initResponse.status, initResponse.statusText)

      if (!initResponse.ok) {
        const errorText = await initResponse.text()
        console.error('[Voice] Init session failed:', errorText)
        throw new Error(`Failed to initialize session: ${initResponse.status} ${errorText}`)
      }

      const responseData = await initResponse.json()
      console.log('[Voice] Session credentials received:', {
        hasSignedUrl: !!responseData.signedUrl,
        hasSystemPrompt: !!responseData.systemPrompt,
        sessionId: responseData.sessionId,
        hasError: !!responseData.error
      })

      // Check if response contains an error field (API returned 200 but with error)
      if (responseData.error) {
        throw new Error(`Session initialization failed: ${responseData.error}`)
      }

      // Validate required fields
      if (!responseData.signedUrl) {
        throw new Error('Invalid response: missing signedUrl')
      }

      const { sessionId: newSessionId, signedUrl, systemPrompt, voiceId, metadata, userId } = responseData

      setSessionId(newSessionId)
      setSessionLabel(`Voice ${new Date().toLocaleTimeString()}`)

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      // In global mode, use singleton manager
      if (isGlobal) {
        conversationManager.setLocalStream(stream)
      } else {
        localStreamRef.current = stream
      }

      attachLevelMeter(stream)

      // Start ElevenLabs conversation
      // Note: Metadata for webhook tool calling is embedded in the signed URL
      // ElevenLabs will include user_id in webhook requests based on the signed URL params
      console.log('[Voice] Starting ElevenLabs conversation with signed URL')
      console.log('[Voice] Using voice ID:', voiceId)
      // Get the voice speed rate from preferences (0.8, 1.0, or 1.15)
      const speedRate = voiceSpeedToRate[voiceSpeed] || 1.0
      console.log('[Voice] Using voice speed:', voiceSpeed, '→', speedRate)

      // Build clientTools handlers — names MUST match ElevenLabs dashboard exactly
      const clientToolHandlers: Record<string, (params: Record<string, any>) => Promise<string>> = {
          // ===== Task Management (uses Zustand task store directly) =====
          create_task: async (params: Record<string, any>) => {
            try {
              const { useTaskStore } = await import('@/store/task-store')
              const result = await useTaskStore.getState().createTaskFromTool({
                title: params.title,
                description: params.description || undefined,
                priority: params.priority || undefined,
                timeEstimate: params.timeEstimate ? parseInt(params.timeEstimate, 10) : undefined,
                dueDate: params.dueDate || undefined,
                subtasks: params.subtasks || undefined
              })
              if (!result.success) return result.error || 'Failed to create task. Please try again.'
              return `Created task "${params.title}" successfully. Task ID: ${result.taskId}. Use this ID to edit or complete it later.`
            } catch { return 'Failed to create task.' }
          },

          complete_task: async (params: Record<string, any>) => {
            try {
              const { useTaskStore } = await import('@/store/task-store')
              const result = await useTaskStore.getState().completeTaskFromTool(params.taskId)
              if (!result.success) return result.error || 'Failed to complete task.'
              return 'Task marked as complete!'
            } catch { return 'Failed to complete task.' }
          },

          edit_task: async (params: Record<string, any>) => {
            try {
              const { useTaskStore } = await import('@/store/task-store')
              const result = await useTaskStore.getState().editTaskFromTool(params.taskId, {
                title: params.title || undefined,
                description: params.description || undefined,
                priority: params.priority || undefined,
                timeEstimate: params.timeEstimate ? parseInt(params.timeEstimate, 10) : undefined,
                dueDate: params.dueDate || undefined
              })
              if (!result.success) return result.error || 'Failed to update task.'
              return 'Task updated successfully.'
            } catch { return 'Failed to update task.' }
          },

          // ===== Focus Management (uses Zustand timer store directly) =====
          start_focus: async (params: Record<string, any>) => {
            try {
              const duration = parseInt(params.duration, 10) || 25
              const taskId = params.taskId || undefined
              // Use the timer store's tool-friendly method — handles DB + UI state
              const { useTimerStore } = await import('@/store/timer-store')
              const result = await useTimerStore.getState().startFocusFromTool({ duration, taskId })
              if (!result.success) return result.error || 'Failed to start focus session.'
              return `Started a ${duration}-minute focus session.`
            } catch { return 'Failed to start focus session.' }
          },

          pause_focus: async () => {
            try {
              const { useTimerStore } = await import('@/store/timer-store')
              const result = await useTimerStore.getState().pauseFocusFromTool()
              if (!result.success) return result.error || 'No active focus session to pause.'
              return 'Focus session paused. Take the break you need.'
            } catch { return 'Failed to pause focus session.' }
          },

          stop_focus: async (params: Record<string, any>) => {
            try {
              const completed = params.completed !== false && params.completed !== 'false'
              const { useTimerStore } = await import('@/store/timer-store')
              const result = await useTimerStore.getState().endFocusFromTool(completed)
              if (!result.success) return result.error || 'No active focus session to stop.'
              return completed
                ? `Focus session completed! You focused for ${result.actualDuration || 0} minutes. Great work.`
                : 'Focus session ended.'
            } catch { return 'Failed to stop focus session.' }
          },

          // ===== Music Control =====
          play_music: async (params: Record<string, any>) => {
            const category = params.category || 'focus'
            window.dispatchEvent(new CustomEvent('ai-music-play', {
              detail: { category }
            }))
            return `Playing ${category} music.`
          },

          pause_music: async () => {
            window.dispatchEvent(new CustomEvent('ai-music-pause'))
            return 'Music paused.'
          },

          stop_music: async () => {
            window.dispatchEvent(new CustomEvent('ai-music-stop'))
            return 'Music stopped.'
          },

          // ===== Mood Tracking (uses Zustand mood store directly) =====
          log_mood: async (params: Record<string, any>) => {
            try {
              // Map voice-friendly labels to store enum values
              const moodMap: Record<string, 'terrible' | 'bad' | 'okay' | 'good' | 'excellent'> = {
                great: 'excellent', good: 'good', okay: 'okay', low: 'bad', bad: 'terrible',
                // Also accept direct store values
                excellent: 'excellent', terrible: 'terrible'
              }
              const mood = moodMap[params.mood] || 'okay'
              const energy = parseInt(params.energy, 10) || 5
              const { useMoodStore } = await import('@/store/mood-store')
              const result = await useMoodStore.getState().logMoodFromTool({
                mood,
                energy,
                notes: params.notes || undefined
              })
              if (!result.success) return result.error || 'Failed to log mood.'
              return `Logged mood: ${mood}, energy ${energy}/10.`
            } catch { return 'Failed to log mood.' }
          }
        }

      // Log registered tool names for debugging
      console.log('[Voice] Registered clientTools:', Object.keys(clientToolHandlers))

      const conversation = await VoiceConversation.startSession({
        signedUrl,
        // Override agent's system prompt and voice with personalized version
        overrides: {
          agent: {
            prompt: {
              prompt: systemPrompt
            }
          },
          // TTS voice override for personality-specific voice and speed
          // NOTE: Requires "Voice" override to be enabled in ElevenLabs Security settings
          tts: {
            ...(voiceId ? { voiceId } : {})
          }
        },
        clientTools: clientToolHandlers,
        // ===== Debugging callbacks =====
        onConversationMetadata: (metadata: any) => {
          console.log('[Voice] === CONVERSATION METADATA ===')
          console.log('[Voice] Full metadata:', JSON.stringify(metadata, null, 2))
          // Check if tools are visible in the agent config
          if (metadata?.agent_config?.tools) {
            console.log('[Voice] Agent tools:', metadata.agent_config.tools)
          } else {
            console.warn('[Voice] No tools found in agent metadata — tools may not be configured in ElevenLabs dashboard')
          }
        },
        onUnhandledClientToolCall: (toolCall: any) => {
          console.warn('[Voice] UNHANDLED client tool call:', toolCall.tool_name, toolCall.parameters)
          console.warn('[Voice] This tool was called by the agent but has no handler in clientTools')
          console.warn('[Voice] Registered handlers:', Object.keys(clientToolHandlers))
        },
        onDebug: (info: any) => {
          // Log tool-related debug events
          if (info?.type === 'tentative_agent_response' || info?.type === 'client_tool_call') {
            console.log('[Voice] Debug event:', info)
          }
        },
        // ===== Session callbacks =====
        onConnect: (props) => {
          console.log('[Voice] ElevenLabs conversation connected:', props.conversationId)
          setStatus('listening')
        },
        onDisconnect: (details) => {
          console.log('[Voice] ElevenLabs conversation disconnected:', details.reason)
          stopSessionRef.current()
        },
        onMessage: (props) => {
          // Handle transcript messages - source is 'user' or 'ai'
          const { message, source } = props

          if (source === 'user') {
            const userItem: TranscriptItem = {
              id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              role: 'user',
              content: message,
              timestamp: new Date(),
              isFinal: true
            }
            setTranscript(prev => [...prev, userItem])
            setPendingUserTranscript('')

            // Auto-save user message immediately
            if (autoSaveTranscript) {
              saveTranscriptToDatabase([userItem])
              lastSavedIndexRef.current = transcriptRef.current.length + 1
            }
          } else if (source === 'ai') {
            const assistantItem: TranscriptItem = {
              id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              role: 'assistant',
              content: message,
              timestamp: new Date(),
              isFinal: true
            }
            setTranscript(prev => [...prev, assistantItem])
            setPendingAssistantTranscript('')

            // Auto-save assistant message
            if (autoSaveTranscript) {
              saveTranscriptToDatabase([assistantItem])
              lastSavedIndexRef.current = transcriptRef.current.length + 1
            }
          }
        },
        onModeChange: (props) => {
          // Handle mode changes (speaking, listening, etc.)
          if (props.mode === 'speaking') {
            setStatus('speaking')
          } else if (props.mode === 'listening') {
            setStatus('listening')
          }
        },
        onError: (message, context) => {
          console.error('[Voice] ElevenLabs conversation error:', message, context)
          // Log tool-related errors specifically
          if (context && 'clientToolName' in (context as any)) {
            console.error('[Voice] Tool error for:', (context as any).clientToolName)
          }
          setMicPermissionError('Voice session error. Please try again.')
          stopSessionRef.current()
        }
      })

      // Store conversation in singleton for global mode, or local ref for local mode
      if (isGlobal) {
        conversationManager.setConversation(conversation)
      } else {
        conversationRef.current = conversation
      }

      // Audio is handled internally by ElevenLabs SDK
      // Use SDK methods to monitor levels and check for silence
      lastActivityRef.current = Date.now()
      const monitorInterval = setInterval(() => {
        const activeConversation = isGlobal
          ? conversationManager.getConversation()
          : conversationRef.current

        if (!activeConversation) return

        const inputVol = activeConversation.getInputVolume()
        const outputVol = activeConversation.getOutputVolume()

        levelRef.current = inputVol
        remoteLevelRef.current = outputVol
        setUserAudioLevel(inputVol)
        setAssistantAudioLevel(outputVol)

        if (inputVol > 0.02 || outputVol > 0.02) {
          lastActivityRef.current = Date.now()
        }

        // Check for silence timeout (180 seconds = 3 minutes)
        const idleMs = Date.now() - lastActivityRef.current
        if (idleMs > 180 * 1000) {
          console.log('Session timed out due to inactivity')
          stopSessionRef.current()
        }
      }, 1000)

      // Store interval in singleton for global mode
      if (isGlobal) {
        conversationManager.setMonitorInterval(monitorInterval as unknown as number)
      } else {
        silenceIntervalRef.current = monitorInterval as unknown as number
      }

    } catch (err: any) {
      console.error('[Voice] Start session failed:', err)
      console.error('[Voice] Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      })

      // Check if it's a permission error
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const errorMsg = 'Microphone access denied. Please enable microphone permissions to use voice chat.'
        console.error('[Voice] Permission error:', errorMsg)
        setMicPermissionError(errorMsg)
      } else if (err.name === 'NotFoundError') {
        const errorMsg = 'No microphone found. Please connect a microphone to use voice chat.'
        console.error('[Voice] Device error:', errorMsg)
        setMicPermissionError(errorMsg)
      } else {
        // For other errors (network, API, etc.), show in console but also display to user
        const errorMsg = err.message || 'An unexpected error occurred while starting the voice session'
        console.error('[Voice] Session error:', errorMsg)
        console.error('[Voice] Full error object:', err)
        // Don't set micPermissionError for non-permission errors
        // Instead, we should show this error differently
        // For now, alert the user so they can see it
        alert(`Voice session error: ${errorMsg}`)
      }

      stopSessionRef.current()
    }
  }, [attachLevelMeter, attachRemoteLevelMeter, autoSaveTranscript, saveTranscriptToDatabase, isGlobal, globalStore, voiceMode, setStatus, setElapsed, setTranscript, setPendingUserTranscript, setPendingAssistantTranscript, setMicPermissionError, setSessionId, setUserAudioLevel, setAssistantAudioLevel])

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m

      if (isGlobal) {
        const stream = conversationManager.getLocalStream()
        const track = stream?.getAudioTracks()?.[0]
        if (track) track.enabled = !next

        const conversation = conversationManager.getConversation()
        if (conversation) {
          conversation.setMicMuted(next)
        }
      } else {
        const track = localStreamRef.current?.getAudioTracks()?.[0]
        if (track) track.enabled = !next

        if (conversationRef.current) {
          conversationRef.current.setMicMuted(next)
        }
      }

      return next
    })
  }, [isGlobal])

  // Cleanup on unmount - only for local mode
  // In global mode, sessions persist across component unmounts
  useEffect(() => {
    return () => {
      if (!isGlobal) {
        stopSession()
      }
    }
  }, [isGlobal]) // Only depend on isGlobal to avoid re-running on stopSession changes

  // Format elapsed time
  const formatTime = useCallback(() => {
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [elapsed])

  return {
    // State
    status,
    isMuted,
    elapsed,
    timeString: formatTime(),
    transcript,
    pendingUserTranscript,
    pendingAssistantTranscript,
    sessionId,
    sessionLabel,
    userAudioLevel,
    assistantAudioLevel,
    micPermissionError,

    // Actions
    startSession,
    stopSession,
    toggleMute,
    clearTranscript: () => setTranscript([]),

    // Refs for audio element
    remoteAudioRef
  }
}
