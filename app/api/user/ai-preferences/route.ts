import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/ai-preferences
 * Fetch current user's AI preferences (stored as JSONB in preferences table)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch AI preferences from preferences table
    const { data: preferences, error } = await supabase
      .from('preferences')
      .select('ai_preferences')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no preferences found, return null (they will be created on first save)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ ai_preferences: null })
      }
      console.error('Error fetching AI preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch AI preferences' }, { status: 500 })
    }

    // Return null if no AI preferences set yet
    return NextResponse.json({ ai_preferences: preferences?.ai_preferences || null })
  } catch (error) {
    console.error('AI Preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/ai-preferences
 * Save current user's AI preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.ai_preferences) {
      return NextResponse.json({ error: 'ai_preferences is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upsert AI preferences in preferences table
    const { data: preferences, error } = await supabase
      .from('preferences')
      .upsert({
        user_id: user.id,
        ai_preferences: body.ai_preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('ai_preferences')
      .single()

    if (error) {
      console.error('Error saving AI preferences:', error)
      return NextResponse.json({ error: 'Failed to save AI preferences' }, { status: 500 })
    }

    return NextResponse.json({ ai_preferences: preferences.ai_preferences })
  } catch (error) {
    console.error('AI Preferences POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
