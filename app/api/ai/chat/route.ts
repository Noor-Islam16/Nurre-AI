// app/api/ai/chat/route.ts (COMPLETE MODIFIED VERSION)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPTS, getPersonaPrompt, enforceResponseBoundaries } from '@/lib/ai/prompts'
import { CHAT_MODEL } from '@/lib/ai/openai-config'
import { contextEngine, type UserContext } from '@/lib/ai/context-engine'
import { ToolRegistry } from '@/lib/ai/functions'
import { eventTracker, EventType } from '@/lib/tracking/events'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { ResponsesAPIClient } from '@/lib/ai/responses-api-client'
import { validateRequest } from '@/lib/validation/validate-request'
import { z } from 'zod'
import { requestDeduper } from '@/lib/cache/request-deduper'
import { createSecureApiResponse } from '@/lib/api/with-security-headers'
import { getContentFilter } from '@/lib/ai/content-filter'
import { getAbuseDetector } from '@/lib/ai/abuse-detector'
import { getGuardrailLogger } from '@/lib/ai/guardrail-logger'
import { queueEmbeddingJob } from '@/lib/ai/vector/enqueue-embedding-job'
import { fetchSimilarMessages } from '@/lib/ai/vector/fetch-similar-messages'

// AVATAR ENGINE IMPORTS
import { getPersonality, type PersonalityId } from '@/lib/config/personalities'
import {
  detectConversationMode,
  detectFunctionalState,
  extractSessionMemory,
  validateAvatarResponse,
  buildAvatarPromptLayer,
  type ConversationMode,
} from '@/lib/ai/avatar-engine'

// Chat request validation schema
const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string().min(1).max(10000),
    tool_call_id: z.string().optional()
  })).min(1).max(50),
  stream: z.boolean().default(false),
  conversationId: z.string().uuid().nullable().optional(),
  previousResponseId: z.string().nullable().optional(),
  toolChoice: z.union([
    z.string(),
    z.object({
      type: z.literal('function'),
      function: z.object({
        name: z.string()
      })
    })
  ]).optional(),
  context: z.string().optional()
})

const responsesClient = new ResponsesAPIClient(process.env.OPENAI_API_KEY!)
const guardrailLogger = getGuardrailLogger()

function truncateText(text: string, max: number = 240): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

function formatMemorySnippet(memory: { role: string; content: string; created_at: string; similarity: number }, index: number): string {
  const when = new Date(memory.created_at)
  const dateLabel = Number.isNaN(when.getTime()) ? 'previous session' : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const similarity = Math.round(memory.similarity * 100)
  const speaker = memory.role === 'user' ? 'User' : 'Coach'
  return `${index + 1}. (${similarity}% match) ${speaker} (${dateLabel}): "${truncateText(memory.content)}"`
}

async function safeGuardrailCheck<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await operation()
  } catch (error: any) {
    console.error(`Guardrail check failed (${context}):`, error)
    await guardrailLogger.log({
      userId: 'system',
      action: 'guardrail_error',
      reason: context,
      metadata: { error: error.message }
    })
    return fallback
  }
}

