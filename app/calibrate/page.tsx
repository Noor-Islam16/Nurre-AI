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
  const {
    step,
    error: storeError,
    startCalibration,
    setResult,
    startFocus,
    reset,
  } = useCalibrationStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: ALWAYS start from the default/reset state.
  //
  // Previously this page loaded the user's saved profile and jumped straight
  // to the old result, and the in-memory store kept the previous run — so a
  // new check-in retained the last calibration. Now every visit to the
  // calibrator is a fresh check-in.
  //
  // The saved profile can still be viewed on purpose with /calibrate?view=profile
  useEffect(() => {
    reset();

    const wantsSavedProfile =
      new URLSearchParams(window.location.search).get("view") === "profile";
    if (!wantsSavedProfile) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetProfile();
        if (!cancelled && data.has_profile && data.profile) {
          setResult({
            brain_mode: data.profile.brain_mode,
            flag: data.profile.flag ?? null,
            assigned_loop: data.profile.assigned_loop,
          });
        }
      } catch {
        // No profile or not logged in — fall through to the intro
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBegin() {
    setLoading(true);
    setError(null);
    try {
      const { session_id, first_pair } = await apiStartSession();
      startCalibration(session_id, first_pair);
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

  const visibleError = error || storeError;

  return (
    <CalibrationShell>
      {visibleError && (
        <div
          role="alert"
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
          {visibleError}
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