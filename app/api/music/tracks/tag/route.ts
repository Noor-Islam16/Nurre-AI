import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, isAdminAuthError } from '@/lib/auth/admin-auth'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_MODES = ['Reset', 'Start', 'Deep Focus', 'Flow', 'Ground']

// Kept for backwards compatibility — the admin UI now uses
// PATCH /api/admin/music/tracks. Same behaviour: admin-only, validated,
// written with the service client so RLS can't silently block the update.
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdmin()
    if (isAdminAuthError(adminCheck)) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
    }

    const body = await req.json().catch(() => null)
    const trackId = body?.trackId
    const brainModes = body?.brainModes

    if (typeof trackId !== 'string' || !Array.isArray(brainModes)) {
      return NextResponse.json({ error: 'Missing trackId or invalid brainModes' }, { status: 400 })
    }
    if (!brainModes.every((m: unknown) => typeof m === 'string' && ALLOWED_MODES.includes(m))) {
      return NextResponse.json({ error: 'Invalid brain mode' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('music_tracks')
      .update({ brain_modes: Array.from(new Set(brainModes)) })
      .eq('id', trackId)
      .select('id, title, brain_modes')
      .maybeSingle()

    if (error) {
      console.error('Failed to update brain_modes:', error)
      return NextResponse.json({ error: 'Failed to update brain modes' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, track: data })
  } catch (error) {
    console.error('Error tagging music track:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}