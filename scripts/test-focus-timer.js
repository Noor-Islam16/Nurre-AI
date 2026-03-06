const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testFocusTimer() {
  console.log('⏱️  Testing Focus Timer System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test user
    console.log('👤 Creating test user for focus timer...')
    const testEmail = `test-timer-${Date.now()}@test.com`
    
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
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        email: testEmail,
        name: 'Timer Test User',
        adhd_persona: 'sprinter'
      })
    
    if (profileError) {
      console.error('❌ Failed to create test profile:', profileError)
      process.exit(1)
    }
    console.log('✅ Test profile created')
    
    // Test 1: Create a focus session
    console.log('\n⏱️  Test 1: Creating a focus session...')
    const { data: session1, error: sessionError1 } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: testUserId,
        duration: 25,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (sessionError1) {
      console.error('❌ Failed to create focus session:', sessionError1)
    } else {
      console.log('✅ Focus session created with ID:', session1.id)
      console.log('   Planned duration: 25 minutes')
    }
    
    // Test 2: Create a focus session with task
    console.log('\n⏱️  Test 2: Creating a focus session with task...')
    
    // First create a task
    const { data: testTask } = await supabase
      .from('tasks')
      .insert({
        user_id: testUserId,
        title: 'Test task for timer',
        time_estimate: 30,
        priority: 2
      })
      .select()
      .single()
    
    const { data: session2, error: sessionError2 } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: testUserId,
        task_id: testTask?.id,
        duration: 30,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (sessionError2) {
      console.error('❌ Failed to create focus session with task:', sessionError2)
    } else {
      console.log('✅ Focus session created with task:', testTask?.title)
      console.log('   Session ID:', session2.id)
      console.log('   Task ID:', testTask?.id)
    }
    
    // Test 3: Complete a focus session
    console.log('\n⏱️  Test 3: Completing a focus session...')
    const { data: completedSession, error: completeError } = await supabase
      .from('focus_sessions')
      .update({
        actual_duration: 25,
        ended_at: new Date().toISOString(),
        completed: true
      })
      .eq('id', session1?.id)
      .select()
      .single()
    
    if (completeError) {
      console.error('❌ Failed to complete focus session:', completeError)
    } else {
      console.log('✅ Focus session completed')
      console.log('   Actual duration:', completedSession.actual_duration, 'minutes')
      console.log('   Completed:', completedSession.completed)
    }
    
    // Test 4: Partial completion (stopped early)
    console.log('\n⏱️  Test 4: Stopping a session early...')
    const { data: session3 } = await supabase
      .from('focus_sessions')
      .insert({
        user_id: testUserId,
        duration: 45,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    const { data: stoppedSession, error: stopError } = await supabase
      .from('focus_sessions')
      .update({
        actual_duration: 15,
        ended_at: new Date().toISOString(),
        completed: false
      })
      .eq('id', session3?.id)
      .select()
      .single()
    
    if (stopError) {
      console.error('❌ Failed to stop focus session:', stopError)
    } else {
      console.log('✅ Focus session stopped early')
      console.log('   Planned:', stoppedSession.duration, 'minutes')
      console.log('   Actual:', stoppedSession.actual_duration, 'minutes')
      console.log('   Completed:', stoppedSession.completed)
    }
    
    // Test 5: Query user's focus sessions
    console.log('\n⏱️  Test 5: Querying user focus sessions...')
    const { data: userSessions, error: queryError } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
    
    if (queryError) {
      console.error('❌ Failed to query focus sessions:', queryError)
    } else {
      console.log(`✅ Found ${userSessions.length} focus sessions`)
      userSessions.forEach((session, i) => {
        console.log(`   ${i + 1}. Duration: ${session.actual_duration || session.duration}min, Completed: ${session.completed || false}`)
      })
    }
    
    // Test 6: Calculate total focus time
    console.log('\n⏱️  Test 6: Calculating total focus time...')
    const totalFocusTime = userSessions?.reduce((acc, session) => {
      return acc + (session.actual_duration || 0)
    }, 0) || 0
    
    console.log(`✅ Total focus time: ${totalFocusTime} minutes`)
    
    // Test 7: Focus session with effectiveness (simulating AI assessment)
    console.log('\n⏱️  Test 7: Adding effectiveness score to session...')
    const { data: effectiveSession, error: effectiveError } = await supabase
      .from('focus_sessions')
      .update({
        effectiveness_score: 0.85,
        notes: 'Good focus with minimal distractions'
      })
      .eq('id', session1?.id)
      .select()
      .single()
    
    if (effectiveError) {
      console.error('❌ Failed to update effectiveness:', effectiveError)
    } else {
      console.log('✅ Effectiveness score added')
      console.log('   Score:', effectiveSession.effectiveness_score)
      console.log('   Notes:', effectiveSession.notes)
    }
    
    // Test 8: Today's focus sessions
    console.log('\n⏱️  Test 8: Getting today\'s focus sessions...')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todaySessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', testUserId)
      .gte('created_at', today.toISOString())
    
    console.log(`✅ Today's sessions: ${todaySessions?.length || 0}`)
    const todayTotal = todaySessions?.reduce((acc, s) => acc + (s.actual_duration || 0), 0) || 0
    console.log(`   Total focus time today: ${todayTotal} minutes`)
    
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
    console.log('\n🎉 All focus timer tests passed!')
    
  } catch (error) {
    console.error('❌ Focus timer test failed:', error)
    process.exit(1)
  }
}

testFocusTimer()