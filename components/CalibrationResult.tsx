"use client";

import { useEffect, useRef, useState } from "react";
import { useCalibrationStore, LOOP_META } from "@/store/calibrationStore";
import { apiStartFocusSession, getTrackUrl } from "@/lib/calibrationApi";
import type { LoopState } from "@/types/calibration";

// Placeholder preview tracks per loop (same pattern as FocusMode)
const LOOP_PREVIEW_TRACK: Record<string, string> = {
  Start: getTrackUrl("track_01"),
  Ground: getTrackUrl("track_03"),
  Reset: getTrackUrl("track_05"),
  "Deep Focus": getTrackUrl("track_07"),
  Flow: getTrackUrl("track_09"),
};

// Metric explanations
const METRIC_EXPLANATIONS: Record<string, string> = {
  FSS: "Focus Sound Signature — your unique auditory fingerprint across all five calibration dimensions.",
  "Gravity Level":
    "How grounding vs uplifting your optimal sound profile is. Lower levels feel more anchored; higher levels feel more expansive.",
  "Fit Index":
    "How well your calibration responses match our sound models. Higher scores mean a more precise match.",
};

const VECTOR_EXPLANATIONS: Record<string, string> = {
  Rhythm: "Preference for slower vs faster rhythmic structures.",
  Density:
    "Preference for layered, rich sound textures vs sparse, minimal ones.",
  Brightness: "Sensitivity to high-frequency detail and tonal clarity.",
  Width: "Preference for wide, spatial sound vs narrow, focused audio.",
  Grounding: "Preference for deep, earthy tones vs airy, elevated ones.",
};

// Insight generator based on regulation vector
function generateInsights(reg: {
  x1: number;
  x2: number;
  x3: number;
  x4: number;
  x5: number;
}) {
  const insights: string[] = [];
  insights.push(reg.x1 > 0 ? "Moderate to fast rhythm" : "Slow, steady rhythm");
  insights.push(reg.x2 > 0 ? "Rich sound density" : "Minimal sound texture");
  insights.push(reg.x4 > 0 ? "Wider sound space" : "Focused, narrow audio");
  return insights;
}

interface Props {
  onRecalibrate: () => void;
  onEnterFocus: (focus_session_id: string) => void;
}

