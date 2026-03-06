import { aiCache } from '@/lib/cache/cache-manager';
import crypto from 'crypto';

export class AIContextCache {
  static getTTL(contextType: string): number {
    // Different TTLs for different context types
    const ttlMap: Record<string, number> = {
      'user_profile': 600,      // 10 minutes
      'recent_events': 30,      // 30 seconds
      'active_tasks': 60,       // 1 minute
      'task_summary': 120,      // 2 minutes
      'pattern_analysis': 300,  // 5 minutes
      'mood_history': 180,      // 3 minutes
      'focus_stats': 60,        // 1 minute
      'conversations': 90,      // 1.5 minutes
      'preferences': 600,       // 10 minutes
    };
    
    return ttlMap[contextType] || 60;
  }

  static getCacheKey(
    userId: string, 
    contextType: string,
    params?: Record<string, any>
  ): string {
    const paramStr = params 
      ? crypto.createHash('md5').update(JSON.stringify(params)).digest('hex')
      : '';
    
    return `ai:${userId}:${contextType}${paramStr ? `:${paramStr}` : ''}`;
  }

  static async getContext<T>(
    userId: string,
    contextType: string,
    fetcher: () => Promise<T>,
    params?: Record<string, any>
  ): Promise<T> {
    const key = this.getCacheKey(userId, contextType, params);
    const ttl = this.getTTL(contextType);
    
    // Add performance timing
    const startTime = performance.now();
    
    const result = await aiCache.getOrSet(key, fetcher, { ttl });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log performance metrics only for slow queries (> 50ms)
    if (process.env.NODE_ENV === 'development' && duration > 50) {
      console.log(`[AI Context] ${contextType}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  static async invalidateUserContext(userId: string): Promise<void> {
    // Invalidate all context for a user
    await aiCache.invalidatePattern(`context:${userId}`);
  }

  static async invalidateContextType(
    userId: string, 
    contextType: string
  ): Promise<void> {
    await aiCache.invalidatePattern(`context:${userId}:${contextType}`);
  }

  // Batch get multiple context types
  static async getBatchContext<T extends Record<string, any>>(
    userId: string,
    contexts: {
      [K in keyof T]: {
        type: string;
        fetcher: () => Promise<T[K]>;
        params?: Record<string, any>;
      }
    }
  ): Promise<T> {
    const results = {} as T;
    
    // Fetch all contexts in parallel
    const promises = Object.entries(contexts).map(async ([key, config]) => {
      const value = await this.getContext(
        userId,
        config.type,
        config.fetcher,
        config.params
      );
      return { key, value };
    });
    
    const resolved = await Promise.all(promises);
    
    // Build results object
    for (const { key, value } of resolved) {
      results[key as keyof T] = value as T[keyof T];
    }
    
    return results;
  }

  // Preload cache for user
  static async warmupCache(userId: string, fetchers: Record<string, () => Promise<any>>): Promise<void> {
    const promises = Object.entries(fetchers).map(([contextType, fetcher]) => {
      const key = this.getCacheKey(userId, contextType);
      const ttl = this.getTTL(contextType);
      return aiCache.set(key, fetcher(), { ttl });
    });
    
    await Promise.all(promises);
  }
}