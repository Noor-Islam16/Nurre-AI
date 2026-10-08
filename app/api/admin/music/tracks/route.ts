// app/api/admin/music/tracks/route.ts
// Admin-only track manager API.
//   GET   → all tracks (including inactive) – metadata only, no URL signing
//   PATCH → update category / is_active / brain_modes for one track
//
// Uses the service-role client AFTER verifyAdmin(), so admin edits are not
// silently blocked by row-level security (the old tag route used the user's
// RLS client, which could update 0 rows and report success/failure oddly).

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, isAdminAuthError } from '@/lib/auth/admin-auth'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const BRAIN_MODE_OPTIONS = ['Reset', 'Start', 'Deep Focus', 'Flow', 'Ground'] as const
const CATEGORIES = ['focus', 'calm', 'productivity', 'sleep'] as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
  const admin = await verifyAdmin()
  if (isAdminAuthError(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('music_tracks')
    .select('id,title,category,hz_label,producer_name,brain_modes,is_active')
    .order('title', { ascending: true })

  if (error) {
    console.error('[admin/tracks] load error:', error)
    return NextResponse.json({ error: 'Failed to load tracks' }, { status: 500 })
  }

  return NextResponse.json(
    (data ?? []).map((t) => ({ ...t, brain_modes: t.brain_modes ?? [] })),
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin()
  if (isAdminAuthError(admin)) {
    return NextResponse.json({ error: admin.error }, { status: admin.status })
  }

  const body = await req.json().catch(() => null)
  const trackId = body?.trackId
  if (typeof trackId !== 'string' || !UUID_RE.test(trackId)) {
    return NextResponse.json({ error: 'Invalid trackId' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (body.brainModes !== undefined) {
    if (
      !Array.isArray(body.brainModes) ||
      !body.brainModes.every((m: unknown) => (BRAIN_MODE_OPTIONS as readonly string[]).includes(m as string))
    ) {
      return NextResponse.json({ error: 'Invalid brainModes' }, { status: 400 })
    }
    update.brain_modes = Array.from(new Set(body.brainModes))
  }

  if (body.category !== undefined) {
    if (!(CATEGORIES as readonly string[]).includes(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    update.category = body.category
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isActive' }, { status: 400 })
    }
    update.is_active = body.isActive
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('music_tracks')
    .update(update)
    .eq('id', trackId)
    .select('id,title,category,brain_modes,is_active')
    .maybeSingle()

  if (error) {
    console.error('[admin/tracks] update error:', error)
    return NextResponse.json({ error: 'Failed to update track' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, track: data })
}