// Optional Redis import - only if @upstash/redis is installed
let Redis: any;
let redis: any = null;

try {
  // Try to import Redis if available
  const upstashModule = require('@upstash/redis');
  Redis = upstashModule.Redis;
  
  // Initialize Redis client (using Upstash for serverless)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  // Redis module not installed - will use in-memory fallback
  console.log('Rate limiting: Using in-memory store (Redis not available)');
}

export interface RateLimitConfig {
  requests: number;      // Number of requests allowed
  window: number;        // Time window in seconds
  identifier: string;    // User ID or IP
  endpoint?: string;     // Optional endpoint-specific limiting
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export class RateLimiter {
  // In-memory fallback for development
  private static memoryStore = new Map<string, { count: number; resetAt: number }>();

  static async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const { requests, window, identifier, endpoint } = config;
    const key = endpoint ? `rate_limit:${endpoint}:${identifier}` : `rate_limit:${identifier}`;
    const now = Date.now();
    const windowMs = window * 1000;
    const resetAt = now + windowMs;

    try {
      // Try Redis first if available
      if (redis) {
        return await this.checkRedisLimit(key, requests, windowMs, resetAt);
      }
    } catch (error) {
      console.error('Redis rate limit error, falling back to memory:', error);
    }

    // Fallback to in-memory store
    return this.checkMemoryLimit(key, requests, windowMs, now, resetAt);
  }

  private static async checkRedisLimit(
    key: string,
    limit: number,
    window: number,
    resetAt: number
  ): Promise<RateLimitResult> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, Math.ceil(window / 1000));
    
    const results = await multi.exec();
    const count = results[0] as number;
    
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset: resetAt
    };
  }

  private static checkMemoryLimit(
    key: string,
    limit: number,
    window: number,
    now: number,
    resetAt: number
  ): Promise<RateLimitResult> {
    const existing = this.memoryStore.get(key);
    
    if (!existing || existing.resetAt < now) {
      // New window
      this.memoryStore.set(key, { count: 1, resetAt });
      return Promise.resolve({
        success: true,
        limit,
        remaining: limit - 1,
        reset: resetAt
      });
    }
    
    // Existing window
    existing.count++;
    
    return Promise.resolve({
      success: existing.count <= limit,
      limit,
      remaining: Math.max(0, limit - existing.count),
      reset: existing.resetAt
    });
  }

  // Clean up old entries periodically (for memory store)
  static cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, value] of this.memoryStore.entries()) {
      if (value.resetAt < now) {
        this.memoryStore.delete(key);
      }
    }
  }

  // Get current usage for debugging
  static async getUsage(identifier: string, endpoint?: string): Promise<{ count: number; resetAt: number } | null> {
    const key = endpoint ? `rate_limit:${endpoint}:${identifier}` : `rate_limit:${identifier}`;
    
    if (redis) {
      try {
        const ttl = await redis.ttl(key);
        if (ttl === -2) return null; // Key doesn't exist
        
        const count = await redis.get(key) as number | null;
        return {
          count: count || 0,
          resetAt: Date.now() + (ttl * 1000)
        };
      } catch (error) {
        console.error('Redis getUsage error:', error);
      }
    }
    
    // Fallback to memory store
    const existing = this.memoryStore.get(key);
    if (!existing || existing.resetAt < Date.now()) {
      return null;
    }
    
    return {
      count: existing.count,
      resetAt: existing.resetAt
    };
  }

  // Reset limits for a user (useful for testing or admin actions)
  static async resetLimit(identifier: string, endpoint?: string): Promise<void> {
    const key = endpoint ? `rate_limit:${endpoint}:${identifier}` : `rate_limit:${identifier}`;
    
    if (redis) {
      try {
        await redis.del(key);
      } catch (error) {
        console.error('Redis resetLimit error:', error);
      }
    }
    
    // Also clear from memory store
    this.memoryStore.delete(key);
  }
}

// Cleanup every 5 minutes (only on server side)
if (typeof window === 'undefined') {
  setInterval(() => RateLimiter.cleanupMemoryStore(), 5 * 60 * 1000);
}