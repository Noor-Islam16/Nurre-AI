import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Assessment, InterpretationRange } from '@/lib/types/assessment'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: assessments, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 })
    }

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error in GET /api/assessments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assessment_id, responses, time_taken } = body

    if (!assessment_id || !responses || typeof time_taken !== 'number') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessment_id)
      .single()

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const scores = calculateScores(assessment, responses)
    const severity_level = getSeverityLevel(assessment, scores)

    const { data: response, error: responseError } = await supabase
      .from('assessment_responses')
      .insert({
        user_id: session.user.id,
        assessment_id,
        assessment_type: assessment.type,
        responses,
        scores,
        severity_level,
        time_taken,
        started_at: new Date(Date.now() - time_taken * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        is_complete: true
      })
      .select()
      .single()

    if (responseError) {
      console.error('Error saving assessment response:', responseError)
      return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
    }

    await supabase
      .from('assessment_progress')
      .delete()
      .eq('user_id', session.user.id)
      .eq('assessment_id', assessment_id)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Error in POST /api/assessments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── ASRS Threshold Scoring ───────────────────────────────────────────────────
// Official ASRS-v1.1 Part A screener (Kessler et al. 2005):
//   Q1–Q3 positive at Sometimes (≥2); Q4–Q6 positive at Often (≥3)
//   4+ positive → screen positive → synthetic total of 14 (hits "Possible ADHD" range)
//   <4 positive → screen negative → synthetic total of 0  (hits "Unlikely ADHD" range)
function scoreASRS(responses: Record<number, number>): {
  total: number
  sections: Record<string, number>
} {
  let positiveCount = 0
  for (let q = 1; q <= 3; q++) {
    if ((responses[q] ?? -1) >= 2) positiveCount++
  }
  for (let q = 4; q <= 6; q++) {
    if ((responses[q] ?? -1) >= 3) positiveCount++
  }
  const isPositive = positiveCount >= 4
  const partASum = [1, 2, 3, 4, 5, 6].reduce((s, q) => s + (responses[q] ?? 0), 0)
  return {
    total: isPositive ? 14 : 0,
    sections: { A: partASum }
  }
}

// ─── DASS-21 Subscale Scoring ─────────────────────────────────────────────────
// Per Lovibond & Lovibond (1995): domain_score = sum(domain_questions) × 2
function scoreDASS21(
  assessment: Assessment,
  responses: Record<number, number>
): { total: number; subscales: Record<string, number> } {
  const subscales: Record<string, number> = {}
  let total = 0

  if (assessment.scoring_rules.subscales) {
    for (const [name, sub] of Object.entries(assessment.scoring_rules.subscales as any)) {
      const subData = sub as any
      const rawSum = subData.questions.reduce(
        (s: number, qId: number) => s + (responses[qId] ?? 0),
        0
      )
      const scaled = rawSum * 2
      subscales[name] = scaled
      total += scaled
    }
  }

  return { total, subscales }
}

function calculateScores(
  assessment: Assessment,
  responses: Record<number, number>
): Record<string, any> {
  if (assessment.type === 'asrs') {
    return scoreASRS(responses)
  }

  if (assessment.type === 'dass21') {
    return scoreDASS21(assessment, responses)
  }

  // PHQ-9 / GAD-7: simple sum
  const total = Object.values(responses).reduce((s: number, v: any) => s + v, 0)
  const scores: Record<string, any> = { total }

  if ((assessment.scoring_rules as any).sections) {
    scores.sections = {}
    for (const [name, section] of Object.entries(
      (assessment.scoring_rules as any).sections
    )) {
      const s = section as any
      scores.sections[name] = s.questions.reduce(
        (sum: number, qId: number) => sum + (responses[qId] ?? 0),
        0
      )
    }
  }

  return scores
}

function getSeverityLevel(
  assessment: Assessment,
  scores: Record<string, any>
): string {
  const { ranges } = assessment.interpretation_guide as any
  const total: number = scores.total ?? 0

  for (const range of ranges) {
    if (total >= range.min && total <= range.max) {
      return range.level
    }
  }

  return ranges[0].level
}