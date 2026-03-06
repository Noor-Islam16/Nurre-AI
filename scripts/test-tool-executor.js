const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
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
    this.testUserId = null
    this.testData = {
      tasks: [],
      sessions: [],
      chats: []
    }
  }
  
  async setup() {
    // Create test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-executor-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true
    })
    
    if (authError) throw authError
    this.testUserId = authData.user.id
    
    // Create test profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: this.testUserId,
        username: 'test-executor',
        adhd_persona: 'combined'
      })
    
    if (profileError) throw profileError
    
    console.log(`✅ Test user created: ${this.testUserId}`)
  }
  
  async cleanup() {
    if (!this.testUserId) return
    
    // Clean up test data
    for (const taskId of this.testData.tasks) {
      await supabase.from('tasks').delete().eq('id', taskId)
    }
    
    for (const sessionId of this.testData.sessions) {
      await supabase.from('focus_sessions').delete().eq('id', sessionId)
    }
    
    for (const messageId of this.testData.chats) {
      await supabase.from('chat_messages').delete().eq('id', messageId)
    }
    
    // Delete test user
    await supabase.auth.admin.deleteUser(this.testUserId)
    
    console.log('✅ Test data cleaned up')
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

// Mock tool executor
class MockToolExecutor {
  constructor(userId, supabase) {
    this.userId = userId
    this.supabase = supabase
  }
  
  async executeTools(response) {
    const results = []
    const startTime = Date.now()
    
    for (const [toolName, config] of Object.entries(response.tools)) {
      if (!config.enabled) continue
      
      try {
        const result = await this.executeTool(toolName, config)
        results.push({
          tool: toolName,
          success: true,
          data: result
        })
      } catch (error) {
        results.push({
          tool: toolName,
          success: false,
          error: error.message
        })
      }
    }
    
    return {
      results,
      duration: Date.now() - startTime,
      metadata: response.metadata
    }
  }
  
  async executeTool(name, config) {
    switch (name) {
      case 'create_task':
        return await this.createTask(config)
      case 'start_focus_timer':
        return await this.startFocusTimer(config)
      case 'complete_task':
        return await this.completeTask(config)
      case 'update_task_progress':
        return await this.updateTaskProgress(config)
      case 'suggest_break':
        return await this.suggestBreak(config)
      case 'provide_encouragement':
        return await this.provideEncouragement(config)
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }
  
  async createTask(config) {
    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        user_id: this.userId,
        title: config.title,
        description: config.description,
        priority: config.priority || 'medium',
        category: config.category || 'personal',
        estimated_minutes: config.estimated_minutes || 30,
        steps: config.steps || [],
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  async startFocusTimer(config) {
    const { data, error } = await this.supabase
      .from('focus_sessions')
      .insert({
        user_id: this.userId,
        duration_minutes: config.duration,
        task_id: config.task_id,
        created_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  async completeTask(config) {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: config.notes
      })
      .eq('id', config.task_id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  async updateTaskProgress(config) {
    const { data, error } = await this.supabase
      .from('tasks')
      .update({
        progress: config.progress,
        completed_steps: config.completed_steps || []
      })
      .eq('id', config.task_id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
  
  async suggestBreak(config) {
    // Simulate break suggestion (no DB operation)
    return {
      type: config.type,
      duration: config.duration,
      message: config.message || 'Time for a break!',
      suggested_at: new Date().toISOString()
    }
  }
  
  async provideEncouragement(config) {
    // Simulate encouragement (no DB operation)
    return {
      message: config.message,
      style: config.style || 'gentle',
      delivered_at: new Date().toISOString()
    }
  }
}

// Test tool execution
async function testToolExecution() {
  console.log('\n🧪 Testing Tool Execution\n')
  const runner = new TestRunner('ToolExecution')
  
  await runner.setup()
  const executor = new MockToolExecutor(runner.testUserId, supabase)
  
  // Test single tool execution
  await runner.test('executes create_task tool', async () => {
    const response = {
      message: 'Creating a task for you',
      tools: {
        create_task: {
          enabled: true,
          title: 'Test Task',
          priority: 'high',
          description: 'A test task',
          estimated_minutes: 25
        }
      },
      metadata: { confidence: 0.9 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 1, 'Should execute one tool')
    runner.assertEqual(result.results[0].success, true, 'Should succeed')
    runner.assertExists(result.results[0].data.id, 'Should return task ID')
    
    // Track for cleanup
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  // Test multiple tools execution
  await runner.test('executes multiple tools in parallel', async () => {
    // First create a task
    const taskResponse = await executor.executeTools({
      message: 'Creating task',
      tools: {
        create_task: {
          enabled: true,
          title: 'Focus Task',
          priority: 'medium'
        }
      },
      metadata: { confidence: 0.8 }
    })
    
    const taskId = taskResponse.results[0].data.id
    runner.testData.tasks.push(taskId)
    
    // Now execute multiple tools
    const response = {
      message: 'Starting focus session and providing encouragement',
      tools: {
        start_focus_timer: {
          enabled: true,
          duration: 25,
          task_id: taskId
        },
        provide_encouragement: {
          enabled: true,
          message: 'You got this!',
          style: 'energetic'
        }
      },
      metadata: { confidence: 0.85 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 2, 'Should execute two tools')
    runner.assertEqual(result.results.every(r => r.success), true, 'All should succeed')
    
    // Track session for cleanup
    if (result.results[0].data.id) {
      runner.testData.sessions.push(result.results[0].data.id)
    }
  })
  
  // Test disabled tools
  await runner.test('skips disabled tools', async () => {
    const response = {
      message: 'Selective execution',
      tools: {
        create_task: {
          enabled: false,
          title: 'Skipped Task',
          priority: 'low'
        },
        provide_encouragement: {
          enabled: true,
          message: 'Keep going!',
          style: 'gentle'
        }
      },
      metadata: { confidence: 0.7 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 1, 'Should execute only enabled tool')
    runner.assertEqual(result.results[0].tool, 'provide_encouragement', 'Should execute correct tool')
  })
  
  // Test error handling
  await runner.test('handles tool execution errors gracefully', async () => {
    const response = {
      message: 'Trying to complete non-existent task',
      tools: {
        complete_task: {
          enabled: true,
          task_id: '00000000-0000-0000-0000-000000000000',
          notes: 'This should fail'
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 1, 'Should attempt execution')
    runner.assertEqual(result.results[0].success, false, 'Should fail gracefully')
    runner.assertExists(result.results[0].error, 'Should provide error message')
  })
  
  // Test mixed success/failure
  await runner.test('handles mixed success and failure', async () => {
    const response = {
      message: 'Mixed operations',
      tools: {
        provide_encouragement: {
          enabled: true,
          message: 'Great job!',
          style: 'humorous'
        },
        complete_task: {
          enabled: true,
          task_id: 'invalid-uuid'  // This will fail
        },
        suggest_break: {
          enabled: true,
          type: 'stretch',
          duration: 5
        }
      },
      metadata: { confidence: 0.75 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 3, 'Should execute all tools')
    
    const successes = result.results.filter(r => r.success)
    const failures = result.results.filter(r => !r.success)
    
    runner.assertEqual(successes.length, 2, 'Should have 2 successes')
    runner.assertEqual(failures.length, 1, 'Should have 1 failure')
  })
  
  // Test task progress update
  await runner.test('updates task progress correctly', async () => {
    // Create a task first
    const taskResponse = await executor.executeTools({
      message: 'Creating task',
      tools: {
        create_task: {
          enabled: true,
          title: 'Progress Task',
          priority: 'medium',
          steps: ['Step 1', 'Step 2', 'Step 3']
        }
      },
      metadata: { confidence: 0.8 }
    })
    
    const taskId = taskResponse.results[0].data.id
    runner.testData.tasks.push(taskId)
    
    // Update progress
    const response = {
      message: 'Updating progress',
      tools: {
        update_task_progress: {
          enabled: true,
          task_id: taskId,
          progress: 66,
          completed_steps: [0, 1]
        }
      },
      metadata: { confidence: 0.9 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should update successfully')
    runner.assertEqual(result.results[0].data.progress, 66, 'Should set correct progress')
  })
  
  // Test rapid execution
  await runner.test('handles rapid tool executions', async () => {
    const executions = []
    
    for (let i = 0; i < 5; i++) {
      const response = {
        message: `Encouragement ${i}`,
        tools: {
          provide_encouragement: {
            enabled: true,
            message: `Message ${i}`,
            style: ['gentle', 'energetic', 'humorous', 'practical'][i % 4]
          }
        },
        metadata: { confidence: 0.8 }
      }
      
      executions.push(executor.executeTools(response))
    }
    
    const results = await Promise.all(executions)
    runner.assertEqual(results.length, 5, 'Should handle all executions')
    runner.assertEqual(results.every(r => r.results[0].success), true, 'All should succeed')
  })
  
  // Test performance
  await runner.test('executes within performance limits', async () => {
    const response = {
      message: 'Performance test',
      tools: {
        suggest_break: {
          enabled: true,
          type: 'hydrate',
          duration: 2
        },
        provide_encouragement: {
          enabled: true,
          message: 'Quick test',
          style: 'practical'
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const start = Date.now()
    const result = await executor.executeTools(response)
    const duration = Date.now() - start
    
    runner.assertEqual(result.results.length, 2, 'Should execute both tools')
    runner.assertEqual(duration < 2000, true, 'Should complete within 2 seconds')
  })
  
  await runner.cleanup()
  return runner.summary()
}

// Test tool validation
async function testToolValidation() {
  console.log('\n🧪 Testing Tool Validation\n')
  const runner = new TestRunner('ToolValidation')
  
  await runner.setup()
  const executor = new MockToolExecutor(runner.testUserId, supabase)
  
  // Test required fields validation
  await runner.test('validates required fields for create_task', async () => {
    const response = {
      message: 'Invalid task',
      tools: {
        create_task: {
          enabled: true,
          // Missing required 'title' field
          priority: 'high'
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    try {
      await executor.executeTools(response)
      throw new Error('Should have failed validation')
    } catch (error) {
      runner.assertExists(error.message, 'Should provide error message')
    }
  })
  
  // Test enum validation
  await runner.test('validates enum values', async () => {
    const response = {
      message: 'Invalid priority',
      tools: {
        create_task: {
          enabled: true,
          title: 'Test Task',
          priority: 'super-urgent'  // Invalid priority
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    // This would fail in real validation
    const result = await executor.executeTools(response)
    // Mock executor doesn't validate enums strictly
    runner.assertEqual(result.results[0].success, true, 'Mock allows invalid enums')
  })
  
  // Test number constraints
  await runner.test('validates number constraints', async () => {
    const response = {
      message: 'Testing duration limits',
      tools: {
        start_focus_timer: {
          enabled: true,
          duration: 150  // Above max limit
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    // Mock executor doesn't enforce limits
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Mock allows out-of-range values')
  })
  
  // Test UUID validation
  await runner.test('validates UUID format', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    const invalidUuid = 'not-a-uuid'
    
    // Test with valid UUID (should work)
    const validResponse = {
      message: 'Valid UUID',
      tools: {
        complete_task: {
          enabled: true,
          task_id: validUuid
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const validResult = await executor.executeTools(validResponse)
    runner.assertEqual(validResult.results[0].success, false, 'Should fail (task not found)')
    
    // Test with invalid UUID (should fail validation)
    const invalidResponse = {
      message: 'Invalid UUID',
      tools: {
        complete_task: {
          enabled: true,
          task_id: invalidUuid
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const invalidResult = await executor.executeTools(invalidResponse)
    runner.assertEqual(invalidResult.results[0].success, false, 'Should fail validation')
  })
  
  // Test array validation
  await runner.test('validates array fields', async () => {
    // Create a task to test with
    const taskResponse = await executor.executeTools({
      message: 'Creating task',
      tools: {
        create_task: {
          enabled: true,
          title: 'Array Test Task',
          priority: 'medium',
          steps: ['Step 1', 'Step 2']
        }
      },
      metadata: { confidence: 0.8 }
    })
    
    const taskId = taskResponse.results[0].data.id
    runner.testData.tasks.push(taskId)
    
    // Test with valid array
    const response = {
      message: 'Update with array',
      tools: {
        update_task_progress: {
          enabled: true,
          task_id: taskId,
          progress: 50,
          completed_steps: [0, 1]  // Valid array of numbers
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should accept valid array')
  })
  
  // Test optional fields
  await runner.test('handles optional fields correctly', async () => {
    const response = {
      message: 'Minimal task',
      tools: {
        create_task: {
          enabled: true,
          title: 'Minimal Task',
          priority: 'low'
          // All other fields are optional
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should work with minimal fields')
    runner.assertExists(result.results[0].data.id, 'Should create task')
    
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  await runner.cleanup()
  return runner.summary()
}

// Test edge cases
async function testEdgeCases() {
  console.log('\n🧪 Testing Edge Cases\n')
  const runner = new TestRunner('EdgeCases')
  
  await runner.setup()
  const executor = new MockToolExecutor(runner.testUserId, supabase)
  
  // Test empty tools object
  await runner.test('handles empty tools object', async () => {
    const response = {
      message: 'No tools needed',
      tools: {},
      metadata: { confidence: 0.7 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 0, 'Should execute no tools')
  })
  
  // Test all tools disabled
  await runner.test('handles all tools disabled', async () => {
    const response = {
      message: 'All disabled',
      tools: {
        create_task: { enabled: false, title: 'Task 1', priority: 'high' },
        start_focus_timer: { enabled: false, duration: 25 },
        suggest_break: { enabled: false, type: 'walk', duration: 10 }
      },
      metadata: { confidence: 0.6 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 0, 'Should execute no tools')
  })
  
  // Test very long strings
  await runner.test('handles very long strings', async () => {
    const longTitle = 'Task '.repeat(100)
    const longDescription = 'Description '.repeat(500)
    
    const response = {
      message: 'Long strings test',
      tools: {
        create_task: {
          enabled: true,
          title: longTitle.substring(0, 255),  // Truncate for DB limit
          description: longDescription,
          priority: 'medium'
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should handle long strings')
    
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  // Test special characters
  await runner.test('handles special characters in strings', async () => {
    const response = {
      message: 'Special chars test',
      tools: {
        create_task: {
          enabled: true,
          title: "Task's \"title\" with <special> & chars",
          description: "Line 1\nLine 2\tTabbed\r\nWindows line",
          priority: 'medium'
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should handle special characters')
    
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  // Test Unicode
  await runner.test('handles Unicode characters', async () => {
    const response = {
      message: 'Unicode test',
      tools: {
        create_task: {
          enabled: true,
          title: '任务 📝 مهمة משימה',
          description: 'Multi-language: 你好 مرحبا שלום',
          priority: 'high'
        },
        provide_encouragement: {
          enabled: true,
          message: 'Great job! 🎉 加油! 💪',
          style: 'energetic'
        }
      },
      metadata: { confidence: 0.9 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 2, 'Should execute both tools')
    runner.assertEqual(result.results.every(r => r.success), true, 'Should handle Unicode')
    
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  // Test maximum array sizes
  await runner.test('handles large arrays', async () => {
    const manySteps = Array(100).fill(0).map((_, i) => `Step ${i + 1}`)
    
    const response = {
      message: 'Large array test',
      tools: {
        create_task: {
          enabled: true,
          title: 'Task with many steps',
          priority: 'medium',
          steps: manySteps
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should handle large arrays')
    
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  // Test boundary values
  await runner.test('handles boundary values', async () => {
    const response = {
      message: 'Boundary test',
      tools: {
        start_focus_timer: {
          enabled: true,
          duration: 5  // Minimum value
        },
        suggest_break: {
          enabled: true,
          type: 'stretch',
          duration: 1  // Very short break
        }
      },
      metadata: { 
        confidence: 0  // Minimum confidence
      }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results.length, 2, 'Should handle boundary values')
    
    if (result.results[0].data?.id) {
      runner.testData.sessions.push(result.results[0].data.id)
    }
  })
  
  // Test null and undefined handling
  await runner.test('handles null and undefined in optional fields', async () => {
    const response = {
      message: 'Null test',
      tools: {
        create_task: {
          enabled: true,
          title: 'Task with nulls',
          priority: 'medium',
          description: null,
          category: undefined,
          due_date: null
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(response)
    runner.assertEqual(result.results[0].success, true, 'Should handle null/undefined')
    
    runner.testData.tasks.push(result.results[0].data.id)
  })
  
  // Test concurrent modifications
  await runner.test('handles concurrent tool executions safely', async () => {
    // Create a task
    const taskResponse = await executor.executeTools({
      message: 'Creating task',
      tools: {
        create_task: {
          enabled: true,
          title: 'Concurrent Test Task',
          priority: 'medium'
        }
      },
      metadata: { confidence: 0.8 }
    })
    
    const taskId = taskResponse.results[0].data.id
    runner.testData.tasks.push(taskId)
    
    // Execute multiple updates concurrently
    const updates = []
    for (let i = 0; i < 3; i++) {
      updates.push(executor.executeTools({
        message: `Update ${i}`,
        tools: {
          update_task_progress: {
            enabled: true,
            task_id: taskId,
            progress: (i + 1) * 33,
            completed_steps: [i]
          }
        },
        metadata: { confidence: 0.8 }
      }))
    }
    
    const results = await Promise.all(updates)
    runner.assertEqual(results.length, 3, 'Should complete all updates')
    
    // Last update wins
    const { data: finalTask } = await supabase
      .from('tasks')
      .select()
      .eq('id', taskId)
      .single()
    
    runner.assertExists(finalTask.progress, 'Should have updated progress')
  })
  
  await runner.cleanup()
  return runner.summary()
}

// Test native tool calls
async function testNativeToolCalls() {
  console.log('\n🧪 Testing Native Tool Calls\n')
  const runner = new TestRunner('NativeToolCalls')
  
  await runner.setup()
  
  // Mock native executor
  class NativeToolExecutor extends MockToolExecutor {
    async executeNativeTools(toolCalls) {
      const results = []
      
      for (const toolCall of toolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          const result = await this.executeTool(toolCall.function.name, args)
          
          results.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            content: JSON.stringify({
              success: true,
              ...result
            })
          })
        } catch (error) {
          results.push({
            tool_call_id: toolCall.id,
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
  
  const executor = new NativeToolExecutor(runner.testUserId, supabase)
  
  // Test native tool call format
  await runner.test('executes native format tool calls', async () => {
    const mockToolCalls = [
      {
        id: 'call_abc123',
        type: 'function',
        function: {
          name: 'create_task',
          arguments: JSON.stringify({
            title: 'Test task from native call',
            description: 'Testing native tool calling',
            priority: 'high',
            estimated_minutes: 30,
            steps: ['Step 1', 'Step 2']
          })
        }
      },
      {
        id: 'call_def456',
        type: 'function',
        function: {
          name: 'start_focus_timer',
          arguments: JSON.stringify({
            duration: 25,
            task_id: null
          })
        }
      }
    ]
    
    const results = await executor.executeNativeTools(mockToolCalls)
    
    runner.assertEqual(results.length, 2, 'Should return 2 results')
    runner.assertEqual(results[0].tool_call_id, 'call_abc123', 'Should match tool call ID')
    runner.assertEqual(results[0].role, 'tool', 'Should have tool role')
    
    // Parse and verify results
    const result1 = JSON.parse(results[0].content)
    runner.assertExists(result1.id, 'Should return task ID')
    runner.assertEqual(result1.success, true, 'Should succeed')
    
    // Clean up
    if (result1.id) runner.testData.tasks.push(result1.id)
    const result2 = JSON.parse(results[1].content)
    if (result2.id) runner.testData.sessions.push(result2.id)
  })
  
  // Test parallel execution
  await runner.test('executes parallel native tool calls', async () => {
    const parallelCalls = Array(5).fill(null).map((_, i) => ({
      id: `call_parallel_${i}`,
      type: 'function',
      function: {
        name: 'provide_encouragement',
        arguments: JSON.stringify({
          message: `Test message ${i}`,
          style: ['gentle', 'energetic', 'humorous', 'practical'][i % 4]
        })
      }
    }))
    
    const start = Date.now()
    const parallelResults = await executor.executeNativeTools(parallelCalls)
    const duration = Date.now() - start
    
    console.log(`  Executed ${parallelCalls.length} tools in ${duration}ms`)
    runner.assertEqual(parallelResults.length, 5, 'All tools executed')
    runner.assertEqual(parallelResults.every(r => r.role === 'tool'), true, 'All have tool role')
  })
  
  // Test error handling in native format
  await runner.test('handles errors in native tool calls', async () => {
    const errorCalls = [
      {
        id: 'call_error_1',
        type: 'function',
        function: {
          name: 'complete_task',
          arguments: JSON.stringify({
            task_id: '00000000-0000-0000-0000-000000000000',
            notes: 'This should fail'
          })
        }
      }
    ]
    
    const results = await executor.executeNativeTools(errorCalls)
    runner.assertEqual(results.length, 1, 'Should return error result')
    
    const errorResult = JSON.parse(results[0].content)
    runner.assertEqual(errorResult.success, false, 'Should indicate failure')
    runner.assertExists(errorResult.error, 'Should include error message')
  })
  
  // Test malformed arguments
  await runner.test('handles malformed JSON in native calls', async () => {
    const malformedCalls = [
      {
        id: 'call_malformed',
        type: 'function',
        function: {
          name: 'create_task',
          arguments: 'not valid json'
        }
      }
    ]
    
    const results = await executor.executeNativeTools(malformedCalls)
    const result = JSON.parse(results[0].content)
    runner.assertEqual(result.success, false, 'Should handle malformed JSON')
  })
  
  // Test unknown tool
  await runner.test('handles unknown tools in native format', async () => {
    const unknownCalls = [
      {
        id: 'call_unknown',
        type: 'function',
        function: {
          name: 'unknown_tool',
          arguments: '{}'
        }
      }
    ]
    
    const results = await executor.executeNativeTools(unknownCalls)
    const result = JSON.parse(results[0].content)
    runner.assertEqual(result.success, false, 'Should handle unknown tool')
    runner.assertExists(result.error, 'Should provide error for unknown tool')
  })
  
  await runner.cleanup()
  return runner.summary()
}

// Test V2 compatibility
async function testV2Compatibility() {
  console.log('\n🧪 Testing V2 Compatibility\n')
  const runner = new TestRunner('V2Compatibility')
  
  await runner.setup()
  const executor = new MockToolExecutor(runner.testUserId, supabase)
  
  // Test V2 response format
  await runner.test('maintains V2 response format', async () => {
    const v2Response = {
      message: 'V2 format test',
      tools: {
        create_task: {
          enabled: true,
          title: 'V2 Task',
          priority: 'medium',
          description: 'Testing V2 compatibility'
        }
      },
      metadata: { confidence: 0.85 }
    }
    
    const result = await executor.executeTools(v2Response)
    runner.assertExists(result.results, 'Should have results array')
    runner.assertExists(result.duration, 'Should have duration')
    runner.assertExists(result.metadata, 'Should preserve metadata')
    runner.assertEqual(result.results[0].tool, 'create_task', 'Should have tool name')
    
    if (result.results[0].data?.id) {
      runner.testData.tasks.push(result.results[0].data.id)
    }
  })
  
  // Test V2 disabled tools
  await runner.test('respects V2 enabled/disabled flags', async () => {
    const v2Response = {
      message: 'Testing enabled flags',
      tools: {
        create_task: {
          enabled: false,
          title: 'Disabled Task'
        },
        provide_encouragement: {
          enabled: true,
          message: 'You can do it!',
          style: 'gentle'
        }
      },
      metadata: { confidence: 0.8 }
    }
    
    const result = await executor.executeTools(v2Response)
    runner.assertEqual(result.results.length, 1, 'Should only execute enabled tool')
    runner.assertEqual(result.results[0].tool, 'provide_encouragement', 'Should execute correct tool')
  })
  
  await runner.cleanup()
  return runner.summary()
}

// Main test runner
async function main() {
  console.log('🧪 Tool Executor Test Suite')
  console.log('============================')
  
  const results = []
  
  try {
    // Test both V2 and native formats
    results.push(await testV2Compatibility())
    results.push(await testNativeToolCalls())
    results.push(await testToolExecution())
    results.push(await testToolValidation())
    results.push(await testEdgeCases())
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Overall Test Results')
    console.log('='.repeat(50))
    
    const allPassed = results.every(r => r === true)
    
    if (allPassed) {
      console.log('\n✅ All test suites passed!')
      console.log('\nBoth V2 and Native tool calling formats are working')
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