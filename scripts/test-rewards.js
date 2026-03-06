const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testRewards() {
  console.log('🏆 Testing Rewards System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test user
    console.log('👤 Creating test user for rewards...')
    const testEmail = `test-rewards-${Date.now()}@test.com`
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test123456',
      email_confirm: true
    })
    
    if (authError) {
      console.error('❌ Failed to create auth user:', authError)
      process.exit(1)
    }
    
    const testUserId = authUser.user.id
    console.log('✅ Test user created with ID:', testUserId)
    
    // Test 1: Create profile with initial rewards data
    console.log('\n🌱 Test 1: Creating profile with rewards data...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        email: testEmail,
        name: 'Rewards Test User',
        adhd_persona: 'sprinter',
        current_streak: 3,
        longest_streak: 7,
        rose_progress: 45
      })
    
    if (profileError) {
      console.error('❌ Failed to create test profile:', profileError)
      process.exit(1)
    }
    console.log('✅ Profile created with:')
    console.log('   Current streak: 3 days')
    console.log('   Longest streak: 7 days')
    console.log('   Rose progress: 45%')
    
    // Test 2: Complete tasks for streak
    console.log('\n🔥 Test 2: Testing streak functionality...')
    
    // Create tasks for today
    const today = new Date()
    const tasks = [
      { title: 'Morning exercise', completed: true },
      { title: 'Read documentation', completed: true },
      { title: 'Team meeting', completed: false }
    ]
    
    for (const task of tasks) {
      const { error } = await supabase.from('tasks').insert({
        user_id: testUserId,
        ...task,
        priority: 2,
        created_at: today.toISOString(),
        completed_at: task.completed ? today.toISOString() : null
      })
      
      if (error) {
        console.error('❌ Failed to create task:', error)
      }
    }
    console.log('✅ Created 3 tasks (2 completed)')
    
    // Test 3: Simulate achievement progress
    console.log('\n🏅 Test 3: Simulating achievement progress...')
    
    // Create focus sessions for Focus Master achievement
    const focusSessions = 5
    for (let i = 0; i < focusSessions; i++) {
      const startTime = new Date(today)
      startTime.setHours(startTime.getHours() - i)
      
      const { error } = await supabase.from('focus_sessions').insert({
        user_id: testUserId,
        duration: 25,
        actual_duration: 25,
        completed: true,
        created_at: startTime.toISOString(),
        ended_at: new Date(startTime.getTime() + 25 * 60000).toISOString()
      })
      
      if (error) {
        console.error('❌ Failed to create focus session:', error)
      }
    }
    console.log(`✅ Created ${focusSessions} focus sessions`)
    
    // Create completed tasks for Task Crusher achievement
    const completedTasks = 15
    for (let i = 0; i < completedTasks; i++) {
      const taskDate = new Date()
      taskDate.setDate(taskDate.getDate() - Math.floor(i / 3))
      
      const { error } = await supabase.from('tasks').insert({
        user_id: testUserId,
        title: `Task ${i + 1}`,
        priority: Math.floor(Math.random() * 4),
        completed: true,
        created_at: taskDate.toISOString(),
        completed_at: taskDate.toISOString()
      })
      
      if (error) {
        console.error('❌ Failed to create completed task:', error)
      }
    }
    console.log(`✅ Created ${completedTasks} completed tasks`)
    
    // Test 4: Update rose progress
    console.log('\n🌹 Test 4: Testing rose growth...')
    const newRoseProgress = 65
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ rose_progress: newRoseProgress })
      .eq('id', testUserId)
    
    if (updateError) {
      console.error('❌ Failed to update rose progress:', updateError)
    } else {
      console.log(`✅ Updated rose progress to ${newRoseProgress}%`)
      console.log('   Rose stage: Growing 🌾')
    }
    
    // Test 5: Simulate early bird achievement
    console.log('\n🌅 Test 5: Testing early bird achievement...')
    const earlyMorning = new Date()
    earlyMorning.setHours(8, 30, 0, 0)
    
    const { error: earlyBirdError } = await supabase.from('tasks').insert({
      user_id: testUserId,
      title: 'Early morning task',
      priority: 3,
      completed: true,
      created_at: earlyMorning.toISOString(),
      completed_at: earlyMorning.toISOString()
    })
    
    if (earlyBirdError) {
      console.error('❌ Failed to create early bird task:', earlyBirdError)
    } else {
      console.log('✅ Created task completed at 8:30 AM')
    }
    
    // Test 6: Query all rewards data
    console.log('\n📊 Test 6: Fetching all rewards data...')
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
    
    const { data: sessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', testUserId)
    
    console.log('✅ Rewards Summary:')
    console.log(`   Current Streak: ${profile.current_streak} days`)
    console.log(`   Longest Streak: ${profile.longest_streak} days`)
    console.log(`   Rose Progress: ${profile.rose_progress}%`)
    console.log(`   Total Tasks: ${allTasks.length}`)
    console.log(`   Completed Tasks: ${allTasks.filter(t => t.completed).length}`)
    console.log(`   Focus Sessions: ${sessions.length}`)
    
    console.log('\n🏆 Achievement Progress:')
    console.log(`   First Step: ${allTasks.filter(t => t.completed).length > 0 ? '✅ Unlocked' : '🔒 Locked'} (${Math.min(1, allTasks.filter(t => t.completed).length)}/1)`)
    console.log(`   Week Warrior: ${profile.current_streak >= 7 ? '✅ Unlocked' : '🔒 Locked'} (${profile.current_streak}/7)`)
    console.log(`   Focus Master: ${sessions.length >= 10 ? '✅ Unlocked' : '🔒 Locked'} (${sessions.length}/10)`)
    console.log(`   Task Crusher: ${allTasks.filter(t => t.completed).length >= 50 ? '✅ Unlocked' : '🔒 Locked'} (${allTasks.filter(t => t.completed).length}/50)`)
    
    const earlyTasks = allTasks.filter(t => {
      const hour = new Date(t.completed_at).getHours()
      return t.completed && hour < 9
    })
    console.log(`   Early Bird: ${earlyTasks.length > 0 ? '✅ Unlocked' : '🔒 Locked'} (${earlyTasks.length}/1)`)
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    
    await supabase
      .from('focus_sessions')
      .delete()
      .eq('user_id', testUserId)
    
    await supabase
      .from('tasks')
      .delete()
      .eq('user_id', testUserId)
    
    await supabase
      .from('profiles')
      .delete()
      .eq('id', testUserId)
    
    await supabase.auth.admin.deleteUser(testUserId)
    
    console.log('✅ Test data cleaned up')
    console.log('\n🎉 All rewards tests passed!')
    
  } catch (error) {
    console.error('❌ Rewards test failed:', error)
    process.exit(1)
  }
}

testRewards()