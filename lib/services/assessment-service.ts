import { createClient } from '@/lib/supabase/client'
import type {
  Assessment,
  AssessmentResponse,
  AssessmentProgress,
  AssessmentType,
  InterpretationRange,
  AssessmentStats,
  AssessmentResult
} from '@/lib/types/assessment'

// ─── ASRS Screening Threshold Logic ──────────────────────────────────────────
// Per the official ASRS-v1.1 spec (Kessler et al. 2005):
//   Part A Q1–Q3: positive if response >= 2 (Sometimes / Often / Very Often)
//   Part A Q4–Q6: positive if response >= 3 (Often / Very Often)
//   Screen is POSITIVE if 4+ of the 6 Part A items are positive
// We do NOT use a simple sum for ASRS — only Part A (Q1–Q6) matters.
function scoreASRS(responses: Record<number, number>): {
  total: number
  sections: Record<string, number>
  isPositive: boolean
} {
  let positiveCount = 0

  // Q1–Q3: threshold at "Sometimes" (value 2)
  for (let q = 1; q <= 3; q++) {
    if ((responses[q] ?? -1) >= 2) positiveCount++
  }
  // Q4–Q6: threshold at "Often" (value 3)
  for (let q = 4; q <= 6; q++) {
    if ((responses[q] ?? -1) >= 3) positiveCount++
  }

  const isPositive = positiveCount >= 4

  // Synthetic total: map to the interpretation ranges defined in the DB
  // Range "low"      → min:0,  max:13
  // Range "moderate" → min:14, max:24
  // We pick 0 (negative) or 14 (positive) so the range lookup always hits correctly.
  const total = isPositive ? 14 : 0

  // Part-A section score (raw sum of Q1–Q6, kept for reference)
  const partASum = [1, 2, 3, 4, 5, 6].reduce((s, q) => s + (responses[q] ?? 0), 0)

  return { total, sections: { A: partASum }, isPositive }
}

// ─── DASS-21 Subscale Scoring ─────────────────────────────────────────────────
// Per Lovibond & Lovibond (1995):
//   domain_score = sum(domain_questions) × 2
// Subscale thresholds are then applied to these multiplied values.
function scoreDASS21(
  assessment: Assessment,
  responses: Record<number, number>
): { total: number; subscales: Record<string, number> } {
  const subscales: Record<string, number> = {}
  let total = 0

  if (assessment.scoring_rules.subscales) {
    for (const [name, sub] of Object.entries(assessment.scoring_rules.subscales)) {
      const rawSum = sub.questions.reduce((s, qId) => s + (responses[qId] ?? 0), 0)
      const scaledScore = rawSum * 2          // DASS-21 multiplier
      subscales[name] = scaledScore
      total += scaledScore
    }
  }

  return { total, subscales }
}

export class AssessmentService {
  private supabase = createClient()

  // Fetch all available assessments via API route
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

