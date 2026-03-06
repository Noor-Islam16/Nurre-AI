'use client';

import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentSection: number;
  totalSections: number;
  currentQuestion: number;
  totalQuestions: number;
}

export function ProgressIndicator({
  currentSection,
  totalSections,
  currentQuestion,
  totalQuestions
}: ProgressIndicatorProps) {
  const progressPercentage = Math.round((currentQuestion / totalQuestions) * 100);
  
  const sectionNames = [
    'Profile',
    'Core Symptoms',
    'Distractions',
    'Impact'
  ];
  
  return (
    <div className="space-y-4 mb-6">
      {/* Section indicators */}
      <div className="flex justify-between items-center">
        {Array.from({ length: totalSections }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center flex-1"
          >
            <div className="flex items-center w-full">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  i < currentSection
                    ? "bg-primary-600 text-white"
                    : i === currentSection
                    ? "bg-primary-600 text-white ring-4 ring-primary-200"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {i < currentSection ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              
              {i < totalSections - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2",
                    i < currentSection
                      ? "bg-primary-600"
                      : "bg-gray-200"
                  )}
                />
              )}
            </div>
            
            <span className={cn(
              "text-xs mt-2 text-center hidden sm:block",
              i <= currentSection ? "text-gray-900 font-medium" : "text-gray-500"
            )}>
              {sectionNames[i]}
            </span>
          </div>
        ))}
      </div>
      
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Overall Progress</span>
          <span className="font-medium">{currentQuestion} of {totalQuestions} questions</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary-600 to-primary-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500">
          {progressPercentage}% complete
        </div>
      </div>
    </div>
  );
}