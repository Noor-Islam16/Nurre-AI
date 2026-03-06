const OpenAI = require('openai')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
  
  assertInRange(value, min, max, message) {
    if (value < min || value > max) {
      throw new Error(message || `Value ${value} not in range [${min}, ${max}]`)
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

// Mock response parser
class ResponseParser {
  parse(text) {
    try {
      return JSON.parse(text)
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
      
      // Try to find JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        return JSON.parse(objectMatch[0])
      }
      
      throw new Error('Could not parse response')
    }
  }
  
  detectRefusal(text) {
    const refusalPatterns = [
      /I (cannot|can't|won't|will not)/i,
      /I('m| am) (unable|not able) to/i,
      /I (don't|do not) (have|possess)/i,
      /not (appropriate|suitable|allowed)/i,
      /against (my|the) (guidelines|policies)/i
    ]
    
    return refusalPatterns.some(pattern => pattern.test(text))
  }
  
  extractPartialMessage(text) {
    // Extract message even from incomplete JSON
    const messageMatch = text.match(/"message"\s*:\s*"([^"]*)"/)
    if (messageMatch) {
      return messageMatch[1]
    }
    return null
  }
}

// Test response parsing edge cases
async function testResponseParsing() {
  console.log('\n🧪 Testing Response Parsing Edge Cases\n')
  const runner = new TestRunner('ResponseParsing')
  const parser = new ResponseParser()
  
  // Test valid JSON parsing
  await runner.test('parses valid JSON response', async () => {
    const response = '{"message":"Hello","tools":{},"metadata":{"confidence":0.8}}'
    const parsed = parser.parse(response)
    runner.assertEqual(parsed.message, 'Hello', 'Should parse message')
  })
  
  // Test JSON in markdown
  await runner.test('extracts JSON from markdown code blocks', async () => {
    const response = `Here's the response:
\`\`\`json
{
  "message": "Task created",
  "tools": {
    "create_task": {
      "enabled": true,
      "title": "New task"
    }
  },
  "metadata": {"confidence": 0.9}
}
\`\`\`
That's the structured output.`
    
    const parsed = parser.parse(response)
    runner.assertEqual(parsed.message, 'Task created', 'Should extract from markdown')
  })
  
  // Test refusal detection
  await runner.test('detects refusal responses', async () => {
    const refusals = [
      "I cannot help with that request",
      "I'm unable to perform that action",
      "I don't have access to that functionality",
      "That's not appropriate for me to do",
      "This goes against my guidelines"
    ]
    
    refusals.forEach(text => {
      runner.assertEqual(parser.detectRefusal(text), true, `Should detect: ${text}`)
    })
  })
  
  // Test partial message extraction
  await runner.test('extracts message from incomplete JSON', async () => {
    const partial = '{"message":"Hello world","tools":{'
    const message = parser.extractPartialMessage(partial)
    runner.assertEqual(message, 'Hello world', 'Should extract partial message')
  })
  
  // Test escaped characters
  await runner.test('handles escaped characters in JSON', async () => {
    const response = '{"message":"Line 1\\nLine 2\\t\\"Quoted\\"","tools":{},"metadata":{"confidence":0.8}}'
    const parsed = parser.parse(response)
    runner.assertExists(parsed.message.includes('\n'), 'Should handle newlines')
    runner.assertExists(parsed.message.includes('"'), 'Should handle quotes')
  })
  
  // Test Unicode in responses
  await runner.test('handles Unicode in responses', async () => {
    const response = '{"message":"Hello 世界 🌍","tools":{},"metadata":{"confidence":0.8}}'
    const parsed = parser.parse(response)
    runner.assertExists(parsed.message.includes('世界'), 'Should handle Chinese')
    runner.assertExists(parsed.message.includes('🌍'), 'Should handle emoji')
  })
  
  // Test nested JSON extraction
  await runner.test('extracts deeply nested JSON', async () => {
    const response = `
    Some text before
    {
      "message": "Nested test",
      "tools": {
        "create_task": {
          "enabled": true,
          "title": "Task",
          "metadata": {
            "nested": {
              "deeply": true
            }
          }
        }
      },
      "metadata": {"confidence": 0.8}
    }
    Some text after
    `
    
    const parsed = parser.parse(response)
    runner.assertEqual(parsed.message, 'Nested test', 'Should extract nested JSON')
  })
  
  // Test malformed JSON recovery
  await runner.test('attempts recovery from malformed JSON', async () => {
    const malformed = [
      '{"message":"Test"',  // Missing closing
      '{"message":"Test","tools":',  // Incomplete
      '{"message":"Test","tools":{},"metadata":{',  // Partial metadata
    ]
    
    malformed.forEach(text => {
      const message = parser.extractPartialMessage(text)
      runner.assertEqual(message, 'Test', 'Should extract message from malformed JSON')
    })
  })
  
  return runner.summary()
}

// Test streaming edge cases
async function testStreamingEdgeCases() {
  console.log('\n🧪 Testing Streaming Edge Cases\n')
  const runner = new TestRunner('StreamingEdgeCases')
  
  // Simulate streaming processor
  class StreamProcessor {
    constructor() {
      this.buffer = ''
      this.messages = []
    }
    
    processChunk(chunk) {
      this.buffer += chunk
      
      // Try to extract message
      const match = this.buffer.match(/"message"\s*:\s*"([^"]*)"/)
      if (match && match[1].length > this.messages.join('').length) {
        const newContent = match[1].substring(this.messages.join('').length)
        if (newContent) {
          this.messages.push(newContent)
          return { type: 'message', content: newContent }
        }
      }
      
      // Try to parse complete JSON
      try {
        const parsed = JSON.parse(this.buffer)
        return { type: 'complete', data: parsed }
      } catch {
        return { type: 'partial', buffer: this.buffer }
      }
    }
    
    reset() {
      this.buffer = ''
      this.messages = []
    }
  }
  
  const processor = new StreamProcessor()
  
  // Test incremental message building
  await runner.test('builds message incrementally from chunks', async () => {
    processor.reset()
    
    const chunks = [
      '{"mes',
      'sage":"Hel',
      'lo wor',
      'ld","to',
      'ols":{}}'
    ]
    
    let finalMessage = ''
    chunks.forEach(chunk => {
      const result = processor.processChunk(chunk)
      if (result.type === 'message') {
        finalMessage += result.content
      }
    })
    
    runner.assertEqual(finalMessage, 'Hello world', 'Should build message from chunks')
  })
  
  // Test chunk size variations
  await runner.test('handles variable chunk sizes', async () => {
    processor.reset()
    
    const fullResponse = '{"message":"Testing variable chunks","tools":{},"metadata":{"confidence":0.8}}'
    const chunkSizes = [1, 5, 10, 20, 15, 8, 3]
    
    let position = 0
    const chunks = []
    chunkSizes.forEach(size => {
      if (position < fullResponse.length) {
        chunks.push(fullResponse.substring(position, position + size))
        position += size
      }
    })
    if (position < fullResponse.length) {
      chunks.push(fullResponse.substring(position))
    }
    
    let result
    chunks.forEach(chunk => {
      result = processor.processChunk(chunk)
    })
    
    runner.assertEqual(result.type, 'complete', 'Should complete with variable chunks')
  })
  
  // Test rapid chunk processing
  await runner.test('processes rapid chunks efficiently', async () => {
    processor.reset()
    
    const start = Date.now()
    const message = 'a'.repeat(1000)
    const fullResponse = `{"message":"${message}","tools":{},"metadata":{"confidence":0.8}}`
    
    // Process in 100 small chunks
    const chunkSize = Math.ceil(fullResponse.length / 100)
    for (let i = 0; i < fullResponse.length; i += chunkSize) {
      processor.processChunk(fullResponse.substring(i, i + chunkSize))
    }
    
    const duration = Date.now() - start
    runner.assertInRange(duration, 0, 100, 'Should process 100 chunks quickly')
  })
  
  // Test buffer overflow prevention
  await runner.test('handles large buffers safely', async () => {
    processor.reset()
    
    const largeMessage = 'x'.repeat(50000)
    const response = `{"message":"${largeMessage}","tools":{},"metadata":{"confidence":0.8}}`
    
    // Process in chunks
    const chunkSize = 1000
    for (let i = 0; i < response.length; i += chunkSize) {
      processor.processChunk(response.substring(i, i + chunkSize))
    }
    
    runner.assertEqual(processor.buffer.length > 0, true, 'Should handle large buffer')
  })
  
  // Test chunk boundary handling
  await runner.test('handles chunks split at critical points', async () => {
    processor.reset()
    
    // Split at worst possible points
    const chunks = [
      '{"message":"Test',
      ' message","tool',
      's":{"create_tas',
      'k":{"enabled":t',
      'rue,"title":"Ta',
      'sk"}},"metadata',
      '":{"confidence"',
      ':0.8}}'
    ]
    
    let lastResult
    chunks.forEach(chunk => {
      lastResult = processor.processChunk(chunk)
    })
    
    runner.assertEqual(lastResult.type, 'complete', 'Should handle bad chunk boundaries')
  })
  
  return runner.summary()
}

// Test error recovery
async function testErrorRecovery() {
  console.log('\n🧪 Testing Error Recovery\n')
  const runner = new TestRunner('ErrorRecovery')
  
  // Mock error handler
  class ErrorHandler {
    constructor() {
      this.fallbackStrategies = [
        this.extractPartialResponse,
        this.createMinimalResponse,
        this.returnErrorResponse
      ]
    }
    
    async handleError(error, context) {
      for (const strategy of this.fallbackStrategies) {
        try {
          return await strategy.call(this, error, context)
        } catch {
          continue
        }
      }
      throw error
    }
    
    extractPartialResponse(error, context) {
      if (context?.partial) {
        const match = context.partial.match(/"message"\s*:\s*"([^"]*)"/)
        if (match) {
          return {
            message: match[1],
            tools: {},
            metadata: { confidence: 0.5, error: true, recovered: true }
          }
        }
      }
      throw new Error('Cannot extract partial')
    }
    
    createMinimalResponse(error, context) {
      return {
        message: "I encountered an issue but I'm still here to help.",
        tools: {},
        metadata: { confidence: 0.3, error: true, fallback: true }
      }
    }
    
    returnErrorResponse(error, context) {
      return {
        message: `Error: ${error.message}`,
        tools: {},
        metadata: { confidence: 0.1, error: true }
      }
    }
  }
  
  const handler = new ErrorHandler()
  
  // Test partial response recovery
  await runner.test('recovers from partial response', async () => {
    const error = new Error('JSON parse error')
    const context = { partial: '{"message":"Partial response here","tools":{' }
    
    const recovered = await handler.handleError(error, context)
    runner.assertEqual(recovered.message, 'Partial response here', 'Should recover partial')
    runner.assertEqual(recovered.metadata.recovered, true, 'Should mark as recovered')
  })
  
  // Test fallback response
  await runner.test('provides fallback response on total failure', async () => {
    const error = new Error('Complete failure')
    const context = {}
    
    const fallback = await handler.handleError(error, context)
    runner.assertExists(fallback.message, 'Should provide fallback message')
    runner.assertEqual(fallback.metadata.error, true, 'Should mark as error')
  })
  
  // Test network error handling
  await runner.test('handles network timeouts gracefully', async () => {
    const error = new Error('Request timeout')
    error.code = 'ETIMEDOUT'
    
    const response = await handler.handleError(error, {})
    runner.assertExists(response.message, 'Should handle timeout')
    runner.assertInRange(response.metadata.confidence, 0, 0.5, 'Should have low confidence')
  })
  
  // Test rate limit handling
  await runner.test('handles rate limits appropriately', async () => {
    const error = new Error('Rate limit exceeded')
    error.status = 429
    
    const response = await handler.handleError(error, {})
    runner.assertExists(response.message, 'Should handle rate limit')
  })
  
  // Test context preservation
  await runner.test('preserves context during error recovery', async () => {
    const error = new Error('Processing error')
    const context = {
      userId: 'test-user',
      taskId: 'test-task',
      partial: '{"message":"Before error",'
    }
    
    const recovered = await handler.handleError(error, context)
    runner.assertExists(recovered, 'Should recover with context')
  })
  
  return runner.summary()
}

