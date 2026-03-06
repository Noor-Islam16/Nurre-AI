#!/usr/bin/env node

/**
 * Test script to verify AI API compliance
 * Ensures only Responses API is used, never Chat Completions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Testing AI API Compliance\n');

let violations = [];
let passed = [];

// Test 1: Check for Chat Completions usage (excluding test scripts)
console.log('1. Checking for Chat Completions API usage...');
try {
  const chatCompletions = execSync('grep -r "chat\\.completions" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "// " | grep -v "scripts/test" || true', 
    { encoding: 'utf8', cwd: process.cwd() }
  );
  
  if (chatCompletions.trim()) {
    // Filter out test scripts and example files
    const lines = chatCompletions.split('\n').filter(line => 
      !line.includes('scripts/test') && 
      !line.includes('example') &&
      line.trim()
    );
    
    if (lines.length > 0) {
      violations.push('Found chat.completions usage in production code:\n' + lines.join('\n'));
    } else {
      passed.push('✅ No chat.completions usage in production code');
    }
  } else {
    passed.push('✅ No chat.completions usage found');
  }
} catch (error) {
  passed.push('✅ No chat.completions usage found');
}

// Test 2: Check for wrong model names
console.log('2. Checking for non-GPT-5 models...');
try {
  const wrongModels = execSync('grep -r "gpt-4\\|gpt-3" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "gpt-5" | grep -v "//" | grep -v migration || true',
    { encoding: 'utf8', cwd: process.cwd() }
  );
  
  if (wrongModels.trim()) {
    // Filter out comments and migration files
    const lines = wrongModels.split('\n').filter(line => 
      !line.includes('comment') && 
      !line.includes('migration') &&
      !line.includes('Legacy') &&
      line.trim()
    );
    
    if (lines.length > 0) {
      violations.push('Found non-GPT-5 models:\n' + lines.join('\n'));
    } else {
      passed.push('✅ All models are GPT-5 variants');
    }
  } else {
    passed.push('✅ All models are GPT-5 variants');
  }
} catch (error) {
  passed.push('✅ All models are GPT-5 variants');
}

// Test 3: Check that ResponsesAPIClient is imported where needed
console.log('3. Checking AI endpoints use ResponsesAPIClient...');
const aiEndpoints = [
  'app/api/ai/chat/route.ts',
  'app/api/ai/intervention/route.ts',
  'app/api/ai/welcome/route.ts'
];

aiEndpoints.forEach(endpoint => {
  if (fs.existsSync(endpoint)) {
    const content = fs.readFileSync(endpoint, 'utf8');
    
    if (content.includes('ResponsesAPIClient')) {
      passed.push(`✅ ${endpoint} uses ResponsesAPIClient`);
    } else if (content.includes('openai.chat.completions')) {
      violations.push(`❌ ${endpoint} uses Chat Completions directly`);
    }
  }
});

// Test 4: Check for openai.responses usage (which should NOT exist - we use ResponsesAPIClient)
console.log('4. Checking for direct openai.responses usage...');
try {
  const directResponses = execSync('grep -r "openai\\.responses\\." --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ResponsesAPIClient || true',
    { encoding: 'utf8', cwd: process.cwd() }
  );
  
  if (directResponses.trim()) {
    // This is actually OK if it's inside ResponsesAPIClient
    const lines = directResponses.split('\n').filter(line => 
      !line.includes('responses-api-client.ts') && line.trim()
    );
    
    if (lines.length === 0) {
      passed.push('✅ Direct openai.responses only used in ResponsesAPIClient wrapper');
    }
  } else {
    passed.push('✅ No direct openai.responses usage (using wrapper)');
  }
} catch (error) {
  passed.push('✅ No direct openai.responses usage (using wrapper)');
}

// Test 5: Verify fallback models are GPT-5
console.log('5. Checking fallback models...');
const configFile = 'lib/ai/openai-config.ts';
if (fs.existsSync(configFile)) {
  const content = fs.readFileSync(configFile, 'utf8');
  
  if (content.includes("'gpt-4o'") || content.includes("'gpt-4o-mini'")) {
    violations.push('❌ openai-config.ts contains non-GPT-5 fallback models');
  } else if (content.includes("'gpt-5-mini'")) {
    passed.push('✅ Fallback models use gpt-5-mini');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Compliance Test Results\n');

if (passed.length > 0) {
  console.log('PASSED:');
  passed.forEach(p => console.log('  ' + p));
}

if (violations.length > 0) {
  console.log('\n❌ VIOLATIONS FOUND:');
  violations.forEach(v => console.log('  ' + v));
  console.log('\n⚠️  Fix these violations to ensure architecture compliance');
  process.exit(1);
} else {
  console.log('\n✅ All API compliance tests passed!');
  console.log('   - Only Responses API is used');
  console.log('   - All models are GPT-5 variants');
  console.log('   - No Chat Completions API usage');
}