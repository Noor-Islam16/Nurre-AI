type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

type Bucket = {
  count: number
  reset: number
}

const buckets = new Map<string, Bucket>()

/**
 * Lightweight in-memory rate limiter for development/staging.
 * Replace with a persistent/shared implementation for production traffic.
 */
export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  if (limit <= 0) {
    throw new Error("rateLimit requires a positive limit")
  }

  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.reset <= now) {
    const bucket: Bucket = {
      count: 1,
      reset: now + windowMs,
    }
    buckets.set(key, bucket)
    return { success: true, remaining: Math.max(0, limit - 1), reset: bucket.reset }
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, reset: existing.reset }
  }

  existing.count += 1
  return { success: true, remaining: Math.max(0, limit - existing.count), reset: existing.reset }
}
