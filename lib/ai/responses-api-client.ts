// lib/ai/responses-api-client.ts
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';

/**
 * ResponsesAPIClient - Wrapper class for migrating from Chat Completions API to Responses API
 * 
 * This class provides:
 * - Conversion of Chat Completions messages to Responses API input format
 * - Tool format conversion between APIs
 * - Backward compatibility with convertResponseToChat method
 * - Support for GPT-5 specific features (reasoning effort, verbosity)
 */
export class ResponsesAPIClient {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Convert Chat Completions messages array to Responses API input format
   * Handles system prompts, user messages, assistant messages, and tool responses
   */
  private convertMessages(messages: ChatCompletionMessageParam[]): { input: any[], systemPrompt?: string } {
    const input: any[] = [];
    let systemPrompt: string | undefined;
    
    for (const message of messages) {
      if (message.role === 'system') {
        // System messages become instructions in Responses API
        systemPrompt = message.content as string;
      } else if (message.role === 'user') {
        // User messages map directly
        input.push({
          role: 'user',
          content: message.content
        });
      } else if (message.role === 'assistant') {
        if (message.content) {
          // Assistant text messages
          input.push({
            type: 'message',
            role: 'assistant',
            content: [{
              type: 'output_text',
              text: message.content
            }]
          });
        } else if ('tool_calls' in message && message.tool_calls) {
          // Assistant tool calls
          for (const toolCall of message.tool_calls) {
            if (toolCall.type === 'function') {
              input.push({
                type: 'function_call',
                call_id: toolCall.id,
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              });
            }
          }
        }
      } else if (message.role === 'tool' && 'tool_call_id' in message) {
        // Tool responses become function_call_output
        input.push({
          type: 'function_call_output',
          call_id: message.tool_call_id,
          output: message.content
        });
      }
    }
    
    return { input, systemPrompt };
  }

  /**
   * Convert Chat Completions tools to Responses API format
   * Maintains function definitions with proper structure
   * Handles both nested (Chat Completions) and flattened (Responses API) formats
   */
  private convertTools(tools?: ChatCompletionTool[] | any[]): any[] | undefined {
    if (!tools) return undefined;
    
    return tools.map(tool => {
      if (tool.type === 'function') {
        // Check if already in flattened Responses API format
        if ('name' in tool && 'description' in tool && 'parameters' in tool && !('function' in tool)) {
          // Already flattened - return as is
          return {
            type: 'function',
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
            strict: tool.strict
          };
        } 
        // Check if in nested Chat Completions format
        else if ('function' in tool && tool.function) {
          // Nested format - need to flatten
          return {
            type: 'function',
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
            strict: tool.function.strict
          };
        }
        // Malformed tool
        else {
          console.warn('Malformed tool definition:', tool);
          return null;
        }
      }
      return tool;
    }).filter(tool => tool !== null); // Remove any null tools
  }

  /**
   * Main conversion method - Creates a response using Responses API
   * Converts Chat Completions format to Responses API format
   */
  async create(params: any): Promise<any> {
    let input: any[];
    let systemPrompt: string | undefined;
    
    // Check if input is already in Responses API format
    if (params.input && !params.messages) {
      // Already in Responses API format
      input = params.input;
      systemPrompt = params.instructions;
    } else if (params.messages) {
      // Convert from Chat Completions format
      const converted = this.convertMessages(params.messages);
      input = converted.input;
      systemPrompt = converted.systemPrompt;
    } else {
      throw new Error('Either input or messages must be provided');
    }
    
    // Strip date suffixes from model names for Responses API
    const model = params.model.replace('-2025-08-07', '');
    
    const requestParams: any = {
      model,
      input,
      tools: this.convertTools(params.tools),
      stream: false  // Always non-streaming
    };

    // Add system prompt as instructions
    if (systemPrompt) {
      requestParams.instructions = systemPrompt;
    }

    // Add GPT-5 specific features
    requestParams.reasoning = params.reasoning || { effort: params.reasoning_effort || 'minimal' };
    
    // Handle verbosity through text configuration
    if (params.text) {
      requestParams.text = params.text;
    } else if (params.verbosity) {
      requestParams.text = { verbosity: params.verbosity };
    } else {
      requestParams.text = { verbosity: 'medium' };
    }

    // Handle tool choice
    if (params.tool_choice) {
      requestParams.tool_choice = params.tool_choice;
    }

    // Handle temperature
    if (params.temperature !== undefined) {
      requestParams.temperature = params.temperature;
    }

    // Handle max tokens - convert to max_output_tokens
    if (params.max_output_tokens !== undefined) {
      requestParams.max_output_tokens = params.max_output_tokens;
    } else if (params.max_tokens !== undefined) {
      requestParams.max_output_tokens = params.max_tokens;
    } else if (params.max_completion_tokens !== undefined) {
      requestParams.max_output_tokens = params.max_completion_tokens;
    }
    
    // Handle previous response ID for multi-turn conversations
    if (params.previous_response_id) {
      requestParams.previous_response_id = params.previous_response_id;
    }

    // Handle parallel tool calls
    if (params.parallel_tool_calls !== undefined) {
      requestParams.parallel_tool_calls = params.parallel_tool_calls;
    }

    // Call Responses API
    return this.openai.responses.create(requestParams);
  }

