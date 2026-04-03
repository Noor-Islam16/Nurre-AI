// hooks/use-online-sync.ts
//
// Listens for the browser's "online" event and fires syncOfflineResults()
// the moment the client regains connectivity.  Drop this hook into any
// top-level component — it runs once on mount and cleans up on unmount.
"use client";

import { useEffect } from "react";
import { useAssessmentStore } from "@/store/assessment-store";
import { getPendingOfflineResults } from "@/lib/utils/offline-results";

export function useOnlineSync() {
  useEffect(() => {
    const handleOnline = () => {
      // Only bother if there's actually something to sync
      if (getPendingOfflineResults().length === 0) return;

      console.info("[OnlineSync] Network restored — syncing offline results…");
      useAssessmentStore
        .getState()
        .syncOfflineResults()
        .catch((err) =>
          console.warn("[OnlineSync] Sync after reconnect failed:", err),
        );
    };

    window.addEventListener("online", handleOnline);

    // Also attempt immediately if we're already online and have pending items
    if (navigator.onLine && getPendingOfflineResults().length > 0) {
      handleOnline();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
