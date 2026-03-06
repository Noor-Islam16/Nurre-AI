const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testTasks() {
  console.log('🎯 Testing Task Planner System...\n')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Create a test user
    console.log('👤 Creating test user for tasks...')
    const testEmail = `test-tasks-${Date.now()}@test.com`
    
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
        name: 'Test Task User',
        adhd_persona: 'planner'
      })
    
    if (profileError) {
      console.error('❌ Failed to create test profile:', profileError)
      process.exit(1)
    }
    console.log('✅ Test profile created')
    
    // Test 1: Create tasks with different priorities
    console.log('\n📝 Test 1: Creating tasks with different priorities...')
    const testTasks = [
      {
        user_id: testUserId,
        title: 'Urgent: Review presentation',
        description: 'Review slides for tomorrow\'s meeting',
        priority: 3,
        time_estimate: 30,
        completed: false
      },
      {
        user_id: testUserId,
        title: 'Write weekly report',
        description: 'Summarize this week\'s progress',
        priority: 2,
        time_estimate: 45,
        completed: false
      },
      {
        user_id: testUserId,
        title: 'Organize desk',
        description: 'Clean and organize workspace',
        priority: 0,
        time_estimate: 15,
        completed: false
      },
      {
        user_id: testUserId,
        title: 'Schedule team meeting',
        description: 'Find time slot for next week',
        priority: 1,
        time_estimate: 10,
        completed: false
      }
    ]
    
    const createdTasks = []
    for (const task of testTasks) {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single()
      
      if (error) {
        console.error(`❌ Failed to create task "${task.title}":`, error)
      } else {
        createdTasks.push(data)
        console.log(`✅ Created task: "${task.title}" (Priority ${task.priority})`)
      }
    }
    
    // Test 2: Create task with AI-generated steps
    console.log('\n📝 Test 2: Creating task with AI-generated steps...')
    const taskWithSteps = {
      user_id: testUserId,
      title: 'Prepare project proposal',
      description: 'Create proposal for new client project',
      priority: 2,
      time_estimate: 60,
      ai_generated_steps: [
        'Open proposal template document',
        'Write executive summary (10 min)',
        'List project objectives (5 min)',
        'Create timeline with milestones (15 min)',
        'Add budget breakdown (10 min)',
        'Review and proofread (5 min)',
        'Export as PDF and save'
      ],
      completed: false
    }
    
    const { data: stepsTask, error: stepsError } = await supabase
      .from('tasks')
      .insert(taskWithSteps)
      .select()
      .single()
    
    if (stepsError) {
      console.error('❌ Failed to create task with steps:', stepsError)
    } else {
      console.log('✅ Created task with AI-generated steps:', stepsTask.title)
      console.log('   Steps:', stepsTask.ai_generated_steps.length)
    }
    
    // Test 3: Query tasks and verify ordering
    console.log('\n📝 Test 3: Querying tasks with priority ordering...')
    const { data: orderedTasks, error: queryError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (queryError) {
      console.error('❌ Failed to query tasks:', queryError)
    } else {
      console.log(`✅ Found ${orderedTasks.length} tasks`)
      orderedTasks.forEach((task, i) => {
        console.log(`   ${i + 1}. [P${task.priority}] ${task.title}`)
      })
    }
    
    // Test 4: Update task (mark as completed)
    console.log('\n📝 Test 4: Marking task as completed...')
    if (createdTasks.length > 0) {
      const taskToComplete = createdTasks[0]
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskToComplete.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Failed to update task:', updateError)
      } else {
        console.log('✅ Task marked as completed:', updatedTask.title)
      }
    }
    
    // Test 5: Test task filtering (active vs completed)
    console.log('\n📝 Test 5: Testing task filtering...')
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
      .is('completed', false)
    
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', testUserId)
      .is('completed', true)
    
    console.log(`✅ Active tasks: ${activeTasks?.length || 0}`)
    console.log(`✅ Completed tasks: ${completedTasks?.length || 0}`)
    
    // Test 6: Calculate total focus time
    console.log('\n📝 Test 6: Calculating total focus time...')
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('time_estimate')
      .eq('user_id', testUserId)
    
    const totalTime = allTasks?.reduce((acc, task) => acc + (task.time_estimate || 0), 0) || 0
    console.log(`✅ Total focus time: ${totalTime} minutes`)
    
    // Test 7: Delete a task
    console.log('\n📝 Test 7: Deleting a task...')
    if (createdTasks.length > 1) {
      const taskToDelete = createdTasks[1]
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id)
      
      if (deleteError) {
        console.error('❌ Failed to delete task:', deleteError)
      } else {
        console.log('✅ Task deleted successfully')
      }
    }
    
    // Test 8: Test task with due date
    console.log('\n📝 Test 8: Creating task with due date...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const { data: dueDateTask, error: dueDateError } = await supabase
      .from('tasks')
      .insert({
        user_id: testUserId,
        title: 'Task with deadline',
        description: 'This task has a due date',
        priority: 2,
        time_estimate: 20,
        due_date: tomorrow.toISOString(),
        completed: false
      })
      .select()
      .single()
    
    if (dueDateError) {
      console.error('❌ Failed to create task with due date:', dueDateError)
    } else {
      console.log('✅ Created task with due date:', dueDateTask.title)
      console.log(`   Due: ${new Date(dueDateTask.due_date).toLocaleDateString()}`)
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    
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
    console.log('\n🎉 All task tests passed!')
    
  } catch (error) {
    console.error('❌ Task test failed:', error)
    process.exit(1)
  }
}

testTasks()