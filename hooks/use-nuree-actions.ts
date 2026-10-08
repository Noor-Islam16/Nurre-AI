// hooks/use-nuree-actions.ts
// Single source of truth for the two primary Nuree actions, shared by the
// homepage buttons, the text-chat quick replies and the voice agent.
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export const CHECKIN_PROMPT = "Shall we do a quick nervous system check-in?";
export const QUICK_FOCUS_MINUTES = 15;

export const CHECKIN_ROUTE = "/calibrate";
export const QUICK_FOCUS_ROUTE = `/focus?duration=${QUICK_FOCUS_MINUTES}`;

const AFFIRMATIVE_RE =
  /^\s*(yes|yeah|yep|yup|sure|ok|okay|please|let'?s do it|let'?s go|go ahead|do it|y)[\s.!]*$/i;

export function isAffirmative(text: string): boolean {
  return AFFIRMATIVE_RE.test(text);
}

export function useNureeActions() {
  const router = useRouter();

  // The calibrator always starts from a fresh state (see /calibrate page).
  const startCheckIn = useCallback(() => {
    router.push(CHECKIN_ROUTE);
  }, [router]);

  const startQuickFocus = useCallback(() => {
    router.push(QUICK_FOCUS_ROUTE);
  }, [router]);

  return { startCheckIn, startQuickFocus };
}