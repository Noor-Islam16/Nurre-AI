#!/usr/bin/env node

/**
 * Test script for dashboard statistics
 * Verifies that dashboard shows correct data
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

// Test user for dashboard testing
const TEST_USER_EMAIL = 'dashboard-test@demo.com'
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
  
  // Delete existing data
  await Promise.all([
    supabase.from('tasks').delete().eq('user_id', userId),
    supabase.from('focus_sessions').delete().eq('user_id', userId),
    supabase.from('mood_entries').delete().eq('user_id', userId)
  ])
  
  // Reset user streaks
  await supabase
    .from('users')
    .update({ current_streak: 0, longest_streak: 0 })
    .eq('id', userId)
  
  console.log('✅ Test data cleaned')
}

async function createTestData(userId) {
  console.log('📝 Creating test data...')
  
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  
  // Create tasks for today
  const tasksToday = [
    { title: 'Morning task', completed: true, completed_at: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString() },
    { title: 'Afternoon task', completed: true, completed_at: new Date(today.getTime()).toISOString() },
    { title: 'Pending task 1', completed: false },
    { title: 'Pending task 2', completed: false }
  ]
  
  for (const task of tasksToday) {
    await supabase.from('tasks').insert({
      user_id: userId,
      title: task.title,
      completed: task.completed,
      completed_at: task.completed_at,
      priority: 2,
      created_at: new Date(today.getTime() - 6 * 60 * 60 * 1000).toISOString()
    })
  }
  
  // Create tasks for past days (for weekly progress)
  for (let i = 1; i <= 6; i++) {
    const pastDate = new Date(today)
    pastDate.setDate(pastDate.getDate() - i)
    pastDate.setHours(14, 0, 0, 0)
    
    const taskCount = Math.floor(Math.random() * 3) + 1
    for (let j = 0; j < taskCount; j++) {
      await supabase.from('tasks').insert({
        user_id: userId,
        title: `Task ${j + 1} from ${i} days ago`,
        completed: true,
        completed_at: pastDate.toISOString(),
        created_at: new Date(pastDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        priority: 1
      })
    }
  }
  
  // Create focus sessions for today
  const sessionsToday = [
    { duration: 25, actual_duration: 25, completed: true },
    { duration: 45, actual_duration: 40, completed: true },
    { duration: 30, actual_duration: 30, completed: true }
  ]
  
  for (const session of sessionsToday) {
    await supabase.from('focus_sessions').insert({
      user_id: userId,
      duration: session.duration,
      actual_duration: session.actual_duration,
      completed: session.completed,
      created_at: new Date(today.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString()
    })
  }
  
  // Create focus sessions for past days
  for (let i = 1; i <= 6; i++) {
    const pastDate = new Date(today)
    pastDate.setDate(pastDate.getDate() - i)
    
    const sessionCount = Math.floor(Math.random() * 2) + 1
    for (let j = 0; j < sessionCount; j++) {
      const duration = [25, 30, 45, 60][Math.floor(Math.random() * 4)]
      await supabase.from('focus_sessions').insert({
        user_id: userId,
        duration: duration,
        actual_duration: duration - Math.floor(Math.random() * 5),
        completed: true,
        created_at: pastDate.toISOString()
      })
    }
  }
  
  // Create mood entries for today
  await supabase.from('mood_entries').insert({
    user_id: userId,
    mood: 'good',
    energy: 7,
    focus: 8,
    created_at: new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString()
  })
  
  // Update user streak
  await supabase.rpc('calculate_all_user_streaks')
  
  console.log('✅ Test data created')
}

async function verifyDashboardStats(userId) {
  console.log('\n🔍 Verifying Dashboard Statistics...\n')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Get actual counts from database
  const [tasksCreated, tasksCompleted, sessions, userData] = await Promise.all([
    supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString()),
    
    supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', today.toISOString())
      .lt('completed_at', tomorrow.toISOString()),
    
    supabase
      .from('focus_sessions')
      .select('actual_duration')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString()),
    
    supabase
      .from('users')
      .select('current_streak, longest_streak')
      .eq('id', userId)
      .single()
  ])
  
  const focusMinutes = sessions.data?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
  
  console.log('📊 Expected Dashboard Values:')
  console.log(`  Tasks Today: ${tasksCreated.count} (4 tasks created today)`)
  console.log(`  Completed Today: ${tasksCompleted.count} (2 tasks completed today)`)
  console.log(`  Focus Minutes: ${focusMinutes} (95 minutes total)`)
  console.log(`  Current Streak: ${userData.data?.current_streak || 0}`)
  console.log(`  Longest Streak: ${userData.data?.longest_streak || 0}`)
  
  // Test the API endpoint
  console.log('\n🌐 Testing Dashboard API Endpoint...')
  
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/stats`
  
  console.log('  Note: API endpoint requires authentication')
  console.log('  Test manually by logging in as test user and checking:')
  console.log(`  ${apiUrl}`)
  
  // Verify weekly progress
  console.log('\n📈 Weekly Progress Data:')
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const dayTasks = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('completed_at', date.toISOString())
      .lt('completed_at', nextDate.toISOString())
    
    const daySessions = await supabase
      .from('focus_sessions')
      .select('actual_duration')
      .eq('user_id', userId)
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString())
    
    const focusMins = daySessions.data?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
    
    console.log(`  ${date.toLocaleDateString('en', { weekday: 'short' })}: ${dayTasks.count} tasks, ${focusMins} focus minutes`)
  }
}

async function main() {
  try {
    console.log('🚀 Starting Dashboard Statistics Tests\n')
    console.log('================================\n')
    
    const userId = await setupTestUser()
    await cleanupTestData(userId)
    await createTestData(userId)
    await verifyDashboardStats(userId)
    
    console.log('\n================================')
    console.log('✨ Dashboard test complete!')
    console.log('\nTo see the dashboard in action:')
    console.log('1. Start the dev server: npm run dev')
    console.log(`2. Login with: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`)
    console.log('3. Visit the dashboard page')
    console.log('4. Verify the statistics match the expected values above\n')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the tests
main()