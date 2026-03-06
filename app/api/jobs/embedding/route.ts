import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/admin'
import { openai, EMBEDDING_MODEL } from '@/lib/ai/openai-config'
import { isVectorContextEnabled } from '@/lib/ai/vector/enqueue-embedding-job'
import { EventType } from '@/lib/tracking/events'

export const runtime = 'nodejs'

const RequestSchema = z.union([
  z.object({ messageId: z.string().uuid() }),
  z.object({ messageIds: z.array(z.string().uuid()).nonempty() })
])

const MAX_MESSAGES_PER_REQUEST = 50
const SUPPORTED_ROLES = new Set(['user', 'assistant'])
const FAILURE_THRESHOLD = 5

function getUniqueIds(payload: { messageId?: string; messageIds?: string[] }): string[] {
  const ids = payload.messageIds ?? (payload.messageId ? [payload.messageId] : [])
  return Array.from(new Set(ids))
}

function buildSuccessMetadata(metadata: any) {
  const base = (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) ? metadata : {}
  return {
    ...base,
    embedding_error: null,
    embedding_updated_at: new Date().toISOString()
  }
}

function buildErrorMetadata(metadata: any, error: string, failureCount: number) {
  const base = (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) ? metadata : {}
  return {
    ...base,
    embedding_error: {
      message: error,
      retry_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      occurred_at: new Date().toISOString(),
      count: failureCount
    }
  }
}

