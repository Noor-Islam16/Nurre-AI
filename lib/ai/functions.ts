import type { ChatCompletionTool } from 'openai/resources/chat/completions'

// =====================================================
// Native OpenAI Tool Definitions - 10 Core Tools
// Per Architecture Specification (Features 30-38)
// =====================================================

export const AI_FUNCTIONS: ChatCompletionTool[] = [
  // ===== Task Management =====
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description: 'Create a new task with optional subtasks for the user. Breaks down complex tasks into manageable steps.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Task title',
            maxLength: 100
          },
          description: {
            type: 'string',
            description: 'Detailed task description',
            maxLength: 500
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Task priority level'
          },
          timeEstimate: {
            type: 'number',
            description: 'Estimated time in minutes',
            minimum: 5,
            maximum: 480
          },
          dueDate: {
            type: 'string',
            description: 'Due date in ISO format (YYYY-MM-DD) or relative like "today", "tomorrow", "next week"'
          },
          subtasks: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of subtask steps',
            maxItems: 5
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'complete_task',
      description: 'Mark a task as completed with optional completion notes',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID of the task to complete'
          },
          notes: {
            type: 'string',
            description: 'Completion notes or reflections',
            maxLength: 500
          }
        },
        required: ['taskId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_task',
      description: 'Modify an existing task. Only include the fields you want to change.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID of the task to edit'
          },
          title: {
            type: 'string',
            description: 'New task title',
            maxLength: 100
          },
          description: {
            type: 'string',
            description: 'New task description',
            maxLength: 500
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'New priority level'
          },
          timeEstimate: {
            type: 'number',
            description: 'New time estimate in minutes',
            minimum: 5,
            maximum: 480
          },
          dueDate: {
            type: 'string',
            description: 'New due date in ISO format (YYYY-MM-DD) or relative like "today", "tomorrow"'
          }
        },
        required: ['taskId']
      }
    }
  },

  // ===== Focus Management =====
  {
    type: 'function' as const,
    function: {
      name: 'start_focus',
      description: 'Start a focus timer session. Only call when user explicitly requests to start focusing or begin work.',
      parameters: {
        type: 'object',
        properties: {
          duration: {
            type: 'number',
            description: 'Duration in minutes',
            minimum: 5,
            maximum: 90
          },
          taskId: {
            type: 'string',
            description: 'Associated task ID (optional)'
          }
        },
        required: ['duration']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'pause_focus',
      description: 'Pause the current focus session with a reason',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for pausing',
            maxLength: 200
          }
        },
        required: ['reason']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'stop_focus',
      description: 'Stop and end the current focus session',
      parameters: {
        type: 'object',
        properties: {
          completed: {
            type: 'boolean',
            description: 'Whether to mark the session as completed successfully'
          }
        }
      }
    }
  },

  // ===== Music Control =====
  {
    type: 'function' as const,
    function: {
      name: 'play_music',
      description: 'Play music to help with focus or relaxation. If music is already paused, this will resume it.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['focus', 'calm', 'productivity', 'sleep'],
            description: 'Music category to play'
          }
        },
        required: ['category']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'pause_music',
      description: 'Pause currently playing music',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'stop_music',
      description: 'Stop music playback completely',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },

  // ===== Mood Tracking =====
  {
    type: 'function' as const,
    function: {
      name: 'log_mood',
      description: 'Log current mood and energy levels for tracking. Use when user shares how they are feeling.',
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            enum: ['terrible', 'bad', 'okay', 'good', 'excellent'],
            description: 'Mood level'
          },
          energy: {
            type: 'number',
            description: 'Energy level from 1-10',
            minimum: 1,
            maximum: 10
          },
          notes: {
            type: 'string',
            description: 'Additional notes or context',
            maxLength: 500
          }
        },
        required: ['mood', 'energy']
      }
    }
  }
]

// =====================================================
// Tool Registry Class for Managing Native Tools
// =====================================================

export class ToolRegistry {
  private tools: Map<string, ChatCompletionTool>
  private chatLaneTools: Set<string>
  private plannerLaneTools: Set<string>
  
