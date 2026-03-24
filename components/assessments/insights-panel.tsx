"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Assessment, AssessmentResponse } from "@/lib/types/assessment";
import { ASSESSMENT_CONFIG } from "@/lib/types/assessment";

interface HistoryByType {
  [assessmentType: string]: AssessmentResponse[];
}

interface InsightsPanelProps {
  historyByType: HistoryByType;
  assessments: Assessment[];
  recommendation: {
    assessment: Assessment | null;
    reason: string;
  };
  onStartAssessment: (assessment: Assessment) => void;
}

// ── Colours ───────────────────────────────────────────────────────────────────
function getColorForType(type: string): string {
  const map: Record<string, string> = {
    phq9: "#3b82f6",
    gad7: "#f59e0b",
    asrs: "#8b5cf6",
    dass21: "#14b8a6",
  };
  return map[type] || "#6b7280";
}

// ── Per-type data point ───────────────────────────────────────────────────────
interface DataPoint {
  date: Date;
  score: number;
  assessmentType: string;
  color: string;
  label: string; // short name e.g. "GAD-7"
  completedAt: string; // ISO string for tooltip display
}

// ── Build data grouped by type, filtered to last 90 days ─────────────────────
function buildChartData(historyByType: HistoryByType): {
  byType: Record<string, DataPoint[]>;
  allPoints: DataPoint[];
  minDate: Date;
  maxDate: Date;
  maxScore: number;
} {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const byType: Record<string, DataPoint[]> = {};
  const allPoints: DataPoint[] = [];

  for (const [type, responses] of Object.entries(historyByType)) {
    const config = ASSESSMENT_CONFIG[type as keyof typeof ASSESSMENT_CONFIG];
    if (!config) continue;

    const pts: DataPoint[] = [];
    for (const r of responses) {
      const date = new Date(r.completed_at);
      if (date < ninetyDaysAgo) continue;

      // ASRS: use positive Part-A count; others: total
      const score =
        type === "asrs"
          ? (r.scores.sections?.["A"] ?? r.scores.total ?? 0)
          : (r.scores.total ?? 0);

      pts.push({
        date,
        score,
        assessmentType: type,
        color: getColorForType(type),
        label: config.shortName,
        completedAt: r.completed_at,
      });
    }

    // Sort oldest → newest
    pts.sort((a, b) => a.date.getTime() - b.date.getTime());
    if (pts.length > 0) {
      byType[type] = pts;
      allPoints.push(...pts);
    }
  }

  allPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

  const dates = allPoints.map((p) => p.date);
  const scores = allPoints.map((p) => p.score);

  return {
    byType,
    allPoints,
    minDate:
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : ninetyDaysAgo,
    maxDate:
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : now,
    maxScore: scores.length > 0 ? Math.max(...scores, 10) : 27,
  };
}

// ── Map a data point to SVG coordinates ──────────────────────────────────────
function toXY(
  point: DataPoint,
  minDate: Date,
  maxDate: Date,
  maxScore: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  width: number,
  height: number,
) {
  const dateRange = maxDate.getTime() - minDate.getTime() || 1;
  const x =
    padL +
    ((point.date.getTime() - minDate.getTime()) / dateRange) *
      (width - padL - padR);
  const y = padT + (1 - point.score / maxScore) * (height - padT - padB);
  return { x, y };
}

// ── X-axis date labels (up to 5 evenly spaced) ───────────────────────────────
function buildXLabels(minDate: Date, maxDate: Date, count = 5) {
  const range = maxDate.getTime() - minDate.getTime();
  return Array.from({ length: count }, (_, i) => {
    const t = minDate.getTime() + (range * i) / (count - 1);
    const d = new Date(t);
    return {
      x: i / (count - 1), // 0..1 fraction
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    };
  });
}

// ── Y-axis grid lines ─────────────────────────────────────────────────────────
function buildYGrid(maxScore: number, steps = 4) {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    value: Math.round((maxScore * i) / steps),
    fraction: i / steps,
  }));
}

