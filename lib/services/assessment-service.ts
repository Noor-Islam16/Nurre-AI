import { createClient } from '@/lib/supabase/client'
import type { 
  Assessment, 
  AssessmentResponse, 
  AssessmentProgress, 
  AssessmentType,
  ScoreCalculationResult,
  InterpretationRange,
  AssessmentStats,
  AssessmentResult
} from '@/lib/types/assessment'

export class AssessmentService {
  private supabase = createClient()

  // Fetch all available assessments via API route (server-side auth is
  // always reliable — avoids RLS timing issues during client-side navigation)
  async getAssessments(): Promise<Assessment[]> {
    try {
      const res = await fetch('/api/assessments')
      if (!res.ok) {
        console.error('Error fetching assessments:', res.status)
        return []
      }
      const data = await res.json()
      return data.assessments || []
    } catch (error) {
      console.error('Error fetching assessments:', error)
      return []
    }
  }

  // Get a specific assessment by type
  async getAssessment(type: AssessmentType): Promise<Assessment | null> {
    const { data, error } = await this.supabase
      .from('assessments')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching assessment:', error)
      return null
    }

    return data
  }

  // Get user's assessment history
  async getUserAssessmentHistory(
    userId: string,
    type?: AssessmentType
  ): Promise<AssessmentResponse[]> {
    let query = this.supabase
      .from('assessment_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })

    if (type) {
      query = query.eq('assessment_type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching assessment history:', error)
      return []
    }

    return data || []
  }

  // Get user's last assessment of a specific type
  async getLastAssessment(
    userId: string,
    type: AssessmentType
  ): Promise<AssessmentResponse | null> {
    const { data, error } = await this.supabase
      .from('assessment_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_type', type)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching last assessment:', error)
    }

    return data || null
  }

  // Check if user can retake an assessment
  async canRetakeAssessment(
    userId: string,
    type: AssessmentType,
    retakeIntervalDays: number
  ): Promise<{ canRetake: boolean; daysRemaining?: number }> {
    const lastAssessment = await this.getLastAssessment(userId, type)
    
    if (!lastAssessment) {
      return { canRetake: true }
    }

    const daysSinceLastAssessment = Math.floor(
      (Date.now() - new Date(lastAssessment.completed_at).getTime()) / 
      (1000 * 60 * 60 * 24)
    )

    const canRetake = daysSinceLastAssessment >= retakeIntervalDays
    const daysRemaining = canRetake 
      ? undefined 
      : retakeIntervalDays - daysSinceLastAssessment

    return { canRetake, daysRemaining }
  }

  // Get or create assessment progress
  async getOrCreateProgress(
    userId: string,
    assessmentId: string
  ): Promise<AssessmentProgress | null> {
    // First try to get existing progress
    let { data, error } = await this.supabase
      .from('assessment_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .single()

    if (error && error.code === 'PGRST116') { // Not found, create new
      const { data: newProgress, error: createError } = await this.supabase
        .from('assessment_progress')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          current_question_index: 0,
          responses: {},
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating assessment progress:', createError)
        return null
      }

      return newProgress
    }

    if (error) {
      console.error('Error fetching assessment progress:', error)
      return null
    }

    return data
  }

  // Save assessment progress
  async saveProgress(
    userId: string,
    assessmentId: string,
    questionIndex: number,
    responses: Record<number, number>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('assessment_progress')
      .upsert({
        user_id: userId,
        assessment_id: assessmentId,
        current_question_index: questionIndex,
        responses,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id,assessment_id'
      })

    if (error) {
      console.error('Error saving assessment progress:', error)
      return false
    }

    return true
  }

  // Complete assessment and save response
  async completeAssessment(
    userId: string,
    assessment: Assessment,
    responses: Record<number, number>,
    startTime: number
  ): Promise<AssessmentResponse | null> {
    // Calculate scores
    const scores = this.calculateScores(assessment, responses)
    
    // Get interpretation
    const interpretation = this.getInterpretation(
      assessment,
      scores.total || 0
    )

    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    // Save response
    const { data, error } = await this.supabase
      .from('assessment_responses')
      .insert({
        user_id: userId,
        assessment_id: assessment.id,
        assessment_type: assessment.type,
        responses,
        scores: scores,
        severity_level: interpretation.level,
        time_taken: timeTaken,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        is_complete: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving assessment response:', error)
      return null
    }

    // Clear progress
    await this.clearProgress(userId, assessment.id)

    return data
  }

  // Clear assessment progress
  async clearProgress(userId: string, assessmentId: string): Promise<void> {
    await this.supabase
      .from('assessment_progress')
      .delete()
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
  }

  // Calculate assessment scores
  calculateScores(
    assessment: Assessment,
    responses: Record<number, number>
  ): AssessmentResponse['scores'] {
    const { scoring_rules } = assessment
    const scores: AssessmentResponse['scores'] = {}

    // Calculate total score if needed
    if (scoring_rules.total_score !== false) {
      const total = Object.values(responses).reduce((sum, value) => sum + value, 0)
      scores.total = total
    }

    // Calculate section scores
    if (scoring_rules.sections) {
      scores.sections = {}
      for (const [sectionName, section] of Object.entries(scoring_rules.sections)) {
        const sectionScore = section.questions.reduce((sum, qId) => {
          return sum + (responses[qId] || 0)
        }, 0)
        scores.sections[sectionName] = sectionScore
      }
    }

    // Calculate subscale scores (for DASS-21)
    if (scoring_rules.subscales) {
      scores.subscales = {}
      for (const [subscaleName, subscale] of Object.entries(scoring_rules.subscales)) {
        const subscaleScore = subscale.questions.reduce((sum, qId) => {
          return sum + (responses[qId] || 0)
        }, 0)
        scores.subscales[subscaleName] = subscaleScore
      }
    }

    return scores
  }

  // Get interpretation for score
  getInterpretation(
    assessment: Assessment,
    score: number
  ): InterpretationRange {
    const { ranges } = assessment.interpretation_guide

    for (const range of ranges) {
      if (score >= range.min && score <= range.max) {
        return range
      }
    }

    // Default to first range if no match
    return ranges[0]
  }

  // Get assessment statistics for dashboard
  async getAssessmentStats(
    userId: string,
    type: AssessmentType
  ): Promise<AssessmentStats | null> {
    const history = await this.getUserAssessmentHistory(userId, type)
    
    if (history.length === 0) {
      return null
    }

    // Calculate statistics
    const totalScores = history.map(h => h.scores.total || 0)
    const averageScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length

    // Determine trend (comparing last 3 assessments)
    let trend: AssessmentStats['trend'] = 'stable'
    if (history.length >= 3) {
      const recentScores = totalScores.slice(0, 3)
      const scoreDiff = recentScores[0] - recentScores[2]
      if (scoreDiff < -2) trend = 'improving'
      else if (scoreDiff > 2) trend = 'worsening'
    }

    // Format scores over time (last 10 assessments)
    const scoresOverTime = history.slice(0, 10).reverse().map(h => ({
      date: h.completed_at,
      score: h.scores.total || 0,
      severity_level: h.severity_level
    }))

    return {
      assessment_type: type,
      total_taken: history.length,
      last_taken: history[0].completed_at,
      average_score: Math.round(averageScore * 10) / 10,
      trend,
      scores_over_time: scoresOverTime
    }
  }

  // Get complete assessment result with comparisons
  async getAssessmentResult(
    assessment: Assessment,
    response: AssessmentResponse
  ): Promise<AssessmentResult> {
    const interpretation = this.getInterpretation(
      assessment,
      response.scores.total || 0
    )

    // Get subscale interpretations if available
    let subscaleInterpretations: Record<string, InterpretationRange> | undefined
    if (response.scores.subscales && assessment.interpretation_guide.subscales) {
      subscaleInterpretations = {}
      for (const [subscale, score] of Object.entries(response.scores.subscales)) {
        const ranges = assessment.interpretation_guide.subscales[subscale]
        if (ranges) {
          for (const range of ranges) {
            if (score >= range.min && score <= range.max) {
              subscaleInterpretations[subscale] = range
              break
            }
          }
        }
      }
    }

    // Get previous assessment for comparison
    const previousAssessments = await this.getUserAssessmentHistory(
      response.user_id,
      assessment.type
    )
    
    let comparisonToPrevious: AssessmentResult['comparison_to_previous']
    if (previousAssessments.length > 1) {
      const previous = previousAssessments[1] // Second item is the previous one
      const scoreChange = (response.scores.total || 0) - (previous.scores.total || 0)
      const daysSinceLast = Math.floor(
        (new Date(response.completed_at).getTime() - 
         new Date(previous.completed_at).getTime()) / 
        (1000 * 60 * 60 * 24)
      )

      comparisonToPrevious = {
        score_change: scoreChange,
        level_change: `${previous.severity_level} → ${response.severity_level}`,
        days_since_last: daysSinceLast
      }
    }

    return {
      assessment,
      response,
      interpretation,
      subscale_interpretations: subscaleInterpretations,
      comparison_to_previous: comparisonToPrevious
    }
  }

  // Generate verification code for export
  generateVerificationCode(responseId: string): string {
    // Simple hash for verification (in production, use crypto)
    const hash = responseId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)
    
    return `NHS-${hash.toString(36).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  }

  // Check if any critical items were flagged
  checkCriticalItems(
    assessment: Assessment,
    responses: Record<number, number>
  ): number[] {
    const { scoring_rules } = assessment
    const flaggedItems: number[] = []

    if (scoring_rules.critical_items) {
      for (const itemId of scoring_rules.critical_items) {
        // Flag if response is 2 or higher (on 0-3 scale)
        if (responses[itemId] >= 2) {
          flaggedItems.push(itemId)
        }
      }
    }

    return flaggedItems
  }
}