#!/usr/bin/env tsx
/**
 * Prisma Migration Env Preflight (OPS-ENV-001)
 *
 * Validates that DIRECT_DATABASE_URL is correctly set before running
 * `prisma migrate deploy`. Classifies the endpoint type and fails fast
 * for configurations that cannot run DDL (transaction pooler).
 *
 * Usage:
 *   pnpm -C server prisma:preflight
 *   pnpm -C server prisma:preflight -- --env-file=server/.env.production
 *   tsx server/scripts/prisma-env-preflight.ts
 *
 * Exit codes:
 *   0 = DIRECT or SESSION_POOLER endpoint (safe for migrations)
 *   1 = missing var, invalid scheme, TX_POOLER, or parse error
 *
 * ONE TRUE VAR: DIRECT_DATABASE_URL  (schema.prisma directUrl)
 * LEGACY ALIAS: MIGRATION_DATABASE_URL (deprecated — prints warning)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
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
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

type EndpointClass = 'DIRECT' | 'SESSION_POOLER' | 'TX_POOLER' | 'UNKNOWN';

function classifyHost(host: string, port: number): EndpointClass {
  const h = host.toLowerCase();
  // Supabase transaction pooler: aws-0-* port 6543
  if (h.includes('.pooler.supabase.com') && (h.startsWith('aws-0-') || port === 6543)) {
    return 'TX_POOLER';
  }
  // Supabase session pooler: aws-1-* port 5432
  if (h.includes('.pooler.supabase.com') && h.startsWith('aws-1-')) {
    return 'SESSION_POOLER';
  }
  // Supabase direct: db.<ref>.supabase.co
  if (h.startsWith('db.') && (h.endsWith('.supabase.co') || h.includes('.supabase.co'))) {
    return 'DIRECT';
  }
  // Generic pooler detection by port
  if (port === 6543) return 'TX_POOLER';
  // Fallback: assume direct if none of the above match
  return 'UNKNOWN';
}

function redactedSummary(urlStr: string): { host: string; port: number; db: string; scheme: string; classification: EndpointClass } | null {
  try {
    const u = new URL(urlStr);
    const port = u.port ? parseInt(u.port, 10) : (u.protocol === 'postgres:' || u.protocol === 'postgresql:' ? 5432 : -1);
    const db = u.pathname.replace(/^\//, '') || '(root)';
    const classification = classifyHost(u.hostname, port);
    return { host: u.hostname, port, db, scheme: u.protocol.replace(':', ''), classification };
  } catch {
    return null;
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

// Parse --env-file= argument
const envFileArg = process.argv.find(a => a.startsWith('--env-file='));
const envFilePath = envFileArg
  ? path.resolve(envFileArg.split('=').slice(1).join('='))
  : path.join(__dirname, '../.env');

// Load env file
loadEnvFile(envFilePath);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Prisma Migration Env Preflight (OPS-ENV-001)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Env file: ${envFilePath}`);
console.log('');

// Resolve the URL — primary: DIRECT_DATABASE_URL, legacy alias: MIGRATION_DATABASE_URL
let urlValue: string | undefined = process.env['DIRECT_DATABASE_URL'];
let varUsed = 'DIRECT_DATABASE_URL';
let legacyAlias = false;

if (!urlValue && process.env['MIGRATION_DATABASE_URL']) {
  urlValue = process.env['MIGRATION_DATABASE_URL'];
  varUsed = 'MIGRATION_DATABASE_URL';
  legacyAlias = true;
}

if (!urlValue) {
  console.error('  ✗ DIRECT_DATABASE_URL is NOT SET');
  console.error('');
  console.error('  Resolution:');
  console.error('    Set DIRECT_DATABASE_URL in server/.env pointing to the');
  console.error('    Supabase direct connection or session-pooler connection.');
  console.error('    DO NOT use the transaction pooler (aws-0-* port 6543).');
  console.error('');
  console.error('  See: docs/ops/prisma-migrations.md');
  console.error('');
  process.exit(1);
}

if (legacyAlias) {
  console.warn('  ⚠ DEPRECATION WARNING: Using MIGRATION_DATABASE_URL as alias for DIRECT_DATABASE_URL');
  console.warn('    Rename the key in your .env to DIRECT_DATABASE_URL to silence this warning.');
  console.warn('');
}

const parsed = redactedSummary(urlValue);

if (!parsed) {
  console.error(`  ✗ Could not parse URL from ${varUsed} (redacted)`);
  console.error('    Check that the value is a valid PostgreSQL connection string.');
  process.exit(1);
}

// Validate scheme
if (parsed.scheme !== 'postgres' && parsed.scheme !== 'postgresql') {
  console.error(`  ✗ Invalid scheme: ${parsed.scheme}`);
  console.error('    Expected: postgres:// or postgresql://');
  process.exit(1);
}

// Print redacted summary
console.log(`  Var used    : ${varUsed}`);
console.log(`  Scheme      : ${parsed.scheme}`);
console.log(`  Host        : ${parsed.host}`);
console.log(`  Port        : ${parsed.port}`);
console.log(`  Database    : ${parsed.db}`);
console.log(`  Endpoint    : ${parsed.classification}`);
console.log('');

// Decision
switch (parsed.classification) {
  case 'TX_POOLER':
    console.error('  ✗ BLOCKED: Transaction pooler detected (aws-0-* port 6543)');
    console.error('    Transaction poolers do NOT support DDL (CREATE TABLE, ALTER, etc.)');
    console.error('    Prisma migrations WILL FAIL against this endpoint.');
    console.error('');
    console.error('  Fix: Use the direct connection or session pooler instead.');
    console.error('    Direct:          db.<ref>.supabase.co:5432');
    console.error('    Session pooler:  aws-1-<region>.pooler.supabase.com:5432');
    console.error('');
    process.exit(1);

  case 'SESSION_POOLER':
    console.log('  ✓ SESSION_POOLER — acceptable for Prisma migrations on Supabase');
    console.log('    Note: direct connection (db.<ref>.supabase.co:5432) is preferred.');
    console.log('');
    console.log('  PREFLIGHT PASS');
    console.log('');
    process.exit(0);

  case 'DIRECT':
    console.log('  ✓ DIRECT — ideal endpoint for Prisma migrations');
    console.log('');
    console.log('  PREFLIGHT PASS');
    console.log('');
    process.exit(0);

  case 'UNKNOWN':
    console.log('  ~ UNKNOWN endpoint classification (non-Supabase host)');
    console.log('    Proceeding — validate manually if this is a managed Postgres host.');
    console.log('');
    console.log('  PREFLIGHT PASS (with caveat)');
    console.log('');
    process.exit(0);
}
