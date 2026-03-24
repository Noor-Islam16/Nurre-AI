"use client";

import { useState, useRef, useCallback } from "react";
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
  Eye,
  EyeOff,
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

interface DataPoint {
  date: Date;
  score: number;
  assessmentType: string;
  color: string;
  label: string;
  completedAt: string;
  severityLevel: string;
}

interface TooltipState {
  x: number;
  y: number;
  label: string;
  score: number;
  date: string;
  time: string;
  color: string;
  severityLevel: string;
  maxScore: number;
}

// ── Colours ───────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  phq9: "#3b82f6",
  gad7: "#f59e0b",
  asrs: "#8b5cf6",
  dass21: "#14b8a6",
};

function getColorForType(type: string): string {
  return TYPE_COLORS[type] || "#6b7280";
}

// Severity band colors per type (lightest to darkest = low to high)
const SEVERITY_BANDS: Record<
  string,
  { label: string; max: number; alpha: string }[]
> = {
  phq9: [
    { label: "Minimal", max: 4, alpha: "0.06" },
    { label: "Mild", max: 9, alpha: "0.12" },
    { label: "Moderate", max: 14, alpha: "0.18" },
    { label: "Mod. Severe", max: 19, alpha: "0.24" },
    { label: "Severe", max: 27, alpha: "0.30" },
  ],
  gad7: [
    { label: "Minimal", max: 4, alpha: "0.06" },
    { label: "Mild", max: 9, alpha: "0.12" },
    { label: "Moderate", max: 14, alpha: "0.18" },
    { label: "Severe", max: 21, alpha: "0.24" },
  ],
  asrs: [
    { label: "Unlikely", max: 3, alpha: "0.06" },
    { label: "Likely", max: 6, alpha: "0.18" },
  ],
  dass21: [
    { label: "Normal", max: 9, alpha: "0.06" },
    { label: "Mild", max: 12, alpha: "0.12" },
    { label: "Moderate", max: 20, alpha: "0.18" },
    { label: "Severe", max: 27, alpha: "0.24" },
  ],
};

// ── Build chart data ──────────────────────────────────────────────────────────
function buildChartData(historyByType: HistoryByType) {
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
        severityLevel: r.severity_level,
      });
    }
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

// ── SVG coordinate mapper ─────────────────────────────────────────────────────
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

// ── Smooth cubic bezier path from points ─────────────────────────────────────
function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const cur = coords[i];
    const cpx = (prev.x + cur.x) / 2;
    d += ` C ${cpx} ${prev.y} ${cpx} ${cur.y} ${cur.x} ${cur.y}`;
  }
  return d;
}

