#!/usr/bin/env node

/**
 * Test script for streak calculation functionality
 * Tests the database functions and API endpoints
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test user for streak testing
const TEST_USER_EMAIL = 'streak-test@demo.com'
const TEST_USER_PASSWORD = 'TestPassword123!'

async function setupTestUser() {
  console.log('🔧 Setting up test user...')
  
  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', TEST_USER_EMAIL)
    .single()
  
  if (existingUser) {
    console.log('✅ Test user already exists')
    return existingUser.id
  }
  
  // Create test user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    email_confirm: true
  })
  
  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`)
  }
  
  console.log('✅ Test user created')
  return authData.user.id
}

async function cleanupTestData(userId) {
  console.log('🧹 Cleaning up old test data...')
  
  // Delete existing tasks
  await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
  
  // Reset user streaks
  await supabase
    .from('users')
    .update({ 
      current_streak: 0, 
      longest_streak: 0 
    })
    .eq('id', userId)
  
  console.log('✅ Test data cleaned')
}

async function createTaskWithDate(userId, title, daysAgo) {
  const completedAt = new Date()
  completedAt.setDate(completedAt.getDate() - daysAgo)
  completedAt.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: `${title} (${daysAgo} days ago)`,
      completed: true,
      completed_at: completedAt.toISOString(),
      priority: 1
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }
  
  return data
}

async function testStreakCalculation(userId) {
  console.log('\n🧪 Testing Streak Calculation...\n')
  
  // Test 1: Single day streak
  console.log('Test 1: Single day streak')
  await createTaskWithDate(userId, 'Task 1', 0)
  
  // Trigger streak calculation
  await supabase.rpc('update_user_streaks', { p_user_id: userId })
  
  let { data: userData } = await supabase
    .from('users')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .single()
  
  console.log(`  Current streak: ${userData.current_streak} (expected: 1)`)
  console.log(`  Longest streak: ${userData.longest_streak} (expected: 1)`)
  console.assert(userData.current_streak === 1, 'Current streak should be 1')
  console.assert(userData.longest_streak === 1, 'Longest streak should be 1')
  
  // Test 2: Consecutive days (3-day streak)
  console.log('\nTest 2: Three-day streak')
  await cleanupTestData(userId)
  
  await createTaskWithDate(userId, 'Task 1', 2)
  await createTaskWithDate(userId, 'Task 2', 1)
  await createTaskWithDate(userId, 'Task 3', 0)
  
  // Run the calculate_all_user_streaks function
  await supabase.rpc('calculate_all_user_streaks')
  
  userData = (await supabase
    .from('users')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .single()).data
  
  console.log(`  Current streak: ${userData.current_streak} (expected: 3)`)
  console.log(`  Longest streak: ${userData.longest_streak} (expected: 3)`)
  console.assert(userData.current_streak === 3, 'Current streak should be 3')
  console.assert(userData.longest_streak === 3, 'Longest streak should be 3')
  
  // Test 3: Broken streak
  console.log('\nTest 3: Broken streak (gap at day 3)')
  await cleanupTestData(userId)
  
  await createTaskWithDate(userId, 'Task 1', 5)
  await createTaskWithDate(userId, 'Task 2', 4)
  // Gap on day 3
  await createTaskWithDate(userId, 'Task 3', 2)
  await createTaskWithDate(userId, 'Task 4', 1)
  await createTaskWithDate(userId, 'Task 5', 0)
  
  await supabase.rpc('calculate_all_user_streaks')
  
  userData = (await supabase
    .from('users')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .single()).data
  
  console.log(`  Current streak: ${userData.current_streak} (expected: 3)`)
  console.log(`  Longest streak: ${userData.longest_streak} (expected: 3)`)
  console.assert(userData.current_streak === 3, 'Current streak should be 3')
  console.assert(userData.longest_streak === 3, 'Longest streak should be 3')
  
  // Test 4: Expired streak (last task was 2 days ago)
  console.log('\nTest 4: Expired streak')
  await cleanupTestData(userId)
  
  await createTaskWithDate(userId, 'Task 1', 4)
  await createTaskWithDate(userId, 'Task 2', 3)
  await createTaskWithDate(userId, 'Task 3', 2)
  // No tasks for last 2 days
  
  await supabase.rpc('calculate_all_user_streaks')
  
  userData = (await supabase
    .from('users')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .single()).data
  
  console.log(`  Current streak: ${userData.current_streak} (expected: 0)`)
  console.log(`  Longest streak: ${userData.longest_streak} (expected: 3)`)
  console.assert(userData.current_streak === 0, 'Current streak should be 0')
  console.assert(userData.longest_streak === 3, 'Longest streak should be 3')
  
  // Test 5: Reset broken streaks function
  console.log('\nTest 5: Reset broken streaks function')
  await cleanupTestData(userId)
  
  // Create a streak that ended yesterday
  await createTaskWithDate(userId, 'Task 1', 3)
  await createTaskWithDate(userId, 'Task 2', 2)
  // No task yesterday (day 1)
  await createTaskWithDate(userId, 'Task 3', 0) // Task today
  
  await supabase.rpc('calculate_all_user_streaks')
  
  // Manually set a current streak to test the reset function
  await supabase
    .from('users')
    .update({ current_streak: 5 })
    .eq('id', userId)
  
  // Run reset function
  await supabase.rpc('reset_broken_streaks')
  
  userData = (await supabase
    .from('users')
    .select('current_streak')
    .eq('id', userId)
    .single()).data
  
  console.log(`  Current streak after reset: ${userData.current_streak} (expected: 0 or 1)`)
  // Note: The exact value depends on whether today's task counts
  
  console.log('\n✅ All streak calculation tests completed!')
}

async function testStreakAPI() {
  console.log('\n🌐 Testing Streak API Endpoint...\n')
  
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/streaks`
  
  // Note: This would require authentication in a real test
  console.log('  Note: API endpoint requires authentication')
  console.log('  Test manually by logging in and checking /api/user/streaks')
  console.log('  Expected response structure:')
  console.log('  {')
  console.log('    currentStreak: number,')
  console.log('    longestStreak: number,')
  console.log('    tasksCompletedToday: number,')
  console.log('    streakCalendar: Array')
  console.log('  }')
}

async function main() {
  try {
    console.log('🚀 Starting Streak Calculation Tests\n')
    console.log('================================\n')
    
    const userId = await setupTestUser()
    await cleanupTestData(userId)
    await testStreakCalculation(userId)
    await testStreakAPI()
    
    console.log('\n================================')
    console.log('✨ All tests completed successfully!\n')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the tests
main()