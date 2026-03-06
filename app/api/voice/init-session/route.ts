import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextEngine } from '@/lib/ai/context-engine'
import { getPersonality, type PersonalityConfig } from '@/lib/config/personalities'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID

// Cache: once tools are verified, skip re-checking
let toolsVerified = false

/**
 * Client tool definitions for the ElevenLabs agent.
 * These MUST exist as workspace tools AND be attached to the agent via tool_ids.
 */
const VOICE_TOOL_DEFINITIONS = [
  {
    type: 'client' as const,
    name: 'start_focus',
    description: 'Start a focus timer for the user. Use when they want to focus, concentrate, study, or work on something.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'integer', description: 'Duration in minutes (5-90, default 25)' },
        taskId: { type: 'string', description: 'Optional task ID to focus on' }
      }
    }
  },
  {
    type: 'client' as const,
    name: 'pause_focus',
    description: 'Pause the currently running focus timer. Use when the user needs a break.',
    expects_response: true,
    parameters: { type: 'object', properties: {} }
  },
  {
    type: 'client' as const,
    name: 'stop_focus',
    description: 'Stop and end the focus timer completely.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        completed: { type: 'boolean', description: 'Whether the session was completed successfully (default true)' }
      }
    }
  },
  {
    type: 'client' as const,
    name: 'create_task',
    description: 'Create a new task for the user. Use when they mention something they need to do.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The task title (required)' },
        description: { type: 'string', description: 'Optional task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority' },
        dueDate: { type: 'string', description: 'Optional due date (ISO format)' },
        timeEstimate: { type: 'integer', description: 'Estimated time in minutes' }
      },
      required: ['title']
    }
  },
  {
    type: 'client' as const,
    name: 'complete_task',
    description: 'Mark a task as done. Use when the user says they finished something.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID to complete (required)' }
      },
      required: ['taskId']
    }
  },
  {
    type: 'client' as const,
    name: 'edit_task',
    description: 'Update a task\'s details. Use when the user wants to change something about a task.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID to update (required)' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'New priority' },
        timeEstimate: { type: 'integer', description: 'New time estimate in minutes' },
        dueDate: { type: 'string', description: 'New due date (ISO format)' }
      },
      required: ['taskId']
    }
  },
  {
    type: 'client' as const,
    name: 'play_music',
    description: 'Play background music for the user. Use when they want music for focus or relaxation.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['focus', 'calm', 'productivity', 'sleep'], description: 'Music category' }
      }
    }
  },
  {
    type: 'client' as const,
    name: 'pause_music',
    description: 'Pause the currently playing music.',
    expects_response: true,
    parameters: { type: 'object', properties: {} }
  },
  {
    type: 'client' as const,
    name: 'stop_music',
    description: 'Stop music playback completely.',
    expects_response: true,
    parameters: { type: 'object', properties: {} }
  },
  {
    type: 'client' as const,
    name: 'log_mood',
    description: 'Log the user\'s current mood and energy level. Use when they share how they\'re feeling.',
    expects_response: true,
    parameters: {
      type: 'object',
      properties: {
        mood: { type: 'string', enum: ['great', 'good', 'okay', 'low', 'bad'], description: 'Current mood (great=excellent, good, okay, low=bad, bad=terrible)' },
        energy: { type: 'integer', description: 'Energy level 1-10' },
        notes: { type: 'string', description: 'Optional notes about how they feel' }
      },
      required: ['mood', 'energy']
    }
  }
]

/**
 * Ensure all client tools are created in the ElevenLabs workspace
 * and attached to the agent. Runs once per server lifecycle.
 */
