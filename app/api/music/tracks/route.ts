import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Category = 'focus' | 'calm' | 'productivity' | 'sleep'
const ALLOWED_CATEGORIES = new Set<Category>(['focus', 'calm', 'productivity', 'sleep'])

type TrackRow = {
  id: string
  title: string
  url: string
  category: Category
  hz_label?: string | null
  duration_sec?: number | null
  has_voice?: boolean | null
  producer_name?: string | null
  producer_url?: string | null
  brain_modes?: string[] | null
}

type TrackResponse = {
  id: string
  title: string
  url: string
  category: Category
  hz_label?: string | null
  duration_sec?: number | null
  has_voice?: boolean | null
  producer_name?: string | null
  producer_url?: string | null
  signedUntil?: string
  liked?: boolean
  brain_modes?: string[]
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const search = req.nextUrl.searchParams
    const categoryParam = (search.get('category') || '').trim()
    let category: Category | undefined
    if (categoryParam) {
      if (!ALLOWED_CATEGORIES.has(categoryParam as Category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      category = categoryParam as Category
    }

    let query = supabase
      .from('music_tracks')
      .select('id,title,url,category,hz_label,duration_sec,has_voice,producer_name,producer_url,brain_modes')
      .eq('is_active', true)
      .order('title', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const [tracksResult, likedResult] = await Promise.all([
      query,
      supabase
        .from('user_liked_tracks')
        .select('track_id')
        .eq('user_id', auth.user.id)
    ])

    const { data: rows, error } = tracksResult
    if (error) {
      console.error('music_tracks query error:', error)
      return NextResponse.json({ error: 'Failed to load tracks' }, { status: 500 })
    }

    const likedSet = new Set((likedResult.data || []).map((r) => r.track_id))

    const ttlHours = Number(process.env.MUSIC_SIGN_TTL_HOURS || 12)
    const ttlSeconds = Number.isFinite(ttlHours) && ttlHours > 0 ? Math.floor(ttlHours * 3600) : 12 * 3600

    // Prepare signer once; only used when needed
    const admin = createServiceClient()

    const rowsArr = (rows || []) as TrackRow[]

    // Sign every relative storage path in a single batched request instead
    // of one network round-trip per track — signing them one-by-one in a
    // loop was the main reason category loads got slow as track lists grew
    // (N tracks meant N sequential Storage calls).
    const pathsToSign = rowsArr
      .filter((row) => !/^https?:\/\//i.test(row.url))
      .map((row) => row.url)

    const signedUrlMap = new Map<string, string>()
    if (pathsToSign.length > 0) {
      const { data: signedBatch, error: signBatchErr } = await admin.storage
        .from('music')
        .createSignedUrls(pathsToSign, ttlSeconds)

      if (signBatchErr) {
        console.warn('Batch signing error for tracks:', signBatchErr.message)
      } else {
        for (const item of signedBatch || []) {
          if (item.path && item.signedUrl && !item.error) {
            signedUrlMap.set(item.path, item.signedUrl)
          }
        }
      }
    }

    const signedUntil = new Date(Date.now() + ttlSeconds * 1000).toISOString()

    const results: TrackResponse[] = []
    for (const row of rowsArr) {
      const isLiked = likedSet.has(row.id)
      const isAbsolute = /^https?:\/\//i.test(row.url)
      if (isAbsolute) {
        results.push({
          id: row.id,
          title: row.title,
          url: row.url,
          category: row.category,
          hz_label: row.hz_label ?? undefined,
          duration_sec: row.duration_sec ?? undefined,
          has_voice: row.has_voice ?? undefined,
          producer_name: row.producer_name ?? undefined,
          producer_url: row.producer_url ?? undefined,
          liked: isLiked,
          brain_modes: row.brain_modes ?? [],
        })
        continue
      }

      const signedUrl = signedUrlMap.get(row.url)
      if (!signedUrl) {
        console.warn('Skipping track due to signing error or missing URL', {
          id: row.id,
          path: row.url,
        })
        // Filter out this track rather than returning a broken URL
        continue
      }

      results.push({
        id: row.id,
        title: row.title,
        url: signedUrl,
        category: row.category,
        hz_label: row.hz_label ?? undefined,
        duration_sec: row.duration_sec ?? undefined,
        has_voice: row.has_voice ?? undefined,
        producer_name: row.producer_name ?? undefined,
        producer_url: row.producer_url ?? undefined,
        signedUntil,
        liked: isLiked,
        brain_modes: row.brain_modes ?? [],
      })
    }

    return new NextResponse(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (err: any) {
    console.error('GET /api/music/tracks error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}