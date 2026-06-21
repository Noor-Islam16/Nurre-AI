import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { trackId } = body
    if (!trackId) {
      return NextResponse.json({ error: 'Missing trackId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_liked_tracks')
      .upsert({
        user_id: auth.user.id,
        track_id: trackId,
      }, { onConflict: 'user_id,track_id' })
      .select()

    if (error) {
      console.error('Error liking track:', error)
      return NextResponse.json({ error: 'Failed to like track' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('POST /api/music/like error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try reading trackId from query params first, fallback to JSON body
    const search = req.nextUrl.searchParams
    let trackId = search.get('trackId')

    if (!trackId) {
      try {
        const body = await req.json()
        trackId = body.trackId
      } catch {
        // Body reading failed, that's fine if trackId is not provided
      }
    }

    if (!trackId) {
      return NextResponse.json({ error: 'Missing trackId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_liked_tracks')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('track_id', trackId)

    if (error) {
      console.error('Error unliking track:', error)
      return NextResponse.json({ error: 'Failed to unlike track' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/music/like error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
