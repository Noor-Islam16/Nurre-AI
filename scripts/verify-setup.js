const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function verifySetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('🔍 Checking environment variables...')
  
  if (!supabaseUrl) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
    process.exit(1)
  }
  if (!supabaseAnonKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  if (!supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  
  console.log('✅ Environment variables configured')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)

  console.log('\n🔗 Testing Supabase connection...')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Test auth connection
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('❌ Auth connection failed:', authError.message)
    } else {
      console.log('✅ Auth service connected')
      console.log(`   Users in database: ${authData.users.length}`)
    }

    console.log('\n📊 Checking database tables...')
    
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

    let tablesFound = 0
    let tablesMissing = []

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        if (error.message.includes('table') || error.message.includes('relation')) {
          console.log(`  ⚠️  Table '${table}' - Not found`)
          tablesMissing.push(table)
        } else {
          console.log(`  ❌ Table '${table}' - Error: ${error.message}`)
        }
      } else {
        console.log(`  ✅ Table '${table}' - Ready`)
        tablesFound++
      }
    }

    console.log(`\n📈 Summary: ${tablesFound}/${tables.length} tables found`)
    
    if (tablesMissing.length > 0) {
      console.log('\n⚠️  Missing tables detected!')
      console.log('\n📝 To complete setup:')
      console.log('1. Go to your Supabase Dashboard: ' + supabaseUrl)
      console.log('2. Navigate to SQL Editor')
      console.log('3. Copy and paste the contents of: supabase/migrations/001_initial_schema.sql')
      console.log('4. Click "Run" to execute the migration')
      console.log('5. Run this script again to verify: npm run verify:setup')
    } else {
      console.log('\n🎉 All tables are configured! Your database is ready.')
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    process.exit(1)
  }
}

verifySetup()