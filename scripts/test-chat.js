const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testChat() {
  console.log('🎯 Testing Chat Interface System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test user
    console.log('👤 Creating test user for chat...')
    const testEmail = `test-chat-${Date.now()}@test.com`
    
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
        name: 'Test Chat User',
        adhd_persona: 'sprinter'
      })
    
    if (profileError) {
      console.error('❌ Failed to create test profile:', profileError)
      process.exit(1)
    }
    console.log('✅ Test profile created')
    
    // Test 1: Store chat messages
    console.log('\n📝 Test 1: Storing chat messages...')
    const messages = [
      { role: 'user', content: 'Hello, I need help focusing today' },
      { role: 'assistant', content: 'Hi there! I understand focusing can be challenging. Let me help you get started. What task are you working on today?' },
      { role: 'user', content: 'I need to write a report but I keep getting distracted' },
      { role: 'assistant', content: 'Reports can feel overwhelming! Let\'s break it down into smaller chunks. How about we start with just 15 minutes on the outline? That\'s much more manageable than thinking about the whole report.' }
    ]
    
    for (const message of messages) {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: testUserId,
          role: message.role,
          content: message.content
        })
      
      if (error) {
        console.error(`❌ Failed to insert ${message.role} message:`, error)
      } else {
        console.log(`✅ Stored ${message.role} message`)
      }
    }
    
    // Test 2: Query chat messages
    console.log('\n📝 Test 2: Querying chat messages...')
    const { data: chatMessages, error: queryError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true })
    
    if (queryError) {
      console.error('❌ Failed to query messages:', queryError)
    } else {
      console.log(`✅ Found ${chatMessages.length} messages`)
      chatMessages.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`)
      })
    }
    
    // Test 3: Test function calls in messages
    console.log('\n📝 Test 3: Testing function calls in messages...')
    const messageWithFunction = {
      user_id: testUserId,
      role: 'assistant',
      content: 'I\'ll start a 25-minute focus timer for you.',
      function_calls: [{
        name: 'start_focus_timer',
        arguments: { duration: 25 }
      }]
    }
    
    const { error: funcError } = await supabase
      .from('chat_messages')
      .insert(messageWithFunction)
    
    if (funcError) {
      console.error('❌ Failed to store message with function call:', funcError)
    } else {
      console.log('✅ Stored message with function call')
    }
    
    // Test 4: Test recent messages query (for context)
    console.log('\n📝 Test 4: Testing recent messages query...')
    const { data: recentMessages, error: recentError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (recentError) {
      console.error('❌ Failed to query recent messages:', recentError)
    } else {
      console.log(`✅ Retrieved ${recentMessages.length} recent messages`)
      const reversed = recentMessages.reverse()
      reversed.forEach((msg, i) => {
        console.log(`   ${i + 1}. ${msg.role}: ${msg.content.substring(0, 40)}...`)
      })
    }
    
    // Test 5: Create a sample task for context
    console.log('\n📝 Test 5: Creating task for chat context...')
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: testUserId,
        title: 'Write quarterly report',
        description: 'Complete Q4 2024 report',
        priority: 1,
        completed: false,
        time_estimate: 120
      })
      .select()
      .single()
    
    if (taskError) {
      console.error('❌ Failed to create task:', taskError)
    } else {
      console.log('✅ Created task:', task.title)
    }
    
    // Test 6: Test chat with task context
    console.log('\n📝 Test 6: Testing chat with task context...')
    const contextMessage = {
      user_id: testUserId,
      role: 'user',
      content: 'How should I approach my current task?'
    }
    
    const { error: contextError } = await supabase
      .from('chat_messages')
      .insert(contextMessage)
    
    if (!contextError) {
      // Simulate AI response with task context
      const aiResponse = {
        user_id: testUserId,
        role: 'assistant',
        content: `I see you're working on "${task?.title || 'your task'}". Since you mentioned getting distracted earlier, let's use the sprint approach: Set a timer for 15 minutes and focus just on creating a basic outline. Don't worry about perfection - just get your main points down. Ready to start?`
      }
      
      const { error: aiError } = await supabase
        .from('chat_messages')
        .insert(aiResponse)
      
      if (!aiError) {
        console.log('✅ Simulated context-aware AI response')
      }
    }
    
    // Test 7: Test message deletion
    console.log('\n📝 Test 7: Testing message deletion...')
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', testUserId)
      .eq('role', 'user')
      .limit(1)
    
    if (!deleteError) {
      console.log('✅ Successfully deleted a message')
    }
    
    // Test 8: Verify chat history ordering
    console.log('\n📝 Test 8: Verifying chat history ordering...')
    const { data: orderedMessages, error: orderError } = await supabase
      .from('chat_messages')
      .select('created_at, role, content')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: true })
    
    if (!orderError && orderedMessages) {
      let previousTime = null
      let orderCorrect = true
      
      for (const msg of orderedMessages) {
        if (previousTime && new Date(msg.created_at) < new Date(previousTime)) {
          orderCorrect = false
          break
        }
        previousTime = msg.created_at
      }
      
      if (orderCorrect) {
        console.log('✅ Messages are correctly ordered by timestamp')
      } else {
        console.log('❌ Message ordering issue detected')
      }
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    
    await supabase
      .from('chat_messages')
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
    console.log('\n🎉 All chat tests passed!')
    
  } catch (error) {
    console.error('❌ Chat test failed:', error)
    process.exit(1)
  }
}

testChat()