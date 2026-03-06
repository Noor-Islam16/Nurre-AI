#!/usr/bin/env node

/**
 * Test script for Task 110: Update Store Methods for Tool Execution
 * Tests the new tool-friendly store methods
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Import StoreBridge for server-side testing
import { StoreBridge } from '../lib/ai/store-bridge.js'

async function getTestUser() {
  // Get or create test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
  
  if (users?.length) {
    return users[0].id
  }
  
  // Create test user if none exists
  const testUserId = 'test-user-' + Date.now()
  await supabase.from('profiles').insert({
    id: testUserId,
    email: `test-${Date.now()}@example.com`,
    full_name: 'Test User',
    adhd_persona: 'explorer'
  })
  
  return testUserId
}

async function testTaskMethods(bridge) {
  console.log('\n📝 Testing Task Store Methods...')
  
  // Test createTaskFromTool
  console.log('  Testing createTaskFromTool...')
  const createResult = await bridge.createTaskFromTool({
    title: 'Test Task ' + Date.now(),
    description: 'Created via tool-friendly method',
    priority: 'high',
    timeEstimate: 30,
    subtasks: ['Step 1', 'Step 2', 'Step 3']
  })
  
  if (!createResult.success) {
    console.error('    ❌ Failed to create task:', createResult.error)
    return false
  }
  
  console.log('    ✅ Task created:', createResult.taskId)
  
  // Test completeTaskFromTool
  console.log('  Testing completeTaskFromTool...')
  const completeResult = await bridge.completeTaskFromTool(
    createResult.taskId,
    'Completed via test'
  )
  
  if (!completeResult.success) {
    console.error('    ❌ Failed to complete task:', completeResult.error)
    return false
  }
  
  console.log('    ✅ Task completed')
  
  // Verify in database
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', createResult.taskId)
    .single()
  
  if (!task || !task.completed) {
    console.error('    ❌ Task not properly marked as completed in database')
    return false
  }
  
  console.log('    ✅ Database verified')
  return true
}

async function testFocusMethods(bridge) {
  console.log('\n⏱️ Testing Focus Store Methods...')
  
  // Test startFocusFromTool
  console.log('  Testing startFocusFromTool...')
  const startResult = await bridge.startFocusFromTool({
    duration: 25,
    backgroundNoise: 'rain'
  })
  
  if (!startResult.success) {
    console.error('    ❌ Failed to start focus:', startResult.error)
    return false
  }
  
  console.log('    ✅ Focus session started:', startResult.sessionId)
  
  // Test pauseFocusFromTool
  console.log('  Testing pauseFocusFromTool...')
  await new Promise(resolve => setTimeout(resolve, 1000)) // Wait a bit
  
  const pauseResult = await bridge.pauseFocusFromTool('Testing pause')
  
  if (!pauseResult.success) {
    console.error('    ❌ Failed to pause focus:', pauseResult.error)
    return false
  }
  
  console.log('    ✅ Focus paused')
  
  // Test endFocusFromTool
  console.log('  Testing endFocusFromTool...')
  const endResult = await bridge.endFocusFromTool(true)
  
  if (!endResult.success) {
    console.error('    ❌ Failed to end focus:', endResult.error)
    return false
  }
  
  console.log('    ✅ Focus ended, duration:', endResult.actualDuration, 'minutes')
  
  // Verify in database
  const { data: session } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', startResult.sessionId)
    .single()
  
  if (!session || !session.ended_at) {
    console.error('    ❌ Session not properly ended in database')
    return false
  }
  
  console.log('    ✅ Database verified')
  return true
}

async function testMoodMethods(bridge) {
  console.log('\n😊 Testing Mood Store Methods...')
  
  // Test logMoodFromTool
  console.log('  Testing logMoodFromTool...')
  const moodResult = await bridge.logMoodFromTool({
    mood: 75,
    energy: 60,
    focus: 80,
    anxiety: 30,
    motivation: 70,
    notes: 'Feeling productive after testing'
  })
  
  if (!moodResult.success) {
    console.error('    ❌ Failed to log mood:', moodResult.error)
    return false
  }
  
  console.log('    ✅ Mood logged:', moodResult.entryId)
  
  // Verify in database
  const { data: mood } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('id', moodResult.entryId)
    .single()
  
  if (!mood || !mood.mood_values) {
    console.error('    ❌ Mood not properly saved in database')
    return false
  }
  
  console.log('    ✅ Database verified')
  console.log('    Mood values:', mood.mood_values)
  return true
}

async function testRewardMethods(bridge) {
  console.log('\n🎉 Testing Reward Store Methods...')
  
  // Test grantRewardFromTool with points
  console.log('  Testing grantRewardFromTool (points)...')
  const pointsResult = await bridge.grantRewardFromTool({
    type: 'points',
    value: 50,
    reason: 'Test completion reward'
  })
  
  if (!pointsResult.success) {
    console.error('    ❌ Failed to grant points:', pointsResult.error)
    return false
  }
  
  console.log('    ✅ Points granted')
  
  // Test grantRewardFromTool with streak
  console.log('  Testing grantRewardFromTool (streak)...')
  const streakResult = await bridge.grantRewardFromTool({
    type: 'streak',
    value: 1,
    reason: 'Daily check-in'
  })
  
  if (!streakResult.success) {
    console.error('    ❌ Failed to update streak:', streakResult.error)
    return false
  }
  
  console.log('    ✅ Streak updated')
  
  return true
}

async function cleanup(userId) {
  console.log('\n🧹 Cleaning up test data...')
  
  // Clean up test data
  await supabase.from('tasks').delete().eq('user_id', userId)
  await supabase.from('focus_sessions').delete().eq('user_id', userId)
  await supabase.from('mood_entries').delete().eq('user_id', userId)
  await supabase.from('user_events').delete().eq('user_id', userId)
  
  console.log('  ✅ Test data cleaned')
}

async function main() {
  console.log('🚀 Testing Store Methods for Tool Execution')
  console.log('=' .repeat(50))
  
  try {
    const userId = await getTestUser()
    console.log('Using test user:', userId)
    
    // Create StoreBridge instance
    const bridge = new StoreBridge(userId, supabase)
    
    // Run tests
    const taskSuccess = await testTaskMethods(bridge)
    const focusSuccess = await testFocusMethods(bridge)
    const moodSuccess = await testMoodMethods(bridge)
    const rewardSuccess = await testRewardMethods(bridge)
    
    // Clean up
    await cleanup(userId)
    
    // Summary
    console.log('\n' + '=' .repeat(50))
    console.log('📊 Test Results:')
    console.log(`  Tasks: ${taskSuccess ? '✅' : '❌'}`)
    console.log(`  Focus: ${focusSuccess ? '✅' : '❌'}`)
    console.log(`  Mood: ${moodSuccess ? '✅' : '❌'}`)
    console.log(`  Rewards: ${rewardSuccess ? '✅' : '❌'}`)
    
    const allPassed = taskSuccess && focusSuccess && moodSuccess && rewardSuccess
    
    if (allPassed) {
      console.log('\n✅ All store method tests passed!')
      process.exit(0)
    } else {
      console.log('\n❌ Some tests failed')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error)
    process.exit(1)
  }
}

main()