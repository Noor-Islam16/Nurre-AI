import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { getToolExecutor } from '@/lib/ai/tool-executor'

/**
 * ElevenLabs Voice Actions Webhook Endpoint
 *
 * Receives tool call requests from ElevenLabs agent and executes them server-side.
 * Implements three-layer security:
 * 1. HMAC signature verification
 * 2. Allowlist (configured in ElevenLabs dashboard)
 * 3. User authentication via metadata
 */

interface ElevenLabsWebhookRequest {
  conversation_id: string
  agent_id: string
  tool_name: string
  // All other fields are tool-specific parameters
  [key: string]: any
}

interface ToolExecutionResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

/**
 * Verify HMAC signature from ElevenLabs
 * Uses constant-time comparison to prevent timing attacks
 */
function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    console.error('Missing signature header')
    return false
  }

  try {
    // Create HMAC with SHA256
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(body)
    const computed = hmac.digest('hex')

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Format tool result for speech output
 * Converts technical results into natural language for voice
 */
function formatToolResponseForSpeech(toolName: string, result: any): string {
  if (!result.success) {
    return result.error || "I couldn't complete that action. Please try again."
  }

  // Tool-specific friendly messages
  switch (toolName) {
    case 'start_focus':
      const duration = result.duration || 25
      return `I've started a ${duration}-minute focus session for you. Let's make some great progress!`

    case 'create_task':
      return `I've created that task for you! It's now in your planner.`

    case 'complete_task':
      return `Amazing work! I've marked that task as complete. You're doing great!`

    case 'pause_focus':
      return `I've paused your timer. Take the break you need.`

    case 'log_mood':
      return `Thanks for sharing how you're feeling. I've logged your mood.`

    case 'navigate_to':
      return `Taking you to ${result.navigatedTo || 'that page'} now.`

    case 'trigger_breathing':
      return `Let's take a moment to breathe. Starting the ${result.pattern || 'breathing'} exercise.`

    case 'trigger_mood_check':
      return result.message || "I've opened the mood check for you."

    case 'start_feature_tour':
      return result.message || `Starting the ${result.data?.tour_id?.replace('_', ' ') || 'feature'} tour!`

    case 'schedule_reminder':
      return `I've scheduled that reminder for you.`

    default:
      return result.message || 'Done! Let me know what else you need.'
  }
}

export async function POST(req: NextRequest) {
  let userId: string | undefined

  try {
    // 1. Read raw body for signature verification
    const bodyText = await req.text()

    // 2. Verify HMAC signature
    const signature = req.headers.get('x-elevenlabs-signature')
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('ELEVENLABS_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          message: "I'm having trouble connecting right now. Please try again later."
        },
        { status: 500 }
      )
    }

    if (!verifySignature(bodyText, signature, webhookSecret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature',
          message: "I couldn't verify this request. Please try again."
        },
        { status: 401 }
      )
    }

    // 3. Parse request body
    let data: ElevenLabsWebhookRequest
    try {
      data = JSON.parse(bodyText)
    } catch (error) {
      console.error('Failed to parse webhook body:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          message: "I couldn't understand that request. Please try again."
        },
        { status: 400 }
      )
    }

    // 4. Look up user_id from conversation_id
    // Use service role client — this webhook is called by ElevenLabs (no browser cookies)
    // Authentication is handled via HMAC signature verification above
    const supabase = createServiceClient()

    // First, try to find user_id by session_id (primary lookup)
    const { data: sessionData } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('session_id', data.conversation_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionData) {
      userId = sessionData.user_id
    } else {
      // Fallback: Look up by elevenlabs_conversation_id in metadata
      const { data: metadataData } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('metadata->>elevenlabs_conversation_id', data.conversation_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (metadataData) {
        userId = metadataData.user_id
      }
    }

    if (!userId) {
      console.error('Could not find user for conversation:', data.conversation_id)
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          message: "I couldn't identify your account. Please restart the voice session."
        },
        { status: 400 }
      )
    }

    // 5. Verify user exists and is authenticated
    const { data: user, error: userError} = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (userError || !user) {
      console.error('User verification failed:', userError)
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          message: "I couldn't verify your account. Please try again."
        },
        { status: 403 }
      )
    }

    // 6. Extract tool parameters from request body
    // Remove system fields to get just the tool parameters
    const { tool_name, conversation_id, agent_id, ...parameters } = data

    // Log tool call for debugging
    console.log('Voice tool call:', {
      tool: tool_name,
      user: userId,
      conversation: conversation_id,
      parameters
    })

    // 7. Execute tool using server-side ToolExecutor
    const toolExecutor = getToolExecutor(userId, supabase)

    const result = await toolExecutor.executeSingleNativeTool({
      id: `voice_${Date.now()}`,
      type: 'function',
      function: {
        name: tool_name,
        arguments: JSON.stringify(parameters)
      }
    })

    // Parse tool result
    let parsedResult: any
    try {
      parsedResult = JSON.parse(result.content)
    } catch (error) {
      console.error('Failed to parse tool result:', error)
      parsedResult = { success: false, error: 'Tool execution failed' }
    }

    // 8. Save tool call to conversations table
    try {
      await supabase.from('conversations').insert({
        user_id: userId,
        session_id: conversation_id,
        role: 'assistant',
        content: `[Tool: ${tool_name}]`,
        tool_calls: [{
          name: tool_name,
          parameters: parameters,
          result: parsedResult
        }],
        metadata: {
          source: 'voice',
          elevenlabs_conversation_id: conversation_id,
          tool_execution: true,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to save tool call to database:', error)
      // Don't fail the request if logging fails
    }

    // 9. Track tool execution event
    try {
      await supabase.from('events').insert({
        user_id: userId,
        type: 'voice_tool_executed',
        data: {
          tool_name: tool_name,
          success: parsedResult.success,
          conversation_id: conversation_id
        }
      })
    } catch (error) {
      console.error('Failed to track tool event:', error)
      // Don't fail the request if tracking fails
    }

    // 10. Return result to ElevenLabs
    const response: ToolExecutionResponse = {
      success: parsedResult.success,
      message: formatToolResponseForSpeech(tool_name, parsedResult),
      data: parsedResult.data
    }

    if (!parsedResult.success) {
      response.error = parsedResult.error
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Voice webhook error:', error)

    // Log error to database if we have userId
    if (userId) {
      try {
        const supabase = createServiceClient()
        await supabase.from('events').insert({
          user_id: userId,
          type: 'voice_webhook_error',
          data: {
            error: error.message,
            stack: error.stack
          }
        })
      } catch (logError) {
        console.error('Failed to log webhook error:', logError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Tool execution failed',
        message: "I ran into an issue. Please try again."
      },
      { status: 500 }
    )
  }
}

// Disable body parsing to access raw body for signature verification
export const runtime = 'nodejs'
