#!/usr/bin/env node

const https = require('https');
const http = require('http');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const expectedHeaders = {
  // Critical security headers
  'content-security-policy': {
    required: true,
    contains: ["default-src", "script-src", "style-src"],
    production: true
  },
  'content-security-policy-report-only': {
    required: false,
    development: true
  },
  'x-frame-options': {
    required: true,
    value: 'DENY'
  },
  'x-content-type-options': {
    required: true,
    value: 'nosniff'
  },
  'x-xss-protection': {
    required: true,
    value: '1; mode=block'
  },
  'referrer-policy': {
    required: true,
    value: 'strict-origin-when-cross-origin'
  },
  'permissions-policy': {
    required: true,
    contains: ['camera=()', 'microphone=()', 'geolocation=()']
  },
  'strict-transport-security': {
    required: false, // Only in production
    production: true,
    contains: ['max-age=']
  },
  'x-dns-prefetch-control': {
    required: true,
    value: 'off'
  }
};

// Headers that should NOT be present
const disallowedHeaders = [
  'x-powered-by',
  'server'
];

async function testUrl(url, isApi = false) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      const results = {
        url,
        status: res.statusCode,
        headers: res.headers,
        passed: [],
        failed: [],
        warnings: []
      };

      // Check expected headers
      for (const [headerName, config] of Object.entries(expectedHeaders)) {
        const headerValue = res.headers[headerName];
        
        // Skip production-only headers in development
        if (config.production && process.env.NODE_ENV !== 'production') {
          continue;
        }
        
        // Skip development-only headers in production
        if (config.development && process.env.NODE_ENV === 'production') {
          continue;
        }
        
        if (config.required && !headerValue) {
          results.failed.push(`Missing required header: ${headerName}`);
        } else if (headerValue) {
          let passed = true;
          
          // Check specific value
          if (config.value && headerValue !== config.value) {
            results.failed.push(`${headerName}: Expected "${config.value}", got "${headerValue}"`);
            passed = false;
          }
          
          // Check contains
          if (config.contains) {
            for (const substring of config.contains) {
              if (!headerValue.includes(substring)) {
                results.failed.push(`${headerName}: Missing "${substring}"`);
                passed = false;
              }
            }
          }
          
          if (passed) {
            results.passed.push(`${headerName}: ${headerValue.substring(0, 50)}...`);
          }
        }
      }

      // Check for disallowed headers
      for (const badHeader of disallowedHeaders) {
        if (res.headers[badHeader]) {
          results.warnings.push(`Found insecure header: ${badHeader}: ${res.headers[badHeader]}`);
        }
      }

      // API-specific checks
      if (isApi) {
        if (res.headers['cache-control'] !== 'no-store, max-age=0') {
          results.warnings.push('API should have cache-control: no-store, max-age=0');
        }
      }

      resolve(results);
    }).on('error', (err) => {
      resolve({
        url,
        error: err.message,
        passed: [],
        failed: [`Connection error: ${err.message}`],
        warnings: []
      });
    });
  });
}

async function runTests() {
  console.log(`${colors.blue}Security Headers Test${colors.reset}\n`);
  console.log('Testing:', process.env.APP_URL || 'http://localhost:3000');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('---\n');

  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  
  // Test pages
  const pageTests = [
    { url: `${baseUrl}/`, name: 'Home Page' },
    { url: `${baseUrl}/login`, name: 'Login Page' }
  ];

  // Test API endpoints
  const apiTests = [
    { url: `${baseUrl}/api/health/db`, name: 'Health Check API', isApi: true }
  ];

  const allTests = [...pageTests, ...apiTests];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const test of allTests) {
    console.log(`Testing ${test.name}: ${test.url}`);
    const results = await testUrl(test.url, test.isApi);
    
    if (results.error) {
      console.log(`${colors.red}✗ Error: ${results.error}${colors.reset}\n`);
      totalFailed++;
      continue;
    }

    // Show passed
    if (results.passed.length > 0) {
      console.log(`${colors.green}✓ Passed (${results.passed.length}):${colors.reset}`);
      results.passed.forEach(p => console.log(`  - ${p}`));
      totalPassed += results.passed.length;
    }

    // Show failed
    if (results.failed.length > 0) {
      console.log(`${colors.red}✗ Failed (${results.failed.length}):${colors.reset}`);
      results.failed.forEach(f => console.log(`  - ${f}`));
      totalFailed += results.failed.length;
    }

    // Show warnings
    if (results.warnings.length > 0) {
      console.log(`${colors.yellow}⚠ Warnings (${results.warnings.length}):${colors.reset}`);
      results.warnings.forEach(w => console.log(`  - ${w}`));
    }

    console.log('');
  }

  // Summary
  console.log('---');
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${totalPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${totalFailed}${colors.reset}`);
  
  const score = totalPassed / (totalPassed + totalFailed) * 100;
  const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red;
  console.log(`${scoreColor}Score: ${score.toFixed(1)}%${colors.reset}`);

  // Exit code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);