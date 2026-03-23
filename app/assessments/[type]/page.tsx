// app/assessments/[type]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssessmentQuestionComponent } from "@/components/assessments/assessment-question";
import { AssessmentResults } from "@/components/assessments/assessment-results";
import { SafetyInterstitialModal } from "@/components/assessments/safety-interstitial-modal";
import { useAssessmentStore } from "@/store/assessment-store";
import { createClient } from "@/lib/supabase/client";
import { AssessmentService } from "@/lib/services/assessment-service";
import {
  ASSESSMENT_CONFIG,
  isValidAssessmentType,
} from "@/lib/types/assessment";
import type { Assessment } from "@/lib/types/assessment";
import { ArrowLeft, AlertCircle, Clock, Save, CheckCircle } from "lucide-react";

export default function AssessmentFlowPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const assessmentService = new AssessmentService();

  const {
    currentAssessment,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    saveProgress,
    completeAssessment,
    clearCurrentAssessment,
  } = useAssessmentStore();

  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [showSafetyInterstitial, setShowSafetyInterstitial] = useState(false);
  const [pendingNextQuestion, setPendingNextQuestion] = useState(false);

  // ── FIX: hold a stable ref to the assessment object so it survives
  // clearCurrentAssessment() nulling out the Zustand store mid-async call
  const assessmentRef = useRef<Assessment | null>(null);

  const assessmentType = params.type as string;

  useEffect(() => {
    if (!isValidAssessmentType(assessmentType)) {
      router.push("/profile?tab=assessments");
      return;
    }
    initializeAssessment();
  }, [assessmentType]);

  // Keep ref in sync with store
  useEffect(() => {
    if (currentAssessment?.assessment) {
      assessmentRef.current = currentAssessment.assessment;
    }
  }, [currentAssessment]);

  // Auto-save every 5 seconds of inactivity
  useEffect(() => {
    if (currentAssessment && !currentAssessment.isComplete) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);

      const timer = setTimeout(async () => {
        setSaving(true);
        await saveProgress();
        setSaving(false);
      }, 5000);

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [currentAssessment?.responses]);

  const initializeAssessment = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);

    if (
      !currentAssessment ||
      currentAssessment.assessment.type !== assessmentType
    ) {
      const assessment = await assessmentService.getAssessment(
        assessmentType as any,
      );
      if (!assessment) {
        router.push("/profile?tab=assessments");
        return;
      }

      const progress = await assessmentService.getOrCreateProgress(
        user.id,
        assessment.id,
      );
      if (progress && Object.keys(progress.responses).length > 0) {
        useAssessmentStore.setState({
          currentAssessment: {
            assessment,
            currentQuestionIndex: progress.current_question_index,
            responses: progress.responses as Record<number, number>,
            startTime: new Date(progress.started_at).getTime(),
            isComplete: false,
          },
        });
      } else {
        useAssessmentStore.getState().startAssessment(assessment);
      }
    }

    setLoading(false);
  };

  const handleAnswer = (value: number) => {
    if (!currentAssessment) return;

    const currentQuestion =
      currentAssessment.assessment.questions[
        currentAssessment.currentQuestionIndex
      ];
    answerQuestion(currentQuestion.id, value);

    // PHQ-9 Q9 safety check
    if (
      currentAssessment.assessment.type === "phq9" &&
      currentQuestion.id === 9 &&
      value > 0
    ) {
      setShowSafetyInterstitial(true);
      setPendingNextQuestion(true);
      logSafetyEvent();
    }
  };

  const logSafetyEvent = async () => {
    if (!user) return;
    try {
      await supabase.from("events").insert({
        user_id: user.id,
        type: "assessment_safety_interstitial",
        data: {
          assessment_type: "phq9",
          question_id: 9,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to log safety event:", error);
    }
  };

  const handleNext = async () => {
    if (!currentAssessment) return;
    if (pendingNextQuestion) return;

    if (currentAssessment.isComplete) {
      // ── Snapshot the assessment BEFORE completeAssessment() clears the store
      // currentAssessment will be null by the time the await resolves
      const snapshotAssessment =
        assessmentRef.current ?? currentAssessment.assessment;

      setCompleting(true);

      try {
        const response = await completeAssessment();

        if (response && snapshotAssessment) {
          const assessmentResult = await assessmentService.getAssessmentResult(
            snapshotAssessment,
            response,
          );
          setResult(assessmentResult);
          setShowResult(true);
        }
      } catch (error) {
        console.error("Error completing assessment:", error);
      } finally {
        setCompleting(false);
      }
    } else {
      nextQuestion();
    }
  };

  const handleSafetyInterstitialContinue = () => {
    setShowSafetyInterstitial(false);
    setPendingNextQuestion(false);
    if (currentAssessment && !currentAssessment.isComplete) {
      nextQuestion();
    }
  };

  const handleSafetyInterstitialStop = async () => {
    if (currentAssessment && !currentAssessment.isComplete) {
      setSaving(true);
      await saveProgress();
      setSaving(false);
    }
    setShowSafetyInterstitial(false);
    setPendingNextQuestion(false);
    clearCurrentAssessment();
    router.push("/assessments?showCrisis=true");
  };

  const handlePrevious = () => previousQuestion();

  const handleExit = async () => {
    if (currentAssessment && !currentAssessment.isComplete) {
      setSaving(true);
      await saveProgress();
      setSaving(false);
    }
    clearCurrentAssessment();
    router.push("/profile?tab=assessments");
  };

  const handleRetake = () => {
    if (assessmentRef.current) {
      useAssessmentStore.getState().startAssessment(assessmentRef.current);
      setShowResult(false);
      setResult(null);
    }
  };

  const handleViewHistory = () => {
    router.push("/assessments?tab=history");
  };

  // ── Completing spinner — shown while saving result + fetching interpretation
  if (completing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Calculating your results...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Initial loading spinner
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Results screen
  if (showResult && result) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AssessmentResults
          result={result}
          onRetake={handleRetake}
          onViewHistory={handleViewHistory}
        />
      </div>
    );
  }

  // ── Error guard — only reached if genuinely no assessment loaded
  // (completing flag prevents this from showing during the async completion)
  if (!currentAssessment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Unable to load assessment. Please try again.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push("/profile?tab=assessments")}
          className="mt-4"
        >
          Back to Assessments
        </Button>
      </div>
    );
  }

  const config = ASSESSMENT_CONFIG[currentAssessment.assessment.type];
  const currentQuestion =
    currentAssessment.assessment.questions[
      currentAssessment.currentQuestionIndex
    ];
  const selectedValue = currentAssessment.responses[currentQuestion.id];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={handleExit}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Assessment
          </Button>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            {saving && (
              <span className="flex items-center gap-1 text-green-600">
                <Save className="h-4 w-4 animate-pulse" />
                Saving...
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />~
              {currentAssessment.assessment.time_estimate} min
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {config.displayName}
          </h1>
          <p className="text-gray-600">
            {currentAssessment.assessment.description}
          </p>
        </div>
      </motion.div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <AssessmentQuestionComponent
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentAssessment.currentQuestionIndex + 1}
          totalQuestions={currentAssessment.assessment.questions.length}
          selectedValue={selectedValue}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={selectedValue !== undefined}
          canGoPrevious={currentAssessment.currentQuestionIndex > 0}
          isLastQuestion={
            currentAssessment.currentQuestionIndex ===
            currentAssessment.assessment.questions.length - 1
          }
          assessmentType={currentAssessment.assessment.type}
        />
      </AnimatePresence>

      {/* Completion message */}
      {currentAssessment.isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8"
        >
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Great job! You&apos;ve answered all questions. Click
              &quot;Complete&quot; to see your results.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Your progress is saved automatically. You can exit and resume this
          assessment later.
        </p>
      </div>

      <SafetyInterstitialModal
        open={showSafetyInterstitial}
        onContinue={handleSafetyInterstitialContinue}
        onStop={handleSafetyInterstitialStop}
      />
    </div>
  );
}
