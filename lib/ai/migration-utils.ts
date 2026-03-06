/**
 * Migration utilities for transitioning from Chat Completions API to Responses API
 * Provides feature flags, singleton management, and migration helpers
 */

import { ResponsesAPIClient } from './responses-api-client';
import { 
  MigrationConfig, 
  ReasoningEffort, 
  VerbosityLevel,
  ResponsesAPIError 
} from './responses-api-types';

/**
 * Singleton instance of ResponsesAPIClient
 */
let clientInstance: ResponsesAPIClient | null = null;

/**
 * Get or create the ResponsesAPIClient singleton instance
 * Ensures a single client instance is used throughout the application
 */
export function getResponsesAPIClient(): ResponsesAPIClient {
  if (!clientInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ResponsesAPIError('OPENAI_API_KEY is not set', 500, 'CONFIG_ERROR');
    }
    clientInstance = new ResponsesAPIClient(apiKey);
  }
  return clientInstance;
}

/**
 * Reset the client instance (useful for testing)
 */
export function resetResponsesAPIClient(): void {
  clientInstance = null;
}

/**
 * Feature flag system for gradual migration
 * Controls which endpoints use the Responses API
 */
export function shouldUseResponsesAPI(endpoint?: string): boolean {
  // Check if Responses API is globally enabled
  const globalEnabled = process.env.USE_RESPONSES_API === 'true';
  
  if (!endpoint) {
    return globalEnabled;
  }
  
  // Check specific endpoints that have been migrated
  const migratedEndpoints = process.env.RESPONSES_API_ENDPOINTS?.split(',') || [];
  
  // Clean up endpoint names and check
  const cleanEndpoint = endpoint.trim().toLowerCase();
  const isMigrated = migratedEndpoints.some(e => 
    e.trim().toLowerCase() === cleanEndpoint
  );
  
  return globalEnabled || isMigrated;
}

/**
 * Get migration configuration
 * Returns the current migration settings
 */
export function getMigrationConfig(): MigrationConfig {
  const endpoints = process.env.RESPONSES_API_ENDPOINTS?.split(',')
    .map(e => e.trim())
    .filter(Boolean) || [];
  
  return {
    useResponsesAPI: process.env.USE_RESPONSES_API === 'true',
    endpoints,
    defaultReasoningEffort: (process.env.DEFAULT_REASONING_EFFORT as ReasoningEffort) || 'minimal',
    defaultVerbosity: (process.env.DEFAULT_VERBOSITY as VerbosityLevel) || 'medium'
  };
}

/**
 * Helper to convert Chat Completions request to Responses API format
 * Used for gradual migration of existing code
 */
export async function migrateRequest(
  chatCompletionsRequest: any,
  options?: {
    forceResponsesAPI?: boolean;
    reasoningEffort?: ReasoningEffort;
    verbosity?: VerbosityLevel;
  }
): Promise<any> {
  const endpoint = chatCompletionsRequest.endpoint || 'default';
  
  // Check if we should use Responses API
  const useResponsesAPI = options?.forceResponsesAPI || shouldUseResponsesAPI(endpoint);
  
  if (!useResponsesAPI) {
    // Return original request unchanged if not migrating
    return chatCompletionsRequest;
  }
  
  // Get the client and convert the request
  const client = getResponsesAPIClient();
  const config = getMigrationConfig();
  
  // Merge options with defaults
  const requestWithOptions = {
    ...chatCompletionsRequest,
    reasoning_effort: options?.reasoningEffort || config.defaultReasoningEffort,
    verbosity: options?.verbosity || config.defaultVerbosity
  };
  
  // Execute the request
  if (chatCompletionsRequest.stream) {
    return client.stream(requestWithOptions);
  } else {
    const response = await client.create(requestWithOptions);
    // Convert back to Chat Completions format for compatibility
    return client.convertResponseToChat(response);
  }
}

/**
 * Helper to log migration status
 * Useful for debugging and monitoring the migration
 */
