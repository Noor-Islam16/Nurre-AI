import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all active assessments
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
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { assessment_id, responses, time_taken } = body

    // Validate input
    if (!assessment_id || !responses || typeof time_taken !== 'number') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Fetch the assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', assessment_id)
      .single()

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Calculate scores based on assessment type
    const scores = calculateScores(assessment, responses)
    const severity_level = getSeverityLevel(assessment, scores.total || 0)

    // Save the assessment response
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

    // Clear any progress for this assessment
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

function calculateScores(assessment: any, responses: Record<number, number>) {
  const { scoring_rules } = assessment
  const scores: any = {}

  // Calculate total score
  if (scoring_rules.total_score !== false) {
    scores.total = Object.values(responses).reduce((sum: number, value: any) => sum + value, 0)
  }

  // Calculate section scores
  if (scoring_rules.sections) {
    scores.sections = {}
    for (const [sectionName, section] of Object.entries(scoring_rules.sections as any)) {
      const sectionData = section as any
      const sectionScore = sectionData.questions.reduce((sum: number, qId: number) => {
        return sum + (responses[qId] || 0)
      }, 0)
      scores.sections[sectionName] = sectionScore
    }
  }

  // Calculate subscale scores (for DASS-21)
  if (scoring_rules.subscales) {
    scores.subscales = {}
    for (const [subscaleName, subscale] of Object.entries(scoring_rules.subscales as any)) {
      const subscaleData = subscale as any
      const subscaleScore = subscaleData.questions.reduce((sum: number, qId: number) => {
        return sum + (responses[qId] || 0)
      }, 0)
      scores.subscales[subscaleName] = subscaleScore
    }
  }

  return scores
}

function getSeverityLevel(assessment: any, totalScore: number): string {
  const { ranges } = assessment.interpretation_guide

  for (const range of ranges) {
    if (totalScore >= range.min && totalScore <= range.max) {
      return range.level
    }
  }

  return ranges[0].level // Default to first level
}