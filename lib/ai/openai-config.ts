// Central configuration for OpenAI API integration
// Native Tool Calling Only

import OpenAI from 'openai'

// Model configuration
// GPT-5 models for production use
// GPT-5 Mini for general chat interactions (cost-effective, fast)
export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5-mini';
// GPT-5 Nano for planning and complex reasoning (more powerful)
export const PLANNER_MODEL = process.env.OPENAI_PLANNER_MODEL || 'gpt-5-nano';
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

// Legacy model names for backward compatibility (to be removed after migration)
export const LEGACY_CHAT_MODEL = 'gpt-5-mini-2025-08-07';
export const LEGACY_PLANNER_MODEL = 'gpt-5-nano-2025-08-07';

// Helper function to normalize model names
export function normalizeModelName(model: string): string {
  // Remove date suffixes if present
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, '');
}

// Validation function to ensure models are valid
export function validateModelName(model: string): boolean {
  const validModels = [
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano'
  ];
  
  const normalized = normalizeModelName(model);
  return validModels.includes(normalized);
}

// Get model with fallback - MUST use gpt-5-mini
export function getModel(preferredModel: string, fallbackModel?: string): string {
  const normalized = normalizeModelName(preferredModel);
  
  if (validateModelName(normalized)) {
    return normalized;
  }
  
  console.warn(`Invalid model name: ${preferredModel}, using fallback: gpt-5-mini`);
  return 'gpt-5-mini'; // Always fallback to gpt-5-mini per architecture requirements
}

// Tool configuration
export const MAX_TOOLS_PER_CALL = 5;

// API configuration
export const MAX_COMPLETION_TOKENS = parseInt(process.env.OPENAI_MAX_COMPLETION_TOKENS || '2000');

// Create OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Get configuration for logging
export function getConfigSummary() {
  return {
    chatModel: CHAT_MODEL,
    plannerModel: PLANNER_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    maxToolsPerCall: MAX_TOOLS_PER_CALL,
    maxCompletionTokens: MAX_COMPLETION_TOKENS,
    api: 'Responses API Only (No Chat Completions)'
  };
}