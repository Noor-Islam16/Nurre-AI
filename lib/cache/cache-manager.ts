import redis from './redis-client';
import { LRUCache } from 'lru-cache';

// Create separate memory caches for each namespace to avoid collisions
const memoryCaches = new Map<string, LRUCache<string, any>>();

// Get or create a memory cache for a specific namespace
function getMemoryCache(namespace: string): LRUCache<string, any> {
  if (!memoryCaches.has(namespace)) {
    memoryCaches.set(namespace, new LRUCache<string, any>({
      max: 500,
      ttl: 1000 * 60 * 5, // 5 minutes default
    }));
  }
  return memoryCaches.get(namespace)!;
}

// Statistics tracking per namespace
const statsMap = new Map<string, { hits: number; misses: number; sets: number; deletes: number }>();

function getStats(namespace: string) {
  if (!statsMap.has(namespace)) {
    statsMap.set(namespace, { hits: 0, misses: 0, sets: 0, deletes: 0 });
  }
  return statsMap.get(namespace)!;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  compress?: boolean;
}

export class CacheManager {
  private namespace: string;
  private disabled: boolean;
  private memoryCache: LRUCache<string, any>;
  private stats: { hits: number; misses: number; sets: number; deletes: number };

  constructor(namespace: string = 'app') {
    this.namespace = namespace;
    this.disabled = process.env.DISABLE_CACHE === 'true';
    this.memoryCache = getMemoryCache(namespace);
    this.stats = getStats(namespace);
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.disabled) return null;
    
    const fullKey = this.getKey(key);
    
    try {
      // Use Redis if available
      if (redis) {
        const value = await redis.get(fullKey);
        if (value) {
          this.stats.hits++;
          return typeof value === 'string' 
            ? JSON.parse(value) 
            : value as T;
        }
      } else {
        // Fallback to in-memory cache
        const value = this.memoryCache.get(fullKey);
        if (value !== undefined) {
          this.stats.hits++;
          return value;
        }
      }
      
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('[Cache] Get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    if (this.disabled) return;
    
    const fullKey = this.getKey(key);
    const ttl = options.ttl || 300; // Default 5 minutes
    
    try {
      const serialized = JSON.stringify(value);
      this.stats.sets++;
      
      if (redis) {
        await redis.setex(fullKey, ttl, serialized);
      } else {
        // Fallback to in-memory cache
        this.memoryCache.set(fullKey, value, { ttl: ttl * 1000 });
      }
    } catch (error) {
      console.error('[Cache] Set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.disabled) return;
    
    const fullKey = this.getKey(key);
    
    try {
      this.stats.deletes++;
      
      if (redis) {
        await redis.del(fullKey);
      } else {
        this.memoryCache.delete(fullKey);
      }
    } catch (error) {
      console.error('[Cache] Delete error:', error);
    }
  }

  async flush(): Promise<void> {
    if (this.disabled) return;
    
    try {
      if (redis) {
        // Use SCAN for better performance on large datasets
        let cursor = 0;
        const pattern = `${this.namespace}:*`;
        
        do {
          const result = await redis.scan(cursor, {
            match: pattern,
            count: 100 // Process 100 keys at a time
          });
          
          cursor = Number(result[0]);
          const keys = result[1];
          
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== 0);
      } else {
        // Clear in-memory cache
        this.memoryCache.clear();
      }
    } catch (error) {
      console.error('[Cache] Flush error:', error);
    }
  }

  // Alias for flush to match common cache API
  async clear(): Promise<void> {
    return this.flush();
  }

  // Cache with automatic refresh
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetcher();
    
    // Store in cache
    await this.set(key, fresh, options);
    
    return fresh;
  }

  // Invalidate related keys
  async invalidatePattern(pattern: string): Promise<void> {
    if (this.disabled) return;
    
    try {
      if (redis) {
        // Use SCAN for better performance
        let cursor = 0;
        const searchPattern = `${this.namespace}:${pattern}*`;
        let deletedCount = 0;
        
        do {
          const result = await redis.scan(cursor, {
            match: searchPattern,
            count: 100 // Process 100 keys at a time
          });
          
          cursor = Number(result[0]);
          const keys = result[1];
          
          if (keys.length > 0) {
            await redis.del(...keys);
            deletedCount += keys.length;
          }
        } while (cursor !== 0);
        
        if (deletedCount > 0) {
          console.log(`[Cache] Invalidated ${deletedCount} keys matching pattern: ${searchPattern}`);
        }
      } else {
        // In-memory cache pattern matching
        let deletedCount = 0;
        for (const [key] of this.memoryCache.entries()) {
          if (key.includes(pattern)) {
            this.memoryCache.delete(key);
            deletedCount++;
          }
        }
        if (deletedCount > 0) {
          console.log(`[Cache] Invalidated ${deletedCount} memory cache keys matching pattern: ${pattern}`);
        }
      }
    } catch (error) {
      console.error('[Cache] Invalidate pattern error:', error);
    }
  }

  // Get cache statistics
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheType: redis ? 'redis' : 'memory',
      cacheSize: this.memoryCache.size,
      cacheMax: this.memoryCache.max,
      disabled: this.disabled,
    };
  }
}

// Export singleton instances for different namespaces
export const aiCache = new CacheManager('ai');
export const userCache = new CacheManager('user');
export const statsCache = new CacheManager('stats');

// Export stats for monitoring
export function getCacheStats() {
  return {
    ai: aiCache.getStats(),
    user: userCache.getStats(),
    stats: statsCache.getStats(),
  };
}