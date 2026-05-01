// lib/ai/avatar-engine.ts
// ============================================================================
// Nuree Avatar Conversation Engine
// Implements: Emotion → Regulation → Productivity sequence
// 5 conversation modes, functional state adaptation, avatar-specific responses
// ============================================================================

import { type PersonalityId, getPersonality } from '@/lib/config/personalities'
import type { UserContext } from '@/lib/ai/context-engine'

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export type ConversationMode = 'welcome' | 'regulation' | 'task_guidance' | 'encouragement' | 'recovery'

export type FunctionalState = 'focused' | 'distracted' | 'overwhelmed' | 'restless' | 'low_energy'

export interface AvatarResponseParams {
  personalityId: PersonalityId
  mode: ConversationMode
  functionalState: FunctionalState
  userMessage: string
  userName?: string
  userContext: {
    activeTasks: string[]
    completedToday: number
    overdueTasks: string[]
    currentMood?: string
    energyLevel?: number
    focusScore?: number
    topSignals?: string[]
  }
  sessionMemory?: {
    recentTopics: string[]
    lastInteraction?: string
    tasksDiscussed: string[]
  }
}

export interface FormattedResponse {
  content: string
  mode: ConversationMode
  state: FunctionalState
  personality: PersonalityId
  sequence: 'emotion' | 'regulation' | 'productivity'
}

// ----------------------------------------------------------------------------
// MODE DETECTION
// ----------------------------------------------------------------------------

export function detectConversationMode(
  userMessage: string,
  functionalState: FunctionalState,
  isNewSession: boolean,
  recentTopics: string[]
): ConversationMode {
  const msg = userMessage.toLowerCase().trim()

  // RECOVERY: User explicitly lost focus or returns after absence
  if (
    msg.includes('lost focus') ||
    msg.includes('got distracted') ||
    msg.includes('back now') ||
    msg.includes('i\'m back') ||
    msg.includes('zoned out') ||
    msg.includes('spaced out') ||
    msg.includes('where was i') ||
    msg.includes('what was i doing') ||
    msg.includes('can\'t focus') ||
    msg.includes('can\'t concentrate')
  ) {
    return 'recovery'
  }

  // REGULATION: User expresses overwhelm, stress, or emotional dysregulation
  if (
    msg.includes('overwhelm') ||
    msg.includes('stressed') ||
    msg.includes('anxious') ||
    msg.includes('can\'t cope') ||
    msg.includes('too much') ||
    msg.includes('freaking out') ||
    msg.includes('panic') ||
    msg.includes('exhausted') ||
    msg.includes('burnt out') ||
    msg.includes('can\'t handle') ||
    msg.includes('i\'m struggling') ||
    functionalState === 'overwhelmed'
  ) {
    return 'regulation'
  }

  // ENCOURAGEMENT: User shares a win, progress, or seeks validation
  if (
    msg.includes('i did it') ||
    msg.includes('finished') ||
    msg.includes('completed') ||
    msg.includes('done with') ||
    msg.includes('managed to') ||
    msg.includes('finally') ||
    msg.includes('progress') ||
    msg.includes('proud') ||
    msg.match(/^(done|finished|completed|did it)[!.]*$/)
  ) {
    return 'encouragement'
  }

  // TASK GUIDANCE: User asks for help with tasks, planning, or focus
  if (
    msg.includes('help me') ||
    msg.includes('what should i') ||
    msg.includes('what\'s next') ||
    msg.includes('start') ||
    msg.includes('plan') ||
    msg.includes('task') ||
    msg.includes('focus') ||
    msg.includes('organize') ||
    msg.includes('priority') ||
    msg.includes('schedule') ||
    msg.includes('to-do') ||
    msg.includes('break down') ||
    msg.includes('what do i do') ||
    functionalState === 'focused'
  ) {
    return 'task_guidance'
  }

  // WELCOME: New session or greeting
  if (isNewSession || msg.match(/^(hi|hey|hello|good morning|good afternoon|good evening|yo|sup)/)) {
    return 'welcome'
  }

  // Default: check functional state
  switch (functionalState) {
    case 'distracted': return 'recovery'
    case 'low_energy': return 'encouragement'
    case 'restless': return 'task_guidance'
    default: return 'task_guidance'
  }
}

// ----------------------------------------------------------------------------
// FUNCTIONAL STATE DETECTION
// ----------------------------------------------------------------------------