async function ensureAgentTools(): Promise<void> {
  if (toolsVerified || !ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) return

  try {
    // 1. Get current agent configuration
    const agentRes = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${ELEVENLABS_AGENT_ID}`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    })

    if (!agentRes.ok) {
      console.error('[Voice Tools] Failed to fetch agent config:', agentRes.status)
      return
    }

    const agentConfig = await agentRes.json()
    const existingToolIds: string[] = agentConfig?.conversation_config?.agent?.prompt?.tool_ids || []
    console.log('[Voice Tools] Agent has', existingToolIds.length, 'tools attached:', existingToolIds)

    // 2. Get all workspace tools to find existing ones by name
    const toolsRes = await fetch(`${ELEVENLABS_API_URL}/convai/tools?page_size=50`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY }
    })

    let existingTools: Array<{ tool_id: string; name: string; type: string }> = []
    if (toolsRes.ok) {
      const toolsData = await toolsRes.json()
      existingTools = (toolsData?.tools || []).map((t: any) => ({
        tool_id: t.tool_id,
        name: t.name || t.tool_config?.name,
        type: t.type || t.tool_config?.type
      }))
      console.log('[Voice Tools] Workspace tools:', existingTools.map(t => `${t.name} (${t.tool_id})`))
    }

    // 3. Create any missing tools and collect all tool IDs
    const allToolIds: string[] = [...existingToolIds]

    for (const toolDef of VOICE_TOOL_DEFINITIONS) {
      const existing = existingTools.find(t => t.name === toolDef.name)

      if (existing) {
        // Tool exists in workspace — ensure it's attached to the agent
        if (!allToolIds.includes(existing.tool_id)) {
          console.log(`[Voice Tools] Attaching existing tool: ${toolDef.name} (${existing.tool_id})`)
          allToolIds.push(existing.tool_id)
        } else {
          console.log(`[Voice Tools] Tool already attached: ${toolDef.name}`)
        }
      } else {
        // Tool doesn't exist — create it
        console.log(`[Voice Tools] Creating tool: ${toolDef.name}`)
        const createRes = await fetch(`${ELEVENLABS_API_URL}/convai/tools`, {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tool_config: toolDef })
        })

        if (createRes.ok) {
          const created = await createRes.json()
          const newToolId = created.tool_id
          console.log(`[Voice Tools] Created tool: ${toolDef.name} → ${newToolId}`)
          allToolIds.push(newToolId)
        } else {
          const errText = await createRes.text()
          console.error(`[Voice Tools] Failed to create tool ${toolDef.name}:`, createRes.status, errText)
        }
      }
    }

    // 4. If we need to attach new tools, update the agent
    if (allToolIds.length > existingToolIds.length) {
      console.log(`[Voice Tools] Updating agent with ${allToolIds.length} tools (was ${existingToolIds.length})`)

      const updateRes = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${ELEVENLABS_AGENT_ID}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                tool_ids: allToolIds
              }
            }
          }
        })
      })

      if (updateRes.ok) {
        console.log('[Voice Tools] Agent updated successfully with all tools')
      } else {
        const errText = await updateRes.text()
        console.error('[Voice Tools] Failed to update agent:', updateRes.status, errText)
      }
    } else {
      console.log('[Voice Tools] All tools already configured')
    }

    toolsVerified = true
  } catch (error) {
    console.error('[Voice Tools] Error ensuring agent tools:', error)
    // Don't block session init if tool setup fails
  }
}

interface SessionResponse {
  sessionId: string
  signedUrl: string
  agentId: string
  expiresAt: number
  systemPrompt: string
  voiceId: string // ElevenLabs voice ID for personality
  userId: string // For passing to WebSocket connection
  metadata: {
    user_id: string
    session_type: string
    personality: string
    created_at: string
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Fetch user context using ContextEngine (consistent with Text AI)
    await contextEngine.initialize(user.id)
    const userContext = await contextEngine.buildContext()

    // Fetch all context data in parallel using ContextEngine methods
    const [profile, tasks, moodEntries, activeFocus, coachNotes, completedTasksToday, overdueTasks, topSignals] = await Promise.all([
      contextEngine.getUserProfile(),
      contextEngine.getActiveTasks(5),
      contextEngine.getRecentMoods(), // Now uses 7-day window
      contextEngine.getCurrentFocusSession(),
      contextEngine.getCoachNotes(3),
      contextEngine.getCompletedTasksToday(),
      contextEngine.getOverdueTasks(),
      contextEngine.getTopSignals()
    ])

    // Get recent conversation history (last 5 messages from text chat)
    const { data: recentMessages, error: conversationsError } = await supabase
      .from('conversations')
      .select('role, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Log conversations error for debugging (empty history is ok)
    if (conversationsError) {
      console.warn('Conversations query error (skipping history):', conversationsError.message)
    }

    // 3. Get user's selected personality (defaults to 'nur')
    // Fetch personality directly with authenticated server client
    // (ContextEngine uses browser client which lacks session on server-side)
    const { data: userRow } = await supabase
      .from('users')
      .select('selected_personality')
      .eq('id', user.id)
      .single()
    const personality = getPersonality(userRow?.selected_personality ?? profile?.selected_personality)
    console.log('Using personality:', personality.id, personality.name)

    // 4. Build dynamic system prompt with personalization
    const systemPrompt = buildPersonalizedPrompt({
      profile,
      personality,
      tasks: tasks || [],
      moodEntries: moodEntries || [],
      activeFocus,
      recentMessages: recentMessages || [],
      coachNotes: coachNotes || [],
      completedTasksToday: completedTasksToday || [],
      overdueTasks: overdueTasks || [],
      userContext,
      topSignals: topSignals || []
    })

    // 4. Initialize ElevenLabs session with signed URL
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
      throw new Error('ElevenLabs credentials not configured')
    }

    // Ensure all client tools are configured on the agent (runs once per server lifecycle)
    await ensureAgentTools()

    // Get signed URL for conversation with the agent
    // The conversation will be created when the WebSocket connects
    // Note: include_conversation_id=true will return a conversation_id for tracking
    const signedUrlResponse = await fetch(
      `${ELEVENLABS_API_URL}/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}&include_conversation_id=true`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    )

    if (!signedUrlResponse.ok) {
      const errorText = await signedUrlResponse.text()
      console.error('ElevenLabs API error:', errorText)
      throw new Error(`Failed to get signed URL: ${signedUrlResponse.status}`)
    }

    const responseData = await signedUrlResponse.json()
    const { signed_url, conversation_id } = responseData

    // Generate session ID (for tracking)
    const sessionId = conversation_id || `voice_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Signed URLs expire after 15 minutes
    const expiresAt = Date.now() + (15 * 60 * 1000)

    // 5. Save conversation mapping to database for webhook lookup
    // This allows the webhook to find the user_id from conversation_id
    if (conversation_id) {
      try {
        await supabase.from('conversations').insert({
          user_id: user.id,
          session_id: conversation_id,
          role: 'system',
          content: 'Voice session initialized',
          metadata: {
            source: 'voice',
            elevenlabs_conversation_id: conversation_id,
            agent_id: ELEVENLABS_AGENT_ID,
            session_type: 'voice',
            initialized_at: new Date().toISOString(),
            expires_at: new Date(expiresAt).toISOString()
          }
        })
        console.log('Saved conversation mapping:', conversation_id, '→', user.id)
      } catch (dbError) {
        console.error('Failed to save conversation mapping:', dbError)
        // Don't fail the request if saving fails - the session can still work
      }
    }

    // 7. Return session credentials to frontend
    const response: SessionResponse = {
      sessionId,
      signedUrl: signed_url,
      agentId: ELEVENLABS_AGENT_ID,
      expiresAt,
      systemPrompt,
      voiceId: personality.voiceId, // ElevenLabs voice ID for TTS override
      userId: user.id, // Pass userId to client for WebSocket metadata
      metadata: {
        user_id: user.id,
        session_type: 'voice',
        personality: personality.id,
        created_at: new Date().toISOString()
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Voice session initialization error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initialize voice session' },
      { status: 500 }
    )
  }
}

