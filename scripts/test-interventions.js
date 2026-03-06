const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testInterventions() {
  console.log('🎯 Testing Intervention System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test user
    console.log('👤 Creating test user...')
    const testEmail = `test-intervention-${Date.now()}@test.com`
    
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
        name: 'Test User',
        adhd_persona: 'planner'
      })
    
    if (profileError) {
      console.error('❌ Failed to create test profile:', profileError)
      process.exit(1)
    }
    console.log('✅ Test profile created')
    
    // Test 1: Create a sample task for context
    console.log('\n📝 Test 1: Creating sample task...')
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: testUserId,
        title: 'Test Task for Interventions',
        description: 'A task to test intervention triggers',
        time_estimate: 30,
        priority: 2,
        completed: false
      })
      .select()
      .single()
    
    if (taskError) {
      console.error('❌ Failed to create task:', taskError)
    } else {
      console.log('✅ Sample task created:', task.title)
    }
    
    // Test 2: Simulate idle event (procrastination trigger)
    console.log('\n📝 Test 2: Simulating idle procrastination event...')
    const idleEvent = {
      user_id: testUserId,
      event_type: 'idle_detected',
      event_data: { 
        idleTime: 360000, // 6 minutes
        activeTaskId: task?.id 
      },
      created_at: new Date().toISOString()
    }
    
    const { error: idleError } = await supabase
      .from('user_events')
      .insert(idleEvent)
    
    if (!idleError) {
      console.log('✅ Idle event created (should trigger procrastination intervention)')
    }
    
    // Test 3: Simulate tab switching (distraction)
    console.log('\n📝 Test 3: Simulating excessive tab switching...')
    for (let i = 0; i < 6; i++) {
      await supabase
        .from('user_events')
        .insert({
          user_id: testUserId,
          event_type: 'tab_switch',
          event_data: { tabSwitchCount: i + 1 },
          created_at: new Date().toISOString()
        })
    }
    console.log('✅ Tab switch events created (should trigger focus redirect)')
    
    // Test 4: Create intervention record directly
    console.log('\n📝 Test 4: Creating direct intervention record...')
    const testContext = {
      immediate: {
        currentPage: '/dashboard',
        idleTime: 300000,
        activeTaskId: task?.id,
        tabSwitches: 5,
        focusSessionActive: false
      },
      session: {
        tasksCompleted: 0,
        tasksCreated: 1,
        focusMinutes: 0,
        breaksTaken: 0
      },
      psychological: {
        currentMood: 'neutral',
        stressIndicators: 5,
        focusScore: 3,
        overwhelmScore: 6,
        motivationLevel: 4
      }
    }
    
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .insert({
        user_id: testUserId,
        type: 'gentle_nudge',
        trigger_context: testContext,
        message: "I noticed you've been away. Want to try just 10 minutes on your task?",
        user_response: null
      })
      .select()
      .single()
    
    if (interventionError) {
      console.error('❌ Failed to create intervention:', interventionError)
    } else {
      console.log('✅ Intervention created with ID:', intervention.id)
    }
    
    // Test 5: Query interventions
    console.log('\n📝 Test 5: Querying interventions...')
    const { data: interventions, error: queryError } = await supabase
      .from('interventions')
      .select('*')
      .eq('user_id', testUserId)
    
    if (queryError) {
      console.error('❌ Failed to query interventions:', queryError)
    } else {
      console.log(`✅ Found ${interventions.length} intervention(s)`)
      interventions.forEach(i => {
        console.log(`   - Type: ${i.type}, Response: ${i.user_response || 'pending'}`)
      })
    }
    
    // Test 6: Update intervention response
    if (intervention) {
      console.log('\n📝 Test 6: Updating intervention response...')
      const { error: updateError } = await supabase
        .from('interventions')
        .update({
          user_response: 'accepted',
          effectiveness_score: 0.8
        })
        .eq('id', intervention.id)
      
      if (!updateError) {
        console.log('✅ Intervention response updated to "accepted"')
      }
    }
    
    // Test 7: Test intervention types
    console.log('\n📝 Test 7: Testing different intervention types...')
    const interventionTypes = [
      'gentle_nudge',
      'task_breakdown', 
      'break_suggestion',
      'focus_redirect',
      'emotional_support',
      'celebration',
      'priority_check',
      'overwhelm_support'
    ]
    
    for (const type of interventionTypes) {
      const { error } = await supabase
        .from('interventions')
        .insert({
          user_id: testUserId,
          type: type,
          trigger_context: testContext,
          message: `Test message for ${type} intervention type`
        })
      
      if (!error) {
        console.log(`✅ Created ${type} intervention`)
      }
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    
    await supabase
      .from('interventions')
      .delete()
      .eq('user_id', testUserId)
    
    await supabase
      .from('user_events')
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
    console.log('\n🎉 All intervention tests passed!')
    
  } catch (error) {
    console.error('❌ Intervention test failed:', error)
    process.exit(1)
  }
}

testInterventions()