"use client";

import { useEffect, useState } from "react";
import { useCalibrationStore, LOOP_META } from "@/store/calibrationStore";
import { apiStartFocusSession } from "@/lib/calibrationApi";

interface Props {
  onRecalibrate: () => void;
  onEnterFocus: (focus_session_id: string) => void;
}

export function CalibrationResult({ onRecalibrate, onEnterFocus }: Props) {
  const { outputs } = useCalibrationStore();
  const [entering, setEntering] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!outputs) return null;

  const loop = outputs.assigned_loop;
  const meta = LOOP_META[loop];
  const loopColor = meta.color;

  async function handleEnterFocus() {
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
        className={`fade-up ${revealed ? "" : ""}`}
        style={{ textAlign: "center", marginBottom: "2rem" }}
      >
        <p className="nuree-label" style={{ marginBottom: "0.75rem" }}>
          Calibration complete
        </p>
        <h1 className="nuree-title" style={{ marginBottom: "0.5rem" }}>
          Your sound profile
        </h1>
      </div>

      {/* Loop assignment — hero card */}
      <div
        className="nuree-card fade-up fade-up-delay-1"
        style={{
          textAlign: "center",
          marginBottom: "1rem",
          borderColor: `${loopColor}40`,
          background: `linear-gradient(135deg, var(--surface) 0%, ${loopColor}10 100%)`,
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: `${loopColor}20`,
            border: `1px solid ${loopColor}60`,
            margin: "0 auto 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoopIcon color={loopColor} />
        </div>

        <p
          className="nuree-label"
          style={{ marginBottom: "0.5rem", color: loopColor }}
        >
          Assigned loop
        </p>
        <h2
          style={{
            fontFamily: "Playfair Display, Georgia, serif",
            fontSize: "2.25rem",
            fontWeight: 400,
            color: "var(--text)",
            marginBottom: "0.75rem",
            letterSpacing: "-0.02em",
          }}
        >
          {loop}
        </h2>
        <p
          className="nuree-body"
          style={{ maxWidth: "340px", margin: "0 auto 2rem" }}
        >
          {meta.description}
        </p>

        <button
          className="nuree-btn nuree-btn-primary"
          onClick={handleEnterFocus}
          disabled={entering}
          style={{ background: loopColor, color: "#080A0F" }}
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
          marginBottom: "1.5rem",
        }}
      >
        <MetricCard label="FSS" value={outputs.fss} mono />
        <MetricCard label="Gravity Level" value={`GL ${outputs.gl}`} sub="/5" />
        <MetricCard
          label="Fit Index"
          value={`${Math.round(outputs.cfi)}`}
          sub="/100"
        />
      </div>

      {/* Regulation vector */}
      <div
        className="nuree-card fade-up fade-up-delay-3"
        style={{ padding: "1.5rem" }}
      >
        <p className="nuree-label" style={{ marginBottom: "1.25rem" }}>
          Auditory regulation vector
        </p>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
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
            />
          ))}
        </div>
      </div>

      {/* Recalibrate */}
      <div
        className="fade-up fade-up-delay-4"
        style={{ textAlign: "center", marginTop: "1.5rem" }}
      >
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
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div
      className="nuree-card"
      style={{ padding: "1.25rem", textAlign: "center" }}
    >
      <p className="nuree-label" style={{ marginBottom: "0.5rem" }}>
        {label}
      </p>
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
}: {
  label: string;
  value: number;
  color: string;
}) {
  // value is -1 to +1, map to 0–100% with 50% as centre
  const percent = ((value + 1) / 2) * 100;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.35rem",
        }}
      >
        <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          {label}
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
        {/* Centre mark */}
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
        {/* Bar fill from centre */}
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

function LoopIcon({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 9l3-3-3-3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
