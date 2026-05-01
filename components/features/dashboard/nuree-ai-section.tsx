"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIInput } from "@/components/ai/shared/ai-input";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { useVoiceStore } from "@/store/voice-store";
import { useUserStore } from "@/store/user-store";
import { useCalibrationStore } from "@/store/calibrationStore";
import { useRegulation } from "@/hooks/use-regulation";
import { useAudioLevel } from "@/lib/hooks/use-audio-level";
import { getPersonality, type PersonalityId } from "@/lib/config/personalities";
import dynamic from "next/dynamic";
import type { AvatarState } from "./nuree-avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  VoiceHistoryPanel,
  CurrentSubtitle,
  ModernMessageList,
  TypingIndicator,
} from "@/components/ui/modern-message";

// Dynamic import to avoid SSR issues with Three.js
const NureeAvatar = dynamic(
  () => import("./nuree-avatar").then((mod) => ({ default: mod.NureeAvatar })),
  {
    ssr: false,
    loading: () => (
      <div className="w-40 h-40 md:w-48 md:h-48 xl:w-64 xl:h-64 2xl:w-80 2xl:h-80 rounded-full bg-violet-100 animate-pulse flex items-center justify-center">
        <span className="text-violet-400 text-sm xl:text-base">
          Loading avatar...
        </span>
      </div>
    ),
  },
);
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Mic,
  MessageSquare,
  Clock,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { ImmersiveCoachMode } from "@/components/features/immersive-coach-mode";
import { cn } from "@/lib/utils";

interface NureeAISectionProps {
  sessionId?: string;
  className?: string;
  fullHeight?: boolean;
}

const focusDurations = [
  { label: "15", minutes: 15 },
  { label: "25", minutes: 25 },
  { label: "45", minutes: 45 },
];

