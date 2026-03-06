import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAdmin, isAdminAuthError } from '@/lib/auth/admin-auth'

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const auth = await verifyAdmin()
    if (isAdminAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = await createClient()

    // Get index usage statistics
    const { data: indexUsage, error: usageError } = await supabase
      .rpc('get_index_usage')

    if (usageError) {
      console.error('Index usage error:', usageError)
    }

    // Get missing index suggestions
    const { data: suggestions, error: suggestionError } = await supabase
      .rpc('suggest_missing_indexes')

    if (suggestionError) {
      console.error('Index suggestion error:', suggestionError)
    }

    // Get slow queries (if pg_stat_statements is enabled)
    let slowQueries = null
    try {
      const { data } = await supabase.rpc('get_slow_queries')
      slowQueries = data
    } catch (error) {
      // Ignore error if function doesn't exist or pg_stat_statements not enabled
      console.log('Slow queries function not available')
    }

    return NextResponse.json({
      index_usage: indexUsage || [],
      missing_indexes: suggestions || [],
      slow_queries: slowQueries || [],
      message: 'Index statistics retrieved successfully'
    })
  } catch (error) {
    console.error('Index monitoring error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve index statistics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const auth = await verifyAdmin()
    if (isAdminAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = await createClient()
    const { action } = await request.json()

    if (action === 'analyze') {
      // Run ANALYZE on all tables
      const tables = [
        'events', 'conversations', 'tasks',
        'focus_sessions', 'users', 'mood_entries', 'preferences'
      ]

      for (const table of tables) {
        await supabase.rpc('analyze_table', { table_name: table })
      }

      return NextResponse.json({
        success: true,
        message: 'Tables analyzed successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    )
  }
}