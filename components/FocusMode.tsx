"use client";

import { useEffect, useRef, useState } from "react";
import { useCalibrationStore, LOOP_META } from "@/store/calibrationStore";
import {
  apiEndFocusSession,
  getLoopUrl,
  getTrackUrl,
} from "@/lib/calibrationApi";
import type { LoopState } from "@/types/calibration";

const LOOP_PLACEHOLDER_TRACK: Record<LoopState, string> = {
  "Low Energy": getTrackUrl("track_01"),
  Restless: getTrackUrl("track_03"),
  Distracted: getTrackUrl("track_05"),
  Focused: getTrackUrl("track_07"),
  Overwhelmed: getTrackUrl("track_09"),
};

function resolveLoopUrl(loop: LoopState): string {
  return LOOP_PLACEHOLDER_TRACK[loop];
}

export function FocusMode() {
  const { outputs, focus_session_id, reset } = useCalibrationStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const loop = (outputs?.assigned_loop ?? "Focused") as LoopState;
  const meta = LOOP_META[loop] || { description: "Preparing your focus environment..." };
  // Use emerald green as the focus color
  const loopColor = "#059669";
  const loopUrl = resolveLoopUrl(loop);

  useEffect(() => {
    setAudioError(null);

    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume;
    audio.src = loopUrl;

    audio.addEventListener("error", (e) => {
      const err = (e.target as HTMLAudioElement).error;
      if (!err || err.code === 4) return;
      const msg = `Audio error ${err.code}: ${err.message}`;
      console.error("[FocusMode] audio error:", msg);
      setAudioError(`Could not load audio. ${msg}`);
      setIsPlaying(false);
    });

    audioRef.current = audio;

    audio
      .play()
      .then(() => {
        console.log("[FocusMode] playing:", loopUrl);
        setIsPlaying(true);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("[FocusMode] play() rejected:", err);
        setAudioError(`Playback blocked: ${err.message}. Click play to start.`);
        setIsPlaying(false);
      });
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      audio.pause();
      audio.src = "";
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loopUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      setAudioError(null);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }, 1000);
        })
        .catch((err) => {
          console.error("[FocusMode] togglePlay error:", err);
          setAudioError(`Could not resume: ${err.message}`);
        });
    }
  }

  async function handleEnd() {
    setEnding(true);
    if (audioRef.current) audioRef.current.pause();
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      if (focus_session_id) {
        await apiEndFocusSession(focus_session_id);
      }
    } catch (err) {
      console.error("[FocusMode] end session error:", err);
    }

    reset();
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{ textAlign: "center", maxWidth: "480px", width: "100%" }}>
      {/* Ambient orb */}
      <div className="fade-up" style={{ marginBottom: "3rem" }}>
        <FocusOrb color={loopColor} isPlaying={isPlaying} />
      </div>

      <p
        className="nuree-label fade-up fade-up-delay-1"
        style={{ marginBottom: "0.5rem" }}
      >
        Focus Mode
      </p>
      <h1
        className="nuree-title fade-up fade-up-delay-1"
        style={{ marginBottom: "0.5rem", color: loopColor }}
      >
        {loop}
      </h1>
      <p
        className="nuree-body fade-up fade-up-delay-2"
        style={{ maxWidth: "300px", margin: "0 auto 2.5rem" }}
      >
        {meta.description}
      </p>

      {/* Audio error */}
      {audioError && (
        <p
          style={{
            fontSize: "0.8rem",
            color: "#dc2626",
            marginBottom: "1rem",
            maxWidth: "320px",
            margin: "0 auto 1rem",
          }}
        >
          {audioError}
        </p>
      )}

      {/* Timer */}
      <div
        className="fade-up fade-up-delay-2"
        style={{ marginBottom: "2.5rem" }}
      >
        <p
          style={{
            fontFamily: "DM Mono, Courier New, monospace",
            fontSize: "2.5rem",
            color: "#111827",
            letterSpacing: "0.1em",
            fontWeight: 300,
          }}
        >
          {formatTime(elapsed)}
        </p>
      </div>

      {/* Controls */}
      <div
        className="fade-up fade-up-delay-3"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: loopColor,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            boxShadow: `0 0 32px rgba(5,150,105,0.30)`,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.05)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Volume */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            width: "240px",
          }}
        >
          <VolumeIcon low />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ flex: 1, accentColor: loopColor }}
          />
          <VolumeIcon />
        </div>

        {/* End session */}
        <button
          className="nuree-btn nuree-btn-ghost"
          onClick={handleEnd}
          disabled={ending}
          style={{ marginTop: "0.5rem" }}
        >
          {ending ? "Ending…" : "End Focus Session"}
        </button>
      </div>

      <style>{`
        @keyframes focusOrb {
          0%   { transform: scale(1);    opacity: 0.6; }
          50%  { transform: scale(1.08); opacity: 0.9; }
          100% { transform: scale(1);    opacity: 0.6; }
        }
        @keyframes focusRing {
          0%   { transform: scale(1);   opacity: 0.2; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FocusOrb({ color, isPlaying }: { color: string; isPlaying: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: "180px",
        height: "180px",
        margin: "0 auto",
      }}
    >
      {isPlaying &&
        [0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1px solid ${color}`,
              animation: `focusRing 3s ease-out infinite`,
              animationDelay: `${i * 1}s`,
            }}
          />
        ))}
      <div
        style={{
          position: "absolute",
          inset: "20px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(5,150,105,0.25) 0%, rgba(5,150,105,0.06) 60%, transparent 100%)`,
          border: `1px solid rgba(5,150,105,0.4)`,
          animation: isPlaying ? `focusOrb 4s ease-in-out infinite` : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "45px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(5,150,105,0.35) 0%, transparent 80%)`,
          filter: "blur(8px)",
        }}
      />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M7 4l12 7-12 7V4z" fill="#ffffff" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="5" y="4" width="4" height="14" rx="1.5" fill="#ffffff" />
      <rect x="13" y="4" width="4" height="14" rx="1.5" fill="#ffffff" />
    </svg>
  );
}

function VolumeIcon({ low }: { low?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ opacity: 0.4, flexShrink: 0 }}
    >
      <path
        d="M3 6h2l3-3v10l-3-3H3V6z"
        stroke="#111827"
        strokeWidth="1.2"
        fill="none"
      />
      {!low && (
        <path
          d="M11 4c1.5 1 2.5 2.5 2.5 4s-1 3-2.5 4"
          stroke="#111827"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}
