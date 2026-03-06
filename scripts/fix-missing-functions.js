#!/usr/bin/env node

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

async function fixMissingFunctions() {
  console.log('🔧 Fixing missing database functions...\n')

  // SQL to create the update_user_activity function
  const createUpdateUserActivityFunction = `
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
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  const grantPermissions = `
    GRANT EXECUTE ON FUNCTION update_user_activity(UUID) TO authenticated;
  `

  try {
    // Create the function
    console.log('📝 Creating update_user_activity function...')
    const { error: createError } = await supabase.rpc('query', {
      query: createUpdateUserActivityFunction
    }).catch(async () => {
      // If RPC query doesn't work, try direct SQL execution
      const { data, error } = await supabase.from('_sql').insert({
        query: createUpdateUserActivityFunction
      }).select().single()
      return { error }
    })

    if (createError) {
      console.error('❌ Failed to create function:', createError)
      console.log('\n📋 Manual fix required. Run this SQL in your Supabase dashboard:\n')
      console.log(createUpdateUserActivityFunction)
      console.log(grantPermissions)
      return false
    }

    // Grant permissions
    console.log('🔐 Granting permissions...')
    const { error: grantError } = await supabase.rpc('query', {
      query: grantPermissions
    }).catch(async () => {
      // If RPC query doesn't work, try direct SQL execution
      const { data, error } = await supabase.from('_sql').insert({
        query: grantPermissions
      }).select().single()
      return { error }
    })

    if (grantError) {
      console.error('⚠️  Failed to grant permissions:', grantError)
      console.log('\n📋 Please run this SQL manually:\n')
      console.log(grantPermissions)
    }

    console.log('✅ Successfully created update_user_activity function')
    return true

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    console.log('\n📋 Manual fix required. Run this SQL in your Supabase dashboard:\n')
    console.log(createUpdateUserActivityFunction)
    console.log(grantPermissions)
    return false
  }
}

async function verifyFunction() {
  console.log('\n🔍 Verifying function exists...')
  
  try {
    // Test the function with a dummy UUID
    const testUuid = '00000000-0000-0000-0000-000000000000'
    const { error } = await supabase.rpc('update_user_activity', {
      p_user_id: testUuid
    })

    if (error && error.code === 'PGRST202') {
      console.log('❌ Function does not exist')
      return false
    }

    console.log('✅ Function exists and is callable')
    return true
  } catch (error) {
    console.log('❌ Could not verify function:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting database function fix\n')

  // First check if function exists
  const exists = await verifyFunction()
  
  if (exists) {
    console.log('\n✨ Function already exists, no action needed')
    process.exit(0)
  }

  // Try to create the function
  const success = await fixMissingFunctions()
  
  if (success) {
    // Verify it was created
    const nowExists = await verifyFunction()
    if (nowExists) {
      console.log('\n✨ Database function fix completed successfully')
      process.exit(0)
    }
  }

  console.log('\n⚠️  Please create the function manually using the SQL above')
  process.exit(1)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})