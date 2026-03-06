import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRequest } from '@/lib/validation/validate-request'
import { CreateFocusSessionSchema, SessionsQuerySchema } from '@/lib/validation/api-schemas'
import { transactionManager } from '@/lib/db/transaction-manager'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Validate query parameters
    const { searchParams } = new URL(req.url)
    
    // Parse query params manually for validation
    const queryParams = {
      today: searchParams.get('today') || undefined,
      active: searchParams.get('active') || undefined,
      limit: searchParams.get('limit') || undefined
    }
    
    let validatedParams: any
    try {
      validatedParams = SessionsQuerySchema.parse(queryParams)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
    
    const { today, limit = 10 } = validatedParams
    
    // Build query
    let query = supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    // Filter for today if requested
    if (today) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      query = query.gte('created_at', todayStart.toISOString())
    }
    
    // Apply limit
    query = query.limit(limit)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching focus sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
    
  } catch (error) {
    console.error('Focus sessions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(req, CreateFocusSessionSchema)
    if (validation.error) return validation.error
    
    const { taskId, duration } = validation.data
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use transaction manager to create focus session with optional task link
    const result = await transactionManager.createFocusSessionWithTask(
      {
        user_id: user.id,
        duration: duration,
        completed: false,
        interruptions: 0,
        break_taken: false
      },
      taskId
    )
    
    return NextResponse.json(result.session)
    
  } catch (error) {
    console.error('Create focus session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}