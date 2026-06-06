"use client";

import { useEffect, useRef, useState } from "react";
import { useCalibrationStore } from "@/store/calibrationStore";
import {
  apiSubmitPair,
  apiCompleteCalibration,
  getTrackUrl,
} from "@/lib/calibrationApi";
import type { PairBehaviourData } from "@/types/calibration";

// Max pairs in any path is 4 (pairs shown, not tree depth)
const MAX_PAIRS = 4;

const STEP_FEEDBACK: Record<number, string> = {
  1: "Analyzing your energy baseline…",
  2: "Detecting your regulation range…",
  3: "Building your focus profile…",
  4: "Refining your auditory signature…",
};

export function CalibrationPair() {
  const {
    session_id,
    current_node,
    choices,
    pair_sequence_index,
    submitted_pairs,
    recordChoice,
    setProcessing,
    setResult,
  } = useCalibrationStore();

  type TrackState = "idle" | "playing" | "selected" | "done";
  const [stateA, setStateA] = useState<TrackState>("idle");
  const [stateB, setStateB] = useState<TrackState>("idle");
  const [currentPlaying, setCurrentPlaying] = useState<"A" | "B" | null>(null);
  const [chosen, setChosen] = useState<"A" | "B" | null>(null);
  const [replays, setReplays] = useState(0);
  const [switches, setSwitches] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const autoPlayBRef = useRef(false);

  // Reset local state whenever tree node changes (= new pair)
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
  }, [current_node]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (!current_node) return null;

  const pairIndex = pair_sequence_index; // 1-based display index

  function playTrack(track: "A" | "B", auto = false) {
    if (!current_node || confirming) return;

    const url =
      track === "A"
        ? getTrackUrl(current_node.track_a_id)
        : getTrackUrl(current_node.track_b_id);

    if (!auto) {
      if (currentPlaying !== null && currentPlaying !== track) {
        setSwitches((s) => s + 1);
      } else if (currentPlaying === track) {
        setReplays((r) => r + 1);
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audio.volume = 0.85;
    audio.loop = false;

    if (track === "A") {
      audio.onended = () => {
        if (!autoPlayBRef.current) {
          autoPlayBRef.current = true;
          playTrack("B", true);
        }
      };
    }

    audioRef.current = audio;
    audio.play().catch(() => {
      setError("Could not play audio. Check browser audio permissions.");
    });

    setCurrentPlaying(track);
    if (track === "A") {
      setStateA("playing");
      setStateB((p) => (p === "playing" ? "idle" : p));
    } else {
      setStateB("playing");
      setStateA((p) => (p === "playing" ? "idle" : p));
    }
  }

  function handleTap(track: "A" | "B") {
    if (confirming || chosen !== null) return;
    const state = track === "A" ? stateA : stateB;
    if (state === "playing") {
      selectTrack(track);
    } else {
      playTrack(track);
    }
  }

  function selectTrack(track: "A" | "B") {
    if (confirming || chosen !== null) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    setCurrentPlaying(null);
    setChosen(track);
    setStateA(track === "A" ? "selected" : "done");
    setStateB(track === "B" ? "selected" : "done");
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
      handleConfirm(track);
    }, 1400);
  }

  async function handleConfirm(choice: "A" | "B") {
    if (!current_node || !session_id || confirming) return;
    setConfirming(true);
    setError(null);

    const pairData: PairBehaviourData = {
      pair_index: pairIndex,
      track_a_id: current_node.track_a_id,
      track_b_id: current_node.track_b_id,
      final_choice: choice,
      decision_time_ms: Math.max(0, Date.now() - startedAtRef.current),
      replay_count_total: replays,
      switch_count: switches,
    };

    try {
      await apiSubmitPair(session_id, pairData);

      // Determine next step from tree
      const nextChoices = [...choices, choice];
      const { getNextNode } = await import("@/lib/scoringEngine");
      const nextNode = getNextNode(nextChoices);

      // Record choice in store (also advances node)
      recordChoice(choice, pairData);

      if (nextNode === null) {
        // Leaf reached — complete calibration
        setProcessing();
        const allPairs = [...submitted_pairs, pairData];
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

  const progress = ((pairIndex - 1) / MAX_PAIRS) * 100;

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
        <p className="nuree-label">Step {pairIndex}</p>
        <p
          className="nuree-label"
          style={{ color: "#059669", fontSize: "0.75rem" }}
        >
          {current_node.label}
        </p>
      </div>

      {/* Progress bar */}
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
          <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
            {Math.round(progress)}% complete
          </span>
          <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
            Almost there
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
              color: "#059669",
              letterSpacing: "0.06em",
              animation: "fadeUp 0.3s ease forwards",
            }}
          >
            {STEP_FEEDBACK[pairIndex] ?? "Processing your response…"}
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

          let borderColor = "rgba(0,0,0,0.08)";
          let bg = "rgba(0,0,0,0.02)";
          let labelText = "Tap to listen";
          let labelColor = "#6b7280";

          if (isPlaying) {
            borderColor = "#059669";
            bg = "rgba(5,150,105,0.08)";
            labelText = "⏸ Playing · tap to choose";
            labelColor = "#059669";
          } else if (isSelected) {
            borderColor = "#059669";
            bg = "rgba(5,150,105,0.10)";
            labelText = "✓ Selected";
            labelColor = "#059669";
          } else if (isDone) {
            borderColor = "rgba(0,0,0,0.06)";
            bg = "rgba(0,0,0,0.01)";
            labelText = "Not chosen";
            labelColor = "#6b7280";
          } else if (currentPlaying !== null && state === "idle") {
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
                color: "#111827",
                opacity: isDone ? 0.45 : 1,
              }}
            >
              <span
                style={{
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontSize: "2.75rem",
                  fontWeight: 400,
                  color: isSelected || isPlaying ? "#059669" : "#111827",
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

      {/* Hints */}
      {!chosen && currentPlaying === null && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "#6b7280",
            marginBottom: "0.5rem",
          }}
        >
          Tap a sound to begin
        </p>
      )}
      {!chosen && currentPlaying === "A" && stateB === "idle" && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.78rem",
            color: "#6b7280",
            marginBottom: "0.5rem",
          }}
        >
          Sound B will play automatically after A
        </p>
      )}

      {error && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#dc2626",
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
            border: "1px solid #059669",
            opacity: 0,
            animation: "pulse-ring 2s ease-out infinite",
            animationDelay: `${i * 0.65}s`,
          }}
        />
      ))}
    </div>
  );
}
