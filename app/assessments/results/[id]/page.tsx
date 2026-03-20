'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AssessmentResults } from '@/components/assessments/assessment-results'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AssessmentService } from '@/lib/services/assessment-service'
import type { AssessmentResult } from '@/lib/types/assessment'

export default function AssessmentResultPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const assessmentService = new AssessmentService()

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resultId = params?.id as string

  useEffect(() => {
    if (!resultId) {
      router.replace('/profile?tab=assessments')
      return
    }
    loadResult()
  }, [resultId])

  const loadResult = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      // Fetch the specific response — RLS ensures it belongs to this user
      const { data: response, error: responseError } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('id', resultId)
        .eq('user_id', user.id)
        .single()

      if (responseError || !response) {
        setError('Result not found. It may have been deleted or you may not have permission to view it.')
        setLoading(false)
        return
      }

      // Fetch the corresponding assessment template
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', response.assessment_id)
        .single()

      if (assessmentError || !assessment) {
        setError('Assessment template not found.')
        setLoading(false)
        return
      }

      // Build the full result (interpretation + subscales + comparison)
      const assessmentResult = await assessmentService.getAssessmentResult(
        assessment,
        response
      )

      setResult(assessmentResult)
    } catch (err) {
      console.error('Error loading result:', err)
      setError('Failed to load assessment result. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/profile?tab=assessments')
  }

  const handleRetake = () => {
    if (result) {
      router.push(`/assessments/${result.assessment.type}`)
    }
  }

  const handleViewHistory = () => {
    router.push('/profile?tab=assessments')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-4xl flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto" />
          <p className="text-gray-600">Loading your results…</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
      </div>
    )
  }

  if (!result) return null

  // ── Result ───────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Button>
      </motion.div>

      <AssessmentResults
        result={result}
        onRetake={handleRetake}
        onViewHistory={handleViewHistory}
      />
    </div>
  )
}