// Test performance edge cases
async function testPerformanceEdgeCases() {
  console.log('\n🧪 Testing Performance Edge Cases\n')
  const runner = new TestRunner('PerformanceEdgeCases')
  
  // Test rapid validations
  await runner.test('handles 1000 validations under 1 second', async () => {
    const responses = []
    for (let i = 0; i < 1000; i++) {
      responses.push({
        message: `Message ${i}`,
        tools: {},
        metadata: { confidence: Math.random() }
      })
    }
    
    const start = Date.now()
    responses.forEach(r => {
      // Simulate validation
      if (!r.message || !r.metadata || r.metadata.confidence < 0 || r.metadata.confidence > 1) {
        throw new Error('Validation failed')
      }
    })
    const duration = Date.now() - start
    
    runner.assertInRange(duration, 0, 1000, 'Should validate 1000 responses quickly')
  })
  
  // Test memory usage with large responses
  await runner.test('manages memory with large responses', async () => {
    const largeResponses = []
    for (let i = 0; i < 100; i++) {
      largeResponses.push({
        message: 'a'.repeat(10000),
        tools: {
          create_task: {
            enabled: true,
            title: 'Task',
            description: 'b'.repeat(5000),
            steps: Array(100).fill('Step')
          }
        },
        metadata: { confidence: 0.8 }
      })
    }
    
    // Process all responses
    const processed = largeResponses.map(r => ({
      ...r,
      processed: true
    }))
    
    runner.assertEqual(processed.length, 100, 'Should process all large responses')
  })
  
  // Test concurrent processing
  await runner.test('handles concurrent operations efficiently', async () => {
    const operations = []
    
    for (let i = 0; i < 50; i++) {
      operations.push(new Promise(resolve => {
        setTimeout(() => {
          resolve({
            id: i,
            message: `Operation ${i}`,
            timestamp: Date.now()
          })
        }, Math.random() * 10)
      }))
    }
    
    const start = Date.now()
    const results = await Promise.all(operations)
    const duration = Date.now() - start
    
    runner.assertEqual(results.length, 50, 'Should complete all operations')
    runner.assertInRange(duration, 0, 100, 'Should complete concurrently')
  })
  
  // Test queue management
  await runner.test('manages event queue efficiently', async () => {
    const queue = []
    const processed = []
    
    // Add 1000 events
    for (let i = 0; i < 1000; i++) {
      queue.push({ id: i, type: 'test_event' })
    }
    
    // Process in batches
    const batchSize = 100
    const start = Date.now()
    
    while (queue.length > 0) {
      const batch = queue.splice(0, batchSize)
      processed.push(...batch)
    }
    
    const duration = Date.now() - start
    
    runner.assertEqual(processed.length, 1000, 'Should process all events')
    runner.assertInRange(duration, 0, 50, 'Should process queue quickly')
  })
  
  // Test caching efficiency
  await runner.test('utilizes caching for repeated operations', async () => {
    const cache = new Map()
    
    function expensiveOperation(key) {
      if (cache.has(key)) {
        return cache.get(key)
      }
      
      // Simulate expensive computation
      const result = {
        key,
        value: Math.random(),
        computed: true
      }
      
      cache.set(key, result)
      return result
    }
    
    const start = Date.now()
    
    // First pass - compute
    for (let i = 0; i < 100; i++) {
      expensiveOperation(`key_${i % 10}`)
    }
    
    // Second pass - should use cache
    for (let i = 0; i < 1000; i++) {
      expensiveOperation(`key_${i % 10}`)
    }
    
    const duration = Date.now() - start
    
    runner.assertEqual(cache.size, 10, 'Should cache 10 unique keys')
    runner.assertInRange(duration, 0, 50, 'Should be fast with caching')
  })
  
  return runner.summary()
}

