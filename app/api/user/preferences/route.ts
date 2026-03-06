import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { UpdatePreferencesSchema } from '@/lib/schemas/preferences'
import { validateRequest } from '@/lib/validation/validate-request'
import { z } from 'zod'

/**
 * GET /api/user/preferences
 * Fetch current user's preferences
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch preferences
    const { data: preferences, error } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error) {
      // If no preferences found, create default ones
      if (error.code === 'PGRST116') {
        const { data: newPrefs, error: createError } = await supabase
          .from('preferences')
          .insert({
            user_id: user.id,
            quiet_hours: {
              start: "22:00",
              end: "08:00",
              days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
            },
            theme: 'auto',
            focus_duration: 25,
            break_ratio: 0.20,
            notifications: true,
            ai_personality: 'balanced',
            intervention_cooldown: 15,
            max_interventions_per_hour: 6
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating default preferences:', createError)
          return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 })
        }
        
        return NextResponse.json(newPrefs)
      }
      
      console.error('Error fetching preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }
    
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/preferences
 * Update current user's preferences (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, UpdatePreferencesSchema)
    if (validation.error) return validation.error
    
    const validatedData = validation.data
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('preferences')
      .upsert({
        user_id: user.id,
        ...validatedData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }
    
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Preferences POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/preferences
 * Reset preferences to defaults
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Reset to defaults
    const defaultPreferences = {
      user_id: user.id,
      quiet_hours: {
        start: "22:00",
        end: "08:00",
        days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
      },
      theme: 'auto',
      focus_duration: 25,
      break_ratio: 0.20,
      notifications: true,
      ai_personality: 'balanced',
      intervention_cooldown: 15,
      max_interventions_per_hour: 6,
      updated_at: new Date().toISOString()
    }
    
    const { data: preferences, error } = await supabase
      .from('preferences')
      .upsert(defaultPreferences, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error resetting preferences:', error)
      return NextResponse.json({ error: 'Failed to reset preferences' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      message: 'Preferences reset to defaults',
      preferences 
    })
  } catch (error) {
    console.error('Preferences DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}