function buildPersonalizedPrompt(context: {
  profile: any
  personality: PersonalityConfig
  tasks: any[]
  moodEntries: any[]
  activeFocus: any
  recentMessages: any[]
  coachNotes: any[]
  completedTasksToday: any[]
  overdueTasks: any[]
  userContext: any
  topSignals: string[]
}): string {
  const { profile, personality, tasks, moodEntries, activeFocus, recentMessages, coachNotes, completedTasksToday, overdueTasks, userContext, topSignals } = context

  // Current date/time for context
  const now = new Date()
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Personality-specific base prompt
  let prompt = `${personality.promptModifiers.personality}

${personality.promptModifiers.tone}

${personality.promptModifiers.approach}

Current Date & Time: ${dateString}, ${timeString}

You understand how different brains work — difficulty starting tasks, time blindness, emotional overwhelm, hyperfocus. Keep this in the background to inform how you help, but don't make it the topic of conversation.

BOUNDARIES:
- NEVER write essays, homework, or assignments
- NEVER give medical advice or recommend medications
- For medical questions, say: "That's really a question for your doctor. I can help with strategies though."
- When offering choices, limit to 2 options max

`

  // Add user profile context (background knowledge)
  if (profile?.adhd_presentation || profile?.adhd_persona) {
    const topStruggles = topSignals.length > 0 ? topSignals.map(s => s.replace(/_/g, ' ')).join(', ') : null

    prompt += `\nAbout This User:
${topStruggles ? `- They tend to struggle with: ${topStruggles}` : ''}
- Keep this in mind when helping, but don't bring it up unless relevant

`
  }

  // Add current context
  if (activeFocus) {
    prompt += `\nCurrent State:
- User is in an active focus session (${activeFocus.duration} minutes)
- Started: ${new Date(activeFocus.created_at).toLocaleTimeString()}

`
  }

  // Add task context — include IDs so the agent can reference them in tool calls
  if (tasks.length > 0) {
    prompt += `\nActive Tasks (Priority Order):
${tasks.slice(0, 5).map((t, i) => `${i + 1}. [ID: ${t.id}] "${t.title}" (Priority: ${t.priority}, Est: ${t.time_estimate || 'Unknown'} min)`).join('\n')}

`
  }

  // Add completed tasks
  prompt += `\nCompleted Today:
${completedTasksToday.length > 0
    ? completedTasksToday.map(task => `- "${task.title}" (${task.time_estimate || 25} min)`).join('\n')
    : '- None yet'}

`

  // Add overdue tasks if any
  if (overdueTasks.length > 0) {
    prompt += `\nOverdue Tasks (Need Attention):
${overdueTasks.map(task => {
      const dueDate = new Date(task.due_date)
      const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return `- "${task.title}" (${daysOverdue} days overdue, priority ${task.priority})`
    }).join('\n')}

`
  }

  // Add session context from userContext
  if (userContext) {
    prompt += `\nSession Context:
- Focus Score: ${userContext.psychological?.focusScore || 5}/10
- Energy Level: ${userContext.psychological?.energyLevel || 5}/10
- Tasks Completed Today: ${completedTasksToday.length}
- Focus Minutes Today: ${userContext.session?.focusMinutes || 0}

`
  }

  // Add mood context
  if (moodEntries.length > 0) {
    const latestMood = moodEntries[0]
    prompt += `\nRecent Mood:
- Current: ${latestMood.mood} (Energy: ${latestMood.energy}/10, Focus: ${latestMood.focus}/10)
- Logged: ${new Date(latestMood.created_at).toLocaleTimeString()}

`
  }

  // Add conversation continuity
  if (recentMessages.length > 0) {
    prompt += `\nRecent Conversation Context:
${recentMessages.slice(0, 3).reverse().map(m => `${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`).join('\n')}

`
  }

  // Add coach notes if available
  if (coachNotes && coachNotes.length > 0) {
    prompt += `\nProfessional Coach Observations:
${coachNotes.map(note => `- [${new Date(note.created_at).toLocaleDateString()}] ${note.body}`).join('\n')}

Use these professional insights to guide your coaching approach.

`
  }

  // Add tool awareness
  prompt += `\nAVAILABLE TOOLS — You have tools to take real actions for the user. USE THEM when relevant:

- start_focus: Start a focus timer. Use when user wants to focus, concentrate, study, or work. Parameters: duration (5-90 min, default 25), optional taskId.
- pause_focus: Pause the running focus timer. Use when user needs a break.
- stop_focus: Stop and end the focus timer completely.
- create_task: Create a new task. Returns the new task's ID — remember it so you can edit or complete it later in this conversation. Parameters: title (required), optional description, priority (low/medium/high/urgent), dueDate, timeEstimate (minutes).
- complete_task: Mark a task as done. Use when user says they finished something. Parameters: taskId (required — use the ID from Active Tasks above or from create_task result).
- edit_task: Update a task. Use when user wants to change a task's details. Parameters: taskId (required), plus any fields to update (title, description, priority, timeEstimate, dueDate).
- play_music: Play background music. Use when user wants music for focus or relaxation. Parameters: category (focus/calm/productivity/sleep).
- pause_music: Pause the currently playing music.
- stop_music: Stop music completely.
- log_mood: Log how the user is feeling. Use when they share their mood. Parameters: mood (great/good/okay/low/bad), energy (1-10), optional notes.

TOOL USAGE RULES:
- When the user asks you to do something you have a tool for, USE THE TOOL immediately — don't say you can't do it.
- After using a tool, confirm what you did briefly ("Started a 25-minute focus timer!" not a long explanation).
- You can combine tools — e.g. start focus AND play music if the user asks to focus with music.
- If a tool fails, let the user know simply and suggest an alternative.

`

  // Add voice-specific response rules
  prompt += `\nVOICE RESPONSE RULES (CRITICAL - you are in a voice conversation):
1. ANSWER THE USER'S QUESTION FIRST — respond directly to what they asked
2. Keep responses to 1-2 sentences MAX — voice is not text, long responses are frustrating
3. Be conversational and natural — no bullet points, no lists, no markdown
4. NEVER use XML tags, HTML tags, or any markup — just speak naturally as plain text
5. One idea at a time — don't stack multiple suggestions
6. Walk through tasks ONE step at a time, then ask if they're ready for the next
7. Don't default to "how are you feeling?" — let them lead on emotions

Style:
- Figure out what they want (organize, vent, focus, chat) and go with it
- Acknowledge struggles without minimizing
- Suggest the EASIEST task first, not the most important
- Celebrate progress briefly
- Be direct — clarity over pep talks`

  return prompt
}
