#!/usr/bin/env node

/**
 * Apply preferences table migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Applying preferences table migration...\n');
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '018_preferences_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements (simple split by semicolon)
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Use raw SQL execution via RPC
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();
      
      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('RPC not available, statement needs manual execution');
      }
    }
    
    // Check if table was created
    const { data: tables } = await supabase
      .from('preferences')
      .select('id')
      .limit(1);
    
    if (tables !== null) {
      console.log('\n✅ Preferences table created successfully!');
    } else {
      console.log('\n⚠️  Table creation needs manual execution in Supabase SQL Editor');
      console.log('\nPlease copy the contents of:');
      console.log(migrationPath);
      console.log('\nAnd run it in your Supabase SQL Editor');
    }
    
    // Run the preferences migration for existing users
    console.log('\n🔄 Running preferences migration for existing users...');
    const migrationScript = require('./migrate-preferences.js');
    
  } catch (error) {
    console.error('Migration error:', error);
    console.log('\n⚠️  Please run the migration manually in Supabase SQL Editor');
    console.log('File: supabase/migrations/018_preferences_table.sql');
  }
}

// Run migration
applyMigration();