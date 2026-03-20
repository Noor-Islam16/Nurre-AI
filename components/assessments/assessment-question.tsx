'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AssessmentType, AssessmentQuestion } from '@/lib/types/assessment'

// Per PDF pages 2-3: each assessment has a specific clinical prompt
// shown above every question exactly as validated in the published instrument
const ASSESSMENT_PROMPTS: Record<AssessmentType, string> = {
  phq9:   'Over the last 2 weeks, how often have you been bothered by the following problems?',
  gad7:   'Over the last 2 weeks, how often have you been bothered by the following problems?',
  asrs:   'How often do you experience the following problems?',
  dass21: 'Please read each statement and indicate how much the statement applied to you over the past week.',
}

interface AssessmentQuestionProps {
  question: AssessmentQuestion
  assessmentType: AssessmentType
  questionNumber: number
  totalQuestions: number
  selectedValue?: number
  onAnswer: (value: number) => void
  onNext: () => void
  onPrevious: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  isLastQuestion: boolean
}

export function AssessmentQuestionComponent({
  question,
  assessmentType,
  questionNumber,
  totalQuestions,
  selectedValue,
  onAnswer,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  isLastQuestion
}: AssessmentQuestionProps) {
  const progress = (questionNumber / totalQuestions) * 100
  const prompt = ASSESSMENT_PROMPTS[assessmentType]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Question {questionNumber} of {totalQuestions}</span>
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
        {/* Clinical Prompt — shown once per assessment, above every question */}
        {prompt && (
          <div className="pb-3 border-b border-gray-100">
            <p className="text-sm text-gray-500 italic leading-relaxed">
              {prompt}
            </p>
          </div>
        )}

        {/* Section label (ASRS Part A / Part B) */}
        {question.section && (
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Part {question.section}
          </span>
        )}

        {/* Question Text */}
        <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
          {question.text}
        </h3>

        {/* Answer Options */}
        <RadioGroup
          value={selectedValue?.toString()}
          onValueChange={(value) => onAnswer(parseInt(value))}
          className="space-y-3"
        >
          {question.options.map((option, index) => {
            const value = question.values[index]
            const isSelected = selectedValue === value

            return (
              <motion.div
                key={value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Label
                  htmlFor={`option-${question.id}-${value}`}
                  className={`
                    flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer
                    transition-all duration-200
                    ${isSelected
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <RadioGroupItem
                    value={value.toString()}
                    id={`option-${question.id}-${value}`}
                    className="flex-shrink-0"
                  />
                  <span className={`flex-1 ${isSelected ? 'text-violet-900 font-medium' : 'text-gray-700'}`}>
                    {option}
                  </span>
                </Label>
              </motion.div>
            )
          })}
        </RadioGroup>

        {/* Navigation */}
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
            {selectedValue !== undefined ? '✓ Answered' : 'Please select an answer'}
          </span>

          <Button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isLastQuestion ? 'Complete' : 'Next'}
            {!isLastQuestion && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </motion.div>

      <p className="text-center text-xs text-gray-400">
        Your answers are saved automatically.
      </p>
    </div>
  )
}