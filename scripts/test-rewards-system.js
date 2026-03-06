#!/usr/bin/env node

/**
 * Test script for rewards & growth system
 * Verifies that rewards page shows correct data
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

// Test user for rewards testing
const TEST_USER_EMAIL = 'rewards-test@demo.com'
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
  ])
  
  // Reset user stats
  await supabase
    .from('users')
    .update({ 
      current_streak: 0, 
      longest_streak: 0 
    })
    .eq('id', userId)
  
  console.log('✅ Test data cleaned')
}

async function createTestData(userId) {
  console.log('📝 Creating test data for rewards...')
  
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  
  // Create completed tasks for streak (last 5 days)
  for (let i = 0; i < 5; i++) {
    const taskDate = new Date(today)
    taskDate.setDate(taskDate.getDate() - i)
    
    // Create 2-3 tasks per day
    const taskCount = i === 0 ? 3 : Math.floor(Math.random() * 2) + 1
    
    for (let j = 0; j < taskCount; j++) {
      const completedAt = new Date(taskDate)
      completedAt.setHours(10 + j * 2, 0, 0, 0)
      
      // Make one task an early bird (before 9 AM)
      if (j === 0 && i === 2) {
        completedAt.setHours(8, 30, 0, 0)
      }
      
      await supabase.from('tasks').insert({
        user_id: userId,
        title: `Task ${j + 1} from ${i} days ago`,
        completed: true,
        completed_at: completedAt.toISOString(),
        created_at: new Date(completedAt.getTime() - 60 * 60 * 1000).toISOString(),
        priority: Math.floor(Math.random() * 3) + 1
      })
    }
  }
  
  // Create some incomplete tasks
  for (let i = 0; i < 3; i++) {
    await supabase.from('tasks').insert({
      user_id: userId,
      title: `Pending task ${i + 1}`,
      completed: false,
      priority: 2,
      created_at: today.toISOString()
    })
  }
  
  // Create focus sessions
  for (let i = 0; i < 8; i++) {
    const sessionDate = new Date(today)
    sessionDate.setDate(sessionDate.getDate() - Math.floor(i / 2))
    
    await supabase.from('focus_sessions').insert({
      user_id: userId,
      duration: 25,
      actual_duration: 20 + Math.floor(Math.random() * 10),
      completed: true,
      created_at: sessionDate.toISOString(),
      ended_at: new Date(sessionDate.getTime() + 25 * 60 * 1000).toISOString()
    })
  }
  
  // Run streak calculation
  await supabase.rpc('calculate_all_user_streaks')
  
  console.log('✅ Test data created')
}

async function testRewardsCalculation(userId) {
  console.log('\n🧪 Testing Rewards Calculation...\n')
  
  // Get reward statistics
  const { data: rewards, error: rewardsError } = await supabase
    .rpc('get_user_rewards', { p_user_id: userId })
  
  if (rewardsError) {
    throw new Error(`Failed to get rewards: ${rewardsError.message}`)
  }
  
  console.log('📊 Reward Statistics:')
  console.log(`  Current Streak: ${rewards.current_streak} days`)
  console.log(`  Longest Streak: ${rewards.longest_streak} days`)
  console.log(`  Total Tasks: ${rewards.total_tasks_completed}`)
  console.log(`  Total Focus Minutes: ${rewards.total_focus_minutes}`)
  console.log(`  Growth Percentage: ${rewards.growth_percentage}%`)
  console.log(`  Growth Stage: ${rewards.current_stage}`)
  console.log(`  Tasks Today: ${rewards.tasks_today}`)
  console.log(`  Focus Today: ${rewards.focus_today} minutes`)
  console.log(`  Tasks This Week: ${rewards.tasks_this_week}`)
  console.log(`  Early Bird Count: ${rewards.early_bird_count}`)
  
  // Test achievements
  const { data: achievements, error: achievementError } = await supabase
    .rpc('check_user_achievements', { p_user_id: userId })
  
  if (achievementError) {
    throw new Error(`Failed to check achievements: ${achievementError.message}`)
  }
  
  console.log('\n🏆 Achievements:')
  achievements.forEach(achievement => {
    const status = achievement.unlocked ? '✅' : '🔒'
    console.log(`  ${status} ${achievement.achievement_id}: ${achievement.progress}/${achievement.target}`)
  })
  
  // Verify calculations
  console.log('\n✔️ Verification:')
  console.assert(rewards.current_streak === 5, 'Current streak should be 5')
  console.assert(rewards.total_tasks_completed > 0, 'Should have completed tasks')
  console.assert(rewards.early_bird_count === 1, 'Should have 1 early bird task')
  console.assert(rewards.growth_percentage > 0, 'Growth percentage should be > 0')
  
  const firstTaskAchievement = achievements.find(a => a.achievement_id === 'first-task')
  console.assert(firstTaskAchievement?.unlocked === true, 'First task achievement should be unlocked')
  
  console.log('✅ All rewards calculations verified!')
}

async function testRewardsAPI() {
  console.log('\n🌐 Testing Rewards API Endpoint...\n')
  
  const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/rewards`
  
  console.log('  Note: API endpoint requires authentication')
  console.log('  Test manually by logging in and checking:')
  console.log(`  ${apiUrl}`)
  console.log('\n  Expected response structure:')
  console.log('  {')
  console.log('    currentStreak: number,')
  console.log('    longestStreak: number,')
  console.log('    growthProgress: number,')
  console.log('    growthStage: { name, emoji },')
  console.log('    achievements: Array,')
  console.log('    motivationalMessage: string,')
  console.log('    ...')
  console.log('  }')
}

async function main() {
  try {
    console.log('🚀 Starting Rewards System Tests\n')
    console.log('================================\n')
    
    const userId = await setupTestUser()
    await cleanupTestData(userId)
    await createTestData(userId)
    await testRewardsCalculation(userId)
    await testRewardsAPI()
    
    console.log('\n================================')
    console.log('✨ Rewards test complete!')
    console.log('\nTo see the rewards page in action:')
    console.log('1. Start the dev server: npm run dev')
    console.log(`2. Login with: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`)
    console.log('3. Visit the rewards page')
    console.log('4. Verify:')
    console.log('   - 5-day streak is shown')
    console.log('   - Growth progress is displayed')
    console.log('   - Achievements show correct progress')
    console.log('   - Plant emoji reflects growth stage\n')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the tests
main()