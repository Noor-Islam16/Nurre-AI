"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCalibrationStore,
  PAIR_TRACK_CONFIG,
} from "@/store/calibrationStore";
import {
  apiSubmitPair,
  apiCompleteCalibration,
  getTrackUrl,
} from "@/lib/calibrationApi";
import type { PairBehaviourData } from "@/types/calibration";

// Per-step AI feedback messages shown between pairs
const STEP_FEEDBACK: Record<number, string> = {
  1: "Analyzing your auditory preference…",
  2: "Detecting rhythm sensitivity…",
  3: "Building your focus profile…",
  4: "Calibrating sound density response…",
  5: "Finalizing your auditory signature…",
};

export function CalibrationPair() {
  const {
    session_id,
    current_pair_index,
    submitted_pairs,
    addSubmittedPair,
    setProcessing,
    setResult,
  } = useCalibrationStore();

  const config = PAIR_TRACK_CONFIG[current_pair_index - 1];

  // "idle" | "playing-a" | "playing-b" | "selected-a" | "selected-b"
  type TrackState = "idle" | "playing" | "selected" | "done";
  const [stateA, setStateA] = useState<TrackState>("idle");
  const [stateB, setStateB] = useState<TrackState>("idle");

  // Which track is actively playing
  const [currentPlaying, setCurrentPlaying] = useState<"A" | "B" | null>(null);
  // Which track user chose
  const [chosen, setChosen] = useState<"A" | "B" | null>(null);

  const [replays, setReplays] = useState(0);
  const [switches, setSwitches] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const autoPlayBRef = useRef(false);

  // Reset when pair changes
  useEffect(() => {
    setStateA("idle");
    setStateB("idle");
    setCurrentPlaying(null);
    setChosen(null);
    setReplays(0);
    setSwitches(0);
    setConfirming(false);
    setError(null);
    autoPlayBRef.current = false;
    startedAtRef.current = Date.now();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
  }, [current_pair_index]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
    };
  }, []);

  function playTrack(track: "A" | "B", auto = false) {
    if (!config || confirming) return;

    const url =
      track === "A"
        ? getTrackUrl(config.track_a_id)
        : getTrackUrl(config.track_b_id);

    if (!auto) {
      if (currentPlaying !== null && currentPlaying !== track)
        setSwitches((s) => s + 1);
      else if (currentPlaying === track) setReplays((r) => r + 1);
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audio.volume = 0.85;
    // No loop — we want ended event
    audio.loop = false;

    // Auto-play B after A finishes (first time only)
    if (track === "A") {
      audio.onended = () => {
        if (!autoPlayBRef.current) {
          autoPlayBRef.current = true;
          playTrack("B", true);
        }
      };
    }

    audioRef.current = audio;

    audio.play().catch((err) => {
      console.error("Audio play error:", err);
      setError("Could not play audio. Check your browser allows audio.");
    });

    setCurrentPlaying(track);

    if (track === "A") {
      setStateA("playing");
      // Keep B as-is unless it was playing
      setStateB((prev) => (prev === "playing" ? "idle" : prev));
    } else {
      setStateB("playing");
      setStateA((prev) => (prev === "playing" ? "idle" : prev));
    }
  }

  function handleTap(track: "A" | "B") {
    if (confirming) return;

    const state = track === "A" ? stateA : stateB;
    const otherState = track === "A" ? stateB : stateA;
    const setThis = track === "A" ? setStateA : setStateB;
    const setOther = track === "A" ? setStateB : setStateA;

    // If already selected → do nothing (committed)
    if (chosen !== null) return;

    if (state === "idle") {
      // First tap: play
      playTrack(track);
      return;
    }

    if (state === "playing") {
      // Second tap on the playing track → select it
      selectTrack(track);
      return;
    }

    // Was replaying / finished → play again
    playTrack(track);
  }

  function selectTrack(track: "A" | "B") {
    if (confirming || chosen !== null) return;

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    setCurrentPlaying(null);
    setChosen(track);
    setStateA(track === "A" ? "selected" : "done");
    setStateB(track === "B" ? "selected" : "done");

    // Brief AI feedback then auto-confirm
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      handleConfirm(track);
    }, 1400);
  }

  async function handleConfirm(choice: "A" | "B") {
    if (!config || !session_id || confirming) return;

    setConfirming(true);
    setError(null);

    const pairData: PairBehaviourData = {
      pair_index: config.pair_index,
      track_a_id: config.track_a_id,
      track_b_id: config.track_b_id,
      final_choice: choice,
      decision_time_ms: Math.max(0, Date.now() - startedAtRef.current),
      replay_count_total: replays,
      switch_count: switches,
    };

    try {
      await apiSubmitPair(session_id, pairData);
      addSubmittedPair(pairData);
      if (config.pair_index === 5) {
        setProcessing();
        const { outputs } = await apiCompleteCalibration(session_id);
        setResult(outputs);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit";
      setError(msg);
      setConfirming(false);
      setChosen(null);
      setStateA("idle");
      setStateB("idle");
    }
  }

  if (!config) return null;

  const progress = ((current_pair_index - 1) / 5) * 100;
  const progressNext = (current_pair_index / 5) * 100;

  return (
    <div className="nuree-card fade-up" style={{ maxWidth: "640px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <p className="nuree-label">Step {current_pair_index} of 5</p>
        <p className="nuree-label" style={{ color: "var(--accent)" }}>
          {config.axis}
        </p>
      </div>

      {/* Progress bar with percentage */}
      <div style={{ marginBottom: "2.25rem" }}>
        <div className="nuree-progress-bar">
          <div
            className="nuree-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.4rem",
          }}
        >
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            {Math.round(progress)}% complete
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            {5 - current_pair_index + 1} left
          </span>
        </div>
      </div>

      <h2
        className="nuree-title"
        style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}
      >
        Which feels more natural?
      </h2>
      <p
        className="nuree-body"
        style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }}
      >
        Tap to listen · Tap again to choose
      </p>

      {/* AI feedback */}
      <div
        style={{
          height: "1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {showFeedback && (
          <p
            style={{
              fontSize: "0.78rem",
              color: "var(--accent)",
              letterSpacing: "0.06em",
              animation: "fadeUp 0.3s ease forwards",
            }}
          >
            {STEP_FEEDBACK[current_pair_index]}
          </p>
        )}
      </div>

      {/* A / B tap cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {(["A", "B"] as const).map((track) => {
          const state = track === "A" ? stateA : stateB;
          const isPlaying = state === "playing";
          const isSelected = state === "selected";
          const isDone = state === "done";

          let borderColor = "var(--border)";
          let bg = "rgba(255,255,255,0.03)";
          let labelText = "Tap to listen";
          let labelColor = "var(--muted)";

          if (isPlaying) {
            borderColor = "var(--accent)";
            bg = "var(--accent-glow)";
            labelText = "⏸ Playing · tap to choose";
            labelColor = "var(--accent)";
          } else if (isSelected) {
            borderColor = "var(--green)";
            bg = "rgba(126,184,164,0.12)";
            labelText = "✓ Selected";
            labelColor = "var(--green)";
          } else if (isDone) {
            borderColor = "var(--border)";
            bg = "rgba(255,255,255,0.015)";
            labelText = "Not chosen";
            labelColor = "var(--muted)";
          } else if (currentPlaying !== null && state === "idle") {
            // Has been exposed but not currently active
            labelText = "▶ Play again";
          }

          return (
            <button
              key={track}
              onClick={() => handleTap(track)}
              disabled={confirming || chosen !== null}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "2.25rem 1rem",
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: "16px",
                cursor: confirming || chosen !== null ? "default" : "pointer",
                transition: "all 0.2s ease",
                overflow: "hidden",
                color: "var(--text)",
                opacity: isDone ? 0.45 : 1,
              }}
            >
              <span
                style={{
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontSize: "2.75rem",
                  fontWeight: 400,
                  color: isSelected
                    ? "var(--green)"
                    : isPlaying
                      ? "var(--accent)"
                      : "var(--text)",
                  lineHeight: 1,
                  transition: "color 0.2s ease",
                }}
              >
                {track}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: labelColor,
                  transition: "color 0.2s ease",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                {labelText}
              </span>
              {isPlaying && <PlayingRipple />}
            </button>
          );
        })}
      </div>

      {/* Hint — only show until both sounds heard */}
      {!chosen && currentPlaying === null && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--muted)",
            marginBottom: "0.5rem",
          }}
        >
          Tap a sound to begin
        </p>
      )}
      {!chosen && currentPlaying !== null && stateA === "idle" && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "var(--muted)",
            marginBottom: "0.5rem",
          }}
        >
          Sound B will play automatically after A
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#F5A0A0",
            marginTop: "0.5rem",
          }}
        >
          {error}
        </p>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.5; }
          70%  { transform: scale(1.3);  opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function PlayingRipple() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "1px solid var(--accent)",
            opacity: 0,
            animation: `pulse-ring 2s ease-out infinite`,
            animationDelay: `${i * 0.65}s`,
          }}
        />
      ))}
    </div>
  );
}
