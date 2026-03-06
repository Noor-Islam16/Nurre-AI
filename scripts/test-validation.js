#!/usr/bin/env node

/**
 * Test script for API endpoint validation
 * Tests that all endpoints properly validate input and return appropriate errors
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper to make API requests
async function testEndpoint(method, path, body, expectedStatus, description) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => null);
    
    if (response.status === expectedStatus) {
      log(`✓ ${description}`, 'green');
      return { success: true, data };
    } else {
      log(`✗ ${description} - Expected ${expectedStatus}, got ${response.status}`, 'red');
      if (data) console.log('  Response:', data);
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    log(`✗ ${description} - Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n=== API Validation Tests ===\n', 'blue');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Chat endpoint - invalid message format
  log('Testing /api/ai/chat validation:', 'yellow');
  
  let result = await testEndpoint('POST', '/api/ai/chat', {
    messages: [] // Empty array should fail
  }, 400, 'Empty messages array returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/ai/chat', {
    messages: [
      { role: 'invalid', content: 'test' } // Invalid role should fail
    ]
  }, 400, 'Invalid message role returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/ai/chat', {
    messages: [
      { role: 'user', content: '' } // Empty content should fail
    ]
  }, 400, 'Empty message content returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/ai/chat', {
    messages: [
      { role: 'user', content: 'a'.repeat(10001) } // Too long content
    ]
  }, 400, 'Message content over 10000 chars returns 400');
  result.success ? passed++ : failed++;

  // Test 2: Events endpoint validation
  log('\nTesting /api/events validation:', 'yellow');
  
  result = await testEndpoint('POST', '/api/events', {
    events: [] // Empty events array should fail
  }, 400, 'Empty events array returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/events', {
    events: [
      { type: '' } // Empty type should fail
    ]
  }, 400, 'Event with empty type returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/events', {
    events: [
      { type: 'a'.repeat(51) } // Type too long
    ]
  }, 400, 'Event type over 50 chars returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/events', {
    events: new Array(101).fill({ type: 'test' }) // Too many events
  }, 400, 'Over 100 events returns 400');
  result.success ? passed++ : failed++;

  // Test 3: Focus sessions validation
  log('\nTesting /api/focus-sessions validation:', 'yellow');
  
  result = await testEndpoint('POST', '/api/focus-sessions', {
    duration: 4 // Less than minimum
  }, 400, 'Duration < 5 returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/focus-sessions', {
    duration: 91 // More than maximum
  }, 400, 'Duration > 90 returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/focus-sessions', {
    taskId: 'not-a-uuid',
    duration: 25
  }, 400, 'Invalid taskId UUID returns 400');
  result.success ? passed++ : failed++;

  // Test 4: Query parameter validation
  log('\nTesting query parameter validation:', 'yellow');
  
  result = await testEndpoint('GET', '/api/focus-sessions?limit=abc', null, 400, 
    'Non-numeric limit returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('GET', '/api/focus-sessions?limit=101', null, 400, 
    'Limit > 100 returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('GET', '/api/focus-sessions?today=notbool', null, 400, 
    'Invalid boolean param returns 400');
  result.success ? passed++ : failed++;

  // Test 5: Brain endpoint validation
  log('\nTesting /api/ai/brain validation:', 'yellow');
  
  result = await testEndpoint('POST', '/api/ai/brain', {
    action: 'invalid-action'
  }, 400, 'Invalid action returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/ai/brain', {
    // Missing required action field
  }, 400, 'Missing action field returns 400');
  result.success ? passed++ : failed++;

  // Test 6: Intervention endpoint validation
  log('\nTesting /api/ai/intervention validation:', 'yellow');
  
  result = await testEndpoint('POST', '/api/ai/intervention', {
    // Missing required context field
  }, 400, 'Missing context field returns 400');
  result.success ? passed++ : failed++;

  // Test 7: Admin cleanup validation
  log('\nTesting /api/admin/cleanup validation:', 'yellow');
  
  result = await testEndpoint('POST', '/api/admin/cleanup', {
    dry_run: 'not-a-boolean'
  }, 400, 'Invalid dry_run type returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/admin/cleanup', {
    days_to_keep: 0
  }, 400, 'days_to_keep < 1 returns 400');
  result.success ? passed++ : failed++;

  result = await testEndpoint('POST', '/api/admin/cleanup', {
    days_to_keep: 366
  }, 400, 'days_to_keep > 365 returns 400');
  result.success ? passed++ : failed++;

  // Summary
  log('\n=== Test Summary ===', 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Total: ${passed + failed}\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`Test runner error: ${error.message}`, 'red');
  process.exit(1);
});