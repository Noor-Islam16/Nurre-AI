import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRequest } from '@/lib/validation/validate-request'
import { CreateBreathingSessionSchema, BreathingSessionsQuerySchema } from '@/lib/validation/api-schemas'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate query parameters
    const { searchParams } = new URL(req.url)

    const queryParams = {
      limit: searchParams.get('limit') || undefined,
      pattern: searchParams.get('pattern') || undefined
    }

    let validatedParams: any
    try {
      validatedParams = BreathingSessionsQuerySchema.parse(queryParams)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    const { limit = 20, pattern } = validatedParams

    // Build query
    let query = supabase
      .from('breathing_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })

    // Filter by pattern if provided
    if (pattern) {
      query = query.eq('pattern_id', pattern)
    }

    // Apply limit
    query = query.limit(limit)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching breathing sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Breathing sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(req, CreateBreathingSessionSchema)
    if (validation.error) return validation.error

    const { patternId, durationSeconds, cyclesCompleted, stressLevelBefore, stressLevelAfter } = validation.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create breathing session
    const { data: session, error } = await supabase
      .from('breathing_sessions')
      .insert({
        user_id: user.id,
        pattern_id: patternId,
        duration_seconds: durationSeconds,
        cycles_completed: cyclesCompleted,
        stress_level_before: stressLevelBefore,
        stress_level_after: stressLevelAfter
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating breathing session:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json(session)

  } catch (error) {
    console.error('Create breathing session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
