"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  AssessmentQuestion,
  AssessmentType,
} from "@/lib/types/assessment";

interface AssessmentQuestionProps {
  question: AssessmentQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedValue?: number;
  onAnswer: (value: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastQuestion: boolean;
  assessmentType?: AssessmentType;
}

export function AssessmentQuestionComponent({
  question,
  questionNumber,
  totalQuestions,
  selectedValue,
  onAnswer,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  isLastQuestion,
  assessmentType,
}: AssessmentQuestionProps) {
  const progress = (questionNumber / totalQuestions) * 100;

  // ASRS uses frequency labels (Never → Very Often) that map to internal
  // threshold values — showing "(X pts)" is misleading. Hide for ASRS.
  const showPointValue = assessmentType !== "asrs";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Question {questionNumber} of {totalQuestions}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-lg shadow-sm border p-6 space-y-6"
      >
        {/* Question Text */}
        <div className="space-y-2">
          {question.section && (
            <span className="text-sm text-gray-500 uppercase tracking-wide">
              Section {question.section}
            </span>
          )}
          <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
            {question.text}
          </h3>
        </div>

        {/* Answer Options */}
        <RadioGroup
          value={selectedValue?.toString()}
          onValueChange={(value) => onAnswer(parseInt(value))}
          className="space-y-3"
        >
          {question.options.map((option, index) => {
            const value = question.values[index];
            const isSelected = selectedValue === value;

            return (
              <motion.div
                key={value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Label
                  htmlFor={`option-${value}`}
                  className={`
                    flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer
                    transition-all duration-200
                    ${
                      isSelected
                        ? "border-accent-500 bg-accent-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }
                  `}
                >
                  <RadioGroupItem
                    value={value.toString()}
                    id={`option-${value}`}
                    className="flex-shrink-0"
                  />
                  <span
                    className={`flex-1 ${isSelected ? "text-accent-900 font-medium" : "text-gray-700"}`}
                  >
                    {option}
                  </span>
                  {showPointValue && (
                    <span
                      className={`text-sm ${isSelected ? "text-accent-600" : "text-gray-400"}`}
                    >
                      ({value} pts)
                    </span>
                  )}
                </Label>
              </motion.div>
            );
          })}
        </RadioGroup>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-gray-500">
            {selectedValue !== undefined
              ? "✓ Answered"
              : "Please select an answer"}
          </span>

          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
          >
            {isLastQuestion ? "Complete" : "Next"}
            {!isLastQuestion && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </motion.div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Select the option that best describes how often you experience this.
        </p>
        <p className="mt-1">Your answers are saved automatically.</p>
      </div>
    </div>
  );
}