// ── Area path (filled under the line) ────────────────────────────────────────
function buildAreaPath(
  coords: { x: number; y: number }[],
  bottomY: number,
): string {
  if (coords.length < 2) return "";
  const line = buildSmoothPath(coords);
  return `${line} L ${coords[coords.length - 1].x} ${bottomY} L ${coords[0].x} ${bottomY} Z`;
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

// ── Score summary stats per type ──────────────────────────────────────────────
function buildSummaryStats(byType: Record<string, DataPoint[]>) {
  return Object.entries(byType).map(([type, pts]) => {
    const scores = pts.map((p) => p.score);
    const latest = scores[scores.length - 1];
    const first = scores[0];
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const diff = latest - first;
    const trend: "improved" | "worsened" | "stable" =
      diff < -2 ? "improved" : diff > 2 ? "worsened" : "stable";
    return { type, color: getColorForType(type), latest, avg, trend };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InsightsPanel({
  historyByType,
  assessments,
  recommendation,
  onStartAssessment,
}: InsightsPanelProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);

  const toggleType = useCallback((type: string) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }, []);

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

  const { byType, minDate, maxDate, maxScore } = buildChartData(historyByType);
  const changeBullets = buildChangeBullets(historyByType, assessments);
  const summaryStats = buildSummaryStats(byType);

  // SVG dimensions
  const W = 800;
  const H = 280;
  const PAD_L = 40;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 44;
  const CHART_H = H - PAD_T - PAD_B; // inner chart height
  const BOTTOM_Y = PAD_T + CHART_H;

  const xy = (p: DataPoint) =>
    toXY(p, minDate, maxDate, maxScore, PAD_L, PAD_R, PAD_T, PAD_B, W, H);

  // Y grid lines (5 steps)
  const ySteps = 5;
  const yGrid = Array.from({ length: ySteps + 1 }, (_, i) => ({
    value: Math.round((maxScore * i) / ySteps),
    fraction: i / ySteps,
  }));

  // X date labels (6 ticks)
  const xTicks = 6;
  const dateRange = maxDate.getTime() - minDate.getTime() || 1;
  const xLabels = Array.from({ length: xTicks }, (_, i) => {
    const t = new Date(minDate.getTime() + (dateRange * i) / (xTicks - 1));
    const xPx = PAD_L + (i / (xTicks - 1)) * (W - PAD_L - PAD_R);
    return {
      xPx,
      label: t.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    };
  });

  const handleMouseEnterDot = (
    e: React.MouseEvent<SVGCircleElement>,
    p: DataPoint,
    x: number,
    y: number,
  ) => {
    const dateObj = new Date(p.completedAt);
    setTooltip({
      x,
      y,
      label: p.label,
      score: p.score,
      date: dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: dateObj.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      color: p.color,
      severityLevel: p.severityLevel.replace(/_/g, " "),
      maxScore,
    });
  };

  const TW = 172;
  const TH = 80;

  return (
    <div className="space-y-6">
      {/* ── Timeline Chart ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Score Trends
            <span className="text-xs font-normal text-gray-400 ml-1">
              Last 90 days
            </span>
          </CardTitle>
          <CardDescription>
            Toggle assessments in the legend · hover a dot for details
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaryStats.map(({ type, color, latest, avg, trend }) => {
              const config =
                ASSESSMENT_CONFIG[type as keyof typeof ASSESSMENT_CONFIG];
              const isHidden = hiddenTypes.has(type);
              const trendIcon =
                trend === "improved" ? "↓" : trend === "worsened" ? "↑" : "→";
              const trendColor =
                trend === "improved"
                  ? "text-green-600"
                  : trend === "worsened"
                    ? "text-red-600"
                    : "text-gray-400";
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    isHidden
                      ? "border-gray-200 bg-gray-50 opacity-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      {config?.shortName ?? type.toUpperCase()}
                    </span>
                    {isHidden ? (
                      <EyeOff className="h-3 w-3 text-gray-400" />
                    ) : (
                      <Eye className="h-3 w-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-2xl font-semibold"
                      style={{ color: isHidden ? "#9ca3af" : color }}
                    >
                      {latest}
                    </span>
                    <span className={`text-sm font-medium ${trendColor}`}>
                      {trendIcon}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    avg {avg} · {byType[type]?.length ?? 0} entries
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div
            className="relative overflow-x-auto"
            onMouseLeave={() => setTooltip(null)}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto"
              style={{ minHeight: "280px" }}
            >
              {/* Defs: gradients for area fills */}
              <defs>
                {Object.entries(byType).map(([type, _]) => {
                  const color = getColorForType(type);
                  return (
                    <linearGradient
                      key={`grad-${type}`}
                      id={`area-grad-${type}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                      <stop
                        offset="100%"
                        stopColor={color}
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  );
                })}
              </defs>

              {/* ── Y grid lines + labels ── */}
              {yGrid.map(({ value, fraction }) => {
                const y = PAD_T + (1 - fraction) * CHART_H;
                return (
                  <g key={value}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={W - PAD_R}
                      y2={y}
                      stroke={fraction === 0 ? "#d1d5db" : "#f3f4f6"}
                      strokeWidth={fraction === 0 ? "1" : "1"}
                      strokeDasharray={fraction === 0 ? "0" : "4 3"}
                    />
                    <text
                      x={PAD_L - 6}
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

              {/* ── X axis baseline ── */}
              <line
                x1={PAD_L}
                y1={BOTTOM_Y}
                x2={W - PAD_R}
                y2={BOTTOM_Y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />

              {/* ── X date labels ── */}
              {xLabels.map(({ xPx, label }, i) => (
                <text
                  key={i}
                  x={xPx}
                  y={H - 8}
                  fontSize="10"
                  fill="#9ca3af"
                  textAnchor="middle"
                >
                  {label}
                </text>
              ))}

              {/* ── Per-type area fill + line + dots ── */}
              {Object.entries(byType).map(([type, points]) => {
                if (hiddenTypes.has(type)) return null;
                const color = getColorForType(type);
                const coords = points.map((p) => xy(p));

                const linePath = buildSmoothPath(coords);
                const areaPath = buildAreaPath(coords, BOTTOM_Y);

                return (
                  <g key={type}>
                    {/* Area fill */}
                    {points.length > 1 && (
                      <path d={areaPath} fill={`url(#area-grad-${type})`} />
                    )}

                    {/* Smooth line */}
                    {points.length > 1 && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.85"
                      />
                    )}

                    {/* Dots */}
                    {points.map((p, i) => {
                      const { x, y } = coords[i];
                      return (
                        <g key={i}>
                          {/* Outer pulse ring (latest point only) */}
                          {i === points.length - 1 && (
                            <circle
                              cx={x}
                              cy={y}
                              r="9"
                              fill={color}
                              opacity="0.15"
                            />
                          )}
                          {/* Visible dot */}
                          <circle
                            cx={x}
                            cy={y}
                            r="4.5"
                            fill={color}
                            stroke="white"
                            strokeWidth="2"
                          />
                          {/* Hit target */}
                          <circle
                            cx={x}
                            cy={y}
                            r="10"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={(e) =>
                              handleMouseEnterDot(e, p, x, y)
                            }
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* ── Tooltip ── */}
              {tooltip &&
                (() => {
                  const tx = Math.min(tooltip.x + 14, W - TW - 4);
                  const ty = Math.max(tooltip.y - TH - 12, PAD_T + 2);
                  const pct = Math.round(
                    (tooltip.score / tooltip.maxScore) * 100,
                  );

                  return (
                    <g pointerEvents="none">
                      {/* Shadow layer */}
                      <rect
                        x={tx + 1}
                        y={ty + 1}
                        width={TW}
                        height={TH}
                        rx="8"
                        fill="rgba(0,0,0,0.06)"
                      />
                      {/* Card */}
                      <rect
                        x={tx}
                        y={ty}
                        width={TW}
                        height={TH}
                        rx="8"
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                      {/* Color accent bar */}
                      <rect
                        x={tx}
                        y={ty}
                        width={4}
                        height={TH}
                        rx="8"
                        fill={tooltip.color}
                      />
                      <rect
                        x={tx}
                        y={ty + TH / 2}
                        width={4}
                        height={TH / 2}
                        fill={tooltip.color}
                      />
                      {/* Assessment label */}
                      <text
                        x={tx + 14}
                        y={ty + 18}
                        fontSize="12"
                        fontWeight="600"
                        fill="#111827"
                      >
                        {tooltip.label}
                      </text>
                      {/* Score */}
                      <text
                        x={tx + 14}
                        y={ty + 35}
                        fontSize="13"
                        fontWeight="500"
                        fill={tooltip.color}
                      >
                        {tooltip.score}
                        <tspan fontSize="10" fill="#6b7280" fontWeight="400">
                          {" "}
                          / {tooltip.maxScore} ({pct}%)
                        </tspan>
                      </text>
                      {/* Severity pill bg */}
                      <rect
                        x={tx + 14}
                        y={ty + 42}
                        width={80}
                        height={15}
                        rx="4"
                        fill={tooltip.color}
                        opacity="0.12"
                      />
                      <text
                        x={tx + 20}
                        y={ty + 53}
                        fontSize="10"
                        fill={tooltip.color}
                        fontWeight="500"
                      >
                        {tooltip.severityLevel}
                      </text>
                      {/* Date / time */}
                      <text
                        x={tx + 14}
                        y={ty + 70}
                        fontSize="10"
                        fill="#9ca3af"
                      >
                        {tooltip.date} · {tooltip.time}
                      </text>
                    </g>
                  );
                })()}
            </svg>
          </div>

          {/* ── Legend strip ── */}
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.keys(byType).map((type) => {
              const config =
                ASSESSMENT_CONFIG[type as keyof typeof ASSESSMENT_CONFIG];
              if (!config) return null;
              const isHidden = hiddenTypes.has(type);
              const color = getColorForType(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                    isHidden
                      ? "border-gray-200 text-gray-400 bg-gray-50"
                      : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isHidden ? "#d1d5db" : color }}
                  />
                  {config.shortName}
                </button>
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
                      <Minus className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
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