export function logMigrationStatus(endpoint: string): void {
  const isUsingResponsesAPI = shouldUseResponsesAPI(endpoint);
  const config = getMigrationConfig();
  
  console.log('[Migration Status]', {
    endpoint,
    usingResponsesAPI: isUsingResponsesAPI,
    globalEnabled: config.useResponsesAPI,
    migratedEndpoints: config.endpoints,
    defaultReasoningEffort: config.defaultReasoningEffort,
    defaultVerbosity: config.defaultVerbosity
  });
}

/**
 * Validation helper for model names
 * Ensures model names are compatible with Responses API
 */
export function validateModelName(model: string): string {
  // Strip date suffixes for Responses API compatibility
  const cleanModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  
  // Validate against known models
  const validModels = [
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'o3',
    'o4-mini'
  ];
  
  if (!validModels.some(valid => cleanModel.startsWith(valid))) {
    console.warn(`[Migration Warning] Unknown model: ${cleanModel}. Proceeding anyway.`);
  }
  
  return cleanModel;
}

/**
 * Helper to determine optimal reasoning effort based on use case
 */
export function getOptimalReasoningEffort(useCase: string): ReasoningEffort {
  const useCaseMap: Record<string, ReasoningEffort> = {
    'simple_chat': 'minimal',
    'code_generation': 'low',
    'complex_reasoning': 'medium',
    'problem_solving': 'high',
    'quick_response': 'minimal',
    'detailed_analysis': 'high'
  };
  
  return useCaseMap[useCase] || 'minimal';
}

/**
 * Helper to determine optimal verbosity based on use case
 */
export function getOptimalVerbosity(useCase: string): VerbosityLevel {
  const useCaseMap: Record<string, VerbosityLevel> = {
    'concise_answer': 'low',
    'standard_response': 'medium',
    'detailed_explanation': 'high',
    'code_only': 'low',
    'tutorial': 'high'
  };
  
  return useCaseMap[useCase] || 'medium';
}

/**
 * Migration metrics tracking
 */
let migrationMetrics = {
  totalRequests: 0,
  responsesAPIRequests: 0,
  chatCompletionsRequests: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Track a migration request
 */
export function trackMigrationRequest(usedResponsesAPI: boolean, success: boolean): void {
  migrationMetrics.totalRequests++;
  
  if (usedResponsesAPI) {
    migrationMetrics.responsesAPIRequests++;
  } else {
    migrationMetrics.chatCompletionsRequests++;
  }
  
  if (!success) {
    migrationMetrics.errors++;
  }
}

/**
 * Get migration metrics
 */
export function getMigrationMetrics() {
  const uptime = Date.now() - migrationMetrics.startTime;
  const responsesAPIPercentage = migrationMetrics.totalRequests > 0
    ? (migrationMetrics.responsesAPIRequests / migrationMetrics.totalRequests) * 100
    : 0;
  
  return {
    ...migrationMetrics,
    uptime,
    responsesAPIPercentage: responsesAPIPercentage.toFixed(2) + '%',
    errorRate: migrationMetrics.totalRequests > 0
      ? ((migrationMetrics.errors / migrationMetrics.totalRequests) * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * Reset migration metrics (useful for testing)
 */
export function resetMigrationMetrics(): void {
  migrationMetrics = {
    totalRequests: 0,
    responsesAPIRequests: 0,
    chatCompletionsRequests: 0,
    errors: 0,
    startTime: Date.now()
  };
}

/**
 * Environment variable validation
 * Ensures all required configuration is present
 */
export function validateMigrationEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.OPENAI_API_KEY) {
    errors.push('OPENAI_API_KEY is not set');
  }
  
  // Validate reasoning effort if set
  if (process.env.DEFAULT_REASONING_EFFORT) {
    const validEfforts = ['minimal', 'low', 'medium', 'high'];
    if (!validEfforts.includes(process.env.DEFAULT_REASONING_EFFORT)) {
      errors.push(`Invalid DEFAULT_REASONING_EFFORT: ${process.env.DEFAULT_REASONING_EFFORT}`);
    }
  }
  
  // Validate verbosity if set
  if (process.env.DEFAULT_VERBOSITY) {
    const validVerbosities = ['low', 'medium', 'high'];
    if (!validVerbosities.includes(process.env.DEFAULT_VERBOSITY)) {
      errors.push(`Invalid DEFAULT_VERBOSITY: ${process.env.DEFAULT_VERBOSITY}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}