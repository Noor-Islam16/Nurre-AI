"use client";

import { useEffect, useState } from "react";

const PROCESSING_MESSAGES = [
  "Analyzing your auditory preferences…",
  "Computing regulation vector…",
  "Matching to focus environments…",
  "Generating your sound profile…",
  "Almost ready…",
];

export function CalibrationProcessing() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="nuree-card fade-up" style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "2rem" }}>
        <ProcessingVisual />
      </div>

      <p className="nuree-label" style={{ marginBottom: "1rem" }}>
        Calibration Complete
      </p>

      <h2
        className="nuree-title"
        style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}
      >
        Generating your
        <br />
        sound profile
      </h2>

      <div style={{ height: "1.5rem", marginBottom: "0.5rem" }}>
        <p
          className="nuree-body"
          style={{
            maxWidth: "320px",
            margin: "0 auto",
            fontSize: "0.85rem",
            transition: "opacity 0.3s ease",
            opacity: visible ? 1 : 0,
          }}
        >
          {PROCESSING_MESSAGES[msgIndex]}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes processDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function ProcessingVisual() {
  return (
    <div
      style={{
        position: "relative",
        width: "80px",
        height: "80px",
        margin: "0 auto",
      }}
    >
      {/* Spinning ring */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{
          animation: "spin 2s linear infinite",
          position: "absolute",
          inset: 0,
        }}
      >
        <circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="2"
        />
        <circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="#059669"
          strokeWidth="2"
          strokeDasharray="40 174"
          strokeLinecap="round"
          strokeDashoffset="0"
        />
      </svg>
      {/* Centre dots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#059669",
              animation: `processDot 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