  /**
   * Stream method - deprecated, always uses non-streaming
   * Kept for backward compatibility but returns non-streaming response
   */
  async stream(params: any): Promise<any> {
    console.warn('ResponsesAPIClient.stream() is deprecated. Using non-streaming mode.');
    return this.create({ ...params, stream: false });
  }

  /**
   * Convert Responses API output back to Chat Completions format
   * Provides backward compatibility for existing code
   */
  convertResponseToChat(response: any): any {
    const choices = [];
    let toolCalls: any[] = [];
    let textContent = '';
    
    // Process output items
    for (const item of response.output || []) {
      if (item.type === 'message' && item.role === 'assistant') {
        // Extract text content from assistant messages
        for (const content of item.content || []) {
          if (content.type === 'output_text') {
            textContent = content.text || '';
          }
        }
      } else if (item.type === 'function_call') {
        // Collect function calls
        toolCalls.push({
          id: item.call_id,
          type: 'function',
          function: {
            name: item.name,
            arguments: item.arguments
          }
        });
      }
    }

    // Build the choice object
    if (toolCalls.length > 0) {
      choices.push({
        index: 0,
        message: {
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls
        },
        finish_reason: 'tool_calls'
      });
    } else if (textContent) {
      choices.push({
        index: 0,
        message: {
          role: 'assistant',
          content: textContent
        },
        finish_reason: 'stop'
      });
    }

    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created_at || Date.now() / 1000,
      model: response.model,
      choices: choices,
      usage: response.usage
    };
  }

  /**
   * Convert streaming events - deprecated, no longer used
   * Kept for backward compatibility but logs warning
   */
  convertStreamEventToChat(event: any): any {
    console.warn('convertStreamEventToChat is deprecated as streaming is disabled');
    // Original implementation kept but won't be used
    if (event.type === 'response.text.delta') {
      return {
        id: event.response_id,
        object: 'chat.completion.chunk',
        created: Date.now() / 1000,
        model: event.model || '',
        choices: [{
          index: 0,
          delta: {
            content: event.delta
          },
          finish_reason: null
        }]
      };
    } else if (event.type === 'response.function_call_arguments.delta') {
      return {
        id: event.response_id,
        object: 'chat.completion.chunk',
        created: Date.now() / 1000,
        model: event.model || '',
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: event.output_index || 0,
              function: {
                arguments: event.delta
              }
            }]
          },
          finish_reason: null
        }]
      };
    } else if (event.type === 'response.output_item.added' && event.item.type === 'function_call') {
      return {
        id: event.response_id,
        object: 'chat.completion.chunk',
        created: Date.now() / 1000,
        model: event.model || '',
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{
              index: event.output_index || 0,
              id: event.item.call_id,
              type: 'function',
              function: {
                name: event.item.name,
                arguments: ''
              }
            }]
          },
          finish_reason: null
        }]
      };
    } else if (event.type === 'response.done') {
      return {
        id: event.response_id,
        object: 'chat.completion.chunk',
        created: Date.now() / 1000,
        model: event.model || '',
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };
    }
    
    return null;
  }

  /**
   * Helper method to validate request parameters
   */
  private validateRequest(params: any): void {
    if (!params.messages || !Array.isArray(params.messages)) {
      throw new Error('Messages array is required');
    }
    if (!params.model) {
      throw new Error('Model is required');
    }
  }

  /**
   * Create a response with validation
   */
  async createValidated(params: any): Promise<any> {
    this.validateRequest(params);
    return this.create(params);
  }
}