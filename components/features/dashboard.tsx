"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/store/dashboard-store";
import { useTaskStore } from "@/store/task-store";
import { useRewardsStore } from "@/store/rewards-store";
import { DashboardCardSkeleton } from "@/components/ui/skeleton-loader";
import { DynamicBackground } from "@/components/ui/dynamic-background";
import { BookingReminderSection } from "./dashboard/BookingReminderSection";

// Import dashboard components
import { NureeAISection } from "./dashboard/nuree-ai-section";
import { DashboardSummaryBar } from "./dashboard/dashboard-summary-bar";

interface DashboardProps {
  sessionId: string | null;
}

export function Dashboard({ sessionId }: DashboardProps) {
  // Keep store subscription to allow child widgets to update independently
  useDashboardStore();
  const { fetchTasks } = useTaskStore();
  const { fetchRewards, fetchGrowthPoints, claimDailyBonus } =
    useRewardsStore();
  const didInitRef = useRef(false);

  // Initialize data on mount
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchTasks();
    fetchRewards();
    fetchGrowthPoints();
    claimDailyBonus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Do not gate entire dashboard on global loading; child widgets handle their own loading states

  return (
    <div className="min-h-screen">
      <DynamicBackground />
      <div className="w-full max-w-[min(92vw,2200px)] mx-auto px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-2 pb-4 md:pb-6 xl:pb-8 2xl:pb-10 space-y-4 xl:space-y-6 2xl:space-y-8">
        {/* AI Section - Dominates the screen */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <NureeAISection sessionId={sessionId || undefined} fullHeight />
        </motion.div>

        {/* Booking Reminder - Conditional */}
        <BookingReminderSection />

        {/* Minimal Summary Bar */}
        <DashboardSummaryBar />
      </div>
    </div>
  );
}
