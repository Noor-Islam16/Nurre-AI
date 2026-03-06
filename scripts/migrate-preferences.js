#!/usr/bin/env node

/**
 * Migration script for user preferences
 * Creates preference records for existing users
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

async function migratePreferences() {
  console.log('🔄 Starting preferences migration...\n');
  
  try {
    // Get all users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, adhd_persona');
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    console.log(`Found ${users.length} users to process`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of users) {
      // Check if preferences already exist
      const { data: existing } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        console.log(`⏭️  Skipping ${user.email} - preferences already exist`);
        skipped++;
        continue;
      }
      
      // Create default preferences based on ADHD persona
      const defaultPrefs = {
        user_id: user.id,
        quiet_hours: {
          start: "22:00",
          end: "08:00",
          days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        },
        theme: 'auto',
        focus_duration: user.adhd_persona === 'energetic' ? 15 : 25,
        break_ratio: user.adhd_persona === 'creative' ? 0.30 : 0.20,
        notifications: true,
        ai_personality: user.adhd_persona || 'balanced',
        intervention_cooldown: user.adhd_persona === 'anxious' ? 20 : 15,
        max_interventions_per_hour: user.adhd_persona === 'anxious' ? 4 : 6
      };
      
      const { error: createError } = await supabase
        .from('preferences')
        .insert(defaultPrefs);
      
      if (createError) {
        console.error(`❌ Error creating preferences for ${user.email}:`, createError);
        errors++;
      } else {
        console.log(`✅ Created preferences for ${user.email}`);
        created++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePreferences();