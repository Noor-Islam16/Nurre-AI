// app/calibrate/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useCalibrationStore } from "@/store/calibrationStore";
import { apiGetProfile, apiStartSession } from "@/lib/calibrationApi";
import { CalibrationShell } from "@/components/CalibrationShell";
import { CalibrationIntro } from "@/components/CalibrationIntro";
import { CalibrationPair } from "@/components/CalibrationPair";
import { CalibrationProcessing } from "@/components/CalibrationProcessing";
import { CalibrationResult } from "@/components/CalibrationResult";
import { FocusMode } from "@/components/FocusMode";

export default function CalibratorPage() {
  const { step, startCalibration, setResult, startFocus, reset } =
    useCalibrationStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: check if user already has a profile → skip straight to result
  useEffect(() => {
    async function checkProfile() {
      try {
        const data = await apiGetProfile();
        if (data.has_profile && data.profile) {
          setResult({
            brain_mode: data.profile.brain_mode,
            flag: data.profile.flag ?? null,
            assigned_loop: data.profile.assigned_loop,
            path: data.profile.path,
            path_length: data.profile.path.length,
            model_version: data.profile.model_version,
            key_version: data.profile.key_version,
          });
        }
      } catch {
        // No profile or not logged in — show intro
      }
    }
    checkProfile();
  }, []);

  async function handleBegin() {
    setLoading(true);
    setError(null);
    try {
      const { session_id } = await apiStartSession();
      startCalibration(session_id);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleEnterFocus(focus_session_id: string) {
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
      {step === "pair" && <CalibrationPair />}
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
