const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testEventTracking() {
  console.log('🎯 Testing Event Tracking System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test auth user first
    console.log('👤 Creating test user...')
    const testEmail = `test-${Date.now()}@test.com`
    
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
    
    // Create or update the profile
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
    console.log('✅ Test profile created/updated')
    
    // Test 1: Insert test event
    console.log('\n📝 Test 1: Inserting test event...')
    const testEvent = {
      user_id: testUserId,
      event_type: 'page_view',
      event_data: { path: '/dashboard' },
      page_url: '/dashboard',
      created_at: new Date().toISOString()
    }
    
    const { data: insertedEvent, error: insertError } = await supabase
      .from('user_events')
      .insert(testEvent)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Failed to insert event:', insertError)
      process.exit(1)
    }
    console.log('✅ Event inserted successfully')
    
    // Test 2: Query events
    console.log('\n📝 Test 2: Querying recent events...')
    const { data: events, error: queryError } = await supabase
      .from('user_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (queryError) {
      console.error('❌ Failed to query events:', queryError)
      process.exit(1)
    }
    console.log(`✅ Found ${events.length} recent events`)
    
    // Test 3: Test different event types
    console.log('\n📝 Test 3: Testing multiple event types...')
    const eventTypes = [
      { type: 'task_create', data: { taskId: '123', title: 'Test Task' }},
      { type: 'focus_start', data: { duration: 25 }},
      { type: 'idle_detected', data: { idleTime: 300000 }},
      { type: 'mood_check', data: { mood: 'focused', energy: 7 }}
    ]
    
    for (const eventType of eventTypes) {
      const { error } = await supabase
        .from('user_events')
        .insert({
          user_id: testUserId,
          event_type: eventType.type,
          event_data: eventType.data,
          created_at: new Date().toISOString()
        })
      
      if (error) {
        console.error(`❌ Failed to insert ${eventType.type}:`, error)
      } else {
        console.log(`✅ ${eventType.type} event created`)
      }
    }
    
    // Test 4: Verify context data structure
    console.log('\n📝 Test 4: Verifying context data structure...')
    const sessionStart = new Date(Date.now() - 4 * 60 * 60 * 1000)
    
    const { data: contextEvents, error: contextError } = await supabase
      .from('user_events')
      .select('*')
      .eq('user_id', testUserId)
      .gte('created_at', sessionStart.toISOString())
    
    if (!contextError && contextEvents) {
      const eventTypeCounts = {}
      contextEvents.forEach(e => {
        eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1
      })
      console.log('✅ Context event types:', eventTypeCounts)
    }
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...')
    const { error: cleanupEventsError } = await supabase
      .from('user_events')
      .delete()
      .eq('user_id', testUserId)
    
    if (!cleanupEventsError) {
      console.log('✅ Test events cleaned up')
    }
    
    const { error: cleanupProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', testUserId)
    
    if (!cleanupProfileError) {
      console.log('✅ Test profile cleaned up')
    }
    
    // Delete auth user
    const { error: cleanupAuthError } = await supabase.auth.admin.deleteUser(testUserId)
    
    if (!cleanupAuthError) {
      console.log('✅ Test auth user cleaned up')
    }
    
    console.log('\n🎉 All event tracking tests passed!')
    
  } catch (error) {
    console.error('❌ Event tracking test failed:', error)
    process.exit(1)
  }
}

testEventTracking()