function ensureMessageContent(
  content: string | undefined | null,
  toolCalls: any[] = []
): string {
  const trimmed = (content || '').trim();
  
  if (trimmed) {
    return trimmed;
  }
  
  if (toolCalls.length > 0) {
    const tool = toolCalls[0];
    const toolName = tool.function.name;
    
    let args: any = {};
    try {
      args = JSON.parse(tool.function.arguments || '{}');
    } catch (e) {}
    
    switch (toolName) {
      case 'start_focus':
        const duration = args.duration || 25;
        const taskInfo = args.taskId ? ' for your task' : '';
        return `Started a ${duration}-minute focus session${taskInfo}.`;
      case 'create_task':
        return `Added that to your task list.`;
      case 'complete_task':
        return `Done — marked that off. Nice work.`;
      case 'pause_focus':
        return `Paused your timer. Take the break you need.`;
      case 'resume_focus':
        return `Resumed your focus timer.`;
      case 'end_focus':
        return `Session done. Good work.`;
      case 'log_mood':
        return `Logged how you're feeling.`;
      case 'navigate_to':
        const page = args.page || 'that page';
        return `Taking you to ${page}.`;
      case 'trigger_break':
        return `Break time. Stretch, hydrate, rest your mind.`;
      default:
        if (toolCalls.length > 1) {
          return `Done. What's next?`;
        }
        return `Done. What else can I help with?`;
    }
  }
  
  return "I'm here to help! What would you like to work on?";
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    let user: any = null
    
    try {
      if (process.env.NODE_ENV === 'development') {
        try {
          const bodyClone = req.clone()
          const body = await bodyClone.json()
          console.log('Chat API request:', {
            url: req.url,
            method: req.method,
            bodyKeys: Object.keys(body),
            messageCount: body.messages?.length,
            stream: body.stream,
            hasConversationId: !!body.conversationId,
            hasToolChoice: !!body.toolChoice
          })
        } catch (e) {
          console.log('Could not log request body:', e)
        }
      }
      
      const validation = await validateRequest(req, ChatRequestSchema)
      if (validation.error) {
        try {
          const errorDetails = await validation.error.clone().json()
          console.error('Chat API validation failed:', {
            status: validation.error.status,
            error: errorDetails.error,
            details: errorDetails.details
          })
        } catch (e) {
          console.error('Chat API validation failed (could not parse error):', validation.error.status)
        }
        return validation.error
      }
      
      const { messages, conversationId, previousResponseId, toolChoice, context } = validation.data
      const stream = false
      
      const validatedMessages = messages.map(msg => ({
        ...msg,
        content: msg.content || ' '
      }))
      
      const supabase = await createClient()
      const authData = await supabase.auth.getUser()
      user = authData.data.user

      const insertedUserMessageIds: string[] = []
      const insertedAssistantMessageIds: string[] = []
      const latestUserMessage = [...validatedMessages].reverse().find(msg => msg.role === 'user')
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const abuseDetector = getAbuseDetector()
      const abuseCheck = await safeGuardrailCheck(
        () => abuseDetector.checkUser(user.id),
        { allowed: true, restrictionLevel: 'none' },
        'abuse_detection'
      )
      
      if (!abuseCheck.allowed) {
        await guardrailLogger.log({
          userId: user.id,
          action: 'blocked_abuse',
          reason: abuseCheck.reason,
          restrictionLevel: abuseCheck.restrictionLevel,
          severity: 'high',
          metadata: {
            suspensionEndsAt: abuseCheck.suspensionEndsAt,
            cooldownRemaining: abuseCheck.cooldownRemaining
          }
        })
        
        const headers = new Headers({
          'X-Guardrails-Active': 'true',
          'X-Content-Filtered': 'false',
          'X-Restriction-Level': abuseCheck.restrictionLevel || 'limited'
        })
        
        return NextResponse.json({
          error: 'Access restricted',
          message: abuseCheck.reason,
          restrictionLevel: abuseCheck.restrictionLevel,
          suspensionEndsAt: abuseCheck.suspensionEndsAt,
          cooldownRemaining: abuseCheck.cooldownRemaining,
          filtered: true
        }, { status: 403, headers })
      }
      
      let warningMessage = ''
      if (abuseCheck.restrictionLevel === 'warning' && abuseCheck.remainingWarnings) {
        warningMessage = `⚠️ Warning: You have ${abuseCheck.remainingWarnings} warnings remaining before access restrictions are applied.`
      }

      const contentFilter = getContentFilter()
      const lastUserMessage = validatedMessages[validatedMessages.length - 1]
      
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const filterResult = await safeGuardrailCheck(
          () => Promise.resolve(contentFilter.filter(lastUserMessage.content)),
          { allowed: true },
          'content_filtering'
        )
        
        if (!filterResult.allowed) {
          await safeGuardrailCheck(
            () => abuseDetector.recordViolation(
              user.id,
              filterResult.reason as any,
              lastUserMessage.content,
              filterResult.severity || 'medium'
            ),
            undefined,
            'record_violation'
          )
          
          await guardrailLogger.log({
            userId: user.id,
            action: 'filtered_content',
            reason: filterResult.reason,
            severity: filterResult.severity || 'medium',
            matchedPatterns: filterResult.matchedPatterns,
            metadata: {
              confidence: filterResult.confidence,
              message_length: lastUserMessage.content.length
            }
          })
          
          await contentFilter.logFilteredRequest({
            userId: user.id,
            timestamp: new Date(),
            content: lastUserMessage.content,
            filterResult,
            action: 'blocked'
          }, supabase)
          
          await supabase.from('events').insert({
            user_id: user.id,
            type: 'content_filtered',
            data: {
              reason: filterResult.reason,
              severity: filterResult.severity,
              confidence: filterResult.confidence
            }
          })
          
          const headers = new Headers({
            'X-Guardrails-Active': 'true',
            'X-Content-Filtered': 'true',
            'X-Filter-Reason': filterResult.reason || 'unknown',
            'X-Restriction-Level': abuseCheck.restrictionLevel || 'none'
          })
          
          return NextResponse.json({
            id: `filtered-${Date.now()}`,
            content: filterResult.message || "I'm not able to help with that. But I can help you organize your tasks or talk through what's on your mind.",
            message: filterResult.message || "I'm not able to help with that. But I can help you organize your tasks or talk through what's on your mind.",
            filtered: true,
            metadata: {
              filtered: true,
              reason: filterResult.reason,
              warningMessage
            }
          }, { headers })
        }
      }

      eventTracker.track(EventType.AI_MESSAGE, {
        userId: user.id,
        messageCount: validatedMessages.length,
        stream: false,
        lastMessage: validatedMessages[validatedMessages.length - 1]?.content?.substring(0, 100)
      })

      if (conversationId && latestUserMessage && latestUserMessage.role === 'user') {
        const { data: insertedUserMessages, error: userInsertError } = await supabase.from('conversations').insert({
          user_id: user.id,
          session_id: conversationId,
          role: 'user',
          content: latestUserMessage.content,
          created_at: new Date().toISOString(),
          metadata: {
            timestamp: new Date().toISOString(),
            context: context
          }
        }).select('id')

        if (userInsertError) {
          console.error('Failed to save user message:', userInsertError)
        } else if (insertedUserMessages && insertedUserMessages.length > 0) {
          insertedUserMessageIds.push(...insertedUserMessages.map(message => message.id))
          queueEmbeddingJob(insertedUserMessages.map(message => message.id)).catch((error) => {
            console.error('Failed to queue embedding job for user message:', error)
          })
        }
      }

      await contextEngine.initialize(user.id)
      const userContext: UserContext = await contextEngine.buildContext()

      const [userProfile, coachNotes, completedTasksToday, overdueTasks, topSignals] = await Promise.all([
        contextEngine.getUserProfile(),
        contextEngine.getCoachNotes(5),
        contextEngine.getCompletedTasksToday(),
        contextEngine.getOverdueTasks(),
        contextEngine.getTopSignals()
      ])

      let vectorMemories: Array<{ id: string; role: 'user' | 'assistant'; content: string; created_at: string; similarity: number }> = []
      if (latestUserMessage?.content) {
        try {
          vectorMemories = await fetchSimilarMessages(
            supabase,
            user.id,
            latestUserMessage.content,
            {
              limit: 5,
              minSimilarity: 0.6,
              excludeIds: [...insertedUserMessageIds, ...insertedAssistantMessageIds]
            }
          )
        } catch (error) {
          console.error('Failed to fetch similar messages:', error)
        }
      }
      
      const memorySection = vectorMemories.length > 0
        ? `\nRelevant Past Conversations (for context only, do not repeat verbatim):\n${vectorMemories.map((memory, index) => formatMemorySnippet(memory, index)).join('\n')}\n`
        : ''

      // ============================================
      // AVATAR ENGINE INTEGRATION
      // ============================================
      
      // 1. Get user's selected personality and profile data
      const userProfileData = await contextEngine.getUserProfile()
      const personalityId: PersonalityId = (userProfileData?.selected_personality as PersonalityId) || 'nur'
      const personality = getPersonality(personalityId)
      
      // 2. Fetch user's name for personalized avatar responses
      let userName: string | undefined = undefined
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()
        userName = userRow?.name || user?.user_metadata?.name || user?.email?.split('@')[0]
      } catch {
        userName = user?.user_metadata?.name || user?.email?.split('@')[0] || undefined
      }
      
      // 3. Detect functional state from context engine data
      const functionalState = detectFunctionalState(userContext)
      
      // 4. Extract session memory from recent conversation messages
      const sessionMemory = extractSessionMemory(
        validatedMessages.slice(-10), // Last 10 messages for context
        5
      )
      
      // 5. Detect conversation mode based on user message + state
      const isNewSession = !conversationId || validatedMessages.length <= 2
      const lastUserMsg = validatedMessages[validatedMessages.length - 1]?.content || ''
      const conversationMode: ConversationMode = detectConversationMode(
        lastUserMsg,
        functionalState,
        isNewSession,
        sessionMemory.recentTopics
      )
      
      // Log avatar engine decisions for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('🎭 Avatar Engine:', {
          personality: personalityId,
          mode: conversationMode,
          state: functionalState,
          isNewSession,
          memoryTopics: sessionMemory.recentTopics,
          userName: userName || 'unknown',
        })
      }
      
      // 6. Build avatar-specific prompt layer
      const avatarPromptLayer = buildAvatarPromptLayer({
        personalityId,
        mode: conversationMode,
        functionalState,
        userMessage: lastUserMsg,
        userName: userName,
        userContext: {
          activeTasks: (userContext.tasks?.activeTasks || []).map((t: any) => t.title),
          completedToday: completedTasksToday.length,
          overdueTasks: overdueTasks.map((t: any) => t.title),
          currentMood: userContext.psychological?.currentMood,
          energyLevel: userContext.psychological?.energyLevel,
          focusScore: userContext.psychological?.focusScore,
          topSignals,
        },
        sessionMemory,
      })
      
      // 7. Build complete system prompt with all avatar layers
      const systemPrompt = `${SYSTEM_PROMPTS.adhd_coach}

${userProfileData?.adhd_persona ? getPersonaPrompt(userProfileData.adhd_persona) : ''}

${topSignals.length > 0 ? `This user tends to struggle with: ${topSignals.map(s => s.replace(/_/g, ' ')).join(', ')}. Keep this in mind but don't bring it up unless relevant.` : ''}

