#!/usr/bin/env node

import crypto from 'crypto';

console.log('Generating encryption key for Redmine-Bulkr...\n');

const cryptoKey = crypto.randomBytes(32).toString('base64');

console.log('Add this to your .env.local file:\n');
console.log('# AES-256-GCM encryption key (32 bytes in base64)');
console.log(`CRYPTO_KEY_BASE64="${cryptoKey}"`);
console.log('');
console.log('Keep this key secure and never commit it to git!');