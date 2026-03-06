#!/usr/bin/env node

/**
 * Test script for Chat Endpoint Migration to Responses API
 * Tests basic chat, streaming, tool calling, and conversation continuity
 */

require('dotenv').config({ path: '.env.local' })

async function testChatMigration() {
  console.log('Testing chat endpoint migration to Responses API...\n')
  console.log('='.'='.repeat(50))
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let previousResponseId = null
  let conversationId = `test-conv-${Date.now()}`
  
  const tests = [
    {
      name: 'Basic chat (non-streaming)',
      payload: {
        messages: [
          { role: 'user', content: 'Hello, how are you today?' }
        ],
        stream: false
      }
    },
    {
      name: 'Chat with conversation continuity',
      payload: {
        messages: [
          { role: 'user', content: 'What did I just ask you?' }
        ],
        conversationId,
        previousResponseId: null, // Will be set from previous response
        stream: false
      }
    },
    {
      name: 'Tool calling test',
      payload: {
        messages: [
          { role: 'user', content: 'Create a task for me to exercise tomorrow at 9am' }
        ],
        stream: false
      }
    },
    {
      name: 'Streaming chat',
      payload: {
        messages: [
          { role: 'user', content: 'Tell me a short story about ADHD management' }
        ],
        stream: true
      }
    },
    {
      name: 'Streaming with tool calling',
      payload: {
        messages: [
          { role: 'user', content: 'Start a 25 minute focus timer for me' }
        ],
        stream: true
      }
    }
  ]

  // Get auth token (you may need to implement proper auth)
  const authToken = process.env.TEST_AUTH_TOKEN || 'test-token'
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Test: ${test.name}`)
    console.log('='.repeat(50))
    
    try {
      // Update previousResponseId if needed
      if (test.payload.previousResponseId === null && previousResponseId) {
        test.payload.previousResponseId = previousResponseId
      }
      
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(test.payload)
      })
      
      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Failed (${response.status}):`, error)
        continue
      }
      
      if (test.payload.stream) {
        // Handle streaming response
        console.log('📡 Streaming response:')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                switch (data.type) {
                  case 'content':
                  case 'text_delta':
                    process.stdout.write(data.content || data.text || '')
                    break
                  case 'tool_result':
                    console.log(`\n🔧 Tool executed: ${data.tool_call_id}`)
                    break
                  case 'done':
                    console.log(`\n✅ Stream complete`)
                    if (data.response_id) {
                      previousResponseId = data.response_id
                      console.log(`📝 Response ID: ${data.response_id}`)
                    }
                    break
                  case 'error':
                    console.error(`\n❌ Stream error: ${data.error}`)
                    break
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      } else {
        // Handle non-streaming response
        const data = await response.json()
        console.log('✅ Success!')
        console.log('📝 Response:', {
          message: data.message?.substring(0, 100) + '...',
          toolCalls: data.tool_calls?.length || 0,
          toolResults: data.tool_results?.length || 0,
          responseId: data.response_id
        })
        
        // Save response ID for next test
        if (data.response_id) {
          previousResponseId = data.response_id
        }
        
        // Display full message for debugging
        if (process.env.DEBUG) {
          console.log('\nFull message:', data.message)
        }
      }
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }
  
  console.log(`\n${'='.repeat(50)}`)
  console.log('Test Summary')
  console.log('='.repeat(50))
  console.log('✅ All tests completed')
  console.log(`📝 Final response ID: ${previousResponseId}`)
  console.log(`💬 Conversation ID: ${conversationId}`)
}

// Run tests
testChatMigration().catch(console.error)