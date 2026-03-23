"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, FileDown, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Assessment, AssessmentResponse } from "@/lib/types/assessment";
import { ASSESSMENT_CONFIG } from "@/lib/types/assessment";

interface ResultsListItem {
  assessment: Assessment;
  lastResponse: AssessmentResponse;
  history: AssessmentResponse[];
}

interface ResultsListProps {
  items: ResultsListItem[];
  onShare: (item: ResultsListItem) => void;
  onExportPDF: (item: ResultsListItem) => void;
  onExportCSV: (item: ResultsListItem) => void;
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function generateSparklinePath(
  scores: number[],
  width = 80,
  height = 24,
): string {
  if (scores.length < 2) return "";

  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = max - min || 1;

  return scores
    .map((score, i) => {
      const x = (i / (scores.length - 1)) * width;
      const y = height - ((score - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

// ── Severity helpers ─────────────────────────────────────────────────────────
function getSeverityColor(level: string): string {
  const n = level.toLowerCase();
  if (n === "none" || n === "minimal" || n === "low" || n === "normal")
    return "bg-green-100 text-green-700 border-green-200";
  if (n === "mild") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (n === "moderate")
    return "bg-orange-100 text-orange-700 border-orange-200";
  if (n === "moderate_severe" || n === "severe")
    return "bg-red-100 text-red-700 border-red-200";
  if (n === "extremely_severe") return "bg-red-200 text-red-900 border-red-300";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function formatSeverityLabel(level: string): string {
  return level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Score display — assessment-type aware ────────────────────────────────────
function ScoreDisplay({
  response,
  assessmentType,
}: {
  response: AssessmentResponse;
  assessmentType: string;
}) {
  // ASRS: total = positive Part-A answer count (0–6)
  if (assessmentType === "asrs") {
    const positiveCount =
      response.scores.sections?.["A"] ?? response.scores.total ?? 0;
    return (
      <p className="text-sm text-gray-600">
        Part A:{" "}
        <span className="font-semibold text-gray-800">{positiveCount} / 6</span>{" "}
        positive answers
        {positiveCount >= 4 ? (
          <span className="ml-1.5 text-xs text-orange-600 font-medium">
            (screen positive)
          </span>
        ) : (
          <span className="ml-1.5 text-xs text-green-600 font-medium">
            (screen negative)
          </span>
        )}
      </p>
    );
  }

  // DASS-21: show subscale breakdown if available
  if (assessmentType === "dass21" && response.scores.subscales) {
    const { depression, anxiety, stress } = response.scores.subscales as Record<
      string,
      number
    >;
    return (
      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
        {depression !== undefined && (
          <span>
            Depression:{" "}
            <span className="font-semibold text-gray-800">{depression}</span>
          </span>
        )}
        {anxiety !== undefined && (
          <span>
            Anxiety:{" "}
            <span className="font-semibold text-gray-800">{anxiety}</span>
          </span>
        )}
        {stress !== undefined && (
          <span>
            Stress:{" "}
            <span className="font-semibold text-gray-800">{stress}</span>
          </span>
        )}
      </div>
    );
  }

  // PHQ-9 / GAD-7: simple total
  return (
    <p className="text-sm text-gray-600">
      Score:{" "}
      <span className="font-semibold text-gray-800">
        {response.scores.total ?? "N/A"}
      </span>
    </p>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ResultsList({
  items,
  onShare,
  onExportPDF,
  onExportCSV,
}: ResultsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No assessment results yet</p>
        <p className="text-sm mt-2">
          Complete an assessment to see your results here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const config = ASSESSMENT_CONFIG[item.assessment.type];

        // For sparkline — ASRS uses positive count (sections.A), others use total
        const sparklineScores = item.history
          .map((r) =>
            item.assessment.type === "asrs"
              ? (r.scores.sections?.["A"] ?? r.scores.total ?? 0)
              : (r.scores.total ?? 0),
          )
          .slice(0, 10)
          .reverse();

        const sparklinePath = generateSparklinePath(sparklineScores);

        return (
          <div
            key={item.lastResponse.id}
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {/* ── Left: name + score + severity ── */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">
                  {item.assessment.name}
                </h3>
                {/* Assessment type code badge */}
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs flex-shrink-0",
                    config.color === "purple" &&
                      "bg-purple-100 text-purple-700",
                    config.color === "blue" && "bg-blue-100 text-blue-700",
                    config.color === "amber" && "bg-amber-100 text-amber-700",
                    config.color === "teal" && "bg-teal-100 text-teal-700",
                  )}
                >
                  {config.code}
                </Badge>
                {/* Severity badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium flex-shrink-0",
                    getSeverityColor(item.lastResponse.severity_level),
                  )}
                >
                  {formatSeverityLabel(item.lastResponse.severity_level)}
                </Badge>
              </div>

              {/* Score — type aware */}
              <ScoreDisplay
                response={item.lastResponse}
                assessmentType={item.assessment.type}
              />
            </div>

            {/* ── Centre: sparkline ── */}
            {sparklineScores.length > 1 && (
              <div className="hidden sm:block flex-shrink-0">
                <svg
                  width="80"
                  height="24"
                  className="text-blue-500 overflow-visible"
                >
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-xs text-gray-500 text-center mt-1">
                  {sparklineScores.length} result
                  {sparklineScores.length > 1 ? "s" : ""}
                </p>
              </div>
            )}

            {/* ── Right: date + actions ── */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(item.lastResponse.completed_at).toLocaleDateString(
                    "en-GB",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(item.lastResponse.completed_at).toLocaleTimeString(
                    "en-GB",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare(item)}
                  className="h-8 w-8 p-0"
                  title="Share with GP"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExportPDF(item)}
                  className="h-8 w-8 p-0"
                  title="Export as PDF"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExportCSV(item)}
                  className="h-8 w-8 p-0"
                  title="Export as CSV"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