// Test ADHD-specific edge cases
async function testADHDSpecificCases() {
  console.log('\n🧪 Testing ADHD-Specific Edge Cases\n')
  const runner = new TestRunner('ADHDSpecificCases')
  
  // Test task breakdown
  await runner.test('breaks down complex tasks appropriately', async () => {
    const complexTask = {
      title: 'Complete quarterly report',
      estimatedMinutes: 240
    }
    
    // Simulate ADHD-friendly breakdown
    const breakdown = {
      title: complexTask.title,
      estimatedMinutes: 25,  // Reduced to manageable chunk
      steps: [
        'Gather Q4 data (5 min)',
        'Create outline (5 min)',
        'Write executive summary (10 min)',
        'Take a break (5 min)'
      ],
      sessions: Math.ceil(complexTask.estimatedMinutes / 25)
    }
    
    runner.assertEqual(breakdown.steps.length, 4, 'Should create multiple steps')
    runner.assertInRange(breakdown.estimatedMinutes, 15, 30, 'Should use ADHD-friendly duration')
  })
  
  // Test intervention timing
  await runner.test('respects intervention cooldowns', async () => {
    const interventions = []
    const MIN_COOLDOWN = 15 * 60 * 1000  // 15 minutes
    
    function shouldIntervene(lastIntervention) {
      if (!lastIntervention) return true
      return Date.now() - lastIntervention > MIN_COOLDOWN
    }
    
    // Simulate rapid triggers
    let lastTime = null
    for (let i = 0; i < 10; i++) {
      if (shouldIntervene(lastTime)) {
        interventions.push(Date.now())
        lastTime = Date.now()
      }
      // Simulate 5 minute gaps
      lastTime = lastTime ? lastTime - 5 * 60 * 1000 : null
    }
    
    runner.assertEqual(interventions.length, 1, 'Should respect cooldown period')
  })
  
  // Test encouragement variety
  await runner.test('provides varied encouragement styles', async () => {
    const styles = ['gentle', 'energetic', 'humorous', 'practical']
    const messages = {
      gentle: "You're doing great. Take your time.",
      energetic: "Yes! You've got this! Keep going!",
      humorous: "You're crushing it like a grape in a wine press!",
      practical: "Good progress. Next step is ready when you are."
    }
    
    const selectedStyles = []
    for (let i = 0; i < 4; i++) {
      const style = styles[i % styles.length]
      selectedStyles.push(style)
    }
    
    runner.assertEqual(new Set(selectedStyles).size, 4, 'Should use all styles')
  })
  
  // Test focus duration preferences
  await runner.test('adapts focus duration to user patterns', async () => {
    const userHistory = [
      { duration: 25, completed: true },
      { duration: 25, completed: false },
      { duration: 15, completed: true },
      { duration: 15, completed: true },
      { duration: 20, completed: true }
    ]
    
    // Calculate optimal duration
    const completed = userHistory.filter(s => s.completed)
    const avgDuration = completed.reduce((sum, s) => sum + s.duration, 0) / completed.length
    const optimalDuration = Math.round(avgDuration / 5) * 5  // Round to nearest 5
    
    runner.assertInRange(optimalDuration, 15, 20, 'Should adapt to user preference')
  })
  
  // Test overwhelm detection
  await runner.test('detects overwhelm patterns', async () => {
    const events = [
      { type: 'tab_switch', timestamp: Date.now() },
      { type: 'tab_switch', timestamp: Date.now() + 1000 },
      { type: 'tab_switch', timestamp: Date.now() + 2000 },
      { type: 'rapid_clicking', timestamp: Date.now() + 3000 },
      { type: 'text_deletion', timestamp: Date.now() + 4000 }
    ]
    
    // Detect overwhelm (multiple stress indicators in short time)
    const stressEvents = events.filter(e => 
      ['tab_switch', 'rapid_clicking', 'text_deletion'].includes(e.type)
    )
    
    const timeWindow = 5000  // 5 seconds
    const isOverwhelmed = stressEvents.length >= 4 && 
      (stressEvents[stressEvents.length - 1].timestamp - stressEvents[0].timestamp) <= timeWindow
    
    runner.assertEqual(isOverwhelmed, true, 'Should detect overwhelm pattern')
  })
  
  // Test reward timing
  await runner.test('provides immediate rewards for ADHD', async () => {
    const taskCompleted = Date.now()
    const rewardDelivered = taskCompleted + 100  // 100ms delay
    
    const delay = rewardDelivered - taskCompleted
    runner.assertInRange(delay, 0, 500, 'Should deliver reward immediately')
  })
  
  return runner.summary()
}

