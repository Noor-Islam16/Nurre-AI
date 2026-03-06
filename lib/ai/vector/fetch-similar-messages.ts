import { SupabaseClient } from '@supabase/supabase-js'
import { openai, EMBEDDING_MODEL } from '@/lib/ai/openai-config'
import { isVectorContextEnabled } from './enqueue-embedding-job'

type SimilarMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  similarity: number
  metadata?: Record<string, any>
}

interface FetchOptions {
  limit?: number
  candidateLimit?: number
  minSimilarity?: number
  excludeIds?: string[]
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < length; i += 1) {
    const va = a[i]
    const vb = b[i]
    dot += va * vb
    magA += va * va
    magB += vb * vb
  }

  if (!magA || !magB) return 0

  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export async function fetchSimilarMessages(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  options: FetchOptions = {}
): Promise<SimilarMessage[]> {
  if (!isVectorContextEnabled()) return []
  const text = query?.trim()
  if (!text) return []

  const limit = Math.max(1, Math.min(options.limit ?? 5, 10))
  const candidateLimit = Math.max(limit * 5, options.candidateLimit ?? 200)
  const minSimilarity = options.minSimilarity ?? 0.55
  const excludeIds = new Set(options.excludeIds ?? [])

  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  })

  const queryEmbedding = embeddingResponse.data[0]?.embedding
  if (!queryEmbedding || queryEmbedding.length === 0) return []

  const { data: rows, error } = await supabase
    .from('conversations')
    .select('id, role, content, metadata, created_at, embedding')
    .eq('user_id', userId)
    .not('embedding', 'is', null)
    .order('created_at', { ascending: false })
    .limit(candidateLimit)

  if (error || !rows || rows.length === 0) {
    if (error) console.error('fetchSimilarMessages: failed to load candidates', error)
    return []
  }

  const scored = rows
    .filter((row) =>
      row.embedding && Array.isArray(row.embedding) && !excludeIds.has(row.id)
    )
    .map((row) => {
      const similarity = cosineSimilarity(queryEmbedding, row.embedding as number[])
      return {
        id: row.id,
        role: row.role,
        content: row.content || '',
        metadata: row.metadata ?? undefined,
        created_at: row.created_at,
        similarity
      }
    })
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)

  return scored.slice(0, limit)
}
