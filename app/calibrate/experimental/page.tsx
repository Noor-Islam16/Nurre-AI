// app/calibrate/experimental/page.tsx
"use client";

import { useState } from "react";
import { useExperimentalStore } from "@/store/experimentalStore";
import {
  apiExperimentalStartSession,
  apiStartFocusSession,
} from "@/lib/experimentalCalibrationApi";
import { CalibrationShell } from "@/components/CalibrationShell";
import { CalibrationIntro } from "@/components/CalibrationIntro";
import { CalibrationProcessing } from "@/components/CalibrationProcessing";
import { CalibrationResult } from "@/components/CalibrationResult";
import { FocusMode } from "@/components/FocusMode";
import { ExperimentalCalibrationPair } from "@/components/ExperimentalCalibrationPair";

// Re-uses existing Shell, Intro, Processing, Result, FocusMode unchanged
// Only CalibrationPair is swapped for ExperimentalCalibrationPair

export default function ExperimentalCalibratorPage() {
  const { step, startCalibration, setResult, startFocus, reset } =
    useExperimentalStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBegin() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiExperimentalStartSession();
      startCalibration(res.session_id, res.random_pairs);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnterFocus(focus_session_id: string) {
    startFocus(focus_session_id);
  }

  return (
    <CalibrationShell>
      {error && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "8px",
            padding: "0.75rem 1.25rem",
            fontSize: "0.85rem",
            color: "#dc2626",
            zIndex: 100,
            maxWidth: "360px",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {(step === "idle" || step === "intro") && (
        <CalibrationIntro onBegin={handleBegin} loading={loading} />
      )}
      {step === "pair" && <ExperimentalCalibrationPair />}
      {step === "processing" && <CalibrationProcessing />}
      {step === "result" && (
        <CalibrationResult
          onRecalibrate={reset}
          onEnterFocus={handleEnterFocus}
        />
      )}
      {step === "focus" && <FocusMode />}
    </CalibrationShell>
  );
}
