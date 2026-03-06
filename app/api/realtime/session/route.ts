import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'

const VALID_VOICES = new Set([
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'
])

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionRequest = {
  voice?: string
  instructions?: string
  mode?: 'direct' | 'balanced' | 'gentle'
  offerSdp?: string
}

/**
 * POST /api/realtime/session
 * Creates an ephemeral OpenAI Realtime session token for the client (WebRTC).
 * Requires authenticated user (middleware also protects /chat route).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await safeJson<SessionRequest>(req)) || {}

    const model = process.env.REALTIME_MODEL || 'gpt-4o-mini-realtime-preview'
    const defaultVoice = (process.env.REALTIME_DEFAULT_VOICE || 'verse').trim()
    let requestedVoice = (body.voice || defaultVoice).trim()
    if (!VALID_VOICES.has(requestedVoice)) {
      requestedVoice = defaultVoice
    }
    const mode = (body.mode || 'balanced') as 'direct' | 'balanced' | 'gentle'
    const normalizedMode: 'direct' | 'balanced' | 'gentle' =
      mode === 'direct' || mode === 'gentle' ? mode : 'balanced'

    // ADHD-friendly instructions kept concise to reduce latency
    const stylePrefix = normalizedMode === 'direct'
      ? 'Style: Direct and action-first. 1–2 short sentences. Prefer imperative voice. Provide up to 3 numbered steps. Avoid filler. Ask before details.'
      : normalizedMode === 'gentle'
      ? 'Style: Gentle and validating. 1–3 short sentences. Acknowledge feelings briefly, then suggest one next step. Offer at most 2 choices. Ask before details.'
      : 'Style: Balanced—brief, warm, and clear. 1–3 short sentences. Prefer numbered steps. Confirm understanding. Ask before deep detail.'

    const baseInstructions = body.instructions || `
You are Nuree, a supportive personal assistant.
${stylePrefix}
Barge-in: If the user starts speaking, immediately stop and listen.
Keep turns short and concrete. Offer micro-summaries when asked.
`

    // Compose request to OpenAI Realtime Sessions API
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        voice: requestedVoice,
        instructions: baseInstructions,
        // Optionally enable VAD on server side if supported by model/release
        // turn_detection: { type: 'server_vad', threshold: 0.6 },
      })
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('Failed to create realtime session:', res.status, text)
      return NextResponse.json({ error: 'Failed to create realtime session' }, { status: 500 })
    }

    const session = await res.json()

    let answerSdp: string | null = null
    if (body.offerSdp) {
      const ephemeral = session?.client_secret?.value
      if (!ephemeral) {
        console.error('Realtime session missing ephemeral token')
        return NextResponse.json({ error: 'Realtime session token unavailable' }, { status: 500 })
      }

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeral}`,
          'Content-Type': 'application/sdp'
        },
        body: body.offerSdp
      })

      if (!sdpResponse.ok) {
        const text = await sdpResponse.text().catch(() => '')
        console.error('Realtime SDP exchange failed:', sdpResponse.status, text)
        return NextResponse.json({ error: 'Realtime SDP exchange failed' }, { status: 500 })
      }

      answerSdp = await sdpResponse.text()
    }

    // Attach a couple of client hints
    const maxMinutes = Number(process.env.REALTIME_MAX_MINUTES_PER_SESSION || 10)
    const silenceTimeout = Number(process.env.REALTIME_SILENCE_TIMEOUT_SECONDS || 60)

    return NextResponse.json({
      session,
      config: {
        model,
        voice: requestedVoice,
        maxMinutes,
        silenceTimeout,
        mode: normalizedMode,
      },
      answer: answerSdp ?? undefined
    })
  } catch (err: any) {
    console.error('Realtime session route error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function safeJson<T>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