export function NureeAISection({
  sessionId,
  className,
  fullHeight,
}: NureeAISectionProps) {
  const router = useRouter();
  const conversationId = sessionId || undefined;

  // Check global store for active floating session
  const globalStatus = useVoiceStore((state) => state.status);
  const globalMode = useVoiceStore((state) => state.mode);
  const switchToDashboard = useVoiceStore((state) => state.switchToDashboard);
  const hasActiveFloatingSession =
    globalMode === "floating" &&
    globalStatus !== "idle" &&
    globalStatus !== "ended";

  // Get user's selected personality
  const userProfile = useUserStore((state) => state.profile);
  const selectedPersonalityId =
    (userProfile?.selected_personality as PersonalityId) || "nur";
  const personality = useMemo(
    () => getPersonality(selectedPersonalityId),
    [selectedPersonalityId],
  );

  // Get mode from localStorage, default to 'voice'
  const [mode, setMode] = useState<"voice" | "text">(() => {
    if (typeof window === "undefined") return "voice";
    const saved = localStorage.getItem("nuree-dashboard-mode");
    return saved === "text" ? "text" : "voice";
  });

  // Get current functional state
  const outputs = useCalibrationStore((state) => state.outputs);
  const functionalState = outputs?.assigned_loop || null;
  const regulation = useRegulation(functionalState);

  // Immersive mode state
  const [isImmersive, setIsImmersive] = useState(false);

  // Get focus duration from localStorage, default to 25
  const [selectedFocusDuration, setSelectedFocusDuration] = useState(() => {
    if (typeof window === "undefined") return 25;
    const saved = localStorage.getItem("nuree-focus-duration");
    return saved ? parseInt(saved) : 25;
  });

  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const remoteAudioElementRef = useRef<HTMLAudioElement>(null);
  const prevUserTranscriptRef = useRef("");

  const { messages, sendMessage, isLoading, error } = useAIAssistant({
    variant: "dashboard-hero",
    conversationId,
    persistMessages: true,
  });

  // Always use global store so sessions persist across navigation
  const {
    status,
    isMuted,
    transcript,
    pendingUserTranscript,
    pendingAssistantTranscript,
    userAudioLevel,
    startSession,
    stopSession,
    remoteAudioRef,
    micPermissionError,
  } = useVoiceChat({
    mode: "balanced",
    autoSaveTranscript: true,
    storeMode: "global",
    voiceMode: "dashboard",
  });

  // Adopt floating session when component mounts if one is active
  useEffect(() => {
    if (hasActiveFloatingSession && mode === "voice") {
      // Switch global mode to dashboard to show transcripts
      switchToDashboard();
    }
  }, [hasActiveFloatingSession, mode, switchToDashboard]);

  // Switch back to floating mode when leaving dashboard (if session is still active)
  useEffect(() => {
    const switchToFloating = useVoiceStore.getState().switchToFloating;
    return () => {
      const currentStatus = useVoiceStore.getState().status;
      const currentMode = useVoiceStore.getState().mode;
      // Only switch if session is active and currently in dashboard mode
      if (
        currentMode === "dashboard" &&
        currentStatus !== "idle" &&
        currentStatus !== "ended"
      ) {
        switchToFloating();
      }
    };
  }, []);

  // Connect audio element ref
  useEffect(() => {
    if (remoteAudioRef) {
      remoteAudioRef.current = remoteAudioElementRef.current;
    }
  }, [remoteAudioRef]);

  // Persist mode to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nuree-dashboard-mode", mode);
    }
  }, [mode]);

  // Persist focus duration to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "nuree-focus-duration",
        selectedFocusDuration.toString(),
      );
    }
  }, [selectedFocusDuration]);

  // Auto-switch to text mode if mic permission is denied
  useEffect(() => {
    if (micPermissionError) {
      setMode("text");
    }
  }, [micPermissionError]);

  // Refs for stable voice-toggle event handler (avoids listener churn from callback identity changes)
  const startSessionRef = useRef(startSession);
  startSessionRef.current = startSession;
  const stopSessionRef = useRef(stopSession);
  stopSessionRef.current = stopSession;
  const statusRef = useRef(status);
  statusRef.current = status;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Handle tap-to-toggle keyboard shortcuts (Space key)
  useEffect(() => {
    const handleVoiceToggle = () => {
      if (modeRef.current !== "voice") return;

      // Toggle: if idle/ended start, otherwise stop
      if (statusRef.current === "idle" || statusRef.current === "ended") {
        startSessionRef.current();
      } else {
        stopSessionRef.current();
      }
    };

    window.addEventListener("voice-toggle", handleVoiceToggle);

    return () => {
      window.removeEventListener("voice-toggle", handleVoiceToggle);
    };
  }, []);

  // Listen for immersive mode toggle event (from keyboard shortcut)
  useEffect(() => {
    const handleToggleImmersive = () => {
      setIsImmersive((prev) => !prev);
    };

    window.addEventListener("toggle-immersive-coach", handleToggleImmersive);

    return () => {
      window.removeEventListener(
        "toggle-immersive-coach",
        handleToggleImmersive,
      );
    };
  }, []);

  // Dispatch voice transcript events for task highlighting
  useEffect(() => {
    // When pendingUserTranscript changes from non-empty to empty, it means it was finalized
    if (prevUserTranscriptRef.current && !pendingUserTranscript) {
      // Dispatch custom event with the finalized transcript
      window.dispatchEvent(
        new CustomEvent("voice-transcript", {
          detail: { transcript: prevUserTranscriptRef.current },
        }),
      );
    }
    // Update ref to current value for next comparison
    prevUserTranscriptRef.current = pendingUserTranscript;
  }, [pendingUserTranscript]);

  const toggleMode = () => {
    const newMode = mode === "voice" ? "text" : "voice";
    if (mode === "voice" && status !== "idle" && status !== "ended") {
      stopSession();
    }
    setMode(newMode);
  };

  const handleStartFocus = () => {
    router.push(`/focus?duration=${selectedFocusDuration}`);
  };

  const getMicButtonLabel = () => {
    if (status === "listening") return "Listening...";
    if (status === "thinking") return "Thinking...";
    if (status === "speaking") return "Speaking...";
    if (status === "connecting") return "Connecting...";
    return `Talk to ${personality.name}`;
  };

  const isIdle = status === "idle" || status === "ended";

  // Audio level for AI speech lip sync
  const aiAudioLevel = useAudioLevel(remoteAudioElementRef.current);

  // Map voice status to avatar state
  const avatarState: AvatarState = useMemo(() => {
    switch (status) {
      case "listening":
        return "listening";
      case "thinking":
        return "thinking";
      case "speaking":
        return "speaking";
      default:
        return "idle";
    }
  }, [status]);

  // Get appropriate audio level based on state
  const currentAudioLevel = useMemo(() => {
    if (status === "listening") {
      return userAudioLevel;
    }
    if (status === "speaking") {
      return aiAudioLevel;
    }
    return 0;
  }, [status, userAudioLevel, aiAudioLevel]);

  // hasCaption: true when there's any transcript content (for showing history panel)
  const hasCaption =
    !!pendingUserTranscript ||
    !!pendingAssistantTranscript ||
    transcript.length > 0;

  // hasConversationStarted: true only when there's actual finalized content in transcript
  // (not just pending input) - used to determine when to hide the welcome message
  const hasConversationStarted = transcript.length > 0;
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  // Auto-scroll transcript to bottom when new messages arrive
  useEffect(() => {
    if (transcriptContainerRef.current) {
      const scrollContainer =
        transcriptContainerRef.current.querySelector(".overflow-y-auto");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [transcript, pendingUserTranscript, pendingAssistantTranscript]);

  // Get the current/latest message for subtitle display
  const currentSubtitle = useMemo(() => {
    // Priority: pending assistant > pending user > last transcript item
    if (pendingAssistantTranscript) {
      return {
        content: pendingAssistantTranscript,
        role: "assistant" as const,
        isPending: true,
      };
    }
    if (pendingUserTranscript) {
      return {
        content: pendingUserTranscript,
        role: "user" as const,
        isPending: true,
      };
    }
    if (transcript.length > 0) {
      const last = transcript[transcript.length - 1];
      return { content: last.content, role: last.role, isPending: false };
    }
    return null;
  }, [transcript, pendingUserTranscript, pendingAssistantTranscript]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("", className)}
    >
      <Card
        className={cn(
          "flex flex-col bg-transparent border-0 shadow-none overflow-hidden",
          fullHeight
            ? "h-[calc(100vh-10rem)]"
            : mode === "voice"
              ? "h-[680px] md:h-[760px] xl:h-[850px] 2xl:h-[950px]"
              : "h-[50vh] min-h-[25rem] xl:min-h-[30rem] 2xl:min-h-[35rem]",
        )}
      >
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          <AnimatePresence mode="wait">
            {mode === "voice" ? (
              /* Voice Hero Mode - New Layout with History Panel */
              <motion.div
                key="voice-hero"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                {/* Top Bar with Mode Toggle and Focus Mode */}
                <div className="flex justify-end gap-2 xl:gap-3 px-6 xl:px-8 2xl:px-10 pt-4 xl:pt-5 2xl:pt-6 pb-2">
                  <button
                    onClick={toggleMode}
                    className="flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-5 xl:py-2.5 2xl:px-6 2xl:py-3 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition-all text-sm xl:text-base 2xl:text-lg font-medium border border-gray-200/60 shadow-sm"
                  >
                    <Mic className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-violet-600" />
                    <span className="text-violet-600">Voice</span>
                    <span className="text-gray-300">|</span>
                    <MessageSquare className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-gray-400" />
                    <span className="text-gray-400">Text</span>
                  </button>
                  <button
                    onClick={() => setIsImmersive(true)}
                    className="p-2 xl:p-2.5 2xl:p-3 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-violet-600 hover:bg-white transition-all border border-gray-200/60 shadow-sm"
                    title="Focus Mode (Cmd+Shift+F)"
                    aria-label="Enter focus mode"
                  >
                    <Maximize2 className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />
                  </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex px-6 xl:px-8 2xl:px-10 gap-6 xl:gap-8 2xl:gap-10 min-h-0">
                  {/* Left Panel - Conversation History (shows when there's any content) */}
                  <AnimatePresence>
                    {hasCaption && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 288 }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="hidden md:block flex-shrink-0 xl:w-80 2xl:w-96 min-h-0"
                      >
                        <div className="h-full bg-gray-50/30 rounded-2xl xl:rounded-3xl border-0 p-4 xl:p-5 2xl:p-6 flex flex-col min-h-0">
                          <VoiceHistoryPanel
                            transcript={transcript}
                            pendingUserTranscript={pendingUserTranscript}
                            pendingAssistantTranscript={
                              pendingAssistantTranscript
                            }
                            maxHeight="100%"
                            className="h-full min-h-0"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Center - Avatar and Controls */}
                  <div className="flex-1 flex flex-col items-center min-w-0 min-h-0">
                    {/* Top spacer — pushes content to center, shrinks to 0 if space is tight */}
                    <div className="flex-1 min-h-0" />

                    {/* Mic Permission Error */}
                    {micPermissionError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md xl:max-w-lg 2xl:max-w-xl p-4 xl:p-5 2xl:p-6 bg-red-50 border border-red-100 rounded-2xl xl:rounded-3xl text-center flex-shrink-0 mb-3"
                      >
                        <p className="text-sm xl:text-base 2xl:text-lg text-red-800 mb-2">
                          {micPermissionError}
                        </p>
                        <button
                          onClick={() =>
                            window.open(
                              "https://support.google.com/chrome/answer/2693767",
                              "_blank",
                            )
                          }
                          className="text-xs xl:text-sm 2xl:text-base text-red-600 hover:text-red-700 underline inline-flex items-center gap-1"
                        >
                          Enable microphone{" "}
                          <ExternalLink className="w-3 h-3 xl:w-4 xl:h-4" />
                        </button>
                      </motion.div>
                    )}

                    {/* First-load welcome - show when idle and no transcript exists (voice mode) */}
                    {isIdle && !hasConversationStarted && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center flex-shrink-0 mb-3 xl:mb-4"
                      >
                        <h2 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-900 mb-1 xl:mb-2">
                          Hi, I&apos;m {personality.name}
                        </h2>
                        <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-500 max-w-md mx-auto">
                          {regulation.primaryPrompt || "How are you feeling?"}
                        </p>
                        
                        {regulation.interventions.length > 0 && regulation.interventions[0] !== 'none' && (
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {regulation.interventions.map(intervention => (
                              <span key={intervention} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs xl:text-sm font-medium">
                                {intervention.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* 3D Avatar - only render when NOT in immersive mode to prevent WebGL conflicts */}
                    {!isImmersive && (
                      <motion.div
                        className="relative flex-shrink-0"
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Pulsing ring based on audio level */}
                        {!isIdle && (
                          <motion.div
                            className="absolute inset-0 rounded-full bg-violet-300/30 -z-10"
                            animate={{
                              scale: 1 + currentAudioLevel * 0.15,
                              opacity: 0.2 + currentAudioLevel * 0.3,
                            }}
                            transition={{ duration: 0.1 }}
                            style={{
                              width: "clamp(160px, 18vw, 380px)",
                              height: "clamp(160px, 18vw, 380px)",
                              left: "50%",
                              top: "50%",
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        )}

                        <NureeAvatar
                          state={avatarState}
                          audioLevel={currentAudioLevel}
                          personality={selectedPersonalityId}
                          className={cn(
                            "rounded-full overflow-hidden",
                            "transition-all duration-300",
                            isIdle
                              ? "hover:scale-105 cursor-pointer"
                              : "cursor-pointer",
                            micPermissionError &&
                              "opacity-50 cursor-not-allowed",
                          )}
                          style={{
                            width: "clamp(160px, 18vw, 380px)",
                            height: "clamp(160px, 18vw, 380px)",
                          }}
                          onClick={
                            micPermissionError
                              ? undefined
                              : isIdle
                                ? startSession
                                : stopSession
                          }
                        />
                      </motion.div>
                    )}

                    {/* Status Label */}
                    <div className="text-center flex-shrink-0 mt-3 xl:mt-4">
                      <p className="text-base xl:text-lg 2xl:text-xl font-medium text-gray-900">
                        {getMicButtonLabel()}
                      </p>
                      {isIdle && (
                        <p className="text-sm xl:text-base 2xl:text-lg text-gray-400 mt-0.5 xl:mt-1">
                          {isDesktop ? "Tap Space to talk" : "Tap to talk"}
                        </p>
                      )}
                    </div>

                    {/* Current Subtitle - Shows latest message prominently */}
                    <AnimatePresence mode="wait">
                      {currentSubtitle && (
                        <CurrentSubtitle
                          content={currentSubtitle.content}
                          role={currentSubtitle.role}
                          isPending={currentSubtitle.isPending}
                          assistantName={personality.name}
                          className="flex-shrink-0 mt-3 w-full overflow-hidden"
                        />
                      )}
                    </AnimatePresence>

                    {/* Bottom spacer — pushes content to center, shrinks to 0 if space is tight */}
                    <div className="flex-1 min-h-0" />
                  </div>
                </div>

                {/* Bottom - Quick Focus CTA (in normal flow) */}
                <div className="flex-shrink-0 px-6 lg:px-8 xl:px-10 2xl:px-12 pb-4 xl:pb-5 2xl:pb-6 pt-3 xl:pt-4">
                  <div className="flex items-center justify-between gap-4 xl:gap-6">
                    {/* LEFT — icon + labels */}
                    <div className="flex items-center gap-3 lg:gap-4 xl:gap-5">
                      <div className="p-2.5 lg:p-3 xl:p-4 2xl:p-5 bg-emerald-50 rounded-xl xl:rounded-2xl">
                        <Clock className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-semibold text-gray-900">
                          Quick Focus Session
                        </p>
                        <p className="text-xs lg:text-sm xl:text-base 2xl:text-lg text-gray-500">
                          Start a timed focus session
                        </p>
                      </div>
                    </div>

                    {/* RIGHT — Calibration + segmented picker + Start Focus */}
                    {/* RIGHT — segmented picker + buttons */}
                    <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">
                      {/* Segmented Time Picker */}
                      <div className="flex gap-0.5 p-1 lg:p-1.5 xl:p-2 bg-gray-100 rounded-lg xl:rounded-xl">
                        {focusDurations.map((duration) => (
                          <button
                            key={duration.minutes}
                            onClick={() =>
                              setSelectedFocusDuration(duration.minutes)
                            }
                            className={cn(
                              "px-3 py-1.5 lg:px-4 lg:py-2 xl:px-5 xl:py-2.5 2xl:px-6 2xl:py-3 rounded-md xl:rounded-lg text-sm lg:text-base xl:text-lg 2xl:text-xl font-medium transition-all",
                              selectedFocusDuration === duration.minutes
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200",
                            )}
                          >
                            {duration.label}
                          </button>
                        ))}
                      </div>

                      {/* Stacked buttons */}
                      <div className="flex flex-col gap-1.5 xl:gap-2">
                        <Button
                          onClick={() => router.push("/calibrate")}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg xl:rounded-xl shadow-sm lg:text-base xl:text-lg 2xl:text-xl lg:px-4 lg:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 lg:h-auto"
                        >
                          Start Calibration
                        </Button>

                        <Button
                          onClick={handleStartFocus}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg xl:rounded-xl shadow-sm lg:text-base xl:text-lg 2xl:text-xl lg:px-4 lg:py-2 xl:px-6 xl:py-3 2xl:px-8 2xl:py-4 lg:h-auto"
                        >
                          Start {selectedFocusDuration}‑min Focus
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Text Chat Mode - Modern Design */
              <motion.div
                key="text-mode"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full"
              >
                {/* Header */}
                <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 pt-4 lg:pt-6 xl:pt-8 pb-3 lg:pb-4 xl:pb-5 border-b border-gray-100/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 lg:gap-4 xl:gap-5">
                      <div className="p-2.5 lg:p-3 xl:p-4 2xl:p-5 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl xl:rounded-2xl">
                        <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 text-violet-600" />
                      </div>
                      <div>
                        <h2 className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-semibold text-gray-900">
                          Chat with {personality.name}
                        </h2>
                        <p className="text-sm lg:text-base xl:text-lg 2xl:text-xl text-gray-500">
                          Your personal assistant
                        </p>
                      </div>
                    </div>

                    {/* Mode Toggle */}
                    <button
                      onClick={toggleMode}
                      className="flex items-center gap-2 xl:gap-3 px-4 py-2 lg:px-5 lg:py-2.5 xl:px-6 xl:py-3 2xl:px-7 2xl:py-3.5 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white transition-all text-sm lg:text-base xl:text-lg 2xl:text-xl font-medium border border-gray-200/60 shadow-sm"
                    >
                      <Mic className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-gray-400" />
                      <span className="text-gray-400">Voice</span>
                      <span className="text-gray-300">|</span>
                      <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 text-violet-600" />
                      <span className="text-violet-600">Text</span>
                    </button>
                  </div>
                </div>

                {/* Messages container with modern styling */}
                <div className="flex-1 overflow-y-auto px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 lg:py-6 xl:py-8 bg-gradient-to-b from-gray-50/30 to-transparent">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 lg:w-28 lg:h-28 xl:w-36 xl:h-36 2xl:w-44 2xl:h-44 mx-auto mb-4 lg:mb-6 xl:mb-8 bg-gradient-to-br from-violet-100 to-violet-50 rounded-2xl xl:rounded-3xl flex items-center justify-center shadow-sm">
                          <Sparkles className="w-9 h-9 lg:w-12 lg:h-12 xl:w-16 xl:h-16 2xl:w-20 2xl:h-20 text-violet-500" />
                        </div>
                        <h3 className="text-lg lg:text-2xl xl:text-3xl 2xl:text-4xl font-medium text-gray-900 mb-1 lg:mb-2 xl:mb-3">
                          Hi! I&apos;m {personality.name}
                        </h3>
                        <p className="text-gray-500 max-w-xs lg:max-w-md xl:max-w-lg 2xl:max-w-xl mx-auto text-sm lg:text-base xl:text-lg 2xl:text-xl leading-relaxed">
                          I&apos;m here to help you stay focused and productive.
                          Ask me anything or use the quick actions above!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 xl:space-y-2">
                      <ModernMessageList
                        messages={messages.map((m) => ({
                          id: m.id,
                          role: m.role as "user" | "assistant",
                          content: m.content,
                          timestamp: m.timestamp,
                        }))}
                        variant="default"
                      />
                      {isLoading && (
                        <div className="pt-2 xl:pt-3">
                          <TypingIndicator />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input Area - Modern Design */}
                <div className="border-t border-gray-100/30 px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 lg:py-5 xl:py-6 2xl:py-8">
                  <AIInput
                    onSend={sendMessage}
                    isLoading={isLoading}
                    placeholder={`Message ${personality.name}...`}
                  />
                  {error && (
                    <p className="text-xs lg:text-sm xl:text-base text-red-500 mt-2">
                      {error.message}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden Audio Element for Voice Chat */}
          <audio ref={remoteAudioElementRef} className="hidden" />
        </CardContent>
      </Card>

      {/* Immersive Coach Mode Overlay */}
      <ImmersiveCoachMode
        isOpen={isImmersive}
        onClose={() => setIsImmersive(false)}
      />
    </motion.div>
  );
}
