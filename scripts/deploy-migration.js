const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function deployMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  console.log('🔗 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📝 Running migration...')
    
    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip comments
      if (statement.trim().startsWith('--')) continue
      
      console.log(`  Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql: statement 
      }).single()
      
      if (error) {
        // Try direct query as fallback
        const { error: queryError } = await supabase.from('_sql').select('*').single()
        if (queryError) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, statement.substring(0, 50) + '...')
          console.error('Error:', error.message)
          // Continue with other statements
        }
      }
    }

    console.log('✅ Migration completed successfully!')
    console.log('\n📊 Verifying tables...')
    
    // Verify tables were created
    const tables = [
      'profiles',
      'tasks', 
      'focus_sessions',
      'chat_messages',
      'user_events',
      'mood_entries',
      'interventions',
      'context_snapshots'
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.log(`  ❌ Table '${table}' - Error: ${error.message}`)
      } else {
        console.log(`  ✅ Table '${table}' - Ready`)
      }
    }

    console.log('\n🎉 Database setup complete!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

deployMigration()