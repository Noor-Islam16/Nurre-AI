// lib/ai/client-service.ts
import { preferenceManager } from './preference-manager'
import { usePreferenceStore } from '@/store/preference-store'

interface ChatContext {
  userId: string
  persona?: string
  currentTask?: any
  recentMessages?: any[]
  mood?: string
  userEvents?: any[]
}

export class ClientAIService {
  private useNativeTools: boolean = false
  
  setUseNativeTools(use: boolean) {
    this.useNativeTools = use
  }
  
  // Non-streaming chat method
  async chat(
    message: string,
    context: ChatContext,
    useNativeTools?: boolean
  ): Promise<{
    content: string;
    tool_calls?: any[];
    tool_results?: any[];
  }> {
    const shouldUseNative = useNativeTools ?? this.useNativeTools;
    
    // Apply preferences to context
    const preferences = await preferenceManager.getEffectivePreferences(context.userId);
    const enhancedContext = preferenceManager.applyToAIContext(context);
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(shouldUseNative && { 'X-Use-Native-Tools': 'true' })
      },
      body: JSON.stringify({ 
        messages: [
          { role: 'user', content: preferenceManager.formatMessage(message) }
        ],
        stream: false  // ALWAYS false - no streaming
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract the message content and tools from response
    const content = data.content || data.message || "I've processed your request.";
    const tool_calls = data.tool_calls;
    const tool_results = data.tool_results;
    
    return {
      content,
      tool_calls,
      tool_results
    };
  }
  
  /**
   * @deprecated Streaming is no longer supported. This method now uses non-streaming.
   * TODO: Update all callers to use chat() instead
   */
  async streamChat(
    message: string,
    context: ChatContext,
    onChunk: (chunk: any) => void,
    onFunction?: (func: any) => void,
    useNativeTools?: boolean
  ) {
    console.warn('streamChat is deprecated. Streaming is disabled. Using non-streaming fallback.');
    
    try {
      const result = await this.chat(message, context, useNativeTools);
      
      // Simulate immediate "streaming" for compatibility
      if (result.tool_calls) {
        result.tool_calls.forEach((tc: any) => {
          onChunk({ type: 'tool_call', tool: tc.function?.name || tc.name, toolCall: tc });
        });
      }
      
      if (result.tool_results) {
        result.tool_results.forEach((tr: any) => {
          onChunk({ type: 'tool_result', result: tr, success: !tr.error });
        });
      }
      
      // Send the content
      if (result.content) {
        onChunk({ type: 'text', content: result.content });
      }
      
      // Signal completion
      onChunk({ type: 'text', content: '' });
      
    } catch (error: any) {
      onChunk({ type: 'error', error: error.message });
    }
  }
  
  // Non-streaming native tool chat
  async chatWithTools(
    message: string,
    context: ChatContext,
    includeActions: boolean = true
  ): Promise<{
    message: string
    tool_calls?: any[]
    tool_results?: any[]
    metadata?: any
  }> {
    const preferences = await preferenceManager.getEffectivePreferences(context.userId)
    const enhancedContext = preferenceManager.applyToAIContext(context)
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Native-Tools': 'true'
      },
      body: JSON.stringify({
        message: preferenceManager.formatMessage(message),
        context: enhancedContext,
        include_actions: includeActions,
        stream: false,
        preferences: preferences && (preferences as any).tools ? {
          allowedTools: Object.entries((preferences as any).tools)
            .filter(([_, p]: [any, any]) => p.enabled)
            .map(([tool]: [any, any]) => tool)
        } : undefined
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to get chat response')
    }
    
    return await response.json()
  }
  
  async generateEmbedding(text: string, model?: string): Promise<{ embedding: number[]; model: string }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const attempt = async (): Promise<{ embedding: number[]; model: string }> => {
      const response = await fetch('/api/ai/embedding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, model }),
        signal: controller.signal
      })

      if (!response.ok) {
        const details = await response.text().catch(() => '')
        throw new Error(`Failed to generate embedding: ${response.status} ${details}`)
      }

      const data = await response.json()
      return { embedding: data.embedding, model: data.model || model || 'text-embedding-3-small' }
    }

    try {
      return await attempt()
    } catch (error) {
      // Single retry for transient issues
      if (controller.signal.aborted) {
        throw error
      }
      try {
        return await attempt()
      } finally {
        clearTimeout(timeout)
      }
    } finally {
      clearTimeout(timeout)
    }
  }
  
  // Validate if a tool can be executed based on preferences
  async validateToolExecution(toolName: string, parameters?: any): Promise<{
    allowed: boolean
    requiresConfirmation: boolean
    reason?: string
  }> {
    const canUse = preferenceManager.canUseTool(toolName as any)
    
    if (!canUse) {
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: 'Tool is disabled in preferences'
      }
    }
    
    // Validate parameters if provided
    if (parameters && !preferenceManager.validateToolParameters(toolName as any, parameters)) {
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: 'Tool parameters do not meet allowed constraints'
      }
    }
    
    const requiresConfirmation = preferenceManager.requiresConfirmation(toolName as any)
    
    // Record tool usage for rate limiting
    if (!requiresConfirmation) {
      preferenceManager.recordToolUsage(toolName as any)
    }
    
    return {
      allowed: true,
      requiresConfirmation
    }
  }
  
  // Get quick actions based on current mode
  getQuickActions(): string[] {
    return preferenceManager.getQuickActions()
  }
  
  // Check if onboarding is needed
  needsPreferenceOnboarding(): boolean {
    return preferenceManager.needsOnboarding()
  }
  
  // Apply ADHD optimizations to context
  applyADHDOptimizations(context: any): any {
    return preferenceManager.applyADHDOptimizations(context)
  }
  
  // Check if within quiet hours
  async isQuietHours(): Promise<boolean> {
    // Use a dummy user ID for now since we don't have direct access to current user
    return preferenceManager.isWithinQuietHours('current-user')
  }
  
  // Get effective automation level
  getAutomationLevel(): string {
    const store = usePreferenceStore.getState()
    const preferences = store.getEffectivePreferences()
    return preferences.automation.level
  }
  
  // Check if a specific automation is allowed
  canAutomate(action: 'task_creation' | 'focus_start' | 'mood_submission'): boolean {
    return preferenceManager.canAutomate(action)
  }
}

export const aiService = new ClientAIService()
