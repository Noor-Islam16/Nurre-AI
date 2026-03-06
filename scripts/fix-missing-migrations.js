#!/usr/bin/env node

/**
 * Script to directly apply missing database migrations to Supabase
 * Specifically targets planner_state table and update_user_activity function
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// SQL to create planner_state table if it doesn't exist
const createPlannerStateTable = `
-- Create planner_state table for tracking planner execution intervals
CREATE TABLE IF NOT EXISTS planner_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  last_tick_at TIMESTAMPTZ,
  next_tick_at TIMESTAMPTZ,
  tick_interval_ms INTEGER DEFAULT 600000, -- Default 10 minutes
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Activity tracking columns
  last_activity_at TIMESTAMPTZ,
  manual_override BOOLEAN DEFAULT NULL,
  activity_streak_days INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  last_logout_at TIMESTAMPTZ,
  
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_planner_state_user_id ON planner_state(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_state_next_tick ON planner_state(next_tick_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_planner_state_active ON planner_state(is_active);
CREATE INDEX IF NOT EXISTS idx_planner_state_last_activity ON planner_state(last_activity_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_planner_state_manual_override ON planner_state(manual_override) WHERE manual_override IS NOT NULL;
`

// SQL to create the update_user_activity function
const createUpdateUserActivityFunction = `
-- Create a function to update activity timestamp
CREATE OR REPLACE FUNCTION update_user_activity(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE planner_state
  SET 
    last_activity_at = NOW(),
    is_active = CASE 
      WHEN manual_override = false THEN false
      ELSE true
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Update activity streak if last activity was yesterday
  UPDATE planner_state
  SET activity_streak_days = 
    CASE 
      WHEN last_activity_at::date = CURRENT_DATE - INTERVAL '1 day' 
      THEN activity_streak_days + 1
      WHEN last_activity_at::date < CURRENT_DATE - INTERVAL '1 day'
      THEN 1
      ELSE activity_streak_days
    END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
`

// SQL to create handle_user_login function
const createHandleUserLoginFunction = `
-- Create a function to handle user login
CREATE OR REPLACE FUNCTION handle_user_login(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE planner_state
  SET 
    is_active = CASE 
      WHEN manual_override = false THEN false
      ELSE true
    END,
    last_activity_at = NOW(),
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Create planner state if it doesn't exist
  INSERT INTO planner_state (user_id, is_active, last_activity_at, last_login_at)
  VALUES (p_user_id, true, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
`

// SQL to create handle_user_logout function
const createHandleUserLogoutFunction = `
-- Create a function to handle user logout
CREATE OR REPLACE FUNCTION handle_user_logout(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE planner_state
  SET 
    is_active = false,
    last_logout_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
`

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1)
    
    if (error && error.code === 'PGRST205') {
      // Table doesn't exist
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

async function checkFunctionExists(functionName) {
  try {
    // Try to call the function with a dummy UUID
    const { error } = await supabase.rpc(functionName, {
      p_user_id: '00000000-0000-0000-0000-000000000000'
    })
    
    if (error && error.code === 'PGRST202') {
      // Function doesn't exist
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

async function main() {
  console.log('🔧 Fixing missing database migrations\n')
  
  let fixesApplied = []
  let errors = []
  
  // Check if planner_state table exists
  console.log('📋 Checking planner_state table...')
  const tableExists = await checkTableExists('planner_state')
  
  if (!tableExists) {
    console.log('   ❌ Table not found')
    console.log('   ⚠️  Please run the following SQL in your Supabase SQL editor:\n')
    console.log('-- Create planner_state table')
    console.log(createPlannerStateTable)
    fixesApplied.push('planner_state table creation SQL generated')
  } else {
    console.log('   ✅ Table exists')
  }
  
  // Check if update_user_activity function exists
  console.log('\n📋 Checking update_user_activity function...')
  const updateActivityExists = await checkFunctionExists('update_user_activity')
  
  if (!updateActivityExists) {
    console.log('   ❌ Function not found')
    console.log('   ⚠️  Please run the following SQL in your Supabase SQL editor:\n')
    console.log('-- Create update_user_activity function')
    console.log(createUpdateUserActivityFunction)
    fixesApplied.push('update_user_activity function SQL generated')
  } else {
    console.log('   ✅ Function exists')
  }
  
  // Check if handle_user_login function exists
  console.log('\n📋 Checking handle_user_login function...')
  const loginFunctionExists = await checkFunctionExists('handle_user_login')
  
  if (!loginFunctionExists) {
    console.log('   ❌ Function not found')
    console.log('   ⚠️  Please run the following SQL in your Supabase SQL editor:\n')
    console.log('-- Create handle_user_login function')
    console.log(createHandleUserLoginFunction)
    fixesApplied.push('handle_user_login function SQL generated')
  } else {
    console.log('   ✅ Function exists')
  }
  
  // Check if handle_user_logout function exists
  console.log('\n📋 Checking handle_user_logout function...')
  const logoutFunctionExists = await checkFunctionExists('handle_user_logout')
  
  if (!logoutFunctionExists) {
    console.log('   ❌ Function not found')
    console.log('   ⚠️  Please run the following SQL in your Supabase SQL editor:\n')
    console.log('-- Create handle_user_logout function')
    console.log(createHandleUserLogoutFunction)
    fixesApplied.push('handle_user_logout function SQL generated')
  } else {
    console.log('   ✅ Function exists')
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary')
  console.log('='.repeat(50))
  
  if (fixesApplied.length === 0) {
    console.log('\n✨ All database elements are present!')
    console.log('   The database schema is up to date.')
  } else {
    console.log('\n⚠️  Manual SQL execution required:')
    console.log('\n1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the SQL statements shown above')
    console.log('\nGenerated fixes:')
    fixesApplied.forEach((fix, i) => console.log(`   ${i + 1}. ${fix}`))
    
    // Also create a SQL file with all fixes
    const fs = require('fs').promises
    const path = require('path')
    const sqlFile = path.join(__dirname, 'fix-missing-migrations.sql')
    
    let sqlContent = '-- Fix for missing database migrations\n'
    sqlContent += '-- Generated on: ' + new Date().toISOString() + '\n\n'
    
    if (!tableExists) {
      sqlContent += createPlannerStateTable + '\n\n'
    }
    if (!updateActivityExists) {
      sqlContent += createUpdateUserActivityFunction + '\n\n'
    }
    if (!loginFunctionExists) {
      sqlContent += createHandleUserLoginFunction + '\n\n'
    }
    if (!logoutFunctionExists) {
      sqlContent += createHandleUserLogoutFunction + '\n\n'
    }
    
    await fs.writeFile(sqlFile, sqlContent)
    console.log(`\n💾 SQL file saved to: ${sqlFile}`)
    console.log('   You can copy and paste the contents into Supabase SQL Editor')
  }
  
  process.exit(fixesApplied.length > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})