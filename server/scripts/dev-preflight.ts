#!/usr/bin/env tsx
/**
 * Dev Preflight Check (Tooling Only)
 * 
 * Validates required environment variables before starting dev server.
 * Fails fast with actionable instructions if configuration is incomplete.
 * 
 * This is a tooling script - no application logic, no database access.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if exists (manual since this runs before app startup)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Only set if not already in environment
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Required environment variables (must match config/index.ts validation)
const REQUIRED_ENV_VARS = [
  {
    name: 'DATABASE_URL',
    validation: (val: string) => val.startsWith('postgresql://'),
    hint: 'Must be a PostgreSQL connection string starting with postgresql://'
  },
  {
    name: 'JWT_ACCESS_SECRET',
    validation: (val: string) => val.length >= 32,
    hint: 'Must be at least 32 characters long'
  },
  {
    name: 'JWT_REFRESH_SECRET',
    validation: (val: string) => val.length >= 32,
    hint: 'Must be at least 32 characters long'
  },
  {
    name: 'JWT_ADMIN_ACCESS_SECRET',
    validation: (val: string) => val.length >= 32,
    hint: 'Must be at least 32 characters long'
  },
  {
    name: 'JWT_ADMIN_REFRESH_SECRET',
    validation: (val: string) => val.length >= 32,
    hint: 'Must be at least 32 characters long'
  },
  {
    name: 'GEMINI_API_KEY',
    validation: (val: string) => val.length >= 10 && !val.includes('your-'),
    hint: 'Must be a valid Gemini API key (get from https://aistudio.google.com/apikey)'
  }
];

// Check for .env file existence
if (!fs.existsSync(envPath)) {
  console.error('\n❌ PREFLIGHT FAILED: Missing .env file\n');
  console.error('Action required:');
  console.error('  1. Copy the example: cp .env.example .env');
  console.error('  2. Edit .env with your configuration');
  console.error('  3. Run npm run dev again\n');
  process.exit(1);
}

// Validate each required variable
const results = REQUIRED_ENV_VARS.map(({ name, validation, hint }) => {
  const value = process.env[name];
  if (!value) {
    return { name, status: 'missing', hint };
  }
  if (!validation(value)) {
    return { name, status: 'invalid', hint };
  }
  return { name, status: 'ok', hint: null };
});

const missing = results.filter(r => r.status === 'missing');
const invalid = results.filter(r => r.status === 'invalid');
const ok = results.filter(r => r.status === 'ok');

// Print results
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  DEV SERVER PREFLIGHT CHECK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (ok.length > 0) {
  console.log('\n✅ Valid configuration:');
  ok.forEach(({ name }) => {
    console.log(`   ${name}`);
  });
}

let hasErrors = false;

if (missing.length > 0) {
  hasErrors = true;
  console.log('\n❌ Missing required variables:');
  missing.forEach(({ name, hint }) => {
    console.log(`   ${name}`);
    if (hint) console.log(`      → ${hint}`);
  });
}

if (invalid.length > 0) {
  hasErrors = true;
  console.log('\n❌ Invalid configuration:');
  invalid.forEach(({ name, hint }) => {
    console.log(`   ${name}`);
    if (hint) console.log(`      → ${hint}`);
  });
}

if (hasErrors) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📖 Fix instructions:\n');
  console.log('  1. Edit server/.env file');
  console.log('  2. Use server/.env.example as reference');
  console.log('  3. See server/docs/DEV_SERVER_SETUP.md for details');
  console.log('  4. Run npm run dev again\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}

console.log('\n✅ All checks passed - starting dev server...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
process.exit(0);
