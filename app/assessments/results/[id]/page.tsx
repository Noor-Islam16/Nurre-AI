// app / assessments / results / [id] / page.tsx;
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { AssessmentResults } from "@/components/assessments/assessment-results";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { AssessmentService } from "@/lib/services/assessment-service";
import { ArrowLeft, AlertCircle } from "lucide-react";
import type { AssessmentResult } from "@/lib/types/assessment";

export default function AssessmentResultPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const assessmentService = new AssessmentService();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultId = params.id as string;

  useEffect(() => {
    loadResult();
  }, [resultId]);

  const loadResult = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch the assessment response
      const { data: response, error: responseError } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("id", resultId)
        .eq("user_id", user.id)
        .single();

      if (responseError || !response) {
        setError("Assessment result not found");
        setLoading(false);
        return;
      }

      // Fetch the assessment template
      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", response.assessment_id)
        .single();

      if (assessmentError || !assessment) {
        setError("Assessment template not found");
        setLoading(false);
        return;
      }

      // Get the complete result with interpretations
      const assessmentResult = await assessmentService.getAssessmentResult(
        assessment,
        response,
      );

      setResult(assessmentResult);
    } catch (err) {
      console.error("Error loading result:", err);
      setError("Failed to load assessment result");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/assessments?tab=history");
  };

  const handleRetake = () => {
    if (result) {
      router.push(`/assessments/${result.assessment.type}`);
    }
  };

  const handleViewHistory = () => {
    router.push("/assessments?tab=history");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assessment result...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert className="border-red-200 bg-red-50 mb-4">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button onClick={handleBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Button>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to History
        </Button>
      </motion.div>

      {/* Results Component */}
      <AssessmentResults
        result={result}
        onRetake={handleRetake}
        onViewHistory={handleViewHistory}
      />
    </div>
  );
}
