"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_QUESTIONS } from "@/lib/assessment/onboarding-questions";
import {
  scoreAssessment,
  validateResponses,
} from "@/lib/assessment/onboarding-scoring";
import { ResultsDisplay } from "@/components/onboarding/results-display";
import { PersonalitySelection } from "@/components/onboarding/personality-selection";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { PersonalityId } from "@/lib/config/personalities";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/assessment/onboarding-questions";
import type { OnboardingResponse } from "@/lib/assessment/onboarding-scoring";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

interface FormData {
  [questionId: number]: any;
}

function OptionButton({
  label,
  selected,
  onClick,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
        "border-2 hover:scale-105 active:scale-95",
        compact ? "px-3 py-2 text-xs" : "px-4 py-3 sm:px-6",
        selected
          ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200"
          : "bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50",
      )}
    >
      {label}
    </button>
  );
}

function SingleWithOther({
  question,
  value,
  onAnswer,
}: {
  question: Question;
  value: any;
  onAnswer: (value: any) => void;
}) {
  const [otherText, setOtherText] = useState("");
  const isOtherSelected =
    value === "other" ||
    (typeof value === "string" &&
      value !== undefined &&
      !question.values?.includes(value));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto w-full">
        {question.options?.map((option, idx) => {
          const val = (question.values?.[idx] || option) as string;
          const isOtherOption = val === "other";
          return (
            <OptionButton
              key={idx}
              label={option}
              selected={isOtherOption ? isOtherSelected : value === val}
              onClick={() => {
                if (isOtherOption) {
                  onAnswer("other");
                } else {
                  onAnswer(val);
                }
              }}
              compact={true}
            />
          );
        })}
      </div>
      {isOtherSelected && (
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="text"
            placeholder="Type your answer..."
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && otherText.trim())
                onAnswer(otherText.trim());
            }}
            className="flex-1 px-4 py-2 border-2 border-violet-300 rounded-xl text-sm focus:outline-none focus:border-violet-600"
            autoFocus
          />
          <button
            onClick={() => {
              if (otherText.trim()) onAnswer(otherText.trim());
            }}
            disabled={!otherText.trim()}
            className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-violet-700 active:scale-95 transition-all"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// Multiselect uses a special wrapper to distinguish toggle vs confirm
type MultiselectEvent =
  | { __multiselectUpdate: true; value: string[] | undefined }
  | { __multiselectConfirm: true; value: string[] };