Current Context:
- Time: ${new Date().toLocaleTimeString()}
- Date: ${new Date().toDateString()}
- Current Mood: ${userContext.psychological?.currentMood || 'neutral'}
- Energy Level: ${userContext.psychological?.energyLevel || 5}/10
- Focus Score: ${userContext.psychological?.focusScore || 5}/10
- Tasks Completed Today: ${completedTasksToday.length}
- Focus Minutes Today: ${userContext.session?.focusMinutes || 0}
- Functional State: ${functionalState.toUpperCase()}
- Conversation Mode: ${conversationMode.toUpperCase().replace('_', ' ')}

${avatarPromptLayer}

Active Tasks:
${userContext.tasks?.activeTasks && userContext.tasks.activeTasks.length > 0
  ? userContext.tasks.activeTasks.map((task: any) =>
      `- "${task.title}" (${task.time_estimate || 25} minutes${task.priority > 7 ? ', HIGH PRIORITY' : ''})`
    ).join('\n')
  : '- No active tasks'}

Completed Today:
${completedTasksToday.length > 0
  ? completedTasksToday.map((task: any) =>
      `- "${task.title}" (${task.time_estimate || 25} min)`
    ).join('\n')
  : '- None yet'}

${overdueTasks.length > 0 ? `Overdue Tasks (Need Attention):
${overdueTasks.map((task: any) => {
  const dueDate = new Date(task.due_date)
  const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  return `- "${task.title}" (${daysOverdue} days overdue, priority ${task.priority})`
}).join('\n')}
` : ''}
${coachNotes.length > 0 ? `Professional Coach Observations:
${coachNotes.map((note: any) =>
  `- [${new Date(note.created_at).toLocaleDateString()}] ${note.body}`
).join('\n')}

Use these professional insights to guide your coaching approach.
` : ''}
${memorySection}

