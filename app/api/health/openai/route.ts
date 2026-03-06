import { NextRequest, NextResponse } from 'next/server'
import { getConfigSummary, CHAT_MODEL } from '@/lib/ai/openai-config'
import { ResponsesAPIClient } from '@/lib/ai/responses-api-client'
import fs from 'fs/promises'
import path from 'path'

const responsesClient = new ResponsesAPIClient(process.env.OPENAI_API_KEY!)

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    configuration: getConfigSummary(),
    tests: {
      sdkVersion: { status: 'pending', result: null },
      chatCompletions: { status: 'pending', result: null },
      toolCalling: { status: 'pending', result: null },
    },
    errors: []
  }
  
  try {
    // 1. Get OpenAI SDK version
    try {
      const packageJsonPath = path.join(process.cwd(), 'node_modules', 'openai', 'package.json')
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)
      results.tests.sdkVersion = {
        status: 'success',
        result: {
          version: packageJson.version,
          name: packageJson.name
        }
      }
      console.log(`OpenAI SDK Version: ${packageJson.version}`)
    } catch (error) {
      results.tests.sdkVersion = {
        status: 'error',
        result: error instanceof Error ? error.message : 'Failed to read SDK version'
      }
    }
    
    // 2. Test Responses API
    try {
      const response = await responsesClient.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: 'You are a health check assistant. Respond with exactly: "Health check successful"' },
          { role: 'user', content: 'ping' }
        ],
        max_output_tokens: 50,
        reasoning: { effort: 'minimal' }
      })
      
      const chatResponse = responsesClient.convertResponseToChat(response)
      const outputText = chatResponse.choices[0]?.message?.content || ''
      results.tests.chatCompletions = {
        status: 'success',
        result: {
          model: response.model,
          output: outputText.substring(0, 100),
          usage: response.usage
        }
      }
    } catch (error) {
      results.tests.chatCompletions = {
        status: 'error',
        result: error instanceof Error ? error.message : 'Chat Completions API test failed'
      }
      results.errors.push(`Chat API Error: ${error}`)
    }
    
    // 3. Test Native Tool Calling with Responses API
    try {
      const testTool = {
        type: 'function' as const,
        function: {
          name: 'health_check',
          description: 'Health check function',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Health status' }
            },
            required: ['status']
          }
        }
      }
      
      const response = await responsesClient.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: 'You are a health check assistant. Use the health_check tool to report status.' },
          { role: 'user', content: 'Report health status as "ok"' }
        ],
        tools: [testTool],
        tool_choice: 'auto',
        max_output_tokens: 100,
        reasoning: { effort: 'minimal' }
      })
      
      const chatResponse = responsesClient.convertResponseToChat(response)
      const hasToolCalls = chatResponse.choices[0]?.message?.tool_calls && chatResponse.choices[0].message.tool_calls.length > 0
      results.tests.toolCalling = {
        status: 'success',
        result: {
          model: response.model,
          hasToolCalls,
          toolCallsCount: chatResponse.choices[0]?.message?.tool_calls?.length || 0,
          finishReason: chatResponse.choices[0]?.finish_reason
        }
      }
    } catch (error) {
      results.tests.toolCalling = {
        status: 'error',
        result: error instanceof Error ? error.message : 'Tool calling test failed'
      }
      results.errors.push(`Tool Calling Error: ${error}`)
    }
    
    // Determine overall health
    const allTestsPassed = Object.values(results.tests).every(
      (test: any) => test.status === 'success'
    )
    
    results.healthy = allTestsPassed
    results.summary = allTestsPassed 
      ? 'All OpenAI API tests passed' 
      : `Some tests failed: ${results.errors.join(', ')}`
    
    return NextResponse.json(results, { 
      status: allTestsPassed ? 200 : 503 
    })
    
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tests: results.tests
    }, { status: 503 })
  }
}