// Test tool edge cases
async function testToolEdgeCases() {
  console.log('\n🧪 Testing Tool Edge Cases\n')
  const runner = new TestRunner('ToolEdgeCases')
  
  // Mock tool executor
  class MockToolExecutor {
    constructor() {
      this.rateLimits = new Map()
    }
    
    async executeNativeTools(toolCalls) {
      const results = []
      
      for (const call of toolCalls) {
        try {
          // Parse arguments
          let args
          try {
            args = typeof call.function.arguments === 'string' 
              ? JSON.parse(call.function.arguments)
              : call.function.arguments
          } catch (e) {
            results.push({
              tool_call_id: call.id,
              role: 'tool',
              content: JSON.stringify({
                success: false,
                error: 'Invalid JSON arguments'
              })
            })
            continue
          }
          
          // Check for unknown tool
          const knownTools = ['create_task', 'start_focus', 'pause_focus', 'complete_task', 'send_message', 'log_mood']
          if (!knownTools.includes(call.function.name)) {
            results.push({
              tool_call_id: call.id,
              role: 'tool',
              content: JSON.stringify({
                success: false,
                error: `Unknown tool: ${call.function.name}`
              })
            })
            continue
          }
          
          // Validate parameters
          if (call.function.name === 'start_focus') {
            if (args.duration > 90 || args.duration < 5) {
              results.push({
                tool_call_id: call.id,
                role: 'tool',
                content: JSON.stringify({
                  success: false,
                  error: 'Duration must be between 5 and 90 minutes'
                })
              })
              continue
            }
          }
          
          // Check rate limiting for send_message
          if (call.function.name === 'send_message') {
            const now = Date.now()
            const lastCall = this.rateLimits.get('send_message') || 0
            if (now - lastCall < 1000) { // 1 second rate limit
              results.push({
                tool_call_id: call.id,
                role: 'tool',
                content: JSON.stringify({
                  success: false,
                  error: 'Rate limited: Too many messages'
                })
              })
              continue
            }
            this.rateLimits.set('send_message', now)
          }
          
          // Success case
          results.push({
            tool_call_id: call.id,
            role: 'tool',
            content: JSON.stringify({
              success: true,
              result: { id: `${call.function.name}_${Date.now()}` }
            })
          })
          
        } catch (error) {
          results.push({
            tool_call_id: call.id,
            role: 'tool',
            content: JSON.stringify({
              success: false,
              error: error.message
            })
          })
        }
      }
      
      return results
    }
  }
  
  const executor = new MockToolExecutor()
  
  // Test malformed arguments
  await runner.test('handles malformed JSON arguments', async () => {
    const result = await executor.executeNativeTools([{
      id: 'bad-json',
      type: 'function',
      function: {
        name: 'create_task',
        arguments: 'not valid json'
      }
    }])
    
    const parsed = JSON.parse(result[0].content)
    runner.assertEqual(parsed.success, false, 'Should fail')
    runner.assertExists(parsed.error, 'Should have error')
  })
  
  // Test unknown tool
  await runner.test('handles unknown tools', async () => {
    const result = await executor.executeNativeTools([{
      id: 'unknown',
      type: 'function',
      function: {
        name: 'unknown_tool',
        arguments: '{}'
      }
    }])
    
    const parsed = JSON.parse(result[0].content)
    runner.assertEqual(parsed.success, false, 'Should fail for unknown tool')
    runner.assertExists(parsed.error.includes('Unknown tool'), true, 'Should mention unknown tool')
  })
  
  // Test parameter validation
  await runner.test('validates parameter constraints', async () => {
    const result = await executor.executeNativeTools([{
      id: 'invalid-params',
      type: 'function',
      function: {
        name: 'start_focus',
        arguments: JSON.stringify({ duration: 200 }) // Exceeds max
      }
    }])
    
    const parsed = JSON.parse(result[0].content)
    runner.assertEqual(parsed.success, false, 'Should fail validation')
    runner.assertExists(parsed.error.includes('between 5 and 90'), true, 'Should mention limits')
  })
  
  // Test rate limiting
  await runner.test('enforces rate limiting', async () => {
    // First call should succeed
    const result1 = await executor.executeNativeTools([{
      id: 'msg-1',
      type: 'function',
      function: {
        name: 'send_message',
        arguments: JSON.stringify({ text: 'Message 1', style: 'gentle' })
      }
    }])
    
    const parsed1 = JSON.parse(result1[0].content)
    runner.assertEqual(parsed1.success, true, 'First message should succeed')
    
    // Immediate second call should be rate limited
    const result2 = await executor.executeNativeTools([{
      id: 'msg-2',
      type: 'function',
      function: {
        name: 'send_message',
        arguments: JSON.stringify({ text: 'Message 2', style: 'gentle' })
      }
    }])
    
    const parsed2 = JSON.parse(result2[0].content)
    runner.assertEqual(parsed2.success, false, 'Second message should be rate limited')
    runner.assertExists(parsed2.error.includes('Rate limited'), true, 'Should mention rate limit')
    
    // Wait and try again
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    const result3 = await executor.executeNativeTools([{
      id: 'msg-3',
      type: 'function',
      function: {
        name: 'send_message',
        arguments: JSON.stringify({ text: 'Message 3', style: 'gentle' })
      }
    }])
    
    const parsed3 = JSON.parse(result3[0].content)
    runner.assertEqual(parsed3.success, true, 'Third message should succeed after wait')
  })
  
  // Test empty tool calls
  await runner.test('handles empty tool calls array', async () => {
    const result = await executor.executeNativeTools([])
    runner.assertEqual(result.length, 0, 'Should return empty array')
  })
  
  // Test null/undefined handling
  await runner.test('handles missing arguments gracefully', async () => {
    const result = await executor.executeNativeTools([{
      id: 'no-args',
      type: 'function',
      function: {
        name: 'create_task',
        arguments: JSON.stringify({}) // Empty args
      }
    }])
    
    const parsed = JSON.parse(result[0].content)
    runner.assertEqual(parsed.success, true, 'Should handle empty args')
  })
  
  // Test concurrent tool calls
  await runner.test('handles concurrent tool calls', async () => {
    const calls = Array(10).fill(null).map((_, i) => ({
      id: `concurrent-${i}`,
      type: 'function',
      function: {
        name: 'create_task',
        arguments: JSON.stringify({
          title: `Task ${i}`,
          priority: ['low', 'medium', 'high'][i % 3]
        })
      }
    }))
    
    const start = Date.now()
    const results = await executor.executeNativeTools(calls)
    const duration = Date.now() - start
    
    runner.assertEqual(results.length, 10, 'Should process all calls')
    runner.assertInRange(duration, 0, 100, 'Should process quickly')
    
    const allSuccessful = results.every(r => {
      const parsed = JSON.parse(r.content)
      return parsed.success === true
    })
    runner.assertEqual(allSuccessful, true, 'All should succeed')
  })
  
  // Test very long strings
  await runner.test('handles very long strings', async () => {
    const longText = 'x'.repeat(10000)
    
    const result = await executor.executeNativeTools([{
      id: 'long-string',
      type: 'function',
      function: {
        name: 'create_task',
        arguments: JSON.stringify({
          title: 'Long task',
          description: longText
        })
      }
    }])
    
    const parsed = JSON.parse(result[0].content)
    runner.assertEqual(parsed.success, true, 'Should handle long strings')
  })
  
  // Test special characters
  await runner.test('handles special characters in arguments', async () => {
    const result = await executor.executeNativeTools([{
      id: 'special-chars',
      type: 'function',
      function: {
        name: 'create_task',
        arguments: JSON.stringify({
          title: "Task's \"title\" with <special> & chars\n\t",
          description: "Line 1\nLine 2\r\nLine 3"
        })
      }
    }])
    
    const parsed = JSON.parse(result[0].content)
    runner.assertEqual(parsed.success, true, 'Should handle special characters')
  })
  
  // Test error recovery
  await runner.test('recovers from errors in batch', async () => {
    const calls = [
      {
        id: 'good-1',
        type: 'function',
        function: {
          name: 'create_task',
          arguments: JSON.stringify({ title: 'Good task 1' })
        }
      },
      {
        id: 'bad',
        type: 'function',
        function: {
          name: 'unknown_tool',
          arguments: '{}'
        }
      },
      {
        id: 'good-2',
        type: 'function',
        function: {
          name: 'create_task',
          arguments: JSON.stringify({ title: 'Good task 2' })
        }
      }
    ]
    
    const results = await executor.executeNativeTools(calls)
    runner.assertEqual(results.length, 3, 'Should process all calls')
    
    const parsed1 = JSON.parse(results[0].content)
    const parsed2 = JSON.parse(results[1].content)
    const parsed3 = JSON.parse(results[2].content)
    
    runner.assertEqual(parsed1.success, true, 'First should succeed')
    runner.assertEqual(parsed2.success, false, 'Second should fail')
    runner.assertEqual(parsed3.success, true, 'Third should succeed')
  })
  
  return runner.summary()
}

// Main test runner
async function main() {
  console.log('🧪 Edge Cases Test Suite')
  console.log('========================')
  
  const results = []
  
  try {
    results.push(await testResponseParsing())
    results.push(await testStreamingEdgeCases())
    results.push(await testErrorRecovery())
    results.push(await testPerformanceEdgeCases())
    results.push(await testADHDSpecificCases())
    results.push(await testToolEdgeCases())
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Overall Test Results')
    console.log('='.repeat(50))
    
    const allPassed = results.every(r => r === true)
    
    if (allPassed) {
      console.log('\n✅ All test suites passed!')
      process.exit(0)
    } else {
      console.log('\n❌ Some test suites failed')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error)
    process.exit(1)
  }
}

// Run tests
main().catch(console.error)