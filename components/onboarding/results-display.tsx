'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ScoringResult } from '@/lib/assessment/onboarding-scoring';

interface ResultsDisplayProps {
  results: ScoringResult;
  onContinue: () => void;
  onExport?: () => void;
}

const presentationDescriptions = {
  combined: {
    label: 'Combined Presentation',
    description: 'You show significant symptoms in both inattention and hyperactivity-impulsivity domains.',
    color: 'bg-purple-100 text-purple-900 border-purple-300'
  },
  inattentive: {
    label: 'Inattentive Presentation',
    description: 'You primarily experience challenges with focus, organization, and attention to detail.',
    color: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  hyperactive: {
    label: 'Hyperactive-Impulsive Presentation',
    description: 'You primarily experience challenges with restlessness, impulsivity, and hyperactivity.',
    color: 'bg-orange-100 text-orange-900 border-orange-300'
  },
  borderline: {
    label: 'Borderline Symptoms',
    description: 'You show some ADHD-like symptoms that may benefit from support strategies.',
    color: 'bg-yellow-100 text-yellow-900 border-yellow-300'
  },
  negative: {
    label: 'No Significant Symptoms',
    description: 'Your responses don\'t indicate significant ADHD symptoms at this time.',
    color: 'bg-gray-100 text-gray-900 border-gray-300'
  }
};

export function ResultsDisplay({ results, onContinue, onExport }: ResultsDisplayProps) {
  const presentation = presentationDescriptions[results.screen];
  
  const getSeverityLabel = (severity: number) => {
    if (severity >= 75) return 'Severe';
    if (severity >= 50) return 'Moderate';
    if (severity >= 25) return 'Mild';
    return 'Minimal';
  };
  
  const getSeverityColor = (severity: number) => {
    if (severity >= 75) return 'text-red-600';
    if (severity >= 50) return 'text-orange-600';
    if (severity >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-3xl p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Assessment Complete
            </h2>
            <p className="text-gray-600">
              Here are your personalized results
            </p>
          </div>
          
          {/* Main Result */}
          <div className={cn(
            "p-6 rounded-lg border-2",
            presentation.color
          )}>
            <h3 className="text-xl font-semibold mb-2">
              {presentation.label}
            </h3>
            <p className="text-sm leading-relaxed">
              {presentation.description}
            </p>
          </div>
          
          {/* Severity Scores */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Symptom Severity</h4>
            
            <div className="space-y-3">
              {/* Inattention */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Inattention
                  </span>
                  <span className={cn("text-sm font-semibold", getSeverityColor(results.severity.inatt))}>
                    {getSeverityLabel(results.severity.inatt)} ({results.severity.inatt}%)
                  </span>
                </div>
                <Progress value={results.severity.inatt} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {results.counts.inattEndorsed} of 6 symptoms endorsed
                </p>
              </div>
              
              {/* Hyperactivity */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Hyperactivity-Impulsivity
                  </span>
                  <span className={cn("text-sm font-semibold", getSeverityColor(results.severity.hyper))}>
                    {getSeverityLabel(results.severity.hyper)} ({results.severity.hyper}%)
                  </span>
                </div>
                <Progress value={results.severity.hyper} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  {results.counts.hyperEndorsed} of 6 symptoms endorsed
                </p>
              </div>
            </div>
          </div>
          
          {/* Key Indicators */}
          {results.routing.topSignals.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Key Areas for Support</h4>
              <div className="flex flex-wrap gap-2">
                {results.routing.topSignals.map((signal) => (
                  <span
                    key={signal}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                  >
                    {signal.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Important Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Important Note</p>
                <p>
                  This assessment is a screening tool, not a clinical diagnosis. 
                  Please consult with a qualified healthcare professional for proper 
                  evaluation and diagnosis of ADHD.
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onContinue}
              className="flex-1"
              size="lg"
            >
              Choose Your AI Coach
            </Button>
            {onExport && (
              <Button
                onClick={onExport}
                variant="outline"
                size="lg"
              >
                Export Results
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
