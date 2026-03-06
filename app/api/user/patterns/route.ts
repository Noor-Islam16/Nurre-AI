import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { patternCalculator } from '@/lib/patterns/pattern-calculator'
import { PatternResponse } from '@/lib/patterns/simple-patterns'
import { requestCache } from '@/lib/cache/request-cache'

/**
 * GET /api/user/patterns
 * Returns simple behavioral patterns for the authenticated user
 * Cached for 1 hour to avoid excessive calculations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check cache first (1 hour TTL)
    const cacheKey = `patterns-${user.id}`
    const cached = requestCache.get(cacheKey)
    
    if (cached) {
      return NextResponse.json(cached)
    }
    
    // Calculate patterns
    const patterns = await patternCalculator.getAllPatterns(user.id)
    
    // Build response
    const response: PatternResponse = {
      patterns,
      calculatedAt: new Date().toISOString(),
      userId: user.id
    }
    
    // Cache the result for 1 hour
    requestCache.set(cacheKey, response, 60 * 60 * 1000)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching patterns:', error)
    return NextResponse.json(
      { error: 'Failed to calculate patterns' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/patterns/refresh
 * Force refresh patterns (clears cache)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Clear cache
    const cacheKey = `patterns-${user.id}`
    requestCache.delete(cacheKey)
    
    // Recalculate patterns
    const patterns = await patternCalculator.getAllPatterns(user.id)
    
    // Build response
    const response: PatternResponse = {
      patterns,
      calculatedAt: new Date().toISOString(),
      userId: user.id
    }
    
    // Cache the new result
    requestCache.set(cacheKey, response, 60 * 60 * 1000)
    
    return NextResponse.json({
      ...response,
      refreshed: true
    })
    
  } catch (error) {
    console.error('Error refreshing patterns:', error)
    return NextResponse.json(
      { error: 'Failed to refresh patterns' },
      { status: 500 }
    )
  }
}