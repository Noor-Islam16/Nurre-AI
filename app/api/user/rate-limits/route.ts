import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ENDPOINT_LIMITS } from '@/lib/middleware/rate-limit';
import { RateLimiter } from '@/lib/security/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current usage for each endpoint
    const usage: Record<string, any> = {};
    for (const [endpoint, limits] of Object.entries(ENDPOINT_LIMITS)) {
      const currentUsage = await RateLimiter.getUsage(user.id, endpoint);
      usage[endpoint] = {
        ...limits,
        current: currentUsage?.count || 0,
        resetAt: currentUsage?.resetAt || null,
        remaining: currentUsage ? Math.max(0, limits.requests - currentUsage.count) : limits.requests
      };
    }

    // Return current rate limits and usage for the user
    return NextResponse.json({
      limits: ENDPOINT_LIMITS,
      usage,
      userId: user.id,
      message: 'Rate limits are per endpoint and reset on the specified window'
    });
  } catch (error) {
    console.error('Failed to fetch rate limits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate limits' },
      { status: 500 }
    );
  }
}