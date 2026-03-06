'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Download, 
  Share2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  FileText,
  Printer
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssessmentResult } from '@/lib/types/assessment'
import { ASSESSMENT_CONFIG } from '@/lib/types/assessment'
import { motion } from 'framer-motion'

interface AssessmentResultsProps {
  result: AssessmentResult
  onRetake?: () => void
  onViewHistory?: () => void
}

export function AssessmentResults({ result, onRetake, onViewHistory }: AssessmentResultsProps) {
  const [downloading, setDownloading] = useState(false)
  const { assessment, response, interpretation, comparison_to_previous } = result
  const config = ASSESSMENT_CONFIG[assessment.type]
  
  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'none':
      case 'minimal':
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'mild':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'moderate':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'moderate_severe':
      case 'severe':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProgressColor = (level: string) => {
    switch (level) {
      case 'none':
      case 'minimal':
      case 'low':
        return 'bg-green-500'
      case 'mild':
        return 'bg-yellow-500'
      case 'moderate':
        return 'bg-orange-500'
      case 'moderate_severe':
      case 'severe':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDownload = async () => {
    setDownloading(true)
    // TODO: Implement PDF generation
    setTimeout(() => setDownloading(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    // TODO: Implement share with provider functionality
    console.log('Share with provider')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl font-bold text-gray-900">Assessment Complete</h1>
        <p className="text-gray-600">
          {config.displayName} Results
        </p>
      </motion.div>

      {/* Main Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Score</CardTitle>
                <CardDescription>
                  Based on your responses to {assessment.questions.length} questions
                </CardDescription>
              </div>
              <Badge 
                className={cn('text-lg px-4 py-2', getSeverityColor(response.severity_level))}
              >
                {interpretation.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {response.scores.total} / {assessment.questions.length * Math.max(...assessment.questions[0].values)}
                </span>
                <span className="text-sm text-gray-500">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Completed in {formatTime(response.time_taken)}
                </span>
              </div>
              <Progress 
                value={(response.scores.total! / (assessment.questions.length * Math.max(...assessment.questions[0].values))) * 100}
                className={cn('h-3', getProgressColor(response.severity_level))}
              />
            </div>

            {/* Interpretation */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900">What This Means</h3>
              <p className="text-gray-700">{interpretation.description}</p>
              
              <div className="pt-3 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Recommendation</h4>
                <p className="text-gray-700">{interpretation.recommendation}</p>
              </div>
            </div>

            {/* Comparison to Previous */}
            {comparison_to_previous && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Change from Last Assessment</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      Score change: 
                      <span className={cn(
                        'ml-2 font-semibold',
                        comparison_to_previous.score_change < 0 ? 'text-green-600' : 
                        comparison_to_previous.score_change > 0 ? 'text-red-600' : 
                        'text-gray-600'
                      )}>
                        {comparison_to_previous.score_change > 0 && '+'}
                        {comparison_to_previous.score_change}
                        {comparison_to_previous.score_change < 0 && 
                          <TrendingDown className="inline h-4 w-4 ml-1" />
                        }
                        {comparison_to_previous.score_change > 0 && 
                          <TrendingUp className="inline h-4 w-4 ml-1" />
                        }
                      </span>
                    </span>
                    <span className="text-sm">
                      Level: {comparison_to_previous.level_change}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {comparison_to_previous.days_since_last} days since last assessment
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Subscale Results (if applicable) */}
            {result.subscale_interpretations && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Subscale Scores</h3>
                {Object.entries(result.subscale_interpretations).map(([subscale, subInterpretation]) => (
                  <div key={subscale} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium capitalize">{subscale}</span>
                    <Badge className={cn('', getSeverityColor(subInterpretation.level))}>
                      {subInterpretation.label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Important Notice */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Important Notice</AlertTitle>
        <AlertDescription className="text-amber-800">
          This is a screening tool, not a diagnostic assessment. Results should be discussed 
          with a qualified healthcare professional. If you{"'"}re experiencing severe symptoms or 
          having thoughts of self-harm, please seek immediate help.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Generating PDF...' : 'Download Report'}
        </Button>
        
        <Button 
          variant="outline"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleShare}
          className="flex items-center gap-2"
        >
          <Share2 className="h-4 w-4" />
          Share with Provider
        </Button>
        
        {onViewHistory && (
          <Button 
            variant="outline"
            onClick={onViewHistory}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            View History
          </Button>
        )}
        
        {onRetake && config.retakeInterval && (
          <Button 
            variant="outline"
            onClick={onRetake}
            disabled
            className="ml-auto"
          >
            Retake in {config.retakeInterval} days
          </Button>
        )}
      </div>

      {/* Help Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Need Support?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-gray-600">
            If you need immediate support, these resources are available:
          </p>
          <ul className="space-y-1 text-sm">
            <li>• NHS 111 - Call 111 for urgent medical help</li>
            <li>• Samaritans - Call 116 123 (24/7 emotional support)</li>
            <li>• Mind - Call 0300 123 3393 (mental health support)</li>
            <li>• Your GP - Book an appointment to discuss these results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}