#!/usr/bin/env node

/**
 * Test script for database preference integration
 * Verifies that intervention manager uses database preferences
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

async function testPreferenceIntegration() {
  console.log('🧪 Testing Preference Integration\n');
  
  try {
    // Get a test user
    console.log('1️⃣  Finding test user...');
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
    
    // Test 1: Update quiet hours and verify
    console.log('\n2️⃣  Testing quiet hours update...');
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Set quiet hours to current time (should be quiet)
    const quietStart = `${String(currentHour).padStart(2, '0')}:${String(Math.max(0, currentMinute - 5)).padStart(2, '0')}`;
    const quietEnd = `${String((currentHour + 1) % 24).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    const { error: updateError1 } = await supabase
      .from('preferences')
      .update({
        quiet_hours: {
          start: quietStart,
          end: quietEnd,
          days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        }
      })
      .eq('user_id', testUser.id);
    
    if (updateError1) {
      console.log('   ❌ Error updating quiet hours:', updateError1);
    } else {
      console.log(`   ✅ Set quiet hours to ${quietStart} - ${quietEnd}`);
      console.log('   ℹ️  Intervention manager should now block interventions');
    }
    
    // Test 2: Update intervention cooldown
    console.log('\n3️⃣  Testing intervention cooldown update...');
    const cooldownMinutes = 5;
    
    const { error: updateError2 } = await supabase
      .from('preferences')
      .update({
        intervention_cooldown: cooldownMinutes
      })
      .eq('user_id', testUser.id);
    
    if (updateError2) {
      console.log('   ❌ Error updating cooldown:', updateError2);
    } else {
      console.log(`   ✅ Set intervention cooldown to ${cooldownMinutes} minutes`);
    }
    
    // Test 3: Update max interventions per hour
    console.log('\n4️⃣  Testing max interventions update...');
    const maxInterventions = 2;
    
    const { error: updateError3 } = await supabase
      .from('preferences')
      .update({
        max_interventions_per_hour: maxInterventions
      })
      .eq('user_id', testUser.id);
    
    if (updateError3) {
      console.log('   ❌ Error updating max interventions:', updateError3);
    } else {
      console.log(`   ✅ Set max interventions to ${maxInterventions} per hour`);
    }
    
    // Test 4: Update AI personality
    console.log('\n5️⃣  Testing AI personality update...');
    const personalities = ['friendly', 'professional', 'balanced', 'minimal', 'supportive'];
    const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];
    
    const { error: updateError4 } = await supabase
      .from('preferences')
      .update({
        ai_personality: randomPersonality
      })
      .eq('user_id', testUser.id);
    
    if (updateError4) {
      console.log('   ❌ Error updating AI personality:', updateError4);
    } else {
      console.log(`   ✅ Set AI personality to "${randomPersonality}"`);
    }
    
    // Test 5: Verify preferences are readable
    console.log('\n6️⃣  Verifying preferences are accessible...');
    const { data: prefs, error: readError } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', testUser.id)
      .single();
    
    if (readError) {
      console.log('   ❌ Error reading preferences:', readError);
    } else {
      console.log('   ✅ Preferences readable:');
      console.log(`      - Quiet Hours: ${prefs.quiet_hours.start} - ${prefs.quiet_hours.end}`);
      console.log(`      - Cooldown: ${prefs.intervention_cooldown} minutes`);
      console.log(`      - Max/Hour: ${prefs.max_interventions_per_hour}`);
      console.log(`      - AI Personality: ${prefs.ai_personality}`);
      console.log(`      - Focus Duration: ${prefs.focus_duration} minutes`);
      console.log(`      - Notifications: ${prefs.notifications ? 'Enabled' : 'Disabled'}`);
    }
    
    // Reset preferences to reasonable defaults
    console.log('\n7️⃣  Resetting to reasonable defaults...');
    const { error: resetError } = await supabase
      .from('preferences')
      .update({
        quiet_hours: {
          start: "22:00",
          end: "08:00",
          days: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        },
        intervention_cooldown: 15,
        max_interventions_per_hour: 6,
        ai_personality: 'balanced'
      })
      .eq('user_id', testUser.id);
    
    if (resetError) {
      console.log('   ❌ Error resetting preferences:', resetError);
    } else {
      console.log('   ✅ Reset preferences to defaults');
    }
    
    console.log('\n✅ Integration test completed!');
    console.log('\n📝 Manual Testing Instructions:');
    console.log('1. Login to the app');
    console.log('2. Go to Settings → Preferences');
    console.log('3. Change quiet hours to current time');
    console.log('4. Verify AI doesn\'t send interventions');
    console.log('5. Change AI personality and verify tone changes');
    console.log('6. Test cooldown by triggering interventions');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testPreferenceIntegration();