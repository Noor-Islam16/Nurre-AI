#!/usr/bin/env node

/**
 * Test script for preferences functionality
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

async function testPreferences() {
  console.log('🧪 Testing Preferences System\n');
  
  try {
    // Check if table exists
    console.log('1️⃣  Checking if preferences table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('preferences')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('   ❌ Preferences table does not exist');
      console.log('   Run: node scripts/apply-preferences-migration.js');
      return;
    }
    
    console.log('   ✅ Preferences table exists');
    
    // Get a test user
    console.log('\n2️⃣  Finding test user...');
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.log('   ❌ No users found');
      return;
    }
    
    const testUser = users[0];
    console.log(`   ✅ Using user: ${testUser.email}`);
    
    // Check if user has preferences
    console.log('\n3️⃣  Checking user preferences...');
    const { data: prefs, error: prefError } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', testUser.id)
      .single();
    
    if (prefError && prefError.code === 'PGRST116') {
      console.log('   ⚠️  User has no preferences, creating defaults...');
      
      const { data: newPrefs, error: createError } = await supabase
        .from('preferences')
        .insert({
          user_id: testUser.id,
          quiet_hours: {
            start: "22:00",
            end: "08:00",
            days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
          }
        })
        .select()
        .single();
      
      if (createError) {
        console.log('   ❌ Error creating preferences:', createError);
        return;
      }
      
      console.log('   ✅ Default preferences created');
    } else if (prefs) {
      console.log('   ✅ User preferences found:');
      console.log(`      - Theme: ${prefs.theme}`);
      console.log(`      - Focus Duration: ${prefs.focus_duration} minutes`);
      console.log(`      - Quiet Hours: ${prefs.quiet_hours.start} - ${prefs.quiet_hours.end}`);
      console.log(`      - AI Personality: ${prefs.ai_personality}`);
    }
    
    // Test API endpoint
    console.log('\n4️⃣  Testing API endpoint...');
    console.log('   Note: API endpoint requires authentication');
    console.log('   To test manually:');
    console.log('   1. Login to the app');
    console.log('   2. Open browser console');
    console.log('   3. Run: fetch("/api/user/preferences").then(r => r.json()).then(console.log)');
    
    // Test quiet hours logic
    console.log('\n5️⃣  Testing quiet hours logic...');
    if (prefs || newPrefs) {
      const quietHours = (prefs || newPrefs).quiet_hours;
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
      
      console.log(`   Current time: ${currentTime} (${currentDay})`);
      console.log(`   Quiet hours: ${quietHours.start} - ${quietHours.end}`);
      
      const isQuiet = (quietHours.days && quietHours.days.includes(currentDay)) && (
        quietHours.start <= quietHours.end
          ? currentTime >= quietHours.start && currentTime <= quietHours.end
          : currentTime >= quietHours.start || currentTime <= quietHours.end
      );
      
      console.log(`   Is quiet time: ${isQuiet ? 'YES' : 'NO'}`);
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testPreferences();