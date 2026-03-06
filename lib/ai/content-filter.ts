/**
 * Content Filter Module for AI Chat
 * Prevents abuse by blocking academic dishonesty, off-topic queries, and inappropriate content
 */

export interface ContentFilterResult {
  allowed: boolean
  reason?: 'academic' | 'offtopic' | 'inappropriate' | 'prompt_injection'
  message?: string  // User-friendly rejection message
  severity?: 'low' | 'medium' | 'high'
  matchedPatterns?: string[]
  confidence?: number  // 0-1 confidence in the filter decision
}

export interface FilterLog {
  userId: string
  timestamp: Date
  content: string  // Sanitized version
  filterResult: ContentFilterResult
  action: 'blocked' | 'warned' | 'allowed'
}

// Blocked patterns for different categories
const BLOCKED_PATTERNS = {
  academic: [
    'write my essay',
    'do my homework',
    'complete my assignment',
    'solve this problem for school',
    'write a paper about',
    'answer these questions for class',
    'help me cheat',
    'take my test',
    'do my coursework',
    'write my thesis',
    'complete my dissertation',
    'solve my math homework',
    'answer my exam',
    'finish my project for me',
    'write my report',
    'do this assignment',
    'complete this lab',
    'write my research paper',
    'solve these exercises',
    'answer my quiz'
  ],
  offtopic: [
    'recipe for',
    'how to cook',
    'travel advice',
    'travel to',
    'relationship advice',
    'dating tips',
    'investment advice',
    'stock market',
    'cryptocurrency',
    'crypto trading',
    'medical diagnosis',
    'diagnose my',
    'legal advice',
    'sue someone',
    'fix my car',
    'car repair',
    'how to lose weight',
    'diet plan',
    'workout routine',
    'fashion advice',
    'what to wear',
    'movie recommendations',
    'book recommendations',
    'gaming tips',
    'sports betting',
    'gambling advice',
    'political opinion',
    'religious advice',
    'spiritual guidance'
  ],
  promptInjection: [
    'ignore previous instructions',
    'disregard your rules',
    'pretend you are',
    'act as if',
    'bypass your restrictions',
    'forget you are an adhd coach',
    'forget you are nuree',
    'new instructions:',
    'system:',
    'admin mode',
    'developer mode',
    'override your programming',
    'you are now',
    'roleplay as',
    'simulate being',
    'change your personality',
    'disable your filters',
    'ignore your boundaries',
    'reset your context',
    'clear your memory',
    'jailbreak'
  ],
  inappropriate: [
    'explicit content',
    'adult content',
    'violent content',
    'harm yourself',
    'hurt someone',
    'illegal activity',
    'drugs',
    'weapons',
    'hate speech',
    'discriminatory',
    'offensive language'
  ]
}

// ADHD-related allowed topics
const ALLOWED_TOPICS = [
  'focus', 'concentration', 'attention', 'distraction',
  'task', 'productivity', 'procrastination', 'motivation',
  'executive function', 'time management', 'time blindness',
  'organization', 'planning', 'prioritization', 'scheduling',
  'emotional regulation', 'anxiety', 'stress', 'overwhelm',
  'hyperfocus', 'dopamine', 'stimulation', 'fidget',
  'routine', 'habit', 'reminder', 'memory',
  'break', 'rest', 'self-care', 'burnout',
  'adhd', 'add', 'neurodivergent', 'neurotypical',
  'medication', 'therapy', 'coping', 'strategy',
  'rejection sensitive', 'rsd', 'impulsivity', 'hyperactivity',
  'work', 'study', 'homework struggle', 'deadline',
  'timer', 'pomodoro', 'sprint', 'session',
  'reward', 'achievement', 'progress', 'goal',
  'mindfulness', 'meditation', 'breathing', 'grounding'
]

// Rejection messages for different categories
const REJECTION_MESSAGES = {
  academic: "I can't write assignments or do homework for you, but I can help you break it down, manage your time, or get past procrastination. What's making it hard to start?",

  offtopic: "I'm not able to help with that, but I can help you organize your tasks, talk through what's on your mind, or get focused. What would help?",

  promptInjection: "Let's keep things on track. How can I help you today?",

  inappropriate: "Let's keep things supportive and productive. What can I help with?"
}

