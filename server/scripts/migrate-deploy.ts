#!/usr/bin/env tsx
/**
 * Migrate Deploy Wrapper (OPS-ENV-001)
 *
 * Safe wrapper for `prisma migrate deploy` that:
 *  1) Loads env from server/.env
 *  2) Resolves DIRECT_DATABASE_URL (or MIGRATION_DATABASE_URL as legacy alias)
 *  3) Validates the endpoint type (blocks TX_POOLER)
 *  4) Passes DIRECT_DATABASE_URL into the child process env
 *  5) Executes `prisma migrate deploy`
 *
 * This solves the "PowerShell doesn't auto-source .env" problem:
 * the wrapper loads the file itself and injects the env into the child process.
 *
 * Usage (preferred):
 *   pnpm -C server migrate:deploy:prod
 *
 * Equivalent manual steps:
 *   1) Load DIRECT_DATABASE_URL from server/.env into your shell
 *   2) pnpm -C server exec prisma migrate deploy
 *
 * NO SECRETS ARE PRINTED AT ANY POINT.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── env loader ───────────────────────────────────────────────────────────────

function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function classifyHost(host: string, port: number): 'DIRECT' | 'SESSION_POOLER' | 'TX_POOLER' | 'UNKNOWN' {
  const h = host.toLowerCase();
  if (h.includes('.pooler.supabase.com') && (h.startsWith('aws-0-') || port === 6543)) return 'TX_POOLER';
  if (h.includes('.pooler.supabase.com') && h.startsWith('aws-1-')) return 'SESSION_POOLER';
  if (h.startsWith('db.') && h.includes('.supabase.co')) return 'DIRECT';
  if (port === 6543) return 'TX_POOLER';
  return 'UNKNOWN';
}

// ─── main ─────────────────────────────────────────────────────────────────────

const envFilePath = path.join(__dirname, '../.env');
const fileEnv = loadEnvFile(envFilePath);
// Merge: process.env takes priority (shell exports win over .env file)
const mergedEnv: Record<string, string> = { ...fileEnv, ...process.env as Record<string, string> };

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Migrate Deploy Wrapper (OPS-ENV-001)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Resolve URL
let directUrl: string | undefined = mergedEnv['DIRECT_DATABASE_URL'];
let varUsed = 'DIRECT_DATABASE_URL';

if (!directUrl && mergedEnv['MIGRATION_DATABASE_URL']) {
  directUrl = mergedEnv['MIGRATION_DATABASE_URL'];
  varUsed = 'MIGRATION_DATABASE_URL (legacy alias — rename to DIRECT_DATABASE_URL)';
  console.warn('  ⚠ DEPRECATION: Using MIGRATION_DATABASE_URL as DIRECT_DATABASE_URL alias');
}

if (!directUrl) {
  console.error('  ✗ DIRECT_DATABASE_URL not found in shell or server/.env');
  console.error('    Run: pnpm -C server prisma:preflight  to diagnose.');
  process.exit(1);
}

// Parse and classify
let parsed: URL;
try {
  parsed = new URL(directUrl);
} catch {
  console.error('  ✗ Cannot parse URL from ' + varUsed + ' (value redacted)');
  process.exit(1);
}

const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
const classification = classifyHost(parsed.hostname, port);

console.log(`  Var         : ${varUsed.split(' ')[0]}`);
console.log(`  Host        : ${parsed.hostname}`);
console.log(`  Port        : ${port}`);
console.log(`  Database    : ${parsed.pathname.replace(/^\//, '') || '(root)'}`);
console.log(`  Endpoint    : ${classification}`);
console.log('');

if (classification === 'TX_POOLER') {
  console.error('  ✗ BLOCKED: Transaction pooler cannot run DDL migrations.');
  console.error('    Update DIRECT_DATABASE_URL to a direct or session-pooler endpoint.');
  process.exit(1);
}

// Inject DIRECT_DATABASE_URL into child env (solves PowerShell .env not auto-loaded)
const childEnv: Record<string, string> = {
  ...mergedEnv,
  DIRECT_DATABASE_URL: directUrl,
};

console.log('  ✓ Preflight passed — running prisma migrate deploy');
console.log('');

try {
  execSync('prisma migrate deploy', {
    stdio: 'inherit',
    env: childEnv,
    cwd: path.join(__dirname, '..'),  // server/ directory
  });
  console.log('');
  console.log('  ✓ prisma migrate deploy completed successfully');
  console.log('');
} catch (err) {
  console.error('');
  console.error('  ✗ prisma migrate deploy FAILED (see output above)');
  console.error('');
  process.exit(1);
}
