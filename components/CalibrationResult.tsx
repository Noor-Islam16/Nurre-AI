"use client";

import { useEffect, useRef, useState } from "react";
import {
  useCalibrationStore,
  LOOP_META,
  FLAG_META,
} from "@/store/calibrationStore";
import { apiStartFocusSession, getTrackUrl } from "@/lib/calibrationApi";
import { TRACK_IDS } from "@/types/calibration";
import type { LoopState } from "@/types/calibration";

// Preview track per loop — use a real calibration clip that matches the mood
const LOOP_PREVIEW_TRACK: Record<LoopState, string> = {
  "Deep Focus": getTrackUrl(TRACK_IDS.clip_8),
  Ground: getTrackUrl(TRACK_IDS.clip_5),
  Reset: getTrackUrl(TRACK_IDS.clip_2),
  Start: getTrackUrl(TRACK_IDS.clip_3),
  Flow: getTrackUrl(TRACK_IDS.clip_10),
};

interface Props {
  onRecalibrate: () => void;
  onEnterFocus: (focus_session_id: string) => void;
}

export function CalibrationResult({ onRecalibrate, onEnterFocus }: Props) {
  const { outputs } = useCalibrationStore();
  const [entering, setEntering] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const previewRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      previewRef.current?.pause();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  if (!outputs) return null;

  const loop = outputs.assigned_loop;
  const meta = LOOP_META[loop];
  const flagMeta = outputs.flag ? FLAG_META[outputs.flag] : null;
  const loopColor = "#059669";

  function togglePreview() {
    if (isPreviewing) {
      previewRef.current?.pause();
      previewRef.current = null;
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setIsPreviewing(false);
      return;
    }

    setPreviewError(null);
    const audio = new Audio(LOOP_PREVIEW_TRACK[loop]);
    audio.volume = 0.75;
    previewRef.current = audio;

    audio
      .play()
      .then(() => {
        setIsPreviewing(true);
        previewTimerRef.current = setTimeout(() => {
          previewRef.current?.pause();
          previewRef.current = null;
          setIsPreviewing(false);
        }, 30000);
      })
      .catch(() => {
        setPreviewError("Could not play preview. Try clicking again.");
      });
  }

  async function handleEnterFocus() {
    previewRef.current?.pause();
    setIsPreviewing(false);
    setEntering(true);
    try {
      const { focus_session_id } = await apiStartFocusSession();
      onEnterFocus(focus_session_id);
    } catch (err) {
      console.error(err);
      setEntering(false);
    }
  }

  return (
    <div style={{ maxWidth: "580px", width: "100%", margin: "0 auto" }}>
      {/* Header — Brain Mode */}
      <div
        className="fade-up"
        style={{ textAlign: "center", marginBottom: "2rem" }}
      >
        <p className="nuree-label" style={{ marginBottom: "0.75rem" }}>
          Your Sound Profile
        </p>
        <h1
          style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "clamp(3rem, 10vw, 5rem)",
            fontWeight: 400,
            color: loopColor,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: "0.5rem",
          }}
        >
          {outputs.brain_mode}
        </h1>
        <p
          className="nuree-body"
          style={{ maxWidth: "360px", margin: "0 auto" }}
        >
          {meta.description}
        </p>
      </div>

      {/* Flag card — only shown when flag present */}
      {flagMeta && (
        <div
          className="nuree-card fade-up fade-up-delay-1"
          style={{
            padding: "1.25rem 1.5rem",
            marginBottom: "1rem",
            maxWidth: "100%",
            borderColor: "rgba(5,150,105,0.25)",
            background:
              "linear-gradient(135deg, #ffffff 0%, rgba(5,150,105,0.05) 100%)",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1.4 }}>✦</span>
          <div>
            <p
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: loopColor,
                marginBottom: "0.3rem",
              }}
            >
              {flagMeta.label}
            </p>
            <p
              style={{ fontSize: "0.85rem", color: "#374151", lineHeight: 1.6 }}
            >
              {flagMeta.suggestion}
            </p>
          </div>
        </div>
      )}

      {/* Sound preview */}
      <div
        className="nuree-card fade-up fade-up-delay-1"
        style={{
          padding: "1.5rem",
          marginBottom: "1rem",
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          borderColor: isPreviewing
            ? "rgba(5,150,105,0.3)"
            : "rgba(0,0,0,0.08)",
          background: isPreviewing ? "rgba(5,150,105,0.05)" : "#ffffff",
          transition: "all 0.3s ease",
        }}
      >
        <div>
          <p className="nuree-label" style={{ marginBottom: "0.3rem" }}>
            Your Focus Sound
          </p>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#111827",
              fontFamily: "Playfair Display, serif",
            }}
          >
            {loop}
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.2rem",
            }}
          >
            {isPreviewing
              ? "Playing 30s preview…"
              : "Preview your calibrated focus loop"}
          </p>
          {previewError && (
            <p
              style={{
                fontSize: "0.72rem",
                color: "#dc2626",
                marginTop: "0.3rem",
              }}
            >
              {previewError}
            </p>
          )}
        </div>
        <button
          onClick={togglePreview}
          style={{
            flexShrink: 0,
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: isPreviewing ? loopColor : "transparent",
            border: `1px solid ${isPreviewing ? loopColor : "rgba(0,0,0,0.08)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            color: isPreviewing ? "#ffffff" : "#111827",
          }}
        >
          {isPreviewing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

      {/* Enter Focus CTA */}
      <div className="fade-up fade-up-delay-2" style={{ marginBottom: "1rem" }}>
        <button
          className="nuree-btn nuree-btn-primary"
          onClick={handleEnterFocus}
          disabled={entering}
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "1rem 2rem",
            fontSize: "0.95rem",
          }}
        >
          {entering ? "Starting…" : "Enter Focus Mode"}
          {!entering && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M7 2l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Path trail — shows the calibration sequence */}
      <div
        className="nuree-card fade-up fade-up-delay-2"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1rem",
          maxWidth: "100%",
        }}
      >
        <p className="nuree-label" style={{ marginBottom: "0.75rem" }}>
          Calibration path
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexWrap: "wrap",
          }}
        >
          {outputs.path.map((clip, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background:
                    i === outputs.path.length - 1
                      ? loopColor
                      : "rgba(5,150,105,0.1)",
                  color: i === outputs.path.length - 1 ? "#fff" : loopColor,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {clip}
              </span>
              {i < outputs.path.length - 1 && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 5h6M5 2l3 3-3 3"
                    stroke="#9ca3af"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: "0.72rem",
            color: "#9ca3af",
            marginTop: "0.75rem",
          }}
        >
          {outputs.path_length} pair{outputs.path_length !== 1 ? "s" : ""} ·
          model {outputs.model_version}
        </p>
      </div>

      {/* Recalibrate */}
      <div className="fade-up fade-up-delay-3" style={{ textAlign: "center" }}>
        <button className="nuree-btn nuree-btn-ghost" onClick={onRecalibrate}>
          Re-calibrate
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M5 3.5l10 5.5-10 5.5V3.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="4" y="3" width="3.5" height="12" rx="1.5" fill="currentColor" />
      <rect
        x="10.5"
        y="3"
        width="3.5"
        height="12"
        rx="1.5"
        fill="currentColor"
      />
    </svg>
  );
}
