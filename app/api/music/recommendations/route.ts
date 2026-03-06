import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Category = 'focus' | 'calm' | 'productivity' | 'sleep'

type JoinedRow = {
  track_id: string
  note: string | null
  created_at: string
  music: {
    id: string
    title: string
    url: string
    category: Category
    hz_label?: string | null
    duration_sec?: number | null
  } | null
}

type TrackPayload = {
  id: string
  title: string
  url: string
  category: Category
  hz_label?: string | null
  duration_sec?: number | null
  signedUntil?: string
}

type RecommendationItem = {
  track: TrackPayload
  note: string | null
  createdAt: string
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createServiceClient()

    const { data, error } = await admin
      .from('coach_recommendations')
      .select('track_id, note, created_at, music:music_tracks(id,title,url,category,hz_label,duration_sec)')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('recommendations query error:', error)
      return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
    }

    const ttlHours = Number(process.env.MUSIC_SIGN_TTL_HOURS || 12)
    const ttlSeconds = Number.isFinite(ttlHours) && ttlHours > 0 ? Math.floor(ttlHours * 3600) : 12 * 3600

    const items: RecommendationItem[] = []
    for (const row of (data || []) as any[]) {
      // Supabase join returns music as array with single item or null
      const musicArray = row.music as any[] | null
      if (!musicArray || musicArray.length === 0) continue
      const track = musicArray[0]
      const isAbsolute = /^https?:\/\//i.test(track.url)

      if (isAbsolute) {
        items.push({
          track: {
            id: track.id,
            title: track.title,
            url: track.url,
            category: track.category,
            hz_label: track.hz_label ?? undefined,
            duration_sec: track.duration_sec ?? undefined,
          },
          note: row.note,
          createdAt: row.created_at,
        })
        continue
      }

      try {
        const { data: signed, error: signErr } = await admin.storage
          .from('music')
          .createSignedUrl(track.url, ttlSeconds)

        if (signErr || !signed?.signedUrl) {
          console.warn('Skipping recommendation due to signing error or missing URL', {
            track_id: row.track_id,
            path: track.url,
            error: signErr?.message,
          })
          continue
        }

        items.push({
          track: {
            id: track.id,
            title: track.title,
            url: signed.signedUrl,
            category: track.category,
            hz_label: track.hz_label ?? undefined,
            duration_sec: track.duration_sec ?? undefined,
            signedUntil: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
          },
          note: row.note,
          createdAt: row.created_at,
        })
      } catch (e: any) {
        console.warn('Signing exception; filtering out recommendation', { track_id: row.track_id, err: e?.message })
        continue
      }
    }

    return new NextResponse(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err: any) {
    console.error('GET /api/music/recommendations error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

