"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

  // Per-pair local state (reset when pair_index changes)
  const [currentPlaying, setCurrentPlaying] = useState<"A" | "B" | null>(null);
  const [hasPlayedA, setHasPlayedA] = useState(false);
  const [hasPlayedB, setHasPlayedB] = useState(false);
  const [replays, setReplays] = useState(0);
  const [switches, setSwitches] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  // Reset all local state when moving to a new pair
  useEffect(() => {
    setCurrentPlaying(null);
    setHasPlayedA(false);
    setHasPlayedB(false);
    setReplays(0);
    setSwitches(0);
    setConfirming(false);
    setError(null);
    startedAtRef.current = Date.now();

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [current_pair_index]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function playTrack(track: "A" | "B") {
    if (!config) return;

    const url =
      track === "A"
        ? getTrackUrl(config.track_a_id)
        : getTrackUrl(config.track_b_id);

    // Track behaviour signals
    if (currentPlaying !== null && currentPlaying !== track) {
      setSwitches((s) => s + 1);
    } else if (currentPlaying === track) {
      setReplays((r) => r + 1);
    }

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Play new audio
    const audio = new Audio(url);
    audio.loop = true;
    audioRef.current = audio;
    audio.play().catch((err) => {
      console.error("Audio play error:", err);
      setError("Could not play audio. Check your browser allows audio.");
    });

    setCurrentPlaying(track);
    if (track === "A") setHasPlayedA(true);
    else setHasPlayedB(true);
  }

  async function handleConfirm(choice: "A" | "B") {
    if (!config || !session_id || confirming) return;

    setConfirming(true);
    setError(null);

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

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
      // addSubmittedPair increments current_pair_index in the store
      // If it was pair 5, trigger completion
      if (config.pair_index === 5) {
        setProcessing();
        const { outputs } = await apiCompleteCalibration(session_id);
        setResult(outputs);
      }
      // Otherwise the store's current_pair_index increment triggers the
      // useEffect above to reset local state for the next pair
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit";
      setError(msg);
      console.error("[CalibrationPair] submit error:", err);
      setConfirming(false);
    }
  }

  if (!config) return null;

  const canConfirm = hasPlayedA && hasPlayedB;
  const progress = ((current_pair_index - 1) / 5) * 100;

  return (
    <div className="nuree-card fade-up" style={{ maxWidth: "640px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <p className="nuree-label">Step {current_pair_index} of 5</p>
        <p className="nuree-label" style={{ color: "var(--accent)" }}>
          {config.axis}
        </p>
      </div>

      {/* Progress bar */}
      <div className="nuree-progress-bar" style={{ marginBottom: "2.5rem" }}>
        <div
          className="nuree-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2
        className="nuree-title"
        style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}
      >
        Which feels more natural?
      </h2>
      <p className="nuree-body" style={{ marginBottom: "2.5rem" }}>
        Listen to both. Switch freely. Take your time.
      </p>

      {/* A / B buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {(["A", "B"] as const).map((track) => {
          const isActive = currentPlaying === track;
          const hasPlayed = track === "A" ? hasPlayedA : hasPlayedB;
          return (
            <button
              key={track}
              onClick={() => playTrack(track)}
              disabled={confirming}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "2rem 1rem",
                background: isActive
                  ? "var(--accent-glow)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "16px",
                cursor: confirming ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                overflow: "hidden",
                color: "var(--text)",
              }}
            >
              <span
                style={{
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontSize: "2.5rem",
                  fontWeight: 400,
                  color: "var(--accent)",
                  lineHeight: 1,
                }}
              >
                {track}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                {isActive ? "Playing" : hasPlayed ? "Replay" : "Listen"}
              </span>
              {isActive && <PlayingRipple />}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      {!canConfirm && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--muted)",
            marginBottom: "1.5rem",
          }}
        >
          Listen to both sounds before confirming ↑
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#F5A0A0",
            marginBottom: "1rem",
          }}
        >
          {error}
        </p>
      )}

      {/* Choose buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          opacity: canConfirm ? 1 : 0.3,
          transition: "opacity 0.3s",
          pointerEvents: canConfirm ? "auto" : "none",
        }}
      >
        {(["A", "B"] as const).map((choice) => (
          <button
            key={choice}
            className="nuree-btn nuree-btn-primary"
            disabled={!canConfirm || confirming}
            onClick={() => handleConfirm(choice)}
            style={{ justifyContent: "center", width: "100%" }}
          >
            {confirming ? "…" : `Choose ${choice}`}
          </button>
        ))}
      </div>

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
