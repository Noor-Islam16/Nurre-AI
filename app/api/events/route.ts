import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateRequest } from '@/lib/validation/validate-request'
import { EventsArraySchema } from '@/lib/validation/api-schemas'

export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(req, EventsArraySchema)
    if (validation.error) return validation.error
    
    const { events } = validation.data
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // Return 204 No Content instead of 401 to prevent console errors
      return new Response(null, { status: 204 })
    }
    
    // Get page URL from request headers
    const referer = req.headers.get('referer')
    const pageUrl = referer ? new URL(referer).pathname : null
    
    // Process and store validated events
    const eventRecords = events.map((event) => ({
      user_id: user.id,
      type: event.type,
      data: event.metadata || {},
      page_url: pageUrl,
      created_at: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString()
    }))
    
    const { error } = await supabase
      .from('events')
      .insert(eventRecords)
    
    if (error) {
      // Log but don't expose internal errors to client
      console.error('Failed to store events:', error)
      return new Response(null, { status: 204 })
    }
    
    // Activity tracking removed - not needed in simplified architecture
    // Streaks will be calculated from tasks/events tables when needed
    
    // Check if any events should trigger interventions
    // This could be moved to a background job in production
    for (const event of events) {
      if (event.type === 'idle_detected' && event.metadata?.idleTime > 300000) {
        // Trigger intervention for 5+ minutes idle
        // Queue intervention check - to be implemented
      }
    }
    
    return new Response(null, { status: 204 })
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('Event API error:', error)
    return new Response(null, { status: 204 })
  }
}