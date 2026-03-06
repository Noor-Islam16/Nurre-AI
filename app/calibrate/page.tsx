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
  const {
    step,
    session_id,
    startCalibration,
    setPairState,
    setResult,
    startFocus,
    reset,
  } = useCalibrationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: check if user already has a profile → skip to result
  useEffect(() => {
    async function checkProfile() {
      try {
        const data = await apiGetProfile();
        if (data.has_profile && data.profile) {
          setResult({
            fss: data.profile.fss,
            gl: data.profile.gl,
            cfi: data.profile.cfi,
            assigned_loop: data.profile.assigned_loop as any,
            regulation_vector: { x1: 0, x2: 0, x3: 0, x4: 0, x5: 0 },
            model_version: "nuree_cal_v1",
            key_version: "key_v1",
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
      // startCalibration sets step → 'pair' directly (skips intro)
      startCalibration(session_id);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      console.error("[handleBegin]", err);
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
            background: "#2A1A1A",
            border: "1px solid #7A3A3A",
            borderRadius: "8px",
            padding: "0.75rem 1.25rem",
            fontSize: "0.85rem",
            color: "#F5A0A0",
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
