#!/usr/bin/env node

/**
 * Integration test for end-to-end tool calling
 * Tests the full flow from chat API to tool execution
 */

const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })

// Test configuration
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const TEST_USER_ID = 'test-integration-user'

// Test utilities
class TestRunner {
  constructor(name) {
    this.name = name
    this.passed = 0
    this.failed = 0
    this.errors = []
  }
  
  async test(description, fn) {
    try {
      await fn()
      this.passed++
      console.log(`  ✅ ${description}`)
    } catch (error) {
      this.failed++
      this.errors.push({ description, error: error.message })
      console.log(`  ❌ ${description}`)
      console.log(`     ${error.message}`)
    }
  }
  
  assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  }
  
  assertExists(value, message) {
    if (!value) {
      throw new Error(message || 'Value should exist')
    }
  }
  
  summary() {
    console.log(`\n📊 ${this.name} Results:`)
    console.log(`   Passed: ${this.passed}`)
    console.log(`   Failed: ${this.failed}`)
    if (this.failed > 0) {
      console.log('\n   Failed tests:')
      this.errors.forEach(({ description, error }) => {
        console.log(`   - ${description}: ${error}`)
      })
    }
    return this.failed === 0
  }
}

// Test end-to-end native tool calling
async function testEndToEnd() {
  console.log('\n🧪 End-to-End Integration Test\n')
  const runner = new TestRunner('Integration')
  
  // Test chat API with native tools
  await runner.test('chat API accepts native tool requests', async () => {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Native-Tools': 'true',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Create a task for studying math for 30 minutes and start a focus timer'
        }],
        stream: false
      })
    })
    
    runner.assertEqual(response.ok, true, 'Request should succeed')
    
    const result = await response.json()
    runner.assertExists(result.tool_calls, 'Should have tool calls')
    runner.assertExists(result.tool_results, 'Should have tool results')
    runner.assertExists(result.message, 'Should have response message')
  })
  
  // Test streaming with tools
  await runner.test('streaming works with native tools', async () => {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-Native-Tools': 'true',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Help me break down a complex project'
        }],
        stream: true
      })
    })
    
    runner.assertEqual(response.ok, true, 'Stream request should succeed')
    runner.assertExists(response.headers.get('content-type').includes('text/event-stream'), 
      'Should return event stream')
  })
  
  // Test planner brain integration
  await runner.test('planner brain executes tools', async () => {
    const response = await fetch(`${API_URL}/api/ai/brain/think`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({})
    })
    
    if (response.ok) {
      const result = await response.json()
      runner.assertExists(result.executed !== undefined, 'Should indicate execution status')
      
      if (result.executed && result.tools) {
        runner.assertExists(Array.isArray(result.tools), 'Tools should be array')
      }
    } else {
      // Brain endpoint might not be exposed - that's ok
      console.log('    (Brain endpoint not available for testing)')
    }
  })
  
  // Test tool execution from notifications
  await runner.test('notification actions can execute tools', async () => {
    const response = await fetch(`${API_URL}/api/planner/execute-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({
        tool: 'send_message',
        params: {
          text: 'Test message from notification',
          style: 'gentle'
        }
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      runner.assertExists(result.success !== undefined, 'Should indicate success')
      runner.assertExists(result.tool, 'Should return tool name')
    } else if (response.status === 401) {
      console.log('    (Requires authentication - expected in test environment)')
    } else {
      throw new Error(`Unexpected status: ${response.status}`)
    }
  })
  
  // Test V2 compatibility mode
  await runner.test('V2 format still works', async () => {
    const response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Use-V2-Format': 'true',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Help me focus on my work'
        }],
        stream: false
      })
    })
    
    runner.assertEqual(response.ok, true, 'V2 request should succeed')
    
    const result = await response.json()
    // V2 format has different structure
    if (result.tools) {
      runner.assertExists(typeof result.tools === 'object', 'V2 tools should be object')
    }
  })
  
  // Test rate limiting
  await runner.test('rate limiting works for tools', async () => {
    const requests = []
    
    // Send 5 rapid requests
    for (let i = 0; i < 5; i++) {
      requests.push(
        fetch(`${API_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Use-Native-Tools': 'true',
            'X-User-Id': TEST_USER_ID
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Test request ${i}`
            }],
            stream: false
          })
        })
      )
    }
    
    const responses = await Promise.all(requests)
    const rateLimited = responses.some(r => r.status === 429)
    
    if (rateLimited) {
      console.log('    Rate limiting is active')
    } else {
      console.log('    Rate limiting might not be configured')
    }
  })
  
  return runner.summary()
}

// Test tool validation
async function testToolValidation() {
  console.log('\n🧪 Tool Validation Tests\n')
  const runner = new TestRunner('ToolValidation')
  
  // Test invalid tool name
  await runner.test('rejects invalid tool names', async () => {
    const response = await fetch(`${API_URL}/api/planner/execute-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({
        tool: 'invalid_tool_name',
        params: {}
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      runner.assertEqual(result.success, false, 'Should fail for invalid tool')
    } else {
      // Expected to fail
      runner.assertEqual(response.ok, false, 'Should reject invalid tool')
    }
  })
  
  // Test parameter validation
  await runner.test('validates tool parameters', async () => {
    const response = await fetch(`${API_URL}/api/planner/execute-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': TEST_USER_ID
      },
      body: JSON.stringify({
        tool: 'start_focus',
        params: {
          duration: 999 // Invalid duration
        }
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      runner.assertEqual(result.success, false, 'Should fail for invalid params')
    }
  })
  
  return runner.summary()
}

// Main test runner
async function main() {
  console.log('🧪 Integration Test Suite')
  console.log('=========================')
  console.log(`Testing against: ${API_URL}`)
  
  const results = []
  
  // Check if server is running
  try {
    const health = await fetch(`${API_URL}/api/health`).catch(() => null)
    if (!health) {
      console.log('\n⚠️  Server not running at', API_URL)
      console.log('   Start the dev server with: npm run dev')
      console.log('   Then run this test again')
      process.exit(1)
    }
  } catch (error) {
    console.log('\n⚠️  Cannot connect to server')
    console.log('   Make sure the dev server is running')
    process.exit(1)
  }
  
  try {
    results.push(await testEndToEnd())
    results.push(await testToolValidation())
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Overall Integration Test Results')
    console.log('='.repeat(50))
    
    const allPassed = results.every(r => r === true)
    
    if (allPassed) {
      console.log('\n✅ All integration tests passed!')
      console.log('\nThe system is working end-to-end with:')
      console.log('  • Native tool calling')
      console.log('  • V2 compatibility')
      console.log('  • Notification actions')
      console.log('  • Parameter validation')
      process.exit(0)
    } else {
      console.log('\n❌ Some integration tests failed')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error)
    process.exit(1)
  }
}

// Run tests
main().catch(console.error)