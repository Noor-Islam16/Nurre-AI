const { createClient } = require('@supabase/supabase-js')
const OpenAI = require('openai')

class TestUtils {
  constructor() {
    this.supabase = null
    this.openai = null
  }

  // Initialize Supabase client
  initSupabase() {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    }
    return this.supabase
  }

  // Initialize OpenAI client
  initOpenAI() {
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
    return this.openai
  }

  // Create test user
  async createTestUser(email = `test-${Date.now()}@example.com`) {
    const supabase = this.initSupabase()
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true
    })

    if (error) throw error
    return data.user
  }

  // Clean up test user
  async deleteTestUser(userId) {
    const supabase = this.initSupabase()
    
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error
  }

  // Create test data
  async createTestData(table, data) {
    const supabase = this.initSupabase()
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  // Clean up test data
  async cleanupTestData(table, condition) {
    const supabase = this.initSupabase()
    
    let query = supabase.from(table).delete()
    
    Object.entries(condition).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { error } = await query
    if (error) throw error
  }

  // Wait for condition
  async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true
      }
      await this.sleep(interval)
    }
    
    throw new Error('Timeout waiting for condition')
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Assert helper
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  }

  // Deep equal comparison
  deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  // Mock fetch for testing
  mockFetch(responses) {
    const originalFetch = global.fetch
    let callIndex = 0

    global.fetch = async (url, options) => {
      const response = responses[callIndex++] || responses[responses.length - 1]
      
      return {
        ok: response.ok !== false,
        status: response.status || 200,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
        headers: new Map(Object.entries(response.headers || {}))
      }
    }

    return () => {
      global.fetch = originalFetch
    }
  }
}

module.exports = new TestUtils()