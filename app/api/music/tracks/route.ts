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
      .select('id,title,url,category,hz_label,duration_sec,has_voice,producer_name,producer_url')
      .eq('is_active', true)
      .order('title', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: rows, error } = await query
    if (error) {
      console.error('music_tracks query error:', error)
      return NextResponse.json({ error: 'Failed to load tracks' }, { status: 500 })
    }

    const ttlHours = Number(process.env.MUSIC_SIGN_TTL_HOURS || 12)
    const ttlSeconds = Number.isFinite(ttlHours) && ttlHours > 0 ? Math.floor(ttlHours * 3600) : 12 * 3600

    // Prepare signer once; only used when needed
    const admin = createServiceClient()

    const results: TrackResponse[] = []
    for (const row of (rows || []) as TrackRow[]) {
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
        })
        continue
      }

      // Treat as relative path within 'music' bucket; sign if possible
      try {
        const { data: signed, error: signErr } = await admin.storage
          .from('music')
          .createSignedUrl(row.url, ttlSeconds)

        if (signErr || !signed?.signedUrl) {
          console.warn('Skipping track due to signing error or missing URL', {
            id: row.id,
            path: row.url,
            error: signErr?.message
          })
          // Filter out this track rather than returning a broken URL
          continue
        }

        results.push({
          id: row.id,
          title: row.title,
          url: signed.signedUrl,
          category: row.category,
          hz_label: row.hz_label ?? undefined,
          duration_sec: row.duration_sec ?? undefined,
          has_voice: row.has_voice ?? undefined,
          producer_name: row.producer_name ?? undefined,
          producer_url: row.producer_url ?? undefined,
          signedUntil: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        })
      } catch (e: any) {
        console.warn('Signing exception; filtering out track', { id: row.id, err: e?.message })
        continue
      }
    }

    return new NextResponse(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err: any) {
    console.error('GET /api/music/tracks error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