You can execute actions in the app using tools.
Be supportive, understanding, and action-oriented.
Use tools proactively to help the user stay on track.
When a user mentions a task by name, find it in the Active Tasks list above and use its time_estimate for focus sessions.`

      const toolRegistry = new ToolRegistry()
      
      const input: any[] = []
      
      for (const msg of validatedMessages) {
        if (msg.role === 'user') {
          input.push({
            role: 'user',
            content: msg.content
          })
        } else if (msg.role === 'assistant') {
          input.push({
            type: 'message',
            role: 'assistant',
            content: [{
              type: 'output_text',
              text: msg.content
            }]
          })
        } else if (msg.role === 'tool' && msg.tool_call_id) {
          input.push({
            type: 'function_call_output',
            call_id: msg.tool_call_id,
            output: msg.content
          })
        }
      }

      const tools = toolRegistry.getAllTools().map(tool => {
        if (tool.type === 'function') {
          return {
            type: 'function' as const,
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
          }
        }
        return tool
      })
      
      let shouldUsePreviousResponseId = previousResponseId
      const hasToolOutputs = input.some(item => item.type === 'function_call_output')
      
      if (previousResponseId && !hasToolOutputs && input.length === 1 && input[0].role === 'user') {
        console.log('Clearing previousResponseId - new user message without tool outputs')
        shouldUsePreviousResponseId = null
      } else if (previousResponseId) {
        console.log('Using previousResponseId:', previousResponseId, 'for session:', conversationId)
      }
      
      const response = await requestDeduper.dedupe(
        {
          userId: user.id,
          messages: validatedMessages,
          conversationId,
          previousResponseId: shouldUsePreviousResponseId,
          toolChoice,
          context
        },
        async () => {
          return await responsesClient.create({
            model: CHAT_MODEL,
            input,
            instructions: systemPrompt,
            tools,
            tool_choice: toolChoice || 'auto',
            previous_response_id: shouldUsePreviousResponseId,
            reasoning: { effort: 'minimal' },
            text: { verbosity: 'low' },
            max_output_tokens: 1000
          })
        }
      )
      
      let messageContent = ''
      const toolCalls: any[] = []
      
      if (response.output_text) {
        messageContent = response.output_text
      }
      
      if (!messageContent) {
        const chatFormat = responsesClient.convertResponseToChat(response)
        if (chatFormat.choices?.[0]?.message) {
          messageContent = chatFormat.choices[0].message.content || ''
          if (chatFormat.choices[0].message.tool_calls) {
            toolCalls.push(...chatFormat.choices[0].message.tool_calls)
          }
        }
      }
      
      if (!messageContent && response.output && Array.isArray(response.output)) {
        for (const item of response.output) {
          if (item.type === 'message' && item.role === 'assistant') {
            for (const content of item.content || []) {
              if (content.type === 'output_text' && content.text) {
                messageContent += content.text
              }
            }
          } else if (item.type === 'function_call' && toolCalls.length === 0) {
            const toolCall = {
              id: item.call_id,
              type: 'function' as const,
              function: {
                name: item.name,
                arguments: item.arguments
              }
            }
            toolCalls.push(toolCall)
          }
        }
      }
      
      // ============================================
      // AVATAR RESPONSE VALIDATION
      // ============================================
      
      // Validate the response through avatar engine
      const validatedResponse = validateAvatarResponse(messageContent, {
        personalityId,
        mode: conversationMode,
        functionalState,
        userMessage: lastUserMsg,
        userContext: {
          activeTasks: (userContext.tasks?.activeTasks || []).map((t: any) => t.title),
          completedToday: completedTasksToday.length,
          overdueTasks: overdueTasks.map((t: any) => t.title),
          currentMood: userContext.psychological?.currentMood,
          energyLevel: userContext.psychological?.energyLevel,
          focusScore: userContext.psychological?.focusScore,
          topSignals,
        },
      })
      
      messageContent = validatedResponse.content
      
      // Log the response sequence for analytics
      console.log('Avatar response:', {
        mode: validatedResponse.mode,
        state: validatedResponse.state,
        sequence: validatedResponse.sequence,
        personality: validatedResponse.personality,
        length: messageContent.split(' ').length,
      })
      
      messageContent = ensureMessageContent(messageContent, toolCalls);
      
      if (!messageContent || messageContent.trim() === '') {
        console.warn('Empty message content detected after ensureMessageContent - using fallback');
        messageContent = 'Response processed successfully.';
      }
      
      const boundaryCheck = enforceResponseBoundaries(messageContent)
      if (!boundaryCheck.valid) {
        console.warn('AI response violated boundaries:', boundaryCheck.reason)
        
        await guardrailLogger.log({
          userId: user.id,
          action: 'response_boundary_violation',
          reason: boundaryCheck.reason,
          severity: 'medium',
          metadata: {
            originalLength: messageContent.length,
            sampleContent: messageContent.substring(0, 200)
          }
        })
        
        messageContent = boundaryCheck.filteredResponse || "I can't help with that directly, but I can help you organize your tasks or talk through what's on your mind."
        
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ai_boundary_violation',
          data: {
            reason: boundaryCheck.reason,
            original_length: messageContent.length
          }
        })
      }
      
      await guardrailLogger.log({
        userId: user.id,
        action: 'successful_interaction',
        metadata: {
          hasTools: toolCalls.length > 0,
          messageLength: messageContent.length,
          conversationId,
          model: CHAT_MODEL,
          context: context,
          avatarMode: conversationMode,
          avatarState: functionalState
        }
      })
      
      if (toolCalls.length > 0) {
        console.log('Returning tool calls to client for execution:', 
          toolCalls.map(tc => tc.function.name))
        
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ai_tools_requested',
          data: {
            tools: toolCalls.map(tc => tc.function.name),
            count: toolCalls.length,
            model: CHAT_MODEL
          }
        })
      }
      
      if (conversationId && response.id) {
        const safeContent = messageContent || 'Response processed.';

        const { data: insertedAssistantMessages, error: assistantInsertError } = await supabase.from('conversations').insert({
          user_id: user.id,
          session_id: conversationId,
          role: 'assistant',
          content: safeContent,
          tool_calls: toolCalls.length > 0 ? toolCalls : null,
          metadata: {
            timestamp: new Date().toISOString(),
            context: context,
            personality: personalityId,
            response_id: response.id,
            previous_response_id: previousResponseId,
            avatar_mode: conversationMode,
            functional_state: functionalState
          }
        }).select('id')

        if (assistantInsertError) {
          console.error('Failed to save assistant message:', assistantInsertError)
        } else if (insertedAssistantMessages && insertedAssistantMessages.length > 0) {
          insertedAssistantMessageIds.push(...insertedAssistantMessages.map(message => message.id))
          queueEmbeddingJob(insertedAssistantMessages.map(message => message.id)).catch((error) => {
            console.error('Failed to queue embedding job for assistant message:', error)
          })
        }
        
        console.log('Saved response with ID:', response.id, 'for session:', conversationId)
      }
      
      const finalContent = messageContent || 'Response processed.';
      
      const finalMessage = warningMessage ? 
        `${finalContent}\n\n${warningMessage}` : 
        finalContent;
      
      const headers = new Headers({
        'X-Guardrails-Active': 'true',
        'X-Content-Filtered': 'false',
        'X-Restriction-Level': abuseCheck.restrictionLevel || 'none',
        'X-Model': CHAT_MODEL,
        'X-Avatar-Mode': conversationMode,
        'X-Avatar-State': functionalState
      })
      
      if (warningMessage) {
        headers.set('X-Warning-Active', 'true')
      }
      
      if (toolCalls.length > 0) {
        headers.set('X-Tools-Requested', String(toolCalls.length))
      }
      
      return NextResponse.json({
        id: response.id,
        content: finalMessage,
        message: finalMessage,
        tool_calls: toolCalls,
        response_id: response.id,
        requires_tool_execution: toolCalls.length > 0,
        metadata: {
          model: CHAT_MODEL,
          usage: response.usage,
          restrictionLevel: abuseCheck.restrictionLevel,
          warningMessage: warningMessage || undefined,
          avatar: {
            mode: conversationMode,
            state: functionalState,
            personality: personalityId
          }
        }
      }, { headers })
    } catch (error: any) {
      console.error('Chat API error:', error)
      
      if (user) {
        const supabase = await createClient()
        await supabase.from('events').insert({
          user_id: user.id,
          type: 'ai_chat_error',
          data: {
            error: error.message,
            model: CHAT_MODEL
          }
        })
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to process chat request',
          details: error.message 
        },
        { status: 500 }
      )
    }
  })
}