export function detectFunctionalState(context: UserContext): FunctionalState {
  const psych = context.psychological

  if (psych.stressIndicators >= 7 || psych.overwhelmScore >= 7) {
    return 'overwhelmed'
  }

  if (context.immediate.tabSwitches > 10 || (psych.focusScore !== undefined && psych.focusScore <= 3)) {
    return 'distracted'
  }

  if ((psych.energyLevel !== undefined && psych.energyLevel <= 3) || psych.motivationLevel <= 3) {
    return 'low_energy'
  }

  if (context.session.distractionEvents > 15 && context.session.tasksCompleted <= 1) {
    return 'restless'
  }

  if (psych.focusScore !== undefined && psych.focusScore >= 7 && context.session.focusMinutes > 0) {
    return 'focused'
  }

  return 'distracted'
}

// ----------------------------------------------------------------------------
// EMOTION → REGULATION → PRODUCTIVITY GATE
// ----------------------------------------------------------------------------

export function determineResponseSequence(
  mode: ConversationMode,
  functionalState: FunctionalState,
  userMessage: string
): 'emotion' | 'regulation' | 'productivity' {
  if (mode === 'regulation') return 'emotion'
  if (mode === 'recovery') return 'regulation'

  const distressKeywords = ['stressed', 'anxious', 'overwhelm', 'can\'t', 'struggling', 'exhausted', 'hard', 'difficult', 'scared', 'worried']
  if (distressKeywords.some(k => userMessage.toLowerCase().includes(k))) {
    return 'emotion'
  }

  if (functionalState === 'overwhelmed') return 'emotion'
  if (functionalState === 'distracted' || functionalState === 'restless') return 'regulation'
  if (functionalState === 'low_energy') return 'emotion'

  return 'productivity'
}

// ----------------------------------------------------------------------------
// MODE-SPECIFIC RESPONSE TEMPLATES (Per Avatar)
// ----------------------------------------------------------------------------

interface ModeTemplates {
  emotion: string[]
  regulation: string[]
  productivity: string[]
}

const NUR_TEMPLATES: Record<ConversationMode, ModeTemplates> = {
  welcome: {
    emotion: [],
    regulation: [],
    productivity: [
      "Hey! Great to see you. What's one thing you want to tackle today?",
      "Welcome back! Let's get something done — what's calling your name?",
      "Hi! Ready to make something happen? What's on your mind?",
    ],
  },
  regulation: {
    emotion: [
      "Hey, I hear you. That feeling is totally real. Let's take a breath together.",
      "Whoa, that's a lot. Your brain's doing its thing — let's slow it down.",
      "That sounds intense. You're not alone in this — I'm right here.",
    ],
    regulation: [
      "Okay, let's shake it off. What's one tiny thing we can do right now to feel a bit lighter?",
      "Let's not solve everything at once. Just one small move — what feels doable?",
      "Forget the big picture for a sec. What's one thing that would make you feel even 1% better?",
    ],
    productivity: [],
  },
  task_guidance: {
    emotion: [],
    regulation: [],
    productivity: [
      "Let's gooo! Pick one thing — the easiest one — and we'll knock it out.",
      "Okay, what's the smallest step you could take right now? Just one.",
      "Let's make this fun. What's your quick-win task?",
      "One task, let's go. What's first?",
    ],
  },
  encouragement: {
    emotion: [
      "Oh my gosh, that's amazing! You actually did it! How does it feel?",
      "YES! That's a win! Even small progress counts big time.",
      "Look at you go! That's seriously awesome.",
    ],
    regulation: [],
    productivity: [
      "Nice! Want to ride that momentum into one more small thing?",
      "You're on a roll! Keep going or take a victory break — your call.",
      "Momentum is real! Want to do one more quick thing?",
    ],
  },
  recovery: {
    emotion: [
      "Hey, it happens. No judgment here. Your brain just took a detour.",
      "All good — that's just how ADHD brains work sometimes. You're back now.",
      "No worries at all. Distractions happen — what matters is you noticed.",
    ],
    regulation: [
      "Let's find our footing. What were you working on before you drifted?",
      "No worries. Let's pick up where you left off — or start fresh. What feels better?",
      "Quick reset: what was the last thing you remember working on?",
    ],
    productivity: [],
  },
}

