import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canRetakeAssessment } from '@/lib/assessment/validation'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('last_persona_assessment, assessment_history, adhd_persona')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
    
    // Check if user can retake assessment
    const lastAssessment = profile?.last_persona_assessment 
      ? new Date(profile.last_persona_assessment) 
      : null
      
    if (!canRetakeAssessment(lastAssessment)) {
      return NextResponse.json({ 
        error: 'Cannot retake assessment yet',
        nextAvailableDate: new Date(lastAssessment!.getTime() + 90 * 24 * 60 * 60 * 1000)
      }, { status: 403 })
    }
    
    // Get the new persona from request
    const { persona } = await request.json()
    
    if (!persona) {
      return NextResponse.json({ error: 'Persona is required' }, { status: 400 })
    }
    
    // Prepare assessment history entry
    const historyEntry = {
      date: new Date().toISOString(),
      previousPersona: profile?.adhd_persona || null,
      newPersona: persona,
      source: 'retake'
    }
    
    const currentHistory = profile?.assessment_history || []
    const updatedHistory = [...currentHistory, historyEntry]
    
    // Update profile with new persona and assessment date
    const { error: updateError } = await supabase
      .from('users')
      .update({
        adhd_persona: persona,
        last_persona_assessment: new Date().toISOString(),
        assessment_history: updatedHistory
      })
      .eq('id', user.id)
    
    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Assessment completed successfully',
      persona 
    })
    
  } catch (error) {
    console.error('Error in retake assessment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's assessment status
    const { data: profile, error } = await supabase
      .from('users')
      .select('last_persona_assessment, adhd_persona')
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
    
    const lastAssessment = profile?.last_persona_assessment 
      ? new Date(profile.last_persona_assessment) 
      : null
      
    const canRetake = canRetakeAssessment(lastAssessment)
    const nextAvailableDate = lastAssessment 
      ? new Date(lastAssessment.getTime() + 90 * 24 * 60 * 60 * 1000)
      : null
    
    return NextResponse.json({
      canRetake,
      lastAssessment,
      nextAvailableDate,
      currentPersona: profile?.adhd_persona
    })
    
  } catch (error) {
    console.error('Error checking assessment status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}