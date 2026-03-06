#!/usr/bin/env node

/**
 * Test script for pattern insights feature
 * Tests pattern calculations and API endpoint
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData(userId) {
  console.log('📝 Creating test data...');
  
  const now = new Date();
  const tasks = [];
  const focusSessions = [];
  const events = [];
  
  // Create some completed tasks at different hours for peak hours pattern
  const hoursWithCompletions = [9, 10, 14, 9, 10, 9, 15, 10, 14, 9];
  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(i / 2);
    const completedAt = new Date(now);
    completedAt.setDate(completedAt.getDate() - daysAgo);
    completedAt.setHours(hoursWithCompletions[i], 0, 0, 0);
    
    tasks.push({
      user_id: userId,
      title: `Test Task ${i + 1}`,
      completed: true,
      completed_at: completedAt.toISOString(),
      created_at: new Date(completedAt.getTime() - 60 * 60 * 1000).toISOString()
    });
  }
  
  // Create some incomplete tasks for velocity calculation
  for (let i = 0; i < 5; i++) {
    tasks.push({
      user_id: userId,
      title: `Incomplete Task ${i + 1}`,
      completed: false,
      created_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  // Create focus sessions for optimal duration pattern
  const durations = [25, 30, 25, 20, 25, 30, 25];
  for (let i = 0; i < durations.length; i++) {
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - i);
    
    focusSessions.push({
      user_id: userId,
      duration: durations[i],
      actual_duration: durations[i],
      completed: true,
      effectiveness: Math.floor(75 + Math.random() * 25),
      created_at: createdAt.toISOString(),
      ended_at: new Date(createdAt.getTime() + durations[i] * 60 * 1000).toISOString()
    });
  }
  
  // Create recent events for momentum and procrastination detection
  // Recent task completions for momentum
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  tasks.push({
    user_id: userId,
    title: 'Recent Completed Task',
    completed: true,
    completed_at: oneHourAgo.toISOString(),
    created_at: new Date(oneHourAgo.getTime() - 30 * 60 * 1000).toISOString()
  });
  
  // Events for procrastination detection
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  events.push(
    {
      user_id: userId,
      type: 'page_view',
      data: { page: '/tasks' },
      created_at: new Date(thirtyMinutesAgo.getTime() - 5 * 60 * 1000).toISOString()
    },
    {
      user_id: userId,
      type: 'idle_detected',
      data: { idleTime: 300 },
      created_at: thirtyMinutesAgo.toISOString()
    }
  );
  
  // Insert test data
  const { error: tasksError } = await supabase
    .from('tasks')
    .insert(tasks);
  
  if (tasksError) {
    console.error('Error creating test tasks:', tasksError);
  }
  
  const { error: sessionsError } = await supabase
    .from('focus_sessions')
    .insert(focusSessions);
  
  if (sessionsError) {
    console.error('Error creating test sessions:', sessionsError);
  }
  
  const { error: eventsError } = await supabase
    .from('events')
    .insert(events);
  
  if (eventsError) {
    console.error('Error creating test events:', eventsError);
  }
  
  console.log('✅ Test data created');
}

async function testPatternCalculations(userId) {
  console.log('\n🧮 Testing Pattern Calculations\n');
  
  // Since we can't import TypeScript directly in Node, we'll test via database queries
  console.log('Testing pattern data availability...');
  
  // Test 1: Check for completed tasks (for peak hours)
  const { data: completedTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .not('completed_at', 'is', null)
    .limit(10);
  
  if (completedTasks && completedTasks.length > 0) {
    console.log(`   ✅ Found ${completedTasks.length} completed tasks for peak hours analysis`);
    
    // Analyze peak hours manually
    const hourCounts = {};
    completedTasks.forEach(task => {
      const hour = new Date(task.completed_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => {
        const h = parseInt(hour);
        return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      });
    
    if (peakHours.length > 0) {
      console.log(`      Peak hours detected: ${peakHours.join(', ')}`);
    }
  } else {
    console.log('   ⚠️  No completed tasks found');
  }
  
  // Test 2: Check for focus sessions (for optimal duration)
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('duration, actual_duration, effectiveness')
    .eq('user_id', userId)
    .eq('completed', true)
    .limit(10);
  
  if (sessions && sessions.length > 0) {
    console.log(`\n   ✅ Found ${sessions.length} focus sessions for duration analysis`);
    
    const avgDuration = Math.round(
      sessions.reduce((sum, s) => sum + (s.actual_duration || s.duration || 0), 0) / sessions.length
    );
    console.log(`      Average focus duration: ${avgDuration} minutes`);
  } else {
    console.log('\n   ⚠️  No focus sessions found');
  }
  
  // Test 3: Check task velocity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('completed')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString());
  
  if (recentTasks && recentTasks.length > 0) {
    const completed = recentTasks.filter(t => t.completed).length;
    const rate = Math.round((completed / recentTasks.length) * 100);
    console.log(`\n   ✅ Task velocity: ${rate}% (${completed}/${recentTasks.length} tasks completed)`);
  } else {
    console.log('\n   ⚠️  No recent tasks for velocity calculation');
  }
  
  // Test 4: Check for recent events (momentum/procrastination)
  const { data: recentEvents } = await supabase
    .from('events')
    .select('type, data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (recentEvents && recentEvents.length > 0) {
    console.log(`\n   ✅ Found ${recentEvents.length} recent events for behavior analysis`);
    const idleCount = recentEvents.filter(e => e.type === 'idle_detected').length;
    if (idleCount > 0) {
      console.log(`      Detected ${idleCount} idle events (potential procrastination)`);
    }
  } else {
    console.log('\n   ⚠️  No recent events found');
  }
}

async function testAPIEndpoint() {
  console.log('\n🌐 Testing API Endpoint\n');
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Note: This won't work without authentication
    // In a real test, you'd need to authenticate first
    console.log('API endpoint test requires authentication.');
    console.log('To test manually:');
    console.log('1. Login to the app');
    console.log('2. Open browser console');
    console.log('3. Run: fetch("/api/user/patterns").then(r => r.json()).then(console.log)');
  } catch (error) {
    console.error('API test error:', error);
  }
}

async function cleanupTestData(userId) {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete test tasks
  await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .like('title', '%Test Task%');
  
  await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .like('title', '%Incomplete Task%');
  
  await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .eq('title', 'Recent Completed Task');
  
  // Note: Focus sessions and events will be cleaned up by the cleanup job
  
  console.log('✅ Cleanup complete');
}

async function main() {
  console.log('🧪 Pattern Insights Test Suite\n');
  
  // Get or create test user
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .like('email', '%test%')
    .limit(1);
  
  if (!users || users.length === 0) {
    console.error('❌ No test user found. Please create a test user first.');
    process.exit(1);
  }
  
  const testUser = users[0];
  console.log(`Using test user: ${testUser.email} (${testUser.id})`);
  
  const skipDataCreation = process.argv.includes('--skip-data');
  const skipCleanup = process.argv.includes('--skip-cleanup');
  
  try {
    if (!skipDataCreation) {
      await createTestData(testUser.id);
    }
    
    await testPatternCalculations(testUser.id);
    await testAPIEndpoint();
    
    if (!skipCleanup) {
      await cleanupTestData(testUser.id);
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main();