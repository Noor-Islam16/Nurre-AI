import { Redis } from '@upstash/redis';

// Create Redis client if credentials are provided
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('[Cache] Connected to Upstash Redis');
  } catch (error) {
    console.error('[Cache] Failed to connect to Redis:', error);
    console.log('[Cache] Falling back to in-memory cache');
  }
} else {
  console.log('[Cache] Redis credentials not found, using in-memory cache');
}

export default redis;