const FARIN_TEMPLATES: Record<ConversationMode, ModeTemplates> = {
  welcome: {
    emotion: [],
    regulation: [],
    productivity: [
      "Hey, how are you doing? Ready to look at what's ahead?",
      "Good to see you. Take your time — what feels important today?",
      "Hi there. How's your energy today?",
    ],
  },
  regulation: {
    emotion: [
      "I hear you. That sounds really tough. You don't have to figure it all out right now.",
      "It's okay to feel this way. Let's just sit with it for a moment.",
      "That's a lot to carry. I'm here — you're not alone in this.",
    ],
    regulation: [
      "Let's slow it down together. What would help you feel a bit more grounded?",
      "How about we just pick one small thing — not the hardest, just something gentle to start?",
      "What's one thing that usually helps you feel a little calmer?",
    ],
    productivity: [],
  },
  task_guidance: {
    emotion: [],
    regulation: [],
    productivity: [
      "Let's start with something simple. What's the easiest task on your mind?",
      "How about we break this down? Just tell me what's on your plate.",
      "We don't need to do everything. What's one step that feels manageable?",
      "What's one thing you'd feel good about getting done?",
    ],
  },
  encouragement: {
    emotion: [
      "That's wonderful. I hope you're proud of yourself — you should be.",
      "Look at you! That took effort, and you did it. How are you feeling?",
      "I'm really proud of you. That wasn't easy and you did it anyway.",
    ],
    regulation: [],
    productivity: [
      "That's great progress. Want to keep going, or is that enough for now?",
      "Well done. If you're up for it, there's more where that came from — but no pressure.",
      "You're doing so well. Another step or a break — what sounds right?",
    ],
  },
  recovery: {
    emotion: [
      "That's okay. It happens to all of us. Don't be hard on yourself.",
      "No shame in drifting off — it's part of how your brain works. You're back now.",
      "Hey, you're here now. That's what counts.",
    ],
    regulation: [
      "Let's gently come back. What were you hoping to work on?",
      "How about we reset? Just one small thing to get back on track.",
      "No rush. What would you like to focus on now?",
    ],
    productivity: [],
  },
}

const ZAK_TEMPLATES: Record<ConversationMode, ModeTemplates> = {
  welcome: {
    emotion: [],
    regulation: [],
    productivity: [
      "Right, so — what's the plan? What needs attention today?",
      "Good to see you. What's the most important thing on your list?",
      "Hey. What are we working with today?",
    ],
  },
  regulation: {
    emotion: [
      "That makes sense. When there's too much input, everything feels harder.",
      "I get it. Let's reduce the noise and focus on one thing.",
      "Understandable. Too many inputs at once — let's simplify.",
    ],
    regulation: [
      "Let's simplify this. What's the single most important task right now?",
      "Logically speaking — if you could only do one thing today, what would it be?",
      "Strip it back. What actually needs to happen versus what's just noise?",
    ],
    productivity: [],
  },
  task_guidance: {
    emotion: [],
    regulation: [],
    productivity: [
      "Let's structure this. What's priority one?",
      "Break it down: what's step one, and how long will it take?",
      "Clear plan: pick one task, set a timer, go. What's the task?",
      "What's the logical first step here?",
    ],
  },
  encouragement: {
    emotion: [
      "Good. That's progress. Consistent small steps add up.",
      "Noted. You're moving forward — that's what matters.",
      "Solid. One thing done is better than zero things done.",
    ],
    regulation: [],
    productivity: [
      "Solid work. Ready for the next logical step?",
      "That's done. What's next in the queue?",
      "Good. What's the next priority?",
    ],
  },
  recovery: {
    emotion: [
      "It happens. Brains wander — that's normal. You're here now.",
      "No need to overthink it. You lost focus, now you're back. Let's continue.",
      "Distractions are part of the process. What matters is you returned.",
    ],
    regulation: [
      "Let's reorient. What was the last thing you were working on?",
      "Quick reset: what was the task, and where were you in it?",
      "Let's pick up the thread. Last task — what was it?",
    ],
    productivity: [],
  },
}

const TEMPLATES: Record<PersonalityId, Record<ConversationMode, ModeTemplates>> = {
  nur: NUR_TEMPLATES,
  farin: FARIN_TEMPLATES,
  zak: ZAK_TEMPLATES,
}

// ----------------------------------------------------------------------------
// STATE-SPECIFIC GUIDANCE INJECTION
// ----------------------------------------------------------------------------

