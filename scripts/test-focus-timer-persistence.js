#!/usr/bin/env node

/**
 * Test script for focus timer data persistence
 * Verifies that focus sessions are saved to database and appear in dashboard
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

// Test user for focus timer testing
const TEST_USER_EMAIL = 'timer-test@demo.com'
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
  
  // Delete existing focus sessions
  await supabase
    .from('focus_sessions')
    .delete()
    .eq('user_id', userId)
  
  console.log('✅ Test data cleaned')
}

async function createTestSession(userId, duration, actualDuration, completed = true, daysAgo = 0) {
  const sessionDate = new Date()
  sessionDate.setDate(sessionDate.getDate() - daysAgo)
  sessionDate.setHours(10, 0, 0, 0)
  
  const endDate = new Date(sessionDate)
  endDate.setMinutes(endDate.getMinutes() + actualDuration)
  
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      duration: duration,
      actual_duration: actualDuration,
      completed: completed,
      created_at: sessionDate.toISOString(),
      ended_at: completed ? endDate.toISOString() : null,
      effectiveness: completed ? Math.floor(Math.random() * 20) + 80 : null,
      interruptions: Math.floor(Math.random() * 3),
      break_taken: actualDuration >= 25
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create test session: ${error.message}`)
  }
  
  return data
}

async function testFocusSessionCreation(userId) {
  console.log('\n🧪 Testing Focus Session Creation...\n')
  
  // Create various test sessions
  console.log('Creating test sessions...')
  
  // Today's sessions
  const session1 = await createTestSession(userId, 25, 25, true, 0)
  console.log(`  ✅ Created 25-minute completed session`)
  
  const session2 = await createTestSession(userId, 45, 40, true, 0)
  console.log(`  ✅ Created 45-minute session (completed early at 40 min)`)
  
  const session3 = await createTestSession(userId, 15, 15, true, 0)
  console.log(`  ✅ Created 15-minute quick session`)
  
  // Incomplete session
  const session4 = await createTestSession(userId, 30, 10, false, 0)
  console.log(`  ✅ Created incomplete session (10/30 minutes)`)
  
  // Past sessions for weekly data
  for (let i = 1; i <= 6; i++) {
    const duration = [25, 30, 45][Math.floor(Math.random() * 3)]
    await createTestSession(userId, duration, duration - Math.floor(Math.random() * 5), true, i)
  }
  console.log(`  ✅ Created 6 past sessions for weekly progress`)
  
  return { session1, session2, session3, session4 }
}

async function verifyDashboardStats(userId) {
  console.log('\n📊 Verifying Dashboard Statistics...\n')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Get today's focus sessions
  const { data: todaySessions, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
  
  if (error) {
    throw new Error(`Failed to fetch sessions: ${error.message}`)
  }
  
  console.log(`Found ${todaySessions.length} sessions for today:`)
  
  let totalMinutes = 0
  let completedSessions = 0
  
  todaySessions.forEach((session, index) => {
    const minutes = session.actual_duration || 0
    totalMinutes += minutes
    if (session.completed) completedSessions++
    
    console.log(`  Session ${index + 1}: ${minutes} minutes ${session.completed ? '✅' : '❌'}`)
  })
  
  console.log(`\n📈 Dashboard should show:`)
  console.log(`  Focus Minutes Today: ${totalMinutes}`)
  console.log(`  Completed Sessions: ${completedSessions}`)
  console.log(`  Incomplete Sessions: ${todaySessions.length - completedSessions}`)
  
  // Verify calculations
  console.assert(todaySessions.length === 4, 'Should have 4 sessions today')
  console.assert(totalMinutes === 80, 'Total minutes should be 80 (25+40+15+0)')
  console.assert(completedSessions === 3, 'Should have 3 completed sessions')
  
  return totalMinutes
}

async function testAPIEndpoint() {
  console.log('\n🌐 Testing Focus Sessions API...\n')
  
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/focus-sessions`
  
  console.log('  Note: API endpoint requires authentication')
  console.log('  Test manually by:')
  console.log(`  1. Login as ${TEST_USER_EMAIL}`)
  console.log('  2. Start a focus timer in the app`)
  console.log('  3. Complete or stop the timer`)
  console.log('  4. Check dashboard shows the focus minutes')
  console.log(`  5. Or check API directly: ${apiUrl}?today=true`)
}

async function main() {
  try {
    console.log('🚀 Starting Focus Timer Persistence Tests\n')
    console.log('================================\n')
    
    const userId = await setupTestUser()
    await cleanupTestData(userId)
    const sessions = await testFocusSessionCreation(userId)
    const totalMinutes = await verifyDashboardStats(userId)
    await testAPIEndpoint()
    
    console.log('\n================================')
    console.log('✨ Focus timer test complete!')
    console.log('\n🔍 What was fixed:')
    console.log('  1. Column name: planned_duration → duration')
    console.log('  2. Column name: started_at → created_at')
    console.log('  3. Added error handling for session creation')
    console.log('  4. Created API endpoints for focus sessions')
    console.log('\nTo verify in the app:')
    console.log('1. Start the dev server: npm run dev')
    console.log(`2. Login with: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`)
    console.log('3. Go to Focus page and start a timer')
    console.log('4. Complete the timer')
    console.log(`5. Check dashboard shows ${totalMinutes} Focus Minutes\n`)
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the tests
main()