export function CalibrationResult({ onRecalibrate, onEnterFocus }: Props) {
  const { outputs } = useCalibrationStore();
  const [entering, setEntering] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Cleanup preview on unmount
  useEffect(() => {
    return () => {
      if (previewRef.current) {
        previewRef.current.pause();
        previewRef.current = null;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  if (!outputs) return null;

  const loop = outputs.assigned_loop;
  const meta = LOOP_META[loop];
  const loopColor = meta.color;
  const insights = generateInsights(outputs.regulation_vector);

  function togglePreview() {
    if (isPreviewing) {
      // Stop
      if (previewRef.current) {
        previewRef.current.pause();
        previewRef.current = null;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setIsPreviewing(false);
      return;
    }

    setPreviewError(null);
    const url = LOOP_PREVIEW_TRACK[loop] ?? LOOP_PREVIEW_TRACK["Flow"];
    const audio = new Audio(url);
    audio.volume = 0.75;
    previewRef.current = audio;

    audio
      .play()
      .then(() => {
        setIsPreviewing(true);
        // Auto-stop after 30s
        previewTimerRef.current = setTimeout(() => {
          if (previewRef.current) {
            previewRef.current.pause();
            previewRef.current = null;
          }
          setIsPreviewing(false);
        }, 30000);
      })
      .catch((err) => {
        setPreviewError("Could not play preview. Try clicking again.");
        console.error("[CalibrationResult] preview error:", err);
      });
  }

  async function handleEnterFocus() {
    // Stop preview if playing
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current = null;
    }
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
    <div style={{ maxWidth: "640px", width: "100%" }}>
      {/* Header */}
      <div
        className="fade-up"
        style={{ textAlign: "center", marginBottom: "2rem" }}
      >
        <p className="nuree-label" style={{ marginBottom: "0.75rem" }}>
          Your Sound Profile
        </p>
        {/* HERO loop name */}
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
          {loop}
        </h1>
        <p
          className="nuree-body"
          style={{ maxWidth: "360px", margin: "0 auto" }}
        >
          {meta.description}
        </p>
      </div>

      {/* Insight summary */}
      <div
        className="nuree-card fade-up fade-up-delay-1"
        style={{
          padding: "1.5rem",
          marginBottom: "1rem",
          borderColor: `${loopColor}30`,
          background: `linear-gradient(135deg, var(--surface) 0%, ${loopColor}08 100%)`,
        }}
      >
        <p className="nuree-label" style={{ marginBottom: "1rem" }}>
          Your brain prefers
        </p>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {insights.map((insight) => (
            <li
              key={insight}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                fontSize: "0.88rem",
                color: "var(--text)",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: loopColor,
                  flexShrink: 0,
                }}
              />
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* Sound Preview */}
      <div
        className="nuree-card fade-up fade-up-delay-1"
        style={{
          padding: "1.5rem",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          borderColor: isPreviewing ? `${loopColor}50` : "var(--border)",
          background: isPreviewing ? `${loopColor}08` : "var(--surface)",
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
              color: "var(--text)",
              fontFamily: "Playfair Display, serif",
            }}
          >
            {loop}
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
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
                color: "#F5A0A0",
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
            border: `1px solid ${isPreviewing ? loopColor : "var(--border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            color: isPreviewing ? "#080A0F" : "var(--text)",
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
            background: loopColor,
            color: "#080A0F",
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

      {/* Metrics row */}
      <div
        className="fade-up fade-up-delay-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <MetricCard
          label="FSS"
          value={outputs.fss}
          mono
          explanation={METRIC_EXPLANATIONS["FSS"]}
          onTooltip={setTooltip}
        />
        <MetricCard
          label="Gravity Level"
          value={`GL ${outputs.gl}`}
          sub="/5"
          explanation={METRIC_EXPLANATIONS["Gravity Level"]}
          onTooltip={setTooltip}
        />
        <MetricCard
          label="Fit Index"
          value={`${Math.round(outputs.cfi)}`}
          sub="/100"
          explanation={METRIC_EXPLANATIONS["Fit Index"]}
          onTooltip={setTooltip}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.75rem 1rem",
            fontSize: "0.78rem",
            color: "var(--muted)",
            marginBottom: "1rem",
            lineHeight: 1.6,
            animation: "fadeUp 0.2s ease forwards",
          }}
          onClick={() => setTooltip(null)}
        >
          {tooltip}{" "}
          <span style={{ color: "var(--accent)", cursor: "pointer" }}>✕</span>
        </div>
      )}

      {/* Regulation vector */}
      <div
        className="nuree-card fade-up fade-up-delay-3"
        style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
      >
        <p className="nuree-label" style={{ marginBottom: "1.25rem" }}>
          Auditory regulation vector
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { label: "Rhythm", value: outputs.regulation_vector.x1 },
            { label: "Density", value: outputs.regulation_vector.x2 },
            { label: "Brightness", value: outputs.regulation_vector.x3 },
            { label: "Width", value: outputs.regulation_vector.x4 },
            { label: "Grounding", value: outputs.regulation_vector.x5 },
          ].map(({ label, value }) => (
            <VectorBar
              key={label}
              label={label}
              value={value}
              color={loopColor}
              explanation={VECTOR_EXPLANATIONS[label]}
              onTooltip={setTooltip}
            />
          ))}
        </div>
      </div>

      {/* Recalibrate */}
      <div className="fade-up fade-up-delay-4" style={{ textAlign: "center" }}>
        <button className="nuree-btn nuree-btn-ghost" onClick={onRecalibrate}>
          Re-calibrate
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  mono,
  explanation,
  onTooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  explanation: string;
  onTooltip: (msg: string | null) => void;
}) {
  return (
    <div
      className="nuree-card"
      style={{ padding: "1.25rem", textAlign: "center", cursor: "help" }}
      onClick={() => onTooltip(explanation)}
      title={explanation}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.3rem",
          marginBottom: "0.5rem",
        }}
      >
        <p className="nuree-label" style={{ margin: 0 }}>
          {label}
        </p>
        <span
          style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.6 }}
        >
          ⓘ
        </span>
      </div>
      <p
        style={{
          fontSize: mono ? "0.9rem" : "1.5rem",
          fontFamily: mono ? "monospace" : "Playfair Display, serif",
          fontWeight: 400,
          color: "var(--text)",
          letterSpacing: mono ? "0.08em" : "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
        {sub && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              marginLeft: "2px",
            }}
          >
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

function VectorBar({
  label,
  value,
  color,
  explanation,
  onTooltip,
}: {
  label: string;
  value: number;
  color: string;
  explanation: string;
  onTooltip: (msg: string | null) => void;
}) {
  const percent = ((value + 1) / 2) * 100;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.35rem",
          cursor: "help",
        }}
        onClick={() => onTooltip(`${label}: ${explanation}`)}
      >
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          {label}
          <span style={{ fontSize: "0.6rem", opacity: 0.5 }}>ⓘ</span>
        </span>
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
      </div>
      <div
        style={{
          height: "4px",
          background: "var(--border)",
          borderRadius: "4px",
          position: "relative",
          overflow: "visible",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "-2px",
            width: "1px",
            height: "8px",
            background: "rgba(255,255,255,0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            height: "100%",
            borderRadius: "4px",
            background: color,
            left: value >= 0 ? "50%" : `${percent}%`,
            width: `${Math.abs(value) * 50}%`,
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
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