    if (error && error.code !== 'PGRST116') {
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
    let { data, error } = await this.supabase
      .from('assessment_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('assessment_id', assessmentId)
      .single()

    if (error && error.code === 'PGRST116') {
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
      .upsert(
        {
          user_id: userId,
          assessment_id: assessmentId,
          current_question_index: questionIndex,
          responses,
          last_updated: new Date().toISOString()
        },
        { onConflict: 'user_id,assessment_id' }
      )

    if (error) {
      console.error('Error saving assessment progress:', error)
      return false
    }

    return true
  }

  // ─── Complete assessment and save response ──────────────────────────────────
  async completeAssessment(
    userId: string,
    assessment: Assessment,
    responses: Record<number, number>,
    startTime: number
  ): Promise<AssessmentResponse | null> {
    const scores = this.calculateScores(assessment, responses)
    const interpretation = this.getInterpretation(assessment, scores)
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    const { data, error } = await this.supabase
      .from('assessment_responses')
      .insert({
        user_id: userId,
        assessment_id: assessment.id,
        assessment_type: assessment.type,
        responses,
        scores,
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

  // ─── Score Calculation ───────────────────────────────────────────────────────
  // Dispatches to type-specific logic where needed.
  calculateScores(
    assessment: Assessment,
    responses: Record<number, number>
  ): AssessmentResponse['scores'] {
    // ASRS: threshold-based Part A scoring
    if (assessment.type === 'asrs') {
      const { total, sections } = scoreASRS(responses)
      return { total, sections }
    }

    // DASS-21: subscale sum × 2
    if (assessment.type === 'dass21') {
      const { total, subscales } = scoreDASS21(assessment, responses)
      return { total, subscales }
    }

    // PHQ-9 and GAD-7: simple sum of all responses
    const total = Object.values(responses).reduce((sum, v) => sum + v, 0)
    const scores: AssessmentResponse['scores'] = { total }

    // Handle any section scoring if defined (future-proof)
    if (assessment.scoring_rules.sections) {
      scores.sections = {}
      for (const [name, section] of Object.entries(assessment.scoring_rules.sections)) {
        scores.sections[name] = section.questions.reduce(
          (sum, qId) => sum + (responses[qId] ?? 0),
          0
        )
      }
    }

    return scores
  }

  // ─── Interpretation Lookup ───────────────────────────────────────────────────
  // Accepts the full scores object so subscale ranges can be resolved for DASS-21.
  getInterpretation(
    assessment: Assessment,
    scores: AssessmentResponse['scores']
  ): InterpretationRange {
    const { ranges } = assessment.interpretation_guide
    const total = scores.total ?? 0

    for (const range of ranges) {
      if (total >= range.min && total <= range.max) {
        return range
      }
    }

    // Fallback: return the first range
    return ranges[0]
  }

  // Resolve per-subscale interpretations for DASS-21
  getSubscaleInterpretations(
    assessment: Assessment,
    subscaleScores: Record<string, number>
  ): Record<string, InterpretationRange> {
    const result: Record<string, InterpretationRange> = {}
    const subscaleGuides = assessment.interpretation_guide.subscales

    if (!subscaleGuides) return result

    for (const [name, score] of Object.entries(subscaleScores)) {
      const ranges = subscaleGuides[name]
      if (!ranges) continue

      for (const range of ranges) {
        if (score >= range.min && score <= range.max) {
          result[name] = range
          break
        }
      }

      // Fallback
      if (!result[name] && ranges.length > 0) {
        result[name] = ranges[0]
      }
    }

    return result
  }

  // ─── Assessment Statistics ───────────────────────────────────────────────────
  async getAssessmentStats(
    userId: string,
    type: AssessmentType
  ): Promise<AssessmentStats | null> {
    const history = await this.getUserAssessmentHistory(userId, type)

    if (history.length === 0) return null

    const totalScores = history.map(h => h.scores.total ?? 0)
    const averageScore =
      totalScores.reduce((a, b) => a + b, 0) / totalScores.length

    let trend: AssessmentStats['trend'] = 'stable'
    if (history.length >= 3) {
      const recentScores = totalScores.slice(0, 3)
      const scoreDiff = recentScores[0] - recentScores[2]
      if (scoreDiff < -2) trend = 'improving'
      else if (scoreDiff > 2) trend = 'worsening'
    }

    const scoresOverTime = history
      .slice(0, 10)
      .reverse()
      .map(h => ({
        date: h.completed_at,
        score: h.scores.total ?? 0,
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

  // ─── Full Result with Comparison ─────────────────────────────────────────────
  async getAssessmentResult(
    assessment: Assessment,
    response: AssessmentResponse
  ): Promise<AssessmentResult> {
    const interpretation = this.getInterpretation(assessment, response.scores)

    // Subscale interpretations (DASS-21)
    let subscaleInterpretations: Record<string, InterpretationRange> | undefined
    if (response.scores.subscales && assessment.interpretation_guide.subscales) {
      subscaleInterpretations = this.getSubscaleInterpretations(
        assessment,
        response.scores.subscales
      )
    }

    // Previous assessment comparison
    const previousAssessments = await this.getUserAssessmentHistory(
      response.user_id,
      assessment.type
    )

    let comparisonToPrevious: AssessmentResult['comparison_to_previous']
    if (previousAssessments.length > 1) {
      const previous = previousAssessments[1]
      const scoreChange = (response.scores.total ?? 0) - (previous.scores.total ?? 0)
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

  // Check if any critical items were flagged (e.g. PHQ-9 Q9)
  checkCriticalItems(
    assessment: Assessment,
    responses: Record<number, number>
  ): number[] {
    const flaggedItems: number[] = []
    if (assessment.scoring_rules.critical_items) {
      for (const itemId of assessment.scoring_rules.critical_items) {
        if ((responses[itemId] ?? 0) >= 2) {
          flaggedItems.push(itemId)
        }
      }
    }
    return flaggedItems
  }

  generateVerificationCode(responseId: string): string {
    const hash = responseId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return `NHS-${hash.toString(36).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  }
}