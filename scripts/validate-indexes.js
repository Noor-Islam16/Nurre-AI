const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function validateIndexes() {
  console.log('Validating database indexes...\n')

  const requiredIndexes = [
    'idx_user_events_created_at',
    'idx_user_events_user_created',
    'idx_chat_messages_user_created',
    'idx_chat_messages_conversation',
    'idx_tasks_user_status_due',
    'idx_focus_sessions_user_created',
    'idx_ai_errors_created_at'
  ]

  try {
    // Get all indexes
    const { data: indexes, error } = await supabase.rpc('get_all_indexes')
    
    if (error) {
      console.error('Failed to fetch indexes:', error)
      return
    }

    const indexNames = indexes ? indexes.map(idx => idx.index_name) : []
    
    console.log('Required Indexes Status:')
    console.log('------------------------')
    
    let missingCount = 0
    requiredIndexes.forEach(indexName => {
      const exists = indexNames.includes(indexName)
      console.log(`${exists ? '✅' : '❌'} ${indexName}`)
      if (!exists) missingCount++
    })

    if (missingCount > 0) {
      console.log(`\n⚠️  ${missingCount} required indexes are missing!`)
      console.log('Run the migration to create them:')
      console.log('npx supabase migration up')
    } else {
      console.log('\n✅ All required indexes are present!')
    }

    // Check for unused indexes
    const { data: usage, error: usageError } = await supabase.rpc('get_index_usage')
    
    if (!usageError && usage) {
      const unusedIndexes = usage.filter(idx => idx.index_scans === 0)
      
      if (unusedIndexes.length > 0) {
        console.log('\nUnused Indexes (consider removing):')
        console.log('-----------------------------------')
        
        unusedIndexes.forEach(idx => {
          console.log(`⚠️  ${idx.index_name} - Never used (Size: ${idx.index_size})`)
        })
      }
    }

    // Get suggestions for missing indexes
    const { data: suggestions, error: suggestError } = await supabase.rpc('suggest_missing_indexes')
    
    if (!suggestError && suggestions && suggestions.length > 0) {
      console.log('\nSuggested New Indexes:')
      console.log('---------------------')
      
      suggestions.forEach(s => {
        console.log(`📊 ${s.table_name}.${s.column_name} - ${s.estimated_improvement} impact`)
      })
    }

    // Check index efficiency
    if (usage && usage.length > 0) {
      console.log('\nTop 5 Most Used Indexes:')
      console.log('------------------------')
      
      usage
        .sort((a, b) => b.index_scans - a.index_scans)
        .slice(0, 5)
        .forEach(idx => {
          console.log(`📈 ${idx.index_name}: ${idx.index_scans.toLocaleString()} scans (${idx.index_size})`)
        })
    }

    // Display summary
    console.log('\n=== Summary ===')
    console.log(`Total indexes found: ${indexNames.length}`)
    console.log(`Required indexes: ${requiredIndexes.length}`)
    console.log(`Missing indexes: ${missingCount}`)
    
    if (usage) {
      const totalScans = usage.reduce((sum, idx) => sum + (idx.index_scans || 0), 0)
      console.log(`Total index scans: ${totalScans.toLocaleString()}`)
    }

  } catch (error) {
    console.error('Validation error:', error)
    process.exit(1)
  }
}

// Run validation
validateIndexes()
  .then(() => {
    console.log('\n✅ Index validation complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })