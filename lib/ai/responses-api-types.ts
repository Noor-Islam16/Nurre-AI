/**
 * TypeScript type definitions for Responses API
 * Provides strong typing for request and response structures
 */

/**
 * Reasoning effort levels for GPT-5 models
 */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Verbosity levels for response generation
 */
export type VerbosityLevel = 'low' | 'medium' | 'high';

/**
 * Text configuration for Responses API
 */
export interface TextConfig {
  verbosity: VerbosityLevel;
}

/**
 * Reasoning configuration for GPT-5 models
 */
export interface ReasoningConfig {
  effort: ReasoningEffort;
}

/**
 * Tool choice configuration
 */
export interface ToolChoice {
  type: 'auto' | 'required' | 'function' | 'allowed_tools' | 'none';
  name?: string;
  mode?: 'auto' | 'required';
  tools?: Array<{
    type: string;
    name?: string;
    server_label?: string;
  }>;
}

/**
 * Function tool definition
 */
export interface FunctionTool {
  type: 'function';
  name: string;
  description?: string;
  parameters: any;
  strict?: boolean;
}

/**
 * Custom tool definition
 */
export interface CustomTool {
  type: 'custom';
  name: string;
  description: string;
  format?: {
    type: 'grammar';
    syntax: 'lark' | 'regex';
    definition: string;
  };
}

/**
 * Tool definition union type
 */
export type Tool = FunctionTool | CustomTool;

/**
 * Input message types for Responses API
 */
export interface UserMessage {
  role: 'user';
  content: string | Array<any>;
}

export interface AssistantMessage {
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'output_text';
    text: string;
  }>;
}

export interface FunctionCall {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
}

export interface FunctionCallOutput {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export interface CustomToolCall {
  type: 'custom_tool_call';
  call_id: string;
  name: string;
  input: string;
}

export interface ReasoningItem {
  type: 'reasoning';
  content: any[];
  summary?: any[];
}

/**
 * Input item union type
 */
export type InputItem = UserMessage | AssistantMessage | FunctionCall | FunctionCallOutput | CustomToolCall | ReasoningItem;

/**
 * Responses API request structure
 */
export interface ResponsesAPIRequest {
  model: string;
  input: InputItem[];
  instructions?: string;
  tools?: Tool[];
  tool_choice?: string | ToolChoice;
  reasoning?: ReasoningConfig;
  text?: TextConfig;
  temperature?: number;
  max_output_tokens?: number;
  stream?: boolean;
  previous_response_id?: string;
  parallel_tool_calls?: boolean;
  top_p?: number;
  top_logprobs?: number;
  store?: boolean;
  metadata?: Record<string, string>;
  service_tier?: 'auto' | 'default' | 'flex' | 'priority';
  safety_identifier?: string;
  prompt_cache_key?: string;
  truncation?: 'auto' | 'disabled';
  include?: string[];
  background?: boolean;
  stream_options?: {
    include_usage?: boolean;
  };
}

/**
 * Output item types
 */
export interface OutputMessage {
  type: 'message';
  id: string;
  status: 'completed' | 'in_progress';
  role: 'assistant';
  content: Array<{
    type: 'output_text';
    text: string;
    annotations?: any[];
  }>;
}

export interface OutputFunctionCall {
  type: 'function_call';
  id: string;
  call_id: string;
  status: 'completed' | 'in_progress';
  name: string;
  arguments: string;
}

export interface OutputCustomToolCall {
  type: 'custom_tool_call';
  id: string;
  call_id: string;
  status: 'completed' | 'in_progress';
  name: string;
  input: string;
}

export interface OutputReasoning {
  type: 'reasoning';
  id: string;
  content: any[];
  summary?: any[];
}

/**
 * Output item union type
 */
export type OutputItem = OutputMessage | OutputFunctionCall | OutputCustomToolCall | OutputReasoning;

/**
 * Usage information
 */
export interface UsageInfo {
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
}

/**
 * Responses API response structure
 */
export interface ResponsesAPIResponse {
  id: string;
  object: 'response';
  created_at: number;
  status: 'completed' | 'in_progress' | 'failed';
  model: string;
  output: OutputItem[];
  usage?: UsageInfo;
  error?: {
    type: string;
    message: string;
  };
  incomplete_details?: {
    reason: string;
  };
  instructions?: string;
  max_output_tokens?: number;
  service_tier?: string;
}

/**
 * Streaming event types
 */
export interface StreamEvent {
  type: string;
  response_id?: string;
  output_index?: number;
  item_id?: string;
  delta?: string;
  item?: any;
  arguments?: string;
  model?: string;
}

/**
 * Migration helper types
 */
export interface MigrationConfig {
  useResponsesAPI: boolean;
  endpoints: string[];
  defaultReasoningEffort: ReasoningEffort;
  defaultVerbosity: VerbosityLevel;
}

/**
 * Error types for better error handling
 */
export class ResponsesAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ResponsesAPIError';
  }
}

/**
 * Helper type guards
 */
export function isUserMessage(item: InputItem): item is UserMessage {
  return 'role' in item && item.role === 'user';
}

export function isAssistantMessage(item: InputItem): item is AssistantMessage {
  return 'type' in item && item.type === 'message' && 'role' in item && item.role === 'assistant';
}

export function isFunctionCall(item: InputItem | OutputItem): item is FunctionCall | OutputFunctionCall {
  return 'type' in item && item.type === 'function_call';
}

export function isFunctionCallOutput(item: InputItem): item is FunctionCallOutput {
  return 'type' in item && item.type === 'function_call_output';
}

export function isCustomToolCall(item: InputItem | OutputItem): item is CustomToolCall | OutputCustomToolCall {
  return 'type' in item && item.type === 'custom_tool_call';
}

export function isReasoningItem(item: InputItem | OutputItem): item is ReasoningItem | OutputReasoning {
  return 'type' in item && item.type === 'reasoning';
}

/**
 * Conversion helper types
 */
export interface ConversionOptions {
  preserveReasoning?: boolean;
  includeMetadata?: boolean;
  defaultReasoningEffort?: ReasoningEffort;
  defaultVerbosity?: VerbosityLevel;
}