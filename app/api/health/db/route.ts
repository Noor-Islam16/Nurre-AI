import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureApiResponse } from '@/lib/api/with-security-headers'

// Critical database functions that should exist
// Note: Planner functions (handle_user_login, handle_user_logout, etc.) were removed
// as the background planner was eliminated per Architecture Specification
const CRITICAL_FUNCTIONS: string[] = []

// Critical tables that should exist
const CRITICAL_TABLES = [
  'users',
  'tasks',
  'focus_sessions',
  'conversations',
  'events',
  'mood_entries',
  'preferences'
]

async function checkFunction(supabase: any, functionName: string) {
  try {
    // Try to call the function with a dummy UUID
    const testUuid = '00000000-0000-0000-0000-000000000000'
    const { error } = await supabase.rpc(functionName, {
      p_user_id: testUuid
    })
    
    // PGRST202 means function not found
    if (error && error.code === 'PGRST202') {
      return { exists: false, error: 'Function not found' }
    }
    
    // Other errors are OK (like foreign key constraints)
    // as long as the function exists
    return { exists: true, error: null }
  } catch (error: any) {
    return { exists: false, error: error.message }
  }
}

async function checkTable(supabase: any, tableName: string) {
  try {
    // Try to select with limit 0 to check if table exists
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    if (error) {
      return { exists: false, error: error.message }
    }
    
    return { exists: true, error: null }
  } catch (error: any) {
    return { exists: false, error: error.message }
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication (optional - remove if you want public health check)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.HEALTH_CHECK_TOKEN}` && process.env.HEALTH_CHECK_TOKEN) {
      // Only require auth if HEALTH_CHECK_TOKEN is set
      return createSecureApiResponse({ 
        error: 'Unauthorized' 
      }, 401)
    }
    
    const results = {
      status: 'checking',
      timestamp: new Date().toISOString(),
      functions: {} as Record<string, any>,
      tables: {} as Record<string, any>,
      summary: {
        totalFunctions: CRITICAL_FUNCTIONS.length,
        missingFunctions: 0,
        totalTables: CRITICAL_TABLES.length,
        missingTables: 0
      },
      recommendations: [] as string[]
    }
    
    // Check all critical functions
    for (const func of CRITICAL_FUNCTIONS) {
      const result = await checkFunction(supabase, func)
      results.functions[func] = result
      if (!result.exists) {
        results.summary.missingFunctions++
      }
    }
    
    // Check all critical tables
    for (const table of CRITICAL_TABLES) {
      const result = await checkTable(supabase, table)
      results.tables[table] = result
      if (!result.exists) {
        results.summary.missingTables++
      }
    }
    
    // Determine overall status
    if (results.summary.missingFunctions === 0 && results.summary.missingTables === 0) {
      results.status = 'healthy'
    } else if (results.summary.missingFunctions > 2 || results.summary.missingTables > 2) {
      results.status = 'critical'
    } else {
      results.status = 'degraded'
    }
    
    // Add recommendations
    if (results.summary.missingFunctions > 0) {
      results.recommendations.push(
        'Run: npm run db:fix-functions',
        'Or run migrations: npm run db:migrate'
      )
    }
    
    if (results.summary.missingTables > 0) {
      results.recommendations.push(
        'Critical tables are missing. Run migrations: npm run db:migrate'
      )
    }
    
    // Return appropriate status code
    const statusCode = results.status === 'healthy' ? 200 : 
                      results.status === 'degraded' ? 206 : 503
    
    return createSecureApiResponse(results, statusCode)
    
  } catch (error: any) {
    console.error('Health check error:', error)
    return createSecureApiResponse({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error occurred'
    }, 500)
  }
}

// Optional: HEAD request for simpler health checks
export async function HEAD(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Quick check - just verify we can connect
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(0)
    
    if (error) {
      return new Response(null, { status: 503 })
    }
    
    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}