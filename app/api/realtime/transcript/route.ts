import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { queueEmbeddingJob } from '@/lib/ai/vector/enqueue-embedding-job'

// Schema for saving transcript items
const SaveTranscriptSchema = z.object({
  sessionId: z.string().uuid(),
  sessionLabel: z.string().max(200).optional(),
  items: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string()
  }))
})

// Schema for retrieving transcripts
const GetTranscriptSchema = z.object({
  sessionId: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100)
})

/**
 * POST /api/realtime/transcript
 * Save transcript items to the database
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = SaveTranscriptSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error },
        { status: 400 }
      )
    }

    const { sessionId, sessionLabel, items } = validation.data

    // Save each transcript item to the conversations table
    const conversations = items.map(item => ({
      user_id: user.id,
      session_id: sessionId,
      role: item.role,
      content: item.content,
      created_at: item.timestamp,
      metadata: {
        source: 'voice_chat',
        transcript: true,
        timestamp: item.timestamp,
        session_label: sessionLabel || undefined
      }
    }))

    const { data, error } = await supabase
      .from('conversations')
      .insert(conversations)
      .select()

    if (error) {
      console.error('Failed to save transcript:', error)
      return NextResponse.json(
        { error: 'Failed to save transcript', details: error.message },
        { status: 500 }
      )
    }

    if (data && data.length > 0) {
      queueEmbeddingJob(data.map(item => item.id)).catch((err) => {
        console.error('Failed to queue embedding job for transcript entries:', err)
      })
    }

    // Log the transcript save event
    await supabase.from('events').insert({
      user_id: user.id,
      type: 'voice_transcript_saved',
      data: {
        sessionId,
        sessionLabel,
        itemCount: items.length,
        totalLength: items.reduce((sum, item) => sum + item.content.length, 0)
      }
    })

    return NextResponse.json({
      success: true,
      saved: data.length,
      sessionId
    })
  } catch (error: any) {
    console.error('Transcript save error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/realtime/transcript
 * Retrieve transcript items from the database
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId') || undefined
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Build query
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('metadata->>source', 'voice_chat')
      .eq('metadata->>transcript', 'true')
      .order('created_at', { ascending: true })
      .limit(limit)

    // Filter by session if provided
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to retrieve transcript:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve transcript', details: error.message },
        { status: 500 }
      )
    }

    // Format transcript items
    const transcript = data.map(item => ({
      id: item.id,
      role: item.role,
      content: item.content,
      timestamp: item.created_at,
      sessionId: item.session_id,
      sessionLabel: item.metadata?.session_label ?? null
    }))

    return NextResponse.json({
      transcript,
      count: transcript.length
    })
  } catch (error: any) {
    console.error('Transcript retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/realtime/transcript
 * Delete transcript items for a session
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .eq('metadata->>source', 'voice_chat')
      .eq('metadata->>transcript', 'true')

    if (error) {
      console.error('Failed to delete transcript:', error)
      return NextResponse.json(
        { error: 'Failed to delete transcript', details: error.message },
        { status: 500 }
      )
    }

    // Log the deletion
    await supabase.from('events').insert({
      user_id: user.id,
      type: 'voice_transcript_deleted',
      data: { sessionId }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Transcript deleted successfully'
    })
  } catch (error: any) {
    console.error('Transcript deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