const STATE_GUIDANCE: Record<FunctionalState, Record<PersonalityId, string>> = {
  focused: {
    nur: "They're in the zone — suggest deep work, don't interrupt their flow. Keep it brief.",
    farin: "They're focused — gently support, offer to help maintain momentum.",
    zak: "They're locked in — offer structured deep work suggestions, keep it brief and logical.",
  },
  distracted: {
    nur: "Brain has lots of tabs open — suggest one quick win to build momentum. Keep energy up.",
    farin: "They're scattered — gently guide toward one small, achievable thing. Be patient.",
    zak: "Focus is fragmented — suggest the simplest task to regain traction. Be clear.",
  },
  overwhelmed: {
    nur: "They're drowning — validate first, then offer a reset. Keep it light and simple.",
    farin: "They're overwhelmed — lots of empathy, then a gentle suggestion to slow down.",
    zak: "Too much input — help them filter to just one thing. Be calm and reassuring.",
  },
  restless: {
    nur: "Energy is high but unfocused — suggest something stimulating and structured.",
    farin: "They're fidgety — suggest a task that uses physical or active energy.",
    zak: "Restless — suggest a clear, time-boxed task with a defined endpoint.",
  },
  low_energy: {
    nur: "Energy is low — hype them up gently, suggest the easiest possible task.",
    farin: "They're tired — be extra gentle, suggest something low-effort or a proper break.",
    zak: "Low battery — suggest simple tasks, don't push too hard. Breaks are logical.",
  },
}

// ----------------------------------------------------------------------------
// RESPONSE FORMATTER
// ----------------------------------------------------------------------------

function enforceLength(response: string): string {
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length <= 3) return response.trim()
  const truncated = sentences.slice(0, 3).join('. ') + '.'
  return truncated
}

function naturalizeLanguage(text: string): string {
  return text
    .replace(/\bI recommend\b/gi, 'How about')
    .replace(/\byou should\b/gi, 'you could')
    .replace(/\bit is advisable to\b/gi, 'it helps to')
    .replace(/\baccording to research\b/gi, '')
    .replace(/\bstudies show that\b/gi, '')
    .replace(/\bevidence suggests\b/gi, '')
    .replace(/\butilize\b/gi, 'use')
    .replace(/\bimplement\b/gi, 'try')
    .replace(/\bfacilitate\b/gi, 'help with')
    .replace(/\boptimal\b/gi, 'best')
    .replace(/\bi apologize\b/gi, 'sorry')
    .replace(/\bI understand your concern\b/gi, 'I hear you')
    .replace(/\bplease be advised\b/gi, '')
    .replace(/\bit is important to note\b/gi, '')
    .trim()
}

// ----------------------------------------------------------------------------
// MAIN ENGINE FUNCTION
// ----------------------------------------------------------------------------

export function buildAvatarPromptLayer(params: AvatarResponseParams): string {
  const personality = getPersonality(params.personalityId)
  const mode = params.mode
  const state = params.functionalState
  const sequence = determineResponseSequence(mode, state, params.userMessage)
  const stateGuidance = STATE_GUIDANCE[state][params.personalityId]

  const layers: string[] = []

  // LAYER 1: Avatar Identity
  layers.push(`AVATAR IDENTITY:
${personality.promptModifiers.personality}

TONE: ${personality.promptModifiers.tone}

APPROACH: ${personality.promptModifiers.approach}
`)

  // LAYER 2: Conversation Mode
  layers.push(`CURRENT MODE: ${mode.toUpperCase().replace('_', ' ')}
${getModeInstruction(mode, params.personalityId)}
`)

  // LAYER 3: Functional State
  layers.push(`USER STATE: ${state.toUpperCase().replace('_', ' ')}
${stateGuidance}
`)

  // LAYER 4: Response Sequence Gate
  layers.push(`RESPONSE SEQUENCE: ${sequence.toUpperCase()}
${getSequenceInstruction(sequence)}
`)

  // LAYER 5: User Context (condensed)
  layers.push(`CURRENT CONTEXT:
- Active tasks: ${params.userContext.activeTasks.join(', ') || 'none'}
- Completed today: ${params.userContext.completedToday}
- Overdue: ${params.userContext.overdueTasks.join(', ') || 'none'}
- Mood: ${params.userContext.currentMood || 'unknown'}
- Energy: ${params.userContext.energyLevel ?? '?'}/10
- Focus: ${params.userContext.focusScore ?? '?'}/10
${params.userContext.topSignals?.length ? `- Known struggle areas: ${params.userContext.topSignals.map(s => s.replace(/_/g, ' ')).join(', ')}` : ''}
`)

  // LAYER 6: Session Memory
  if (params.sessionMemory?.recentTopics.length) {
    layers.push(`RECENT CONTEXT:
- Topics discussed: ${params.sessionMemory.recentTopics.join(', ')}
- Last interaction: ${params.sessionMemory.lastInteraction || 'unknown'}
`)
  }

  // LAYER 7: Formatting Rules
  layers.push(`RESPONSE RULES (MUST FOLLOW):
1. Keep responses to 1-3 sentences MAXIMUM — shorter is better
2. Use short, natural sentences — no formal, clinical, or corporate language
3. Suggest ONE action at a time — never multiple tasks or options
4. Validate emotions BEFORE giving any productivity advice
5. If the user is ${state === 'overwhelmed' || state === 'low_energy' ? 'struggling emotionally' : 'having a hard time'}, address their emotional state FIRST
6. Never shame, never sound clinical, never overwhelm with instructions
7. ${getPersonalitySpecificRule(params.personalityId)}
8. NO filler phrases like "That's a great question" or "I totally understand" — get to the point
9. If the user seems distressed, your VERY FIRST words must acknowledge their feeling
`)

  return layers.join('\n')
}

