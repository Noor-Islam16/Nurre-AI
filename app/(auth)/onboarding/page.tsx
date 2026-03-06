'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ONBOARDING_QUESTIONS } from '@/lib/assessment/onboarding-questions';
import { scoreAssessment, validateResponses } from '@/lib/assessment/onboarding-scoring';
import { ResultsDisplay } from '@/components/onboarding/results-display';
import { PersonalitySelection } from '@/components/onboarding/personality-selection';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { PersonalityId } from '@/lib/config/personalities';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/assessment/onboarding-questions';
import type { OnboardingResponse } from '@/lib/assessment/onboarding-scoring';

// Animation variants for slide transitions
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

// Likert scale labels (for likert type questions)
const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' }
];

interface FormData {
  [questionId: number]: any;
}

// Horizontal option button component
function OptionButton({
  label,
  selected,
  onClick,
  compact = false
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
          : "bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50"
      )}
    >
      {label}
    </button>
  );
}

// Question card component with horizontal options
function QuestionCard({
  question,
  value,
  onAnswer,
  questionNumber,
  totalQuestions
}: {
  question: Question;
  value: any;
  onAnswer: (value: any) => void;
  questionNumber: number;
  totalQuestions: number;
}) {
  const renderOptions = () => {
    switch (question.type) {
      case 'likert':
        return (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {LIKERT_OPTIONS.map(option => (
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

      case 'frequency':
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

      case 'gender':
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

      case 'age':
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

      case 'onset':
        // 2x2 grid for longer options
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

      case 'single':
        // For distraction question - can be 2 or 3 columns based on count
        const columns = question.options && question.options.length > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2';
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

// Progress bar with navigation
function OnboardingProgress({
  current,
  total,
  onPrev,
  onNext,
  canGoBack,
  canGoForward
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
            : "text-gray-300 cursor-not-allowed"
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
            : "text-gray-300 cursor-not-allowed"
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
  const [showPersonalitySelection, setShowPersonalitySelection] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  const totalQuestions = ONBOARDING_QUESTIONS.length;

  // Save progress to Supabase
  const saveProgress = useCallback(async (data: FormData) => {
    setIsSaving(true);
    try {
      const responses = Object.entries(data).map(([id, response]) => ({
        questionNumber: Number(id),
        response
      }));

      await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Check authorization and load saved progress
  useEffect(() => {
    const checkAuthAndLoadProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // Check if user is a coach
        const { data: coachRow } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (coachRow) {
          router.push('/coach');
          return;
        }

        // Check email confirmation
        if (!user.email_confirmed_at) {
          router.push(`/confirm-email?email=${encodeURIComponent(user.email || '')}`);
          return;
        }

        // Check if already completed
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_completed, onboarding_version, name')
          .eq('id', user.id)
          .single();

        if (profile?.onboarding_completed && profile?.onboarding_version === 2) {
          router.push('/dashboard');
          return;
        }

        if (profile?.name) {
          setName(profile.name);
        }

        // Load saved progress from Supabase
        const progressRes = await fetch('/api/onboarding/save-progress');
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          if (progressData.formData && Object.keys(progressData.formData).length > 0) {
            setFormData(progressData.formData);
            // Set furthest question based on saved answers
            const answeredIds = Object.keys(progressData.formData).map(Number);
            const maxAnswered = Math.max(...answeredIds);
            // Find the index of the question with that ID
            const maxIndex = ONBOARDING_QUESTIONS.findIndex(q => q.id === maxAnswered);
            if (maxIndex !== -1) {
              setFurthestQuestion(maxIndex + 1);
              // Start at the next unanswered question or last answered
              setCurrentQuestion(Math.min(maxIndex + 1, totalQuestions - 1));
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setError('Failed to load. Please refresh the page.');
        setIsLoading(false);
      }
    };

    checkAuthAndLoadProgress();
  }, [router, supabase, totalQuestions]);

  // Handle answer selection
  const handleAnswer = async (value: any) => {
    const questionId = ONBOARDING_QUESTIONS[currentQuestion].id;

    // Update form data
    const newFormData = {
      ...formData,
      [questionId]: value
    };
    setFormData(newFormData);
    setError('');

    // Update furthest question if advancing
    if (currentQuestion >= furthestQuestion) {
      setFurthestQuestion(currentQuestion + 1);
    }

    // Save progress
    await saveProgress(newFormData);

    // Auto-advance to next question (with slight delay for visual feedback)
    setTimeout(() => {
      if (currentQuestion < totalQuestions - 1) {
        setDirection(1);
        setCurrentQuestion(prev => prev + 1);
      } else {
        // Last question - submit
        submitAssessment(newFormData);
      }
    }, 300);
  };

  // Navigation
  const goToNext = () => {
    if (currentQuestion < furthestQuestion && currentQuestion < totalQuestions - 1) {
      setDirection(1);
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestion > 0) {
      setDirection(-1);
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Submit assessment
  const submitAssessment = async (data: FormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Transform formData to expected format
      const responses: OnboardingResponse[] = Object.entries(data).map(([id, response]) => ({
        questionNumber: Number(id),
        response
      }));

      // Validate all questions are answered
      if (!validateResponses(responses)) {
        setError('Please answer all questions before submitting.');
        setIsSubmitting(false);
        return;
      }

      // Calculate results locally first
      const scoringResult = scoreAssessment(responses);

      // Submit to API
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, results: scoringResult })
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData.error || 'Failed to submit assessment');
      }

      setResults(scoringResult);
      setShowResults(true);

    } catch (error) {
      console.error('Error submitting assessment:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle personality selection
  const handlePersonalitySelect = async (personalityId: PersonalityId) => {
    setIsSavingPersonality(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Save personality selection to database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          selected_personality: personalityId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Navigate to booking page
      router.push('/onboarding/booking');
    } catch (error) {
      console.error('Error saving personality:', error);
      setError('Failed to save your selection. Please try again.');
    } finally {
      setIsSavingPersonality(false);
    }
  };

  // Handle back from personality selection to results
  const handleBackToResults = () => {
    setShowPersonalitySelection(false);
  };

  // Loading state
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

  // Show personality selection
  if (showPersonalitySelection) {
    return (
      <PersonalitySelection
        onSelect={handlePersonalitySelect}
        onBack={handleBackToResults}
        isSubmitting={isSavingPersonality}
      />
    );
  }

  // Show results if complete
  if (showResults && results) {
    return (
      <ResultsDisplay
        results={results}
        onContinue={() => setShowPersonalitySelection(true)}
        onExport={() => {
          console.log('Export results:', results);
        }}
      />
    );
  }

  const currentQuestionData = ONBOARDING_QUESTIONS[currentQuestion];
  const canGoBack = currentQuestion > 0;
  const canGoForward = currentQuestion < furthestQuestion && currentQuestion < totalQuestions - 1;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-8 pb-4 px-4 text-center">
        <h1 className="text-lg font-semibold text-gray-900">
          {name ? `Welcome, ${name}!` : 'ADHD Assessment'}
        </h1>
        {isSaving && (
          <p className="text-xs text-violet-500 mt-1">Saving...</p>
        )}
      </div>

      {/* Progress bar with navigation */}
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

      {/* Question area */}
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

      {/* Error message */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Submitting overlay */}
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
