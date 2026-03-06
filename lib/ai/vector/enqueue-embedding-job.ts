const VECTOR_FLAG_VALUE = process.env.ENABLE_VECTOR_CONTEXT ?? process.env.NEXT_PUBLIC_ENABLE_VECTOR_CONTEXT
const VECTOR_CONTEXT_ENABLED = VECTOR_FLAG_VALUE === 'true'
const JOB_SECRET = process.env.EMBEDDING_JOB_SECRET

function resolveJobEndpoint(): string {
  if (typeof window !== 'undefined') {
    return '/api/jobs/embedding'
  }

  const base = process.env.INTERNAL_JOB_ENDPOINT
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  return new URL('/api/jobs/embedding', base).toString()
}

export async function queueEmbeddingJob(messageIds: string | string[]): Promise<void> {
  if (!VECTOR_CONTEXT_ENABLED) return

  const ids = Array.isArray(messageIds) ? messageIds.filter(Boolean) : [messageIds].filter(Boolean)
  if (ids.length === 0) return

  try {
    const endpoint = resolveJobEndpoint()
    const payload = { messageIds: ids }
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    if (JOB_SECRET && typeof window === 'undefined') {
      headers['Authorization'] = `Bearer ${JOB_SECRET}`
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.error('Embedding job enqueue failed:', response.status, errorBody)
    }
  } catch (error) {
    console.error('Failed to enqueue embedding job:', error)
  }
}

export function isVectorContextEnabled(): boolean {
  return VECTOR_CONTEXT_ENABLED
}