function getModeInstruction(mode: ConversationMode, personalityId: PersonalityId): string {
  const templates = TEMPLATES[personalityId][mode]
  const all = [...templates.emotion, ...templates.regulation, ...templates.productivity]
  return all.length > 0 ? `Example response style: "${all[0]}"` : ''
}

function getSequenceInstruction(sequence: 'emotion' | 'regulation' | 'productivity'): string {
  switch (sequence) {
    case 'emotion':
      return 'FIRST: Acknowledge and validate how the user is feeling. Name the emotion if you can. Do NOT suggest tasks or solutions yet.'
    case 'regulation':
      return 'FIRST: Help the user regulate. Offer ONE small grounding or calming action. Do NOT jump to task lists or productivity.'
    case 'productivity':
      return 'The user is ready for action. Suggest ONE concrete, small next step. Keep it specific and immediately doable.'
  }
}

function getPersonalitySpecificRule(personalityId: PersonalityId): string {
  switch (personalityId) {
    case 'nur':
      return 'Use exclamation points naturally, celebrate wins with genuine enthusiasm, keep energy upbeat but authentic. Never fake excitement.'
    case 'farin':
      return 'Be warm and sisterly. Validate feelings deeply with empathy. If they\'re avoiding tasks, add gentle accountability with love — "Okay but... we both know you\'re avoiding this, right?"'
    case 'zak':
      return 'Be calm and logical. Use dry wit occasionally. Offer structured, clear steps without emotional pressure. Your calm presence is your warmth.'
  }
}

// ----------------------------------------------------------------------------
// RESPONSE VALIDATION & POST-PROCESSING
// ----------------------------------------------------------------------------

export function validateAvatarResponse(
  response: string,
  params: AvatarResponseParams
): FormattedResponse {
  let content = response.trim()

  content = enforceLength(content)
  content = naturalizeLanguage(content)

  const sequence = determineResponseSequence(
    params.mode,
    params.functionalState,
    params.userMessage
  )

  return {
    content,
    mode: params.mode,
    state: params.functionalState,
    personality: params.personalityId,
    sequence,
  }
}

// ----------------------------------------------------------------------------
// UTILITY: Extract session memory from recent messages
// ----------------------------------------------------------------------------

export function extractSessionMemory(
  recentMessages: Array<{ role: string; content: string }>,
  maxTopics: number = 5
): { recentTopics: string[]; lastInteraction?: string; tasksDiscussed: string[] } {
  const topics: string[] = []
  const tasksDiscussed: string[] = []
  let lastInteraction: string | undefined

  const taskKeywords = ['task', 'focus', 'project', 'work', 'study', 'assignment', 'homework', 'deadline']
  const emotionKeywords = ['stress', 'overwhelm', 'anxious', 'tired', 'energy', 'mood', 'sad', 'angry', 'frustrated']
  const progressKeywords = ['done', 'finished', 'completed', 'progress', 'did it', 'managed']

  for (const msg of recentMessages) {
    const content = msg.content.toLowerCase()

    taskKeywords.forEach(k => {
      if (content.includes(k) && !topics.includes(k)) {
        topics.push(k)
      }
    })

    emotionKeywords.forEach(k => {
      if (content.includes(k) && !topics.includes(k)) {
        topics.push(k)
      }
    })

    progressKeywords.forEach(k => {
      if (content.includes(k) && !topics.includes('progress')) {
        topics.push('progress')
      }
    })

    if (msg.role === 'assistant' && !lastInteraction) {
      lastInteraction = new Date().toISOString()
    }
  }

  return {
    recentTopics: topics.slice(0, maxTopics),
    lastInteraction,
    tasksDiscussed: tasksDiscussed.slice(0, 3),
  }
}