#!/usr/bin/env node

import crypto from 'crypto';

console.log('Generating encryption keys for Redmine-Bulkr...\n');

const cryptoKey = crypto.randomBytes(32).toString('base64');
const redisHashSecret = crypto.randomBytes(32).toString('hex');

console.log('Add these to your .env.local file:\n');
console.log('# AES-256-GCM encryption key (32 bytes in base64)');
console.log(`CRYPTO_KEY_BASE64="${cryptoKey}"`);
console.log('');
console.log('# Redis hash secret for rate limiting (32 bytes in hex)');
console.log(`REDIS_HASH_SECRET="${redisHashSecret}"`);
console.log('');
console.log('Keep these keys secure and never commit them to git!');