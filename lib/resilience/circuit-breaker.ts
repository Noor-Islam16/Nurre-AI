class CircuitBreaker {
  private failures = 0
  private successCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private name: string
  
  constructor(
    name: string = 'default',
    private threshold = 5,
    private timeout = 60000,
    private successThreshold = 2
  ) {
    this.name = name
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        console.log(`[CircuitBreaker:${this.name}] Attempting half-open state`)
        this.state = 'half-open'
        this.successCount = 0
      } else {
        throw new Error(`Circuit breaker is open for ${this.name}`)
      }
    }
    
    try {
      const result = await fn()
      
      // Handle successful execution
      if (this.state === 'half-open') {
        this.successCount++
        if (this.successCount >= this.successThreshold) {
          this.state = 'closed'
          this.failures = 0
          console.log(`[CircuitBreaker:${this.name}] Circuit closed after successful recovery`)
        }
      } else if (this.state === 'closed') {
        // Reset failures on success in closed state
        this.failures = 0
      }
      
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()
      
      // Open circuit if threshold reached
      if (this.failures >= this.threshold) {
        this.state = 'open'
        console.error(`[CircuitBreaker:${this.name}] Circuit opened after ${this.failures} failures`)
      }
      
      // Reset to open if half-open fails
      if (this.state === 'half-open') {
        this.state = 'open'
        console.error(`[CircuitBreaker:${this.name}] Circuit reopened after half-open failure`)
      }
      
      throw error
    }
  }
  
  // Get current state
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null
    }
  }
  
  // Manual reset
  reset() {
    this.state = 'closed'
    this.failures = 0
    this.successCount = 0
    this.lastFailureTime = 0
    console.log(`[CircuitBreaker:${this.name}] Circuit manually reset`)
  }
}

// Create specific circuit breakers for different services
export const apiCircuitBreaker = new CircuitBreaker('api', 5, 60000)
export const dbCircuitBreaker = new CircuitBreaker('database', 3, 30000)
export const aiCircuitBreaker = new CircuitBreaker('ai-service', 3, 120000)

// Export the class for custom instances
export { CircuitBreaker }