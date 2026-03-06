import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { createSecureApiResponse } from '@/lib/api/with-security-headers'
import { EventType } from '@/lib/tracking/events'

export const runtime = 'nodejs'

const AUTH_TOKEN = process.env.VECTOR_HEALTH_TOKEN || process.env.HEALTH_CHECK_TOKEN || process.env.EMBEDDING_JOB_SECRET || ''
const PIPELINE_PAUSE_WINDOW_MINUTES = 60

async function countConversationsWithEmbeddings(supabase: ReturnType<typeof createServiceClient>) {
  const [{ count: total }, { count: embedded }] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).not('embedding', 'is', null)
  ])

  return {
    total: total ?? 0,
    embedded: embedded ?? 0,
    without: Math.max((total ?? 0) - (embedded ?? 0), 0)
  }
}

async function fetchLatestEventTimestamp(
  supabase: ReturnType<typeof createServiceClient>,
  type: EventType
) {
  const { data, error } = await supabase
    .from('events')
    .select('created_at')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null
  return data[0].created_at
}

async function fetchRecentFailures(
  supabase: ReturnType<typeof createServiceClient>,
  minutes: number
) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('events')
    .select('created_at, data')
    .eq('type', EventType.VECTOR_PIPELINE_PAUSED)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data
}

export async function GET(req: NextRequest) {
  try {
    if (AUTH_TOKEN) {
      const authHeader = req.headers.get('authorization')
      if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return createSecureApiResponse({ error: 'Unauthorized' }, 401)
      }
    }

    const supabase = createServiceClient()
    const counts = await countConversationsWithEmbeddings(supabase)

    const [latestSuccessAt, latestFailureAt, recentPauses] = await Promise.all([
      fetchLatestEventTimestamp(supabase, EventType.VECTOR_EMBEDDING_SUCCESS),
      fetchLatestEventTimestamp(supabase, EventType.VECTOR_EMBEDDING_FAILURE),
      fetchRecentFailures(supabase, PIPELINE_PAUSE_WINDOW_MINUTES)
    ])

    const coveragePercent = counts.total === 0 ? 0 : Math.round((counts.embedded / counts.total) * 100)
    const pipelinePaused = recentPauses.length > 0
    const status = pipelinePaused
      ? 'paused'
      : coveragePercent < 50
        ? 'degraded'
        : 'healthy'

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503

    return createSecureApiResponse({
      status,
      timestamp: new Date().toISOString(),
      totals: {
        total: counts.total,
        withEmbeddings: counts.embedded,
        withoutEmbeddings: counts.without,
        coveragePercent
      },
      latestSuccessAt,
      latestFailureAt,
      pipelinePaused,
      recentPauses
    }, statusCode)
  } catch (error: any) {
    console.error('Vector status endpoint error:', error)
    return createSecureApiResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error?.message || 'Unknown error'
    }, 500)
  }
}