export class ContentFilter {
  private readonly lowercaseBlockedPatterns: Record<string, string[]>
  private readonly lowercaseAllowedTopics: string[]
  
  constructor() {
    // Pre-process patterns to lowercase for efficient matching
    this.lowercaseBlockedPatterns = {
      academic: BLOCKED_PATTERNS.academic.map(p => p.toLowerCase()),
      offtopic: BLOCKED_PATTERNS.offtopic.map(p => p.toLowerCase()),
      promptInjection: BLOCKED_PATTERNS.promptInjection.map(p => p.toLowerCase()),
      inappropriate: BLOCKED_PATTERNS.inappropriate.map(p => p.toLowerCase())
    }
    
    this.lowercaseAllowedTopics = ALLOWED_TOPICS.map(t => t.toLowerCase())
  }
  
  /**
   * Check for academic dishonesty patterns
   */
  checkAcademicIntegrity(content: string): ContentFilterResult {
    const lowerContent = content.toLowerCase()
    const matchedPatterns: string[] = []
    
    // Check for direct academic cheating patterns
    for (const pattern of this.lowercaseBlockedPatterns.academic) {
      if (lowerContent.includes(pattern)) {
        matchedPatterns.push(pattern)
      }
    }
    
    // Check for more complex patterns
    const academicKeywords = ['essay', 'homework', 'assignment', 'exam', 'test', 'coursework', 'thesis']
    const actionWords = ['write', 'do', 'complete', 'solve', 'finish', 'answer']
    
    let hasAcademicKeyword = false
    let hasActionWord = false
    
    for (const keyword of academicKeywords) {
      if (lowerContent.includes(keyword)) {
        hasAcademicKeyword = true
        break
      }
    }
    
    for (const action of actionWords) {
      if (lowerContent.includes(action + ' my') || lowerContent.includes(action + ' this')) {
        hasActionWord = true
        break
      }
    }
    
    // Special case: Allow if it's about ADHD struggles with homework
    const isADHDStruggle = lowerContent.includes('adhd') || 
                          lowerContent.includes('focus') || 
                          lowerContent.includes('procrastinat') ||
                          lowerContent.includes('struggl') ||
                          lowerContent.includes('help me start') ||
                          lowerContent.includes('break down')
    
    if ((matchedPatterns.length > 0 || (hasAcademicKeyword && hasActionWord)) && !isADHDStruggle) {
      return {
        allowed: false,
        reason: 'academic',
        message: REJECTION_MESSAGES.academic,
        severity: 'high',
        matchedPatterns,
        confidence: matchedPatterns.length > 0 ? 0.9 : 0.7
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Check for off-topic requests
   */
  checkTopicRelevance(content: string): ContentFilterResult {
    const lowerContent = content.toLowerCase()
    const matchedPatterns: string[] = []
    
    // Check for off-topic patterns
    for (const pattern of this.lowercaseBlockedPatterns.offtopic) {
      if (lowerContent.includes(pattern)) {
        matchedPatterns.push(pattern)
      }
    }
    
    // Check if the content contains ADHD-related topics
    let hasADHDTopic = false
    for (const topic of this.lowercaseAllowedTopics) {
      if (lowerContent.includes(topic)) {
        hasADHDTopic = true
        break
      }
    }
    
    // If off-topic patterns found and no ADHD topics mentioned
    if (matchedPatterns.length > 0 && !hasADHDTopic) {
      return {
        allowed: false,
        reason: 'offtopic',
        message: REJECTION_MESSAGES.offtopic,
        severity: 'medium',
        matchedPatterns,
        confidence: hasADHDTopic ? 0.3 : 0.8
      }
    }
    
    // Additional check: Very short messages that are clearly off-topic
    const words = lowerContent.split(/\s+/)
    if (words.length < 10 && matchedPatterns.length > 0) {
      return {
        allowed: false,
        reason: 'offtopic',
        message: REJECTION_MESSAGES.offtopic,
        severity: 'medium',
        matchedPatterns,
        confidence: 0.9
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Check for prompt injection attempts
   */
  checkPromptInjection(content: string): ContentFilterResult {
    const lowerContent = content.toLowerCase()
    const matchedPatterns: string[] = []
    
    // Check for prompt injection patterns
    for (const pattern of this.lowercaseBlockedPatterns.promptInjection) {
      if (lowerContent.includes(pattern)) {
        matchedPatterns.push(pattern)
      }
    }
    
    // Check for suspicious command-like patterns
    const suspiciousPatterns = [
      /^system\s*:/i,
      /^admin\s*:/i,
      /^developer\s*:/i,
      /\[system\]/i,
      /\[admin\]/i,
      /<<<.*>>>/,
      /###\s*instructions?\s*###/i
    ]
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        matchedPatterns.push('suspicious command pattern')
      }
    }
    
    if (matchedPatterns.length > 0) {
      return {
        allowed: false,
        reason: 'prompt_injection',
        message: REJECTION_MESSAGES.promptInjection,
        severity: 'high',
        matchedPatterns,
        confidence: 0.95
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Check for inappropriate content
   */
  checkAppropriateContent(content: string): ContentFilterResult {
    const lowerContent = content.toLowerCase()
    const matchedPatterns: string[] = []
    
    // Check for inappropriate patterns
    for (const pattern of this.lowercaseBlockedPatterns.inappropriate) {
      if (lowerContent.includes(pattern)) {
        matchedPatterns.push(pattern)
      }
    }
    
    if (matchedPatterns.length > 0) {
      return {
        allowed: false,
        reason: 'inappropriate',
        message: REJECTION_MESSAGES.inappropriate,
        severity: 'high',
        matchedPatterns,
        confidence: 0.9
      }
    }
    
    return { allowed: true }
  }
  
  /**
   * Main filter method that runs all checks
   */
  filter(content: string): ContentFilterResult {
    // Sanitize content first (remove excessive whitespace, normalize)
    const sanitized = content.trim().replace(/\s+/g, ' ')
    
    // Run all checks in order of severity
    const checks = [
      this.checkPromptInjection(sanitized),
      this.checkAppropriateContent(sanitized),
      this.checkAcademicIntegrity(sanitized),
      this.checkTopicRelevance(sanitized)
    ]
    
    // Return the first failed check
    for (const check of checks) {
      if (!check.allowed) {
        return check
      }
    }
    
    // All checks passed
    return {
      allowed: true,
      confidence: 1.0
    }
  }
  
  /**
   * Sanitize content for logging (remove PII, sensitive data)
   */
  sanitizeForLogging(content: string): string {
    // Remove potential emails
    let sanitized = content.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    
    // Remove potential phone numbers
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    
    // Remove potential SSN patterns
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    
    // Remove potential credit card numbers
    sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    
    // Truncate if too long
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 497) + '...'
    }
    
    return sanitized
  }
  
  /**
   * Log filtered request to database (to be implemented with Supabase)
   */
  async logFilteredRequest(log: FilterLog, supabase: any): Promise<void> {
    try {
      await supabase.from('content_filter_logs').insert({
        user_id: log.userId,
        timestamp: log.timestamp.toISOString(),
        content: this.sanitizeForLogging(log.content),
        filter_reason: log.filterResult.reason,
        severity: log.filterResult.severity,
        action: log.action,
        matched_patterns: log.filterResult.matchedPatterns,
        confidence: log.filterResult.confidence
      })
    } catch (error) {
      console.error('Failed to log filtered request:', error)
      // Don't throw - logging failures shouldn't break the filter
    }
  }
}

// Singleton instance
let filterInstance: ContentFilter | null = null

export function getContentFilter(): ContentFilter {
  if (!filterInstance) {
    filterInstance = new ContentFilter()
  }
  return filterInstance
}

// Helper function for testing patterns
export function testContentFilter(content: string): void {
  const filter = getContentFilter()
  const result = filter.filter(content)
  console.log('Content:', content)
  console.log('Result:', result)
}