import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin, isAdminAuthError } from '@/lib/auth/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin access
    const adminCheck = await verifyAdmin()
    if (isAdminAuthError(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    // 2. Parse request body
    const body = await req.json()
    const { trackId, brainModes } = body

    if (!trackId || !Array.isArray(brainModes)) {
      return NextResponse.json({ error: 'Missing trackId or invalid brainModes' }, { status: 400 })
    }

    const supabase = await createClient()

    // 3. Update the track in Supabase
    const { data, error } = await supabase
      .from('music_tracks')
      .update({ brain_modes: brainModes })
      .eq('id', trackId)
      .select('id, title, brain_modes')
      .single()

    if (error) {
      console.error('Failed to update brain_modes:', error)
      return NextResponse.json({ error: 'Failed to update brain modes' }, { status: 500 })
    }

    return NextResponse.json({ success: true, track: data })

  } catch (error: any) {
    console.error('Error tagging music track:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