async function logVectorEvent(supabase: ReturnType<typeof createServiceClient>, type: EventType, data: Record<string, any>) {
  try {
    await supabase
      .from('events')
      .insert({
        user_id: null,
        type,
        data,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log vector event:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isVectorContextEnabled()) {
      return NextResponse.json({ processed: [], reason: 'vector_context_disabled' })
    }

    const jobSecret = process.env.EMBEDDING_JOB_SECRET
    if (jobSecret) {
      const authHeader = request.headers.get('authorization')
      if (authHeader !== `Bearer ${jobSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    let payload: unknown
    try {
      payload = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const parsed = RequestSchema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 })
    }

    const messageIds = getUniqueIds(parsed.data)

    if (messageIds.length === 0) {
      return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 })
    }

    if (messageIds.length > MAX_MESSAGES_PER_REQUEST) {
      return NextResponse.json({
        error: `Too many message IDs. Maximum per request is ${MAX_MESSAGES_PER_REQUEST}.`
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: messages, error: fetchError } = await supabase
      .from('conversations')
      .select('id, role, content, embedding, embedding_model, metadata')
      .in('id', messageIds)

    if (fetchError) {
      console.error('Failed to fetch conversations for embedding:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch messages for embedding' }, { status: 500 })
    }

    const messageMap = new Map((messages ?? []).map((msg) => [msg.id, msg]))
    const results: Array<{ id: string; status: string; reason?: string }> = []
    let consecutiveFailures = 0
    let pipelinePaused = false

    for (let index = 0; index < messageIds.length; index += 1) {
      const id = messageIds[index]

      if (pipelinePaused) {
        results.push({ id, status: 'skipped', reason: 'pipeline_paused' })
        continue
      }

      const record = messageMap.get(id)

      if (!record) {
        results.push({ id, status: 'not_found' })
        continue
      }

      if (!SUPPORTED_ROLES.has(record.role)) {
        results.push({ id, status: 'skipped', reason: `role_${record.role}` })
        continue
      }

      const text = (record.content || '').trim()
      if (!text) {
        results.push({ id, status: 'skipped', reason: 'empty_content' })
        continue
      }

      if (record.embedding && Array.isArray(record.embedding) && record.embedding.length > 0) {
        results.push({ id, status: 'skipped', reason: 'already_embedded' })
        continue
      }

      const metadata = record.metadata && typeof record.metadata === 'object' ? { ...record.metadata } : {}
      const errorInfo = metadata?.embedding_error
      if (errorInfo?.retry_after) {
        const retryAfter = new Date(errorInfo.retry_after).getTime()
        if (!Number.isNaN(retryAfter) && retryAfter > Date.now()) {
          results.push({ id, status: 'skipped', reason: 'retry_backoff' })
          continue
        }
      }

      const startedAt = Date.now()

      try {
        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: text
        })

        const embeddingVector = embeddingResponse.data[0]?.embedding

        if (!embeddingVector || embeddingVector.length === 0) {
          throw new Error('Empty embedding vector returned')
        }

        const updatedMetadata = buildSuccessMetadata(metadata)

        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            embedding: embeddingVector,
            embedding_model: EMBEDDING_MODEL,
            metadata: updatedMetadata
          })
          .eq('id', id)

        if (updateError) {
          console.error('Failed to update embedding:', updateError)
          const failureCount = (metadata?.embedding_error?.count ?? 0) + 1
          const failureMetadata = buildErrorMetadata(metadata, 'update_failed', failureCount)

          await logVectorEvent(supabase, EventType.VECTOR_EMBEDDING_FAILURE, {
            messageId: id,
            durationMs: Date.now() - startedAt,
            textLength: text.length,
            model: EMBEDDING_MODEL,
            failureCount,
            error: 'update_failed'
          })

          consecutiveFailures += 1
          if (consecutiveFailures >= FAILURE_THRESHOLD) {
            pipelinePaused = true
            await logVectorEvent(supabase, EventType.VECTOR_PIPELINE_PAUSED, {
              failureCount: consecutiveFailures,
              lastMessageId: id,
              pendingMessages: messageIds.length - index - 1
            })
          }

          const { error: failureUpdateError } = await supabase
            .from('conversations')
            .update({ metadata: failureMetadata })
            .eq('id', id)

          if (failureUpdateError) {
            console.error('Failed to persist update failure metadata:', failureUpdateError)
          } else {
            record.metadata = failureMetadata
          }

          results.push({ id, status: 'failed', reason: 'update_failed' })
          continue
        }

        record.embedding = embeddingVector as any
        record.metadata = updatedMetadata

        const durationMs = Date.now() - startedAt
        await logVectorEvent(supabase, EventType.VECTOR_EMBEDDING_SUCCESS, {
          messageId: id,
          durationMs,
          textLength: text.length,
          model: EMBEDDING_MODEL
        })

        consecutiveFailures = 0
        results.push({ id, status: 'embedded' })
      } catch (error: any) {
        console.error('Embedding generation failed:', error)
        const durationMs = Date.now() - startedAt
        const previousError = record.metadata?.embedding_error
        const failureCount = (previousError?.count ?? 0) + 1

        const errorMetadata = buildErrorMetadata(metadata, error?.message || 'Unknown error', failureCount)

        const { error: updateError } = await supabase
          .from('conversations')
          .update({ metadata: errorMetadata })
          .eq('id', id)

        if (updateError) {
          console.error('Failed to record embedding error metadata:', updateError)
        }

        record.metadata = errorMetadata

        await logVectorEvent(supabase, EventType.VECTOR_EMBEDDING_FAILURE, {
          messageId: id,
          durationMs,
          textLength: text.length,
          model: EMBEDDING_MODEL,
          failureCount,
          error: error?.message || 'Unknown error'
        })

        results.push({ id, status: 'failed', reason: 'embedding_error' })
        consecutiveFailures += 1

        if (consecutiveFailures >= FAILURE_THRESHOLD) {
          pipelinePaused = true
          await logVectorEvent(supabase, EventType.VECTOR_PIPELINE_PAUSED, {
            failureCount: consecutiveFailures,
            lastMessageId: id,
            pendingMessages: messageIds.length - index - 1
          })
        }
      }
    }

    return NextResponse.json({ processed: results })
  } catch (error) {
    console.error('Embedding job handler error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 204 })
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
