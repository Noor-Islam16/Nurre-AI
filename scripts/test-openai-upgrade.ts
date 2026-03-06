#!/usr/bin/env node
/**
 * Test script for OpenAI GPT-5 Mini and Responses API upgrade
 * Run with: npx tsx scripts/test-openai-upgrade.ts
 */

import OpenAI from 'openai'
import { config } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// Configuration
const CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  reasoningEffort: (process.env.OPENAI_REASONING_EFFORT || 'minimal') as 'minimal' | 'low' | 'medium' | 'high',
  verbosity: (process.env.OPENAI_VERBOSITY || 'low') as 'low' | 'medium' | 'high',
  maxOutputTokens: parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS || '800'),
  useResponsesApi: process.env.USE_RESPONSES_API !== 'false',
}

// Test results tracker
const testResults: any[] = []

// Helper function to run and log tests
async function runTest(name: string, testFn: () => Promise<any>) {
  console.log(`\n🧪 Testing: ${name}...`)
  const startTime = Date.now()
  
  try {
    const result = await testFn()
    const duration = Date.now() - startTime
    
    testResults.push({
      name,
      status: 'PASSED',
      duration: `${duration}ms`,
      result
    })
    
    console.log(`✅ ${name} - PASSED (${duration}ms)`)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    testResults.push({
      name,
      status: 'FAILED',
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error)
    })
    
    console.error(`❌ ${name} - FAILED (${duration}ms)`)
    console.error(`   Error: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

// Test 1: Check SDK Version
async function testSDKVersion() {
  const packageJsonPath = path.join(process.cwd(), 'node_modules', 'openai', 'package.json')
  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonContent)
  
  console.log(`   OpenAI SDK Version: ${packageJson.version}`)
  
  // Check if version supports Responses API (v5.x)
  const majorVersion = parseInt(packageJson.version.split('.')[0])
  if (majorVersion < 5) {
    throw new Error(`SDK version ${packageJson.version} does not support Responses API. Need v5.x or higher.`)
  }
  
  return packageJson.version
}

// Test 2: Non-streaming Responses API
async function testNonStreamingResponsesApi() {
  if (!CONFIG.useResponsesApi) {
    console.log('   Skipping - Responses API disabled')
    return 'skipped'
  }
  
  const response = await openai.responses.create({
    model: CONFIG.model,
    instructions: 'You are a concise assistant. Keep responses very brief.',
    input: 'What is 2+2? Answer with just the number.',
    max_output_tokens: CONFIG.maxOutputTokens,
    reasoning: { effort: CONFIG.reasoningEffort },
    text: { verbosity: CONFIG.verbosity },
  } as any)
  
  const outputText = (response as any).output_text
  console.log(`   Response: "${outputText}"`)
  
  if (!outputText) {
    throw new Error('No output_text received from Responses API')
  }
  
  return outputText
}

// Test 3: Streaming Responses API
async function testStreamingResponsesApi() {
  if (!CONFIG.useResponsesApi) {
    console.log('   Skipping - Responses API disabled')
    return 'skipped'
  }
  
  const stream = openai.responses.stream({
    model: CONFIG.model,
    instructions: 'You are a concise assistant.',
    input: 'Count from 1 to 5.',
    max_output_tokens: CONFIG.maxOutputTokens,
    reasoning: { effort: CONFIG.reasoningEffort },
    text: { verbosity: CONFIG.verbosity },
  } as any)
  
  let fullResponse = ''
  let eventCount = 0
  
  for await (const event of stream as any) {
    eventCount++
    if (event.type === 'response.output_text.delta') {
      fullResponse += event.delta || ''
    }
  }
  
  console.log(`   Received ${eventCount} events`)
  console.log(`   Full response: "${fullResponse}"`)
  
  if (!fullResponse) {
    throw new Error('No streaming response received')
  }
  
  return { eventCount, response: fullResponse }
}

// Test 4: Tool Calling with Responses API
async function testToolCallingResponsesApi() {
  if (!CONFIG.useResponsesApi) {
    console.log('   Skipping - Responses API disabled')
    return 'skipped'
  }
  
  const tools = [{
    type: 'function' as const,
    function: {
      name: 'calculate',
      description: 'Perform a calculation',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression' },
          result: { type: 'number', description: 'Calculation result' }
        },
        required: ['expression', 'result']
      }
    }
  }]
  
  const response = await openai.responses.create({
    model: CONFIG.model,
    instructions: 'You are a calculator assistant. Use the calculate tool to show calculations.',
    input: 'What is 10 + 20?',
    max_output_tokens: CONFIG.maxOutputTokens,
    reasoning: { effort: CONFIG.reasoningEffort },
    text: { verbosity: CONFIG.verbosity },
    tools,
  } as any)
  
  const outputText = (response as any).output_text
  console.log(`   Tool calling response: "${outputText}"`)
  
  return outputText
}

// Helper to check if model is GPT-5 (requires max_completion_tokens)
function isGPT5Model(model: string): boolean {
  return model.toLowerCase().includes('gpt-5');
}

// Test 5: Chat Completions API Fallback
async function testChatCompletionsFallback() {
  const chatParams: any = {
    model: CONFIG.model,
    messages: [
      { role: 'system', content: 'You are a concise assistant.' },
      { role: 'user', content: 'What is the capital of France? Answer with just the city name.' }
    ],
    temperature: 0.1,
  }
  
  // Use max_completion_tokens for GPT-5 models, max_tokens for others
  if (isGPT5Model(CONFIG.model)) {
    chatParams.max_completion_tokens = 50
  } else {
    chatParams.max_tokens = 50
  }
  
  const completion = await openai.chat.completions.create(chatParams)
  
  const message = completion.choices[0].message.content
  console.log(`   Response: "${message}"`)
  
  if (!message) {
    throw new Error('No response from Chat Completions API')
  }
  
  return message
}

// Test 6: Structured Output (JSON mode)
async function testStructuredOutput() {
  if (!CONFIG.useResponsesApi) {
    console.log('   Using Chat Completions API for structured output')
    
    const chatParams: any = {
      model: CONFIG.model,
      messages: [
        { role: 'system', content: 'Output a JSON object with fields: status (string) and timestamp (ISO string).' },
        { role: 'user', content: 'Generate a status response.' }
      ],
      response_format: { type: 'json_object' },
    }
    
    // Use max_completion_tokens for GPT-5 models, max_tokens for others
    if (isGPT5Model(CONFIG.model)) {
      chatParams.max_completion_tokens = 100
    } else {
      chatParams.max_tokens = 100
    }
    
    const completion = await openai.chat.completions.create(chatParams)
    
    const jsonStr = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(jsonStr)
    console.log(`   Structured response:`, parsed)
    return parsed
  }
  
  const response = await openai.responses.create({
    model: CONFIG.model,
    instructions: 'Output a JSON object with fields: status (string) and timestamp (ISO string).',
    input: 'Generate a status response.',
    max_output_tokens: 100,
    reasoning: { effort: CONFIG.reasoningEffort },
    text: { 
      verbosity: CONFIG.verbosity,
      format: 'json_object'
    },
  } as any)
  
  const jsonStr = (response as any).output_text || '{}'
  const parsed = JSON.parse(jsonStr)
  console.log(`   Structured response:`, parsed)
  
  return parsed
}

// Test 7: Performance Comparison
async function testPerformanceComparison() {
  const prompt = 'Explain photosynthesis in one sentence.'
  
  // Test Responses API timing
  let responsesApiTime = null
  if (CONFIG.useResponsesApi) {
    const start = Date.now()
    await openai.responses.create({
      model: CONFIG.model,
      instructions: 'You are a concise science teacher.',
      input: prompt,
      max_output_tokens: 100,
      reasoning: { effort: 'minimal' },
      text: { verbosity: 'low' },
    } as any)
    responsesApiTime = Date.now() - start
    console.log(`   Responses API (minimal/low): ${responsesApiTime}ms`)
  }
  
  // Test Chat Completions timing
  const chatStart = Date.now()
  const perfChatParams: any = {
    model: CONFIG.model,
    messages: [
      { role: 'system', content: 'You are a concise science teacher.' },
      { role: 'user', content: prompt }
    ],
  }
  
  // Use max_completion_tokens for GPT-5 models, max_tokens for others
  if (isGPT5Model(CONFIG.model)) {
    perfChatParams.max_completion_tokens = 100
  } else {
    perfChatParams.max_tokens = 100
  }
  
  await openai.chat.completions.create(perfChatParams)
  const chatTime = Date.now() - chatStart
  console.log(`   Chat Completions API: ${chatTime}ms`)
  
  return {
    responsesApi: responsesApiTime,
    chatCompletions: chatTime,
    difference: responsesApiTime ? `${Math.abs(responsesApiTime - chatTime)}ms` : 'N/A'
  }
}

// Main test runner
async function main() {
  console.log('🚀 OpenAI GPT-5 Mini & Responses API Test Suite')
  console.log('================================================')
  console.log('\nConfiguration:')
  console.log(`  Model: ${CONFIG.model}`)
  console.log(`  Use Responses API: ${CONFIG.useResponsesApi}`)
  console.log(`  Reasoning Effort: ${CONFIG.reasoningEffort}`)
  console.log(`  Verbosity: ${CONFIG.verbosity}`)
  console.log(`  Max Output Tokens: ${CONFIG.maxOutputTokens}`)
  
  // Run all tests
  await runTest('SDK Version Check', testSDKVersion)
  await runTest('Non-streaming Responses API', testNonStreamingResponsesApi)
  await runTest('Streaming Responses API', testStreamingResponsesApi)
  await runTest('Tool Calling (Responses API)', testToolCallingResponsesApi)
  await runTest('Chat Completions Fallback', testChatCompletionsFallback)
  await runTest('Structured Output', testStructuredOutput)
  await runTest('Performance Comparison', testPerformanceComparison)
  
  // Summary
  console.log('\n================================================')
  console.log('📊 Test Summary:')
  
  const passed = testResults.filter(t => t.status === 'PASSED').length
  const failed = testResults.filter(t => t.status === 'FAILED').length
  const total = testResults.length
  
  console.log(`  Total Tests: ${total}`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\n⚠️  Failed Tests:')
    testResults
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`)
      })
    process.exit(1)
  } else {
    console.log('\n🎉 All tests passed successfully!')
    console.log('\n💡 Next Steps:')
    console.log('  1. Test the chat interface at http://localhost:3000')
    console.log('  2. Check health endpoint at http://localhost:3000/api/health/openai')
    console.log('  3. Monitor performance with different reasoning_effort settings')
    console.log('  4. Review logs for any API deprecation warnings')
  }
}

// Run tests
main().catch(error => {
  console.error('\n❌ Test suite failed:', error)
  process.exit(1)
})