function MultiSelect({
  question,
  value,
  onAnswer,
}: {
  question: Question;
  value: any;
  onAnswer: (value: MultiselectEvent) => void;
}) {
  const selected: string[] = Array.isArray(value) ? value : [];

  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onAnswer({
      __multiselectUpdate: true,
      value: next.length > 0 ? next : undefined,
    });
  };

  const msColumns =
    question.options && question.options.length > 4
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={cn("grid gap-3 max-w-lg mx-auto w-full", msColumns)}>
        {question.options?.map((option, idx) => {
          const val = (question.values?.[idx] || option) as string;
          return (
            <OptionButton
              key={idx}
              label={option}
              selected={selected.includes(val)}
              onClick={() => toggle(val)}
              compact={true}
            />
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          onClick={() =>
            onAnswer({ __multiselectConfirm: true, value: selected })
          }
          className="mt-2 px-8 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 active:scale-95 transition-all duration-200"
        >
          Continue
        </button>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  value,
  onAnswer,
  questionNumber,
  totalQuestions,
}: {
  question: Question;
  value: any;
  onAnswer: (value: any) => void;
  questionNumber: number;
  totalQuestions: number;
}) {
  const renderOptions = () => {
    switch (question.type) {
      case "likert":
        return (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {LIKERT_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                selected={value === option.value}
                onClick={() => onAnswer(option.value)}
                compact={true}
              />
            ))}
          </div>
        );

      case "frequency":
        return (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {question.options?.map((option, idx) => (
              <OptionButton
                key={idx}
                label={option}
                selected={value === question.values?.[idx]}
                onClick={() => onAnswer(question.values?.[idx])}
              />
            ))}
          </div>
        );

      case "gender":
        return (
          <div className="flex justify-center gap-4">
            {question.options?.map((option, idx) => (
              <OptionButton
                key={idx}
                label={option}
                selected={value === question.values?.[idx]}
                onClick={() => onAnswer(question.values?.[idx])}
              />
            ))}
          </div>
        );

      case "age":
        return (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {question.options?.map((option, idx) => (
              <OptionButton
                key={idx}
                label={option}
                selected={value === question.values?.[idx]}
                onClick={() => onAnswer(question.values?.[idx])}
              />
            ))}
          </div>
        );

      case "onset":
        return (
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            {question.options?.map((option, idx) => (
              <OptionButton
                key={idx}
                label={option}
                selected={value === question.values?.[idx]}
                onClick={() => onAnswer(question.values?.[idx])}
                compact={true}
              />
            ))}
          </div>
        );

      case "single": {
        const columns =
          question.options && question.options.length > 4
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2";
        return (
          <div className={cn("grid gap-3 max-w-lg mx-auto", columns)}>
            {question.options?.map((option, idx) => (
              <OptionButton
                key={idx}
                label={option}
                selected={value === (question.values?.[idx] || option)}
                onClick={() => onAnswer(question.values?.[idx] || option)}
                compact={true}
              />
            ))}
          </div>
        );
      }

      case "multiselect":
        return (
          <MultiSelect question={question} value={value} onAnswer={onAnswer} />
        );

      case "single_with_other":
        return (
          <SingleWithOther
            question={question}
            value={value}
            onAnswer={onAnswer}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="text-center px-4 max-w-2xl mx-auto">
      <p className="text-sm text-violet-600 font-medium mb-2">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-8 leading-relaxed">
        {question.text}
      </h2>
      {renderOptions()}
    </div>
  );
}

function OnboardingProgress({
  current,
  total,
  onPrev,
  onNext,
  canGoBack,
  canGoForward,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}) {
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="flex items-center gap-4 w-full max-w-md mx-auto mb-8">
      <button
        onClick={onPrev}
        disabled={!canGoBack}
        className={cn(
          "p-2 rounded-full transition-all duration-200",
          canGoBack
            ? "text-violet-600 hover:bg-violet-100 active:scale-95"
            : "text-gray-300 cursor-not-allowed",
        )}
        aria-label="Previous question"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <div className="flex-1">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canGoForward}
        className={cn(
          "p-2 rounded-full transition-all duration-200",
          canGoForward
            ? "text-violet-600 hover:bg-violet-100 active:scale-95"
            : "text-gray-300 cursor-not-allowed",
        )}
        aria-label="Next question"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [furthestQuestion, setFurthestQuestion] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [direction, setDirection] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [showPersonalitySelection, setShowPersonalitySelection] =
    useState(false);
  const [results, setResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  const totalQuestions = ONBOARDING_QUESTIONS.length;

  const saveProgress = useCallback(async (data: FormData) => {
    setIsSaving(true);
    try {
      const responses = Object.entries(data).map(([id, response]) => ({
        questionNumber: Number(id),
        response,
      }));
      await fetch("/api/onboarding/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    const checkAuthAndLoadProgress = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: coachRow } = await supabase
          .from("coaches")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (coachRow) {
          router.push("/coach");
          return;
        }

        if (!user.email_confirmed_at) {
          router.push(
            `/confirm-email?email=${encodeURIComponent(user.email || "")}`,
          );
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("onboarding_completed, onboarding_version, name")
          .eq("id", user.id)
          .single();

        if (
          profile?.onboarding_completed &&
          profile?.onboarding_version === 2
        ) {
          router.push("/dashboard");
          return;
        }

        if (profile?.name) setName(profile.name);

        const progressRes = await fetch("/api/onboarding/save-progress");
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          if (
            progressData.formData &&
            Object.keys(progressData.formData).length > 0
          ) {
            setFormData(progressData.formData);
            const answeredIds = Object.keys(progressData.formData).map(Number);
            const maxAnswered = Math.max(...answeredIds);
            const maxIndex = ONBOARDING_QUESTIONS.findIndex(
              (q) => q.id === maxAnswered,
            );
            if (maxIndex !== -1) {
              setFurthestQuestion(maxIndex + 1);
              setCurrentQuestion(Math.min(maxIndex + 1, totalQuestions - 1));
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error checking auth:", error);
        setError("Failed to load. Please refresh the page.");
        setIsLoading(false);
      }
    };

    checkAuthAndLoadProgress();
  }, [router, supabase, totalQuestions]);

  const handleAnswer = async (value: any) => {
    const questionId = ONBOARDING_QUESTIONS[currentQuestion].id;
    const questionType = ONBOARDING_QUESTIONS[currentQuestion].type;

    // Multiselect toggle: just update formData, don't save or advance
    if (questionType === "multiselect" && value?.__multiselectUpdate) {
      setFormData((prev) => ({ ...prev, [questionId]: value.value }));
      return;
    }

    // Multiselect confirm: unwrap real value, then fall through to save + advance
    const actualValue = value?.__multiselectConfirm ? value.value : value;

    const newFormData = { ...formData, [questionId]: actualValue };
    setFormData(newFormData);
    setError("");

    if (currentQuestion >= furthestQuestion) {
      setFurthestQuestion(currentQuestion + 1);
    }

    await saveProgress(newFormData);

    // single_with_other: wait until user submits real text, not just 'other'
    if (questionType === "single_with_other" && actualValue === "other") return;

    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setDirection(1);
        setCurrentQuestion((prev) => prev + 1);
      } else {
        submitAssessment(newFormData);
      }
    }, 300);
  };

  const goToNext = () => {
    if (
      currentQuestion < furthestQuestion &&
      currentQuestion < totalQuestions - 1
    ) {
      setDirection(1);
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestion > 0) {
      setDirection(-1);
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const submitAssessment = async (data: FormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const responses: OnboardingResponse[] = Object.entries(data).map(
        ([id, response]) => ({ questionNumber: Number(id), response }),
      );

      if (!validateResponses(responses)) {
        setError("Please answer all questions before submitting.");
        setIsSubmitting(false);
        return;
      }

      const scoringResult = scoreAssessment(responses);

      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, results: scoringResult }),
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || "Failed to submit assessment");
      }

      setResults(scoringResult);
      setShowResults(true);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit assessment. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePersonalitySelect = async (personalityId: PersonalityId) => {
    setIsSavingPersonality(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("users")
        .update({
          selected_personality: personalityId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      router.push("/onboarding/booking");
    } catch (error) {
      console.error("Error saving personality:", error);
      setError("Failed to save your selection. Please try again.");
    } finally {
      setIsSavingPersonality(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto text-violet-600" />
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (showPersonalitySelection) {
    return (
      <PersonalitySelection
        onSelect={handlePersonalitySelect}
        onBack={() => setShowPersonalitySelection(false)}
        isSubmitting={isSavingPersonality}
        recommendedAvatar={results?.routing?.recommendedAvatar as PersonalityId}
      />
    );
  }

  if (showResults && results) {
    return (
      <ResultsDisplay
        results={results}
        onContinue={() => setShowPersonalitySelection(true)}
        onExport={() => console.log("Export results:", results)}
      />
    );
  }

  const currentQuestionData = ONBOARDING_QUESTIONS[currentQuestion];
  const canGoBack = currentQuestion > 0;
  const canGoForward =
    currentQuestion < furthestQuestion && currentQuestion < totalQuestions - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-8 pb-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-gray-900">
          {name ? `Welcome, ${name}!` : "ADHD Assessment"}
        </h1>
        {isSaving && <p className="text-xs text-violet-500 mt-1">Saving...</p>}
      </div>

      <div className="px-4">
        <OnboardingProgress
          current={currentQuestion}
          total={totalQuestions}
          onPrev={goToPrev}
          onNext={goToNext}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQuestion}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            <QuestionCard
              question={currentQuestionData}
              value={formData[currentQuestionData.id]}
              onAnswer={handleAnswer}
              questionNumber={currentQuestion + 1}
              totalQuestions={totalQuestions}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <div className="fixed bottom-4 left-4 right-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {isSubmitting && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto text-violet-600" />
            <p className="mt-4 text-gray-600">Submitting assessment...</p>
          </div>
        </div>
      )}
    </div>
  );
}
