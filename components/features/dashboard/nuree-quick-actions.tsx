// components/features/dashboard/nuree-quick-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHECKIN_PROMPT,
  QUICK_FOCUS_MINUTES,
  useNureeActions,
} from "@/hooks/use-nuree-actions";

const BUTTON_CLASS =
  "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm lg:text-base xl:text-lg 2xl:text-xl lg:px-6 lg:py-3 xl:px-8 xl:py-4 lg:h-auto";

/** Homepage: the two fixed shortcut buttons (replaces the old picker block). */
export function NureeHomeActions({ className }: { className?: string }) {
  const { startCheckIn, startQuickFocus } = useNureeActions();
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 xl:gap-4",
        className,
      )}
    >
      <Button onClick={startCheckIn} className={BUTTON_CLASS}>
        Quick <span aria-hidden>🧠</span>&nbsp;Check-In
      </Button>
      <Button onClick={startQuickFocus} className={BUTTON_CLASS}>
        Start {QUICK_FOCUS_MINUTES}-Minute Focus
      </Button>
    </div>
  );
}

/**
 * Text chat: Nuree's proactive first message with clickable options.
 * Shown instantly (client-side) so there is no waiting for the first reply.
 */
export function NureeChatOpener({
  assistantName,
  onDecline,
}: {
  assistantName: string;
  onDecline: () => void;
}) {
  const { startCheckIn, startQuickFocus } = useNureeActions();
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="rounded-2xl bg-white/80 border border-gray-200/60 shadow-sm px-4 py-3 text-left">
        <p className="text-xs text-gray-400 mb-1">{assistantName}</p>
        <p className="text-gray-900 text-base lg:text-lg">{CHECKIN_PROMPT}</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button onClick={startCheckIn} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
          Yes
        </Button>
        <Button onClick={onDecline} variant="outline" className="rounded-full">
          Not now
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={startCheckIn}
          className="px-4 py-2 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 text-sm font-medium transition-colors"
        >
          Quick 🧠 Check-In
        </button>
        <button
          onClick={startQuickFocus}
          className="px-4 py-2 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100 text-sm font-medium transition-colors"
        >
          Start {QUICK_FOCUS_MINUTES}-Minute Focus
        </button>
      </div>
    </div>
  );
}