import crypto from 'crypto';

interface DedupedRequest<T> {
  key: string;
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private inFlight: Map<string, DedupedRequest<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private maxAge: number = 1000; // 1 second default
  private maxSize: number = 100; // Maximum number of concurrent deduplicated requests

  constructor(maxAge: number = 1000, maxSize: number = 100) {
    this.maxAge = maxAge;
    this.maxSize = maxSize;
    
    // Clean up old requests every second
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 1000);
  }

  private getKey(params: any): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex');
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.inFlight.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.inFlight.delete(key);
      }
    }
  }

  async dedupe<T>(
    params: any,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = this.getKey(params);
    
    // Check if request is in flight
    const existing = this.inFlight.get(key);
    if (existing) {
      // Return existing promise if still fresh
      if (Date.now() - existing.timestamp < this.maxAge) {
        console.log('[Deduper] Returning cached request:', key.substring(0, 8));
        return existing.promise;
      }
      // Remove stale request
      this.inFlight.delete(key);
    }

    // Check size limit and clean up if necessary
    if (this.inFlight.size >= this.maxSize) {
      console.warn('[Deduper] Max size reached, cleaning up oldest requests');
      // Remove oldest entries
      const entriesToRemove = Math.floor(this.maxSize * 0.2); // Remove 20% of oldest
      const sortedEntries = Array.from(this.inFlight.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        this.inFlight.delete(sortedEntries[i][0]);
      }
    }

    // Create new request
    console.log('[Deduper] Creating new request:', key.substring(0, 8));
    const promise = fetcher().finally(() => {
      // Clean up after a short delay to catch rapid duplicates
      setTimeout(() => {
        this.inFlight.delete(key);
      }, 100);
    });

    this.inFlight.set(key, {
      key,
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  // Get statistics
  getStats() {
    return {
      inFlightRequests: this.inFlight.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge,
      utilizationPercent: Math.round((this.inFlight.size / this.maxSize) * 100)
    };
  }

  // Clean up resources
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.inFlight.clear();
  }
}

// Export singleton instance
export const requestDeduper = new RequestDeduplicator();

// Export class for custom instances
export { RequestDeduplicator };