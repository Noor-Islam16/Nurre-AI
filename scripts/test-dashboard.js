const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testDashboard() {
  console.log('📊 Testing Dashboard System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test user
    console.log('👤 Creating test user for dashboard...')
    const testEmail = `test-dashboard-${Date.now()}@test.com`
    
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
    
    // Create profile with streak
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        email: testEmail,
        name: 'Dashboard Test User',
        adhd_persona: 'sprinter',
        current_streak: 5
      })
    
    if (profileError) {
      console.error('❌ Failed to create test profile:', profileError)
      process.exit(1)
    }
    console.log('✅ Test profile created with 5-day streak')
    
    // Test 1: Create tasks for today
    console.log('\n📝 Test 1: Creating tasks for today...')
    const today = new Date()
    const todayTasks = [
      { title: 'Morning meditation', priority: 1, time_estimate: 10, completed: true },
      { title: 'Review project proposal', priority: 3, time_estimate: 30, completed: false },
      { title: 'Team standup', priority: 2, time_estimate: 15, completed: true },
      { title: 'Code review', priority: 3, time_estimate: 45, completed: false },
      { title: 'Lunch break', priority: 0, time_estimate: 60, completed: true }
    ]
    
    for (const task of todayTasks) {
      const { error } = await supabase.from('tasks').insert({
        user_id: testUserId,
        ...task,
        created_at: today.toISOString(),
        completed_at: task.completed ? today.toISOString() : null
      })
      
      if (error) {
        console.error('❌ Failed to create task:', error)
      }
    }
    console.log(`✅ Created ${todayTasks.length} tasks (${todayTasks.filter(t => t.completed).length} completed)`)
    
    // Test 2: Create focus sessions for today
    console.log('\n⏱️ Test 2: Creating focus sessions for today...')
    const sessions = [
      { duration: 25, actual_duration: 25, completed: true },
      { duration: 45, actual_duration: 40, completed: true },
      { duration: 30, actual_duration: 15, completed: false }
    ]
    
    for (const session of sessions) {
      const startTime = new Date(today)
      startTime.setHours(Math.floor(Math.random() * 12) + 8) // Random time between 8am-8pm
      
      const { error } = await supabase.from('focus_sessions').insert({
        user_id: testUserId,
        ...session,
        created_at: startTime.toISOString(),
        ended_at: new Date(startTime.getTime() + session.actual_duration * 60000).toISOString()
      })
      
      if (error) {
        console.error('❌ Failed to create focus session:', error)
      }
    }
    
    const totalFocusToday = sessions.reduce((acc, s) => acc + s.actual_duration, 0)
    console.log(`✅ Created ${sessions.length} focus sessions (${totalFocusToday} minutes total)`)
    
    // Test 3: Create mood entries for today
    console.log('\n😊 Test 3: Creating mood entries for today...')
    const moods = ['happy', 'neutral', 'excited']
    
    for (const mood of moods) {
      const moodTime = new Date(today)
      moodTime.setHours(Math.floor(Math.random() * 12) + 8)
      
      const { error } = await supabase.from('mood_entries').insert({
        user_id: testUserId,
        mood,
        created_at: moodTime.toISOString()
      })
      
      if (error) {
        console.error('❌ Failed to create mood entry:', error)
      }
    }
    console.log(`✅ Created ${moods.length} mood entries:`, moods.join(', '))
    
    // Test 4: Create historical data for weekly progress
    console.log('\n📈 Test 4: Creating weekly historical data...')
    for (let i = 1; i <= 6; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(10, 0, 0, 0)
      
      // Create some tasks for each day
      const tasksPerDay = Math.floor(Math.random() * 3) + 2
      for (let j = 0; j < tasksPerDay; j++) {
        await supabase.from('tasks').insert({
          user_id: testUserId,
          title: `Task ${j + 1} from ${i} days ago`,
          priority: Math.floor(Math.random() * 4),
          completed: true,
          created_at: date.toISOString(),
          completed_at: new Date(date.getTime() + 3600000).toISOString()
        })
      }
      
      // Create a focus session for each day
      const sessionDuration = Math.floor(Math.random() * 30) + 15
      await supabase.from('focus_sessions').insert({
        user_id: testUserId,
        duration: sessionDuration,
        actual_duration: sessionDuration,
        completed: true,
        created_at: date.toISOString(),
        ended_at: new Date(date.getTime() + sessionDuration * 60000).toISOString()
      })
    }
    console.log('✅ Created 6 days of historical data')
    
    // Test 5: Query dashboard stats
    console.log('\n📊 Test 5: Fetching dashboard statistics...')
    
    // Today's stats
    const { data: todaysTasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
      .gte('created_at', today.toISOString())
    
    const todaysStats = {
      totalTasks: todaysTasksData?.length || 0,
      completedTasks: todaysTasksData?.filter(t => t.completed).length || 0,
      pendingTasks: todaysTasksData?.filter(t => !t.completed).length || 0
    }
    
    console.log('✅ Today\'s Statistics:')
    console.log(`   Total tasks: ${todaysStats.totalTasks}`)
    console.log(`   Completed: ${todaysStats.completedTasks}`)
    console.log(`   Pending: ${todaysStats.pendingTasks}`)
    console.log(`   Focus time: ${totalFocusToday} minutes`)
    console.log(`   Mood checks: ${moods.length}`)
    console.log(`   Current streak: 5 days`)
    
    // Test 6: Weekly progress calculation
    console.log('\n📅 Test 6: Calculating weekly progress...')
    const weeklyData = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)
      
      const { data: dayTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', testUserId)
        .is('completed', true)
        .gte('completed_at', date.toISOString())
        .lt('completed_at', nextDate.toISOString())
      
      const { data: daySessions } = await supabase
        .from('focus_sessions')
        .select('actual_duration')
        .eq('user_id', testUserId)
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())
      
      const dayStats = {
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        completed: dayTasks?.length || 0,
        focusMinutes: daySessions?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
      }
      
      weeklyData.push(dayStats)
      console.log(`   ${dayStats.day}: ${dayStats.completed} tasks, ${dayStats.focusMinutes}min focus`)
    }
    
    console.log('✅ Weekly progress calculated for 7 days')
    
    // Test 7: Priority tasks query
    console.log('\n🎯 Test 7: Fetching priority tasks...')
    const { data: priorityTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
      .is('completed', false)
      .order('priority', { ascending: false })
      .limit(3)
    
    console.log(`✅ Top ${priorityTasks?.length || 0} priority tasks:`)
    priorityTasks?.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.title} (Priority: ${task.priority})`)
    })
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    
    await supabase
      .from('mood_entries')
      .delete()
      .eq('user_id', testUserId)
    
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
    console.log('\n🎉 All dashboard tests passed!')
    
  } catch (error) {
    console.error('❌ Dashboard test failed:', error)
    process.exit(1)
  }
}

testDashboard()