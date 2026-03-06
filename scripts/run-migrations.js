#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const fs = require('fs').promises
const path = require('path')
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

// Migration files in order
const MIGRATIONS = [
  '001_initial_schema.sql',
  '004_ai_errors_table.sql',
  '004_enhance_mood_entries.sql',
  '005_assessment_tracking.sql',
  '005_focus_session_enhancements.sql',
  '005_mood_sliders_redesign.sql',
  '005_simple_mood_sliders.sql',
  '006_reminders_table.sql',
  '007_intervention_enhancements.sql',
  '008_pattern_detection.sql',
  '009_tool_calls_native.sql',
  '010_planner_state.sql',
  '011_planner_state_activity.sql',
  '012_data_retention_policies.sql',
  '013_monitoring_functions.sql',
  '014_performance_indexes.sql',
  '015_index_helpers.sql'
]

async function createMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      execution_time_ms INTEGER,
      success BOOLEAN DEFAULT true,
      error_message TEXT
    );
  `
  
  try {
    console.log('📋 Creating migrations tracking table...')
    // Note: In production, you'd execute this via Supabase SQL editor
    // This is a placeholder for the actual implementation
    console.log('ℹ️  Please ensure schema_migrations table exists in your database')
    return true
  } catch (error) {
    console.error('Failed to create migrations table:', error)
    return false
  }
}

async function getMigrationStatus(version) {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version, success')
      .eq('version', version)
      .single()
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist or no matching row
      return null
    }
    
    return data
  } catch (error) {
    return null
  }
}

async function recordMigration(version, success, executionTime, errorMessage = null) {
  try {
    const { error } = await supabase
      .from('schema_migrations')
      .insert({
        version,
        success,
        execution_time_ms: executionTime,
        error_message: errorMessage
      })
    
    if (error) {
      console.error(`Failed to record migration ${version}:`, error)
    }
  } catch (error) {
    console.error(`Failed to record migration ${version}:`, error)
  }
}

async function runMigration(migrationFile) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
  
  try {
    // Read migration file
    const sql = await fs.readFile(migrationPath, 'utf8')
    
    console.log(`\n📝 Running migration: ${migrationFile}`)
    
    const startTime = Date.now()
    
    // Note: In a real implementation, you would execute the SQL
    // This is a placeholder - actual execution would require:
    // 1. Direct database connection
    // 2. Supabase CLI
    // 3. Or manual execution in Supabase dashboard
    
    console.log(`⚠️  Manual execution required for ${migrationFile}`)
    console.log('   Please run this migration in your Supabase SQL editor')
    
    const executionTime = Date.now() - startTime
    
    // Record as pending since manual execution is required
    await recordMigration(migrationFile, false, executionTime, 'Manual execution required')
    
    return false
  } catch (error) {
    console.error(`❌ Failed to run ${migrationFile}:`, error.message)
    await recordMigration(migrationFile, false, 0, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting database migrations\n')
  
  // Create migrations table if it doesn't exist
  await createMigrationsTable()
  
  let pendingMigrations = []
  let completedMigrations = []
  let failedMigrations = []
  
  // Check status of each migration
  for (const migration of MIGRATIONS) {
    const status = await getMigrationStatus(migration)
    
    if (!status) {
      pendingMigrations.push(migration)
    } else if (status.success) {
      completedMigrations.push(migration)
    } else {
      failedMigrations.push(migration)
    }
  }
  
  // Report status
  console.log('📊 Migration Status:')
  console.log(`   ✅ Completed: ${completedMigrations.length}`)
  console.log(`   ⏳ Pending: ${pendingMigrations.length}`)
  console.log(`   ❌ Failed: ${failedMigrations.length}`)
  
  if (completedMigrations.length > 0) {
    console.log('\n✅ Completed migrations:')
    completedMigrations.forEach(m => console.log(`   - ${m}`))
  }
  
  if (failedMigrations.length > 0) {
    console.log('\n❌ Failed migrations (need retry):')
    failedMigrations.forEach(m => console.log(`   - ${m}`))
  }
  
  if (pendingMigrations.length === 0 && failedMigrations.length === 0) {
    console.log('\n✨ All migrations are up to date!')
    process.exit(0)
  }
  
  // Process pending and failed migrations
  const toRun = [...failedMigrations, ...pendingMigrations]
  
  console.log(`\n🔄 Migrations to run: ${toRun.length}`)
  toRun.forEach(m => console.log(`   - ${m}`))
  
  console.log('\n' + '='.repeat(50))
  console.log('⚠️  IMPORTANT: Database migrations must be run manually')
  console.log('='.repeat(50))
  console.log('\nTo apply migrations:')
  console.log('1. Go to your Supabase dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Run each migration file in order')
  console.log('4. Files are located in: supabase/migrations/')
  console.log('\nMigrations to apply in order:')
  toRun.forEach((m, i) => console.log(`${i + 1}. ${m}`))
  
  // For automation in CI/CD, you could use Supabase CLI:
  console.log('\n💡 Alternative: Use Supabase CLI')
  console.log('   npx supabase db push')
  console.log('   (requires supabase/config.toml setup)')
  
  process.exit(toRun.length > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})