// ── Change bullets ────────────────────────────────────────────────────────────
function buildChangeBullets(
  historyByType: HistoryByType,
  assessments: Assessment[],
) {
  const bullets: Array<{
    assessmentName: string;
    change: "improved" | "worsened" | "stable";
    description: string;
  }> = [];

  for (const [type, responses] of Object.entries(historyByType)) {
    if (responses.length < 2) continue;
    const assessment = assessments.find((a) => a.type === type);
    if (!assessment) continue;

    const sorted = [...responses].sort(
      (a, b) =>
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
    );
    const latest = sorted[0];
    const previous = sorted[1];

    const latestScore =
      type === "asrs"
        ? (latest.scores.sections?.["A"] ?? latest.scores.total ?? 0)
        : (latest.scores.total ?? 0);
    const previousScore =
      type === "asrs"
        ? (previous.scores.sections?.["A"] ?? previous.scores.total ?? 0)
        : (previous.scores.total ?? 0);

    const diff = latestScore - previousScore;
    const latestLevel = latest.severity_level.replace(/_/g, " ");
    const previousLevel = previous.severity_level.replace(/_/g, " ");

    let change: "improved" | "worsened" | "stable" = "stable";
    let description = "";

    if (diff < -2) {
      change = "improved";
      description =
        latestLevel !== previousLevel
          ? `${assessment.name}: Improved from ${previousLevel} to ${latestLevel} (score ↓${Math.abs(diff)})`
          : `${assessment.name}: Score decreased by ${Math.abs(diff)} points`;
    } else if (diff > 2) {
      change = "worsened";
      description =
        latestLevel !== previousLevel
          ? `${assessment.name}: Changed from ${previousLevel} to ${latestLevel} (score ↑${diff})`
          : `${assessment.name}: Score increased by ${diff} points`;
    } else {
      change = "stable";
      description = `${assessment.name}: Stable at ${latestLevel}`;
    }

    bullets.push({ assessmentName: assessment.name, change, description });
  }

  const order = { worsened: 0, improved: 1, stable: 2 };
  return bullets.sort((a, b) => order[a.change] - order[b.change]).slice(0, 4);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InsightsPanel({
  historyByType,
  assessments,
  recommendation,
  onStartAssessment,
}: InsightsPanelProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    score: number;
    date: string;
    time: string;
    color: string;
  } | null>(null);

  const hasData = Object.values(historyByType).some((r) => r.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">No assessment data yet</p>
          <p className="text-sm text-gray-500">
            Complete assessments to see insights and trends over time
          </p>
        </CardContent>
      </Card>
    );
  }

  const { byType, allPoints, minDate, maxDate, maxScore } =
    buildChartData(historyByType);
  const changeBullets = buildChangeBullets(historyByType, assessments);

  // SVG dimensions
  const W = 800;
  const H = 260;
  const PAD_L = 36; // left — score labels
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36; // bottom — date labels

  const xy = (p: DataPoint) =>
    toXY(p, minDate, maxDate, maxScore, PAD_L, PAD_R, PAD_T, PAD_B, W, H);

  const xLabels = buildXLabels(minDate, maxDate, 5);
  const yGrid = buildYGrid(maxScore, 4);

  return (
    <div className="space-y-6">
      {/* ── Timeline Chart ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Trends (Last 90 Days)
          </CardTitle>
          <CardDescription>
            Hover over a point to see the exact score, date and time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto relative">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto"
              style={{ minHeight: "260px" }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* ── Y grid lines + labels ── */}
              {yGrid.map(({ value, fraction }) => {
                const y = PAD_T + (1 - fraction) * (H - PAD_T - PAD_B);
                return (
                  <g key={value}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={W - PAD_R}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD_L - 4}
                      y={y + 4}
                      fontSize="10"
                      fill="#9ca3af"
                      textAnchor="end"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* ── X axis line ── */}
              <line
                x1={PAD_L}
                y1={H - PAD_B}
                x2={W - PAD_R}
                y2={H - PAD_B}
                stroke="#e5e7eb"
                strokeWidth="1"
              />

              {/* ── X date labels ── */}
              {xLabels.map(({ x: xFrac, label }, i) => {
                const xPx = PAD_L + xFrac * (W - PAD_L - PAD_R);
                return (
                  <text
                    key={i}
                    x={xPx}
                    y={H - 4}
                    fontSize="10"
                    fill="#9ca3af"
                    textAnchor="middle"
                  >
                    {label}
                  </text>
                );
              })}

              {/* ── Per-type lines + dots ── */}
              {Object.entries(byType).map(([type, points]) => {
                const color = getColorForType(type);

                // Build polyline points string
                const linePts = points
                  .map((p) => {
                    const { x, y } = xy(p);
                    return `${x},${y}`;
                  })
                  .join(" ");

                return (
                  <g key={type}>
                    {/* Line connecting this type's dots */}
                    {points.length > 1 && (
                      <polyline
                        points={linePts}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.6"
                      />
                    )}

                    {/* Dots */}
                    {points.map((p, i) => {
                      const { x, y } = xy(p);
                      const dateObj = new Date(p.completedAt);
                      const dateStr = dateObj.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const timeStr = dateObj.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="7"
                          fill={color}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer"
                          onMouseEnter={() =>
                            setTooltip({
                              x,
                              y,
                              label: p.label,
                              score: p.score,
                              date: dateStr,
                              time: timeStr,
                              color,
                            })
                          }
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* ── Tooltip ── */}
              {tooltip &&
                (() => {
                  const TW = 160;
                  const TH = 62;
                  const tx = Math.min(tooltip.x + 10, W - TW - 4);
                  const ty = Math.max(tooltip.y - TH - 10, PAD_T);

                  return (
                    <g pointerEvents="none">
                      <rect
                        x={tx}
                        y={ty}
                        width={TW}
                        height={TH}
                        rx="6"
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                      />
                      {/* Colour strip */}
                      <rect
                        x={tx}
                        y={ty}
                        width={4}
                        height={TH}
                        rx="2"
                        fill={tooltip.color}
                      />
                      <text
                        x={tx + 12}
                        y={ty + 16}
                        fontSize="11"
                        fontWeight="600"
                        fill="#111827"
                      >
                        {tooltip.label}
                      </text>
                      <text
                        x={tx + 12}
                        y={ty + 30}
                        fontSize="11"
                        fill="#374151"
                      >
                        Score: {tooltip.score}
                      </text>
                      <text
                        x={tx + 12}
                        y={ty + 44}
                        fontSize="10"
                        fill="#6b7280"
                      >
                        {tooltip.date} · {tooltip.time}
                      </text>
                    </g>
                  );
                })()}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 justify-center">
            {Object.keys(byType).map((type) => {
              const config =
                ASSESSMENT_CONFIG[type as keyof typeof ASSESSMENT_CONFIG];
              if (!config) return null;
              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getColorForType(type) }}
                  />
                  <span className="text-sm text-gray-600">
                    {config.shortName}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── What Changed + Next Suggestion ──────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {changeBullets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What Changed</CardTitle>
              <CardDescription>
                Recent changes in your assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {changeBullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {bullet.change === "improved" && (
                      <TrendingDown className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    {bullet.change === "worsened" && (
                      <TrendingUp className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    {bullet.change === "stable" && (
                      <Minus className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-gray-700">
                      {bullet.description}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {recommendation.assessment && (
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Next Suggested Assessment
              </CardTitle>
              <CardDescription>
                Recommended based on your history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {recommendation.assessment.name}
                </h4>
                <p className="text-sm text-gray-600">{recommendation.reason}</p>
              </div>
              <Button
                onClick={() => onStartAssessment(recommendation.assessment!)}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Start Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
