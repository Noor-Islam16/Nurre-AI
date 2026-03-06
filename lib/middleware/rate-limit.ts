import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { RateLimiter } from '@/lib/security/rate-limiter';

export interface EndpointLimits {
  requests: number;
  window: number;  // in seconds
}

// Configure limits per endpoint
export const ENDPOINT_LIMITS: Record<string, EndpointLimits> = {
  '/api/ai/chat': {
    requests: parseInt(process.env.RATE_LIMIT_CHAT_REQUESTS || '10'),
    window: parseInt(process.env.RATE_LIMIT_CHAT_WINDOW || '60')
  },
  '/api/ai/intervention': {
    requests: parseInt(process.env.RATE_LIMIT_INTERVENTION_REQUESTS || '20'),
    window: parseInt(process.env.RATE_LIMIT_INTERVENTION_WINDOW || '60')
  },
  '/api/ai/welcome': {
    requests: parseInt(process.env.RATE_LIMIT_WELCOME_REQUESTS || '5'),
    window: parseInt(process.env.RATE_LIMIT_WELCOME_WINDOW || '300')
  },
  '/api/ai/embedding': {
    requests: parseInt(process.env.RATE_LIMIT_EMBEDDING_REQUESTS || '30'),
    window: parseInt(process.env.RATE_LIMIT_EMBEDDING_WINDOW || '60')
  },
};

// Default limits for endpoints not in the list
const DEFAULT_LIMITS: EndpointLimits = {
  requests: parseInt(process.env.RATE_LIMIT_DEFAULT_REQUESTS || '30'),
  window: parseInt(process.env.RATE_LIMIT_DEFAULT_WINDOW || '60')
};

export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
  customLimits?: EndpointLimits
): Promise<NextResponse> {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this endpoint' },
        { status: 401 }
      );
    }

    // Get endpoint path
    const endpoint = new URL(request.url).pathname;
    const limits = customLimits || ENDPOINT_LIMITS[endpoint] || DEFAULT_LIMITS;

    // Check rate limit
    const result = await RateLimiter.checkLimit({
      requests: limits.requests,
      window: limits.window,
      identifier: user.id,
      endpoint
    });

    // If rate limit exceeded, return 429
    if (!result.success) {
      const waitTime = Math.ceil((result.reset - Date.now()) / 1000);
      const response = NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${waitTime} seconds.`,
          retryAfter: waitTime,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset
        },
        { status: 429 }
      );
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());
      response.headers.set('Retry-After', waitTime.toString());
      
      return response;
    }

    // Process the request
    const response = await handler(request);

    // Add rate limit headers to successful response
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    return response;
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // On error, allow the request but log it
    // This ensures the service remains available even if rate limiting fails
    return handler(request);
  }
}

// Helper for creating rate-limited handlers with custom limits
export function createRateLimitedHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limits?: EndpointLimits
) {
  return (request: NextRequest) => withRateLimit(request, handler, limits);
}

// Helper to check if user is approaching rate limit
export function isApproachingLimit(remaining: number, limit: number): boolean {
  const threshold = Math.max(1, Math.floor(limit * 0.2)); // Warn when 20% remaining
  return remaining <= threshold;
}

// Utility to parse rate limit headers from response
export function parseRateLimitHeaders(headers: Headers) {
  return {
    limit: parseInt(headers.get('X-RateLimit-Limit') || '0'),
    remaining: parseInt(headers.get('X-RateLimit-Remaining') || '0'),
    reset: parseInt(headers.get('X-RateLimit-Reset') || '0'),
    retryAfter: parseInt(headers.get('Retry-After') || '0')
  };
}