#!/usr/bin/env node

/**
 * Migration script to remove lunch quiet hours from existing user preferences
 * This fixes users who already have the lunch period (12:00-13:00) in their database
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

async function removeLunchQuietHours() {
  console.log('🔧 Migrating User Preferences - Removing Lunch Quiet Hours\n');
  
  try {
    // Get all user preferences with quiet_hours
    const { data: preferences, error: fetchError } = await supabase
      .from('preferences')
      .select('id, user_id, quiet_hours');
    
    if (fetchError) {
      console.error('❌ Failed to fetch preferences:', fetchError);
      return;
    }
    
    if (!preferences || preferences.length === 0) {
      console.log('No user preferences found in database.');
      console.log('New users will get the corrected defaults automatically.');
      return;
    }
    
    console.log(`Found ${preferences.length} user preference records to check\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const pref of preferences) {
      if (!pref.quiet_hours) {
        console.log(`⏭️  User ${pref.user_id} - No quiet_hours set, skipping`);
        skippedCount++;
        continue;
      }
      
      // Check if lunch period exists
      const hasLunch = pref.quiet_hours.some(range => 
        range.start === '12:00' && range.end === '13:00'
      );
      
      if (!hasLunch) {
        console.log(`✅ User ${pref.user_id} - No lunch period found, skipping`);
        skippedCount++;
        continue;
      }
      
      // Remove lunch period
      const newQuietHours = pref.quiet_hours.filter(range => 
        !(range.start === '12:00' && range.end === '13:00')
      );
      
      // Update the database
      const { error: updateError } = await supabase
        .from('preferences')
        .update({ 
          quiet_hours: newQuietHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', pref.id);
      
      if (updateError) {
        console.error(`❌ Failed to update user ${pref.user_id}:`, updateError);
      } else {
        console.log(`🔧 User ${pref.user_id} - Removed lunch quiet period`);
        updatedCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  Updated: ${updatedCount} users`);
    console.log(`  Skipped: ${skippedCount} users`);
    console.log(`  Total:   ${preferences.length} users`);
    
    if (updatedCount > 0) {
      console.log('\n✅ Migration complete! Lunch quiet hours have been removed.');
      console.log('   Users can now receive interventions during lunch time (12:00-13:00)');
    } else {
      console.log('\n✅ No users needed updating. All preferences are correct.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Add dry-run option
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  
  // Just check how many users would be affected
  supabase
    .from('preferences')
    .select('id, user_id, quiet_hours')
    .then(({ data: preferences }) => {
      if (!preferences) {
        console.log('No preferences found');
        return;
      }
      
      const affectedUsers = preferences.filter(pref => 
        pref.quiet_hours?.some(range => 
          range.start === '12:00' && range.end === '13:00'
        )
      );
      
      console.log(`Would update ${affectedUsers.length} out of ${preferences.length} users`);
      
      if (affectedUsers.length > 0) {
        console.log('\nAffected users:');
        affectedUsers.forEach(pref => {
          console.log(`  - User ${pref.user_id}`);
        });
      }
    });
} else {
  // Run the actual migration
  removeLunchQuietHours();
}