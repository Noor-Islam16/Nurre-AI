import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRequest } from '@/lib/validation/validate-request'
import { UpdateFocusSessionSchema } from '@/lib/validation/api-schemas'
import { z } from 'zod'

// Extended schema with additional fields
const ExtendedUpdateSessionSchema = UpdateFocusSessionSchema.extend({
  interruptions: z.number().min(0).optional(),
  breakTaken: z.boolean().optional(),
  notes: z.string().max(500).optional()
})

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Validate request body
    const validation = await validateRequest(req, ExtendedUpdateSessionSchema)
    if (validation.error) return validation.error
    
    const body = validation.data
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const params = await context.params
    const sessionId = params.id
    
    // Validate session ID is a UUID
    if (!z.string().uuid().safeParse(sessionId).success) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
    }
    
    // Prepare update data
    const updateData: any = {}
    
    if (body.actualDuration !== undefined) {
      updateData.actual_duration = body.actualDuration
    }
    
    if (body.completed !== undefined) {
      updateData.completed = body.completed
    }
    
    if (body.effectiveness !== undefined) {
      updateData.effectiveness = body.effectiveness
    }
    
    if (body.interruptions !== undefined) {
      updateData.interruptions = body.interruptions
    }
    
    if (body.breakTaken !== undefined) {
      updateData.break_taken = body.breakTaken
    }
    
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }
    
    // Set ended_at if completing
    if (body.completed) {
      updateData.ended_at = new Date().toISOString()
    }
    
    // Update session
    const { data, error } = await supabase
      .from('focus_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id) // Ensure user owns the session
      .select()
      .single()
    
    if (error) {
      console.error('Error updating focus session:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Update focus session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const params = await context.params
    const sessionId = params.id
    
    // Delete session
    const { error } = await supabase
      .from('focus_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id) // Ensure user owns the session
    
    if (error) {
      console.error('Error deleting focus session:', error)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete focus session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}