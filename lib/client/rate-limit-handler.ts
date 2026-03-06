export class RateLimitHandler {
  private static retryAfter = new Map<string, number>();
  private static warningCallbacks = new Map<string, () => void>();

  /**
   * Handle response headers and check for rate limiting
   */
  static handleResponse(response: Response, endpoint: string) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const limit = response.headers.get('X-RateLimit-Limit');
    
    // Handle rate limit exceeded (429)
    if (response.status === 429 && reset) {
      const resetTime = parseInt(reset);
      this.retryAfter.set(endpoint, resetTime);
      
      const waitTime = Math.ceil((resetTime - Date.now()) / 1000);
      const error = new RateLimitError(
        `Rate limit exceeded. Please wait ${waitTime} seconds.`,
        waitTime,
        resetTime
      );
      throw error;
    }
    
    // Warn when approaching limit
    if (remaining && limit) {
      const remainingCount = parseInt(remaining);
      const limitCount = parseInt(limit);
      
      if (remainingCount === 0 && reset) {
        console.warn(`Rate limit reached for ${endpoint}. Resets at ${new Date(parseInt(reset)).toLocaleTimeString()}`);
      } else if (remainingCount <= Math.max(1, Math.floor(limitCount * 0.2))) {
        console.warn(`Rate limit approaching for ${endpoint}: ${remainingCount}/${limitCount} remaining`);
        
        // Trigger warning callback if registered
        const callback = this.warningCallbacks.get(endpoint);
        if (callback) {
          callback();
        }
      }
    }
  }

  /**
   * Check if a request can be made to an endpoint
   */
  static canMakeRequest(endpoint: string): boolean {
    const retryTime = this.retryAfter.get(endpoint);
    if (!retryTime) return true;
    
    if (Date.now() > retryTime) {
      this.retryAfter.delete(endpoint);
      return true;
    }
    
    return false;
  }

  /**
   * Get the wait time in seconds for an endpoint
   */
  static getWaitTime(endpoint: string): number {
    const retryTime = this.retryAfter.get(endpoint);
    if (!retryTime) return 0;
    
    const waitMs = retryTime - Date.now();
    return waitMs > 0 ? Math.ceil(waitMs / 1000) : 0;
  }

  /**
   * Register a callback for when rate limit is approaching
   */
  static onApproachingLimit(endpoint: string, callback: () => void) {
    this.warningCallbacks.set(endpoint, callback);
  }

  /**
   * Clear all rate limit data
   */
  static clear() {
    this.retryAfter.clear();
    this.warningCallbacks.clear();
  }

  /**
   * Get all current rate limit statuses
   */
  static getAllStatuses(): Map<string, { canRequest: boolean; waitTime: number }> {
    const statuses = new Map();
    
    for (const [endpoint] of this.retryAfter) {
      statuses.set(endpoint, {
        canRequest: this.canMakeRequest(endpoint),
        waitTime: this.getWaitTime(endpoint)
      });
    }
    
    return statuses;
  }
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public waitTime: number,
    public resetTime: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Hook for React components to use rate limiting
 */
export function useRateLimit(endpoint: string) {
  const canRequest = RateLimitHandler.canMakeRequest(endpoint);
  const waitTime = RateLimitHandler.getWaitTime(endpoint);
  
  return {
    canRequest,
    waitTime,
    handleResponse: (response: Response) => RateLimitHandler.handleResponse(response, endpoint)
  };
}