// assessment - card.tsx;
("use client");

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Heart,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Assessment,
  AssessmentType,
  AssessmentResponse,
} from "@/lib/types/assessment";
import { ASSESSMENT_CONFIG } from "@/lib/types/assessment";
import { AssessmentService } from "@/lib/services/assessment-service";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AssessmentCardProps {
  assessment: Assessment;
  lastResponse?: AssessmentResponse;
  onStart: () => void;
}

export function AssessmentCard({
  assessment,
  lastResponse,
  onStart,
}: AssessmentCardProps) {
  const [canRetake, setCanRetake] = useState(true);
  const [daysUntilRetake, setDaysUntilRetake] = useState<number>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const assessmentService = new AssessmentService();
  const config = ASSESSMENT_CONFIG[assessment.type];

  // Map icon names to actual components
  const iconMap: Record<string, any> = {
    Brain: Brain,
    Heart: Heart,
    AlertTriangle: AlertTriangle,
    BarChart3: BarChart3,
  };
  const IconComponent = iconMap[config.iconName] || Brain;

  useEffect(() => {
    checkRetakeStatus();
  }, [assessment.type]);

  const checkRetakeStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const result = await assessmentService.canRetakeAssessment(
      user.id,
      assessment.type,
      config.retakeInterval,
    );

    setCanRetake(result.canRetake);
    setDaysUntilRetake(result.daysRemaining);
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case "none":
      case "minimal":
      case "low":
        return "text-green-600 bg-green-50";
      case "mild":
        return "text-yellow-600 bg-yellow-50";
      case "moderate":
        return "text-orange-600 bg-orange-50";
      case "moderate_severe":
      case "severe":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getTrendIcon = () => {
    if (!lastResponse) return null;

    // This would compare with previous assessment
    // For now, returning stable
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const handleStart = () => {
    setLoading(true);
    onStart();
    router.push(`/assessments/${assessment.type}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconComponent className="h-5 w-5 text-gray-700 flex-shrink-0" />
              <span className="line-clamp-2">{config.displayName}</span>
            </CardTitle>
            <CardDescription className="text-sm">
              {assessment.description}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "ml-2 flex-shrink-0",
              config.color === "purple" && "bg-purple-100 text-purple-700",
              config.color === "blue" && "bg-blue-100 text-blue-700",
              config.color === "amber" && "bg-amber-100 text-amber-700",
              config.color === "teal" && "bg-teal-100 text-teal-700",
            )}
          >
            {config.shortName}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Assessment Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{assessment.time_estimate} min</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>{assessment.questions.length} questions</span>
          </div>
        </div>

        {/* Last Result */}
        {lastResponse && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-2 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Last taken</span>
              <span className="font-medium text-gray-900">
                {new Date(lastResponse.completed_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Badge
                className={cn(
                  "font-normal",
                  getSeverityColor(lastResponse.severity_level),
                )}
              >
                {lastResponse.severity_level.replace(/_/g, " ")}
              </Badge>
              {getTrendIcon()}
            </div>
            {lastResponse.scores.total !== undefined && (
              <Progress
                value={
                  (lastResponse.scores.total /
                    (assessment.questions.length * 3)) *
                  100
                }
                className="h-2"
              />
            )}
          </div>
        )}

        {/* Spacer for cards without last response */}
        {!lastResponse && <div className="flex-1" />}

        {/* Action Button */}
        {canRetake ? (
          <Button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeWidth="3"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Starting...
              </>
            ) : lastResponse ? (
              "Retake Assessment"
            ) : (
              "Start Assessment"
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button disabled className="w-full">
              Available in {daysUntilRetake} days
            </Button>
            <p className="text-xs text-center text-gray-500">
              Recommended interval: {config.retakeInterval} days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
