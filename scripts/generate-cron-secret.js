#!/usr/bin/env node

const crypto = require('crypto');

function generateCronSecret() {
  // Generate a 32-byte random string
  const secret = crypto.randomBytes(32).toString('base64');
  
  console.log('Generated CRON_SECRET:');
  console.log('------------------------');
  console.log(secret);
  console.log('------------------------');
  console.log('\nAdd this to your .env.local file:');
  console.log(`CRON_SECRET=${secret}`);
  console.log('\nFor Vercel deployment:');
  console.log('1. Add as environment variable in Vercel Dashboard');
  console.log('2. Create Vercel secret: vercel secrets add cron-secret "<secret>"');
}

generateCronSecret();