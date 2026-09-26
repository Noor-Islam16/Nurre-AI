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
  liked?: boolean
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

    const [recsResult, likedResult] = await Promise.all([
      admin
        .from('coach_recommendations')
        .select('track_id, note, created_at, music:music_tracks(id,title,url,category,hz_label,duration_sec)')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false }),
      admin
        .from('user_liked_tracks')
        .select('track_id')
        .eq('user_id', auth.user.id)
    ])

    const { data, error } = recsResult
    if (error) {
      console.error('recommendations query error:', error)
      return NextResponse.json({ error: 'Failed to load recommendations' }, { status: 500 })
    }

    const likedSet = new Set((likedResult.data || []).map((r) => r.track_id))

    const ttlHours = Number(process.env.MUSIC_SIGN_TTL_HOURS || 12)
    const ttlSeconds = Number.isFinite(ttlHours) && ttlHours > 0 ? Math.floor(ttlHours * 3600) : 12 * 3600

    const rowsArr = (data || []) as any[]

    // Resolve each row's music record once, and batch-sign every relative
    // storage path in a single request instead of one call per track —
    // the old sequential loop was the main source of slowness here.
    const resolved = rowsArr
      .map((row) => {
        const musicArray = row.music as any[] | null
        const track = musicArray && musicArray.length > 0 ? musicArray[0] : null
        return { row, track }
      })
      .filter((r): r is { row: any; track: NonNullable<typeof r.track> } => Boolean(r.track))

    const pathsToSign = resolved
      .filter(({ track }) => !/^https?:\/\//i.test(track.url))
      .map(({ track }) => track.url)

    const signedUrlMap = new Map<string, string>()
    if (pathsToSign.length > 0) {
      const { data: signedBatch, error: signBatchErr } = await admin.storage
        .from('music')
        .createSignedUrls(pathsToSign, ttlSeconds)

      if (signBatchErr) {
        console.warn('Batch signing error for recommendations:', signBatchErr.message)
      } else {
        for (const item of signedBatch || []) {
          if (item.path && item.signedUrl && !item.error) {
            signedUrlMap.set(item.path, item.signedUrl)
          }
        }
      }
    }

    const signedUntil = new Date(Date.now() + ttlSeconds * 1000).toISOString()

    const items: RecommendationItem[] = []
    for (const { row, track } of resolved) {
      const isLiked = likedSet.has(track.id)
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
            liked: isLiked,
          },
          note: row.note,
          createdAt: row.created_at,
        })
        continue
      }

      const signedUrl = signedUrlMap.get(track.url)
      if (!signedUrl) {
        console.warn('Skipping recommendation due to signing error or missing URL', {
          track_id: row.track_id,
          path: track.url,
        })
        continue
      }

      items.push({
        track: {
          id: track.id,
          title: track.title,
          url: signedUrl,
          category: track.category,
          hz_label: track.hz_label ?? undefined,
          duration_sec: track.duration_sec ?? undefined,
          signedUntil,
          liked: isLiked,
        },
        note: row.note,
        createdAt: row.created_at,
      })
    }

    return new NextResponse(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (err: any) {
    console.error('GET /api/music/recommendations error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}