  constructor() {
    this.tools = new Map()
    
    // Register all tools
    AI_FUNCTIONS.forEach(tool => {
      if (tool.type === 'function') {
        this.tools.set(tool.function.name, tool)
      }
    })
    
    // Define which tools are available in each lane
    // All 10 tools available for chat (primary AI interaction)
    this.chatLaneTools = new Set([
      'create_task',
      'complete_task',
      'edit_task',
      'start_focus',
      'pause_focus',
      'stop_focus',
      'play_music',
      'pause_music',
      'stop_music',
      'log_mood'
    ])

    // Planner lane uses subset for proactive interventions
    this.plannerLaneTools = new Set([
      'create_task',
      'start_focus',
      'log_mood'
    ])
  }
  
  /**
   * Get a specific tool by name
   */
  getTool(name: string): ChatCompletionTool | undefined {
    return this.tools.get(name)
  }
  
  /**
   * Get all available tools
   */
  getAllTools(): ChatCompletionTool[] {
    return Array.from(this.tools.values())
  }
  
  /**
   * Get tools available for a specific lane
   */
  getToolsForLane(lane: 'chat' | 'planner'): ChatCompletionTool[] {
    const toolSet = lane === 'chat' ? this.chatLaneTools : this.plannerLaneTools
    return Array.from(toolSet)
      .map(name => this.tools.get(name))
      .filter(tool => tool !== undefined) as ChatCompletionTool[]
  }
  
  /**
   * Validate parameters for a tool
   */
  validateParameters(name: string, params: any): boolean {
    const tool = this.tools.get(name)
    if (!tool || tool.type !== 'function') return false
    
    const schema = tool.function.parameters as any
    const required = schema.required || []
    const properties = schema.properties || {}
    
    // Check required fields
    for (const field of required) {
      if (!(field in params)) {
        console.error(`Missing required field: ${field}`)
        return false
      }
    }
    
    // Validate field types and constraints
    for (const [field, value] of Object.entries(params)) {
      const fieldSchema = properties[field]
      if (!fieldSchema) continue
      
      // Type validation
      if (fieldSchema.type === 'number' && typeof value !== 'number') {
        console.error(`Field ${field} must be a number`)
        return false
      }
      if (fieldSchema.type === 'string' && typeof value !== 'string') {
        console.error(`Field ${field} must be a string`)
        return false
      }
      if (fieldSchema.type === 'boolean' && typeof value !== 'boolean') {
        console.error(`Field ${field} must be a boolean`)
        return false
      }
      if (fieldSchema.type === 'array' && !Array.isArray(value)) {
        console.error(`Field ${field} must be an array`)
        return false
      }
      
      // Constraint validation
      if (fieldSchema.minimum !== undefined && typeof value === 'number' && value < fieldSchema.minimum) {
        console.error(`Field ${field} must be at least ${fieldSchema.minimum}`)
        return false
      }
      if (fieldSchema.maximum !== undefined && typeof value === 'number' && value > fieldSchema.maximum) {
        console.error(`Field ${field} must be at most ${fieldSchema.maximum}`)
        return false
      }
      if (fieldSchema.maxLength !== undefined && typeof value === 'string' && value.length > fieldSchema.maxLength) {
        console.error(`Field ${field} must be at most ${fieldSchema.maxLength} characters`)
        return false
      }
      if (fieldSchema.maxItems !== undefined && Array.isArray(value) && value.length > fieldSchema.maxItems) {
        console.error(`Field ${field} must have at most ${fieldSchema.maxItems} items`)
        return false
      }
      if (fieldSchema.enum !== undefined && !fieldSchema.enum.includes(value)) {
        console.error(`Field ${field} must be one of: ${fieldSchema.enum.join(', ')}`)
        return false
      }
    }
    
    return true
  }
  
  /**
   * Check if a tool exists
   */
  hasTable(name: string): boolean {
    return this.tools.has(name)
  }
  
  /**
   * Get tool names for a lane
   */
  getToolNamesForLane(lane: 'chat' | 'planner'): string[] {
    const toolSet = lane === 'chat' ? this.chatLaneTools : this.plannerLaneTools
    return Array.from(toolSet)
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry()