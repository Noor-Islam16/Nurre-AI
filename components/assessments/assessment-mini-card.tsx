// assessment - mini - card.tsx;
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, HelpCircle, Calendar, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Assessment } from "@/lib/types/assessment";
import { ASSESSMENT_CONFIG } from "@/lib/types/assessment";

interface AssessmentMiniCardProps {
  assessment: Assessment;
  lastTaken?: Date;
  hasResume?: boolean;
  onStart: () => void;
  onDetails: () => void;
}

export function AssessmentMiniCard({
  assessment,
  lastTaken,
  hasResume = false,
  onStart,
  onDetails,
}: AssessmentMiniCardProps) {
  const config = ASSESSMENT_CONFIG[assessment.type];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        {/* Header: Name + Chips */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {assessment.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Render tags from config */}
            {config.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
              >
                {tag}
              </Badge>
            ))}
            {/* Code Badge */}
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                config.color === "purple" && "bg-purple-100 text-purple-700",
                config.color === "blue" && "bg-blue-100 text-blue-700",
                config.color === "amber" && "bg-amber-100 text-amber-700",
                config.color === "teal" && "bg-teal-100 text-teal-700",
              )}
            >
              {config.code}
            </Badge>
          </div>
        </div>

        {/* One-liner Purpose */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {config.purposeOneLiner}
        </p>

        {/* Spacer to push meta and CTA to bottom */}
        <div className="flex-1" />

        {/* Meta Row */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{config.minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{config.questions} Q</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs">
              {lastTaken ? `Last: ${formatDate(lastTaken)}` : "Last: —"}
            </span>
          </div>
          {hasResume && (
            <Badge
              variant="outline"
              className="text-xs bg-violet-50 text-violet-700 border-violet-200"
            >
              <PlayCircle className="h-3 w-3 mr-1" />
              Resume
            </Badge>
          )}
        </div>

        {/* CTA Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={onStart}
              className="bg-violet-600 hover:bg-violet-700 text-white"
              size="sm"
            >
              Start
            </Button>
            <Button
              onClick={onDetails}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              Details
            </Button>
          </div>
          <span className="text-xs text-gray-500">+3 pts</span>
        </div>
      </CardContent>
    </Card>
  );
}
