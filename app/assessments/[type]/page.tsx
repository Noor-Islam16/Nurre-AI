'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AssessmentQuestionComponent } from '@/components/assessments/assessment-question'
import { SafetyInterstitialModal } from '@/components/assessments/safety-interstitial-modal'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle, Clock, Save, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AssessmentService } from '@/lib/services/assessment-service'
import { useAssessmentStore } from '@/store/assessment-store'
import { isValidAssessmentType, ASSESSMENT_CONFIG } from '@/lib/types/assessment'
import type { AssessmentType } from '@/lib/types/assessment'

export default function AssessmentFlowPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const assessmentService = new AssessmentService()

  const {
    currentAssessment,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    saveProgress,
    completeAssessment,
    clearCurrentAssessment
  } = useAssessmentStore()

  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSafetyInterstitial, setShowSafetyInterstitial] = useState(false)
  const [safetyHandled, setSafetyHandled] = useState(false)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)

  const assessmentType = params?.type as string

  useEffect(() => {
    if (!isValidAssessmentType(assessmentType)) {
      router.replace('/profile?tab=assessments')
      return
    }
    initializeAssessment()
  }, [assessmentType])

  const initializeAssessment = async () => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    if (
      currentAssessment &&
      currentAssessment.assessment.type === assessmentType &&
      !currentAssessment.isComplete
    ) { setLoading(false); return }

    const assessment = await assessmentService.getAssessment(assessmentType as AssessmentType)
    if (!assessment) {
      setError('Assessment not found. Please go back and try again.')
      setLoading(false)
      return
    }

    const progress = await assessmentService.getOrCreateProgress(user.id, assessment.id)

    if (progress && progress.responses && Object.keys(progress.responses).length > 0) {
      useAssessmentStore.setState({
        currentAssessment: {
          assessment,
          currentQuestionIndex: progress.current_question_index,
          responses: progress.responses as Record<number, number>,
          startTime: new Date(progress.started_at).getTime(),
          isComplete: false
        }
      })
    } else {
      try {
        const key = `assessment-progress:${user.id}:${assessmentType}`
        const saved = localStorage.getItem(key)
        if (saved) {
          const p = JSON.parse(saved)
          useAssessmentStore.setState({
            currentAssessment: {
              assessment,
              currentQuestionIndex: p.index ?? 0,
              responses: p.responses ?? {},
              startTime: p.startTime ?? Date.now(),
              isComplete: false
            }
          })
        } else {
          useAssessmentStore.getState().startAssessment(assessment)
        }
      } catch {
        useAssessmentStore.getState().startAssessment(assessment)
      }
    }

    setLoading(false)
  }

  // Auto-save every 5s
  useEffect(() => {
    if (!currentAssessment || currentAssessment.isComplete) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      setSaving(true)
      await saveProgress()
      setSaving(false)
    }, 5000)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [currentAssessment?.responses])

  const handleAnswer = useCallback((value: number) => {
    if (!currentAssessment) return
    const question = currentAssessment.assessment.questions[currentAssessment.currentQuestionIndex]
    answerQuestion(question.id, value)
    // PHQ-9 Q9 safety gate
    if (currentAssessment.assessment.type === 'phq9' && question.id === 9 && value > 0 && !safetyHandled) {
      setShowSafetyInterstitial(true)
    }
  }, [currentAssessment, answerQuestion, safetyHandled])

  const handleNext = useCallback(async () => {
    if (!currentAssessment || showSafetyInterstitial) return
    if (currentAssessment.isComplete) { await handleComplete(); return }
    nextQuestion()
  }, [currentAssessment, showSafetyInterstitial, nextQuestion])

  const handleComplete = async () => {
    if (!currentAssessment) return
    setCompleting(true)
    try {
      const response = await completeAssessment()
      if (response) {
        router.push(`/assessments/results/${response.id}`)
      } else {
        setError('Failed to save your results. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  const handlePrevious = useCallback(() => previousQuestion(), [previousQuestion])

  const handleExit = async () => {
    if (currentAssessment && !currentAssessment.isComplete) {
      setSaving(true); await saveProgress(); setSaving(false)
    }
    clearCurrentAssessment()
    router.push('/profile?tab=assessments')
  }

  const handleSafetyContinue = () => {
    setSafetyHandled(true)
    setShowSafetyInterstitial(false)
    if (currentAssessment && !currentAssessment.isComplete) nextQuestion()
  }

  const handleSafetyStop = async () => {
    setSafetyHandled(true)
    setShowSafetyInterstitial(false)
    if (currentAssessment) { setSaving(true); await saveProgress(); setSaving(false) }
    clearCurrentAssessment()
    router.push('/profile?tab=assessments&showCrisis=true')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
          <p className="text-gray-600">Loading assessment…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/profile?tab=assessments')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Assessments
        </Button>
      </div>
    )
  }

  if (!currentAssessment) return null

  const config = ASSESSMENT_CONFIG[currentAssessment.assessment.type]
  const currentQuestion = currentAssessment.assessment.questions[currentAssessment.currentQuestionIndex]
  const selectedValue = currentAssessment.responses[currentQuestion.id]
  const isLast = currentAssessment.currentQuestionIndex === currentAssessment.assessment.questions.length - 1

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={handleExit} className="flex items-center gap-2 text-gray-600">
            <ArrowLeft className="h-4 w-4" /> Exit
          </Button>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {saving && (
              <span className="flex items-center gap-1 text-violet-600">
                <Save className="h-3.5 w-3.5 animate-pulse" /> Saving…
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> ~{currentAssessment.assessment.time_estimate} min
            </span>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{config.displayName}</h1>
          <p className="text-sm text-gray-500">{currentAssessment.assessment.description}</p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <AssessmentQuestionComponent
          key={currentQuestion.id}
          question={currentQuestion}
          assessmentType={currentAssessment.assessment.type}
          questionNumber={currentAssessment.currentQuestionIndex + 1}
          totalQuestions={currentAssessment.assessment.questions.length}
          selectedValue={selectedValue}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoNext={selectedValue !== undefined && !completing}
          canGoPrevious={currentAssessment.currentQuestionIndex > 0}
          isLastQuestion={isLast}
        />
      </AnimatePresence>

      <AnimatePresence>
        {currentAssessment.isComplete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {completing ? 'Saving your results…' : 'All questions answered — click "Complete" to see your results.'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-xs text-gray-400">
        Your progress is saved automatically. You can exit and resume later.
      </p>

      <SafetyInterstitialModal
        open={showSafetyInterstitial}
        onContinue={handleSafetyContinue}
        onStop={handleSafetyStop}
      />
    </div>
  )
}