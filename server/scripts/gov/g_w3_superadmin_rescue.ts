/**
 * G-W3-SUPERADMIN-RESCUE
 * Wave-3 Hotfix — DB Identity + Existence Proof + Idempotent Super Admin Seed
 *
 * Steps:
 *   1) DB Identity Proof  — which DB/host/schema are we writing to?
 *   2) Existence Proof    — does admin@texqtic.com exist in admin_users?
 *   3) Seed (if missing)  — upsert SUPER_ADMIN row idempotently
 *   4) Post-seed verify   — recount + hash prefix check
 *
 * Required env vars:
 *   MIGRATION_DATABASE_URL   (required) — direct connection, bypasses pooler state
 *   SUPERADMIN_EMAIL         (optional, default "admin@texqtic.com")
 *   SUPERADMIN_PASSWORD      (required)
 *
 * NEVER prints: full DB URL, full password hash, or plaintext password.
 *
 * Usage:
 *   $env:MIGRATION_DATABASE_URL="postgres://..."
 *   $env:SUPERADMIN_EMAIL="admin@texqtic.com"
 *   $env:SUPERADMIN_PASSWORD="..."
 *   pnpm -C server exec tsx scripts/gov/g_w3_superadmin_rescue.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── Env validation ────────────────────────────────────────────────────────────

const MIGRATION_DATABASE_URL = process.env['MIGRATION_DATABASE_URL'];
const SUPERADMIN_EMAIL = (
  process.env['SUPERADMIN_EMAIL'] ?? 'admin@texqtic.com'
).toLowerCase();
const SUPERADMIN_PASSWORD = process.env['SUPERADMIN_PASSWORD'];

if (!MIGRATION_DATABASE_URL) {
  console.error('[RESCUE ABORT] MIGRATION_DATABASE_URL is required');
  process.exit(1);
}
if (!SUPERADMIN_PASSWORD) {
  console.error('[RESCUE ABORT] SUPERADMIN_PASSWORD is required');
  process.exit(1);
}

// ── PrismaClient (direct connection) ─────────────────────────────────────────

const prisma = new PrismaClient({
  datasources: {
    db: { url: MIGRATION_DATABASE_URL },
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function redactHost(url: string): string {
  try {
    const u = new URL(url);
    // Print host + port + path (database name) only — no credentials
    return `${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return '<unparseable-url>';
  }
}

// ── Step 1: DB Identity Proof ─────────────────────────────────────────────────

console.log('\n=== STEP 1: DB IDENTITY PROOF ===');
console.log(
  `Connection target (redacted): ${redactHost(MIGRATION_DATABASE_URL)}`,
);

const identityRows = await prisma.$queryRaw<
  Array<{ db: string; host: string; port: number; schema: string; now: Date }>
>`
  SELECT
    current_database()                     AS db,
    COALESCE(inet_server_addr()::text, 'pooler/local') AS host,
    inet_server_port()                     AS port,
    current_schema()                       AS schema,
    now()                                  AS now
`;

const id = identityRows[0];
if (!id) {
  console.error('[RESCUE ABORT] Could not query DB identity');
  await prisma.$disconnect();
  process.exit(1);
}
// Redact the host IP from server output — print only last octet pattern
const hostRedacted = id.host.replace(
  /^(\d+\.\d+)\.\d+\.\d+$/,
  '$1.x.x',
);
console.log(`  database         : ${id.db}`);
console.log(`  server host      : ${hostRedacted}`);
console.log(`  server port      : ${id.port}`);
console.log(`  current_schema() : ${id.schema}`);
console.log(`  server time      : ${id.now.toISOString()}`);

// ── Step 2: Existence Proof ───────────────────────────────────────────────────

console.log('\n=== STEP 2: EXISTENCE PROOF ===');

const countRows = await prisma.$queryRaw<Array<{ admin_users_count: bigint }>>`
  SELECT COUNT(*)::int AS admin_users_count FROM public.admin_users
`;
const totalCount = Number(countRows[0]?.admin_users_count ?? 0);
console.log(`  public.admin_users total rows: ${totalCount}`);

// Check for the specific email we intend to seed
const existingRows = await prisma.$queryRaw<
  Array<{
    id: string;
    email: string;
    role: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
  }>
>`
  SELECT id, email, role, password_hash, created_at, updated_at
  FROM public.admin_users
  WHERE lower(email) = ${SUPERADMIN_EMAIL}
  LIMIT 1
`;

const existing = existingRows[0];
const rowExists = existing !== undefined;

if (rowExists) {
  const hash = existing.password_hash;
  const hashPrefix = hash.substring(0, 7);   // e.g. "$2a$12$"
  const hashLen = hash.length;
  console.log(`  Row EXISTS       : YES`);
  console.log(`  id               : ${existing.id}`);
  console.log(`  email            : ${existing.email}`);
  console.log(`  role             : ${existing.role}`);
  console.log(`  hash prefix      : ${hashPrefix}...`);
  console.log(`  hash length      : ${hashLen}`);
  console.log(`  created_at       : ${existing.created_at.toISOString()}`);
  console.log(`  updated_at       : ${existing.updated_at.toISOString()}`);
} else {
  console.log(`  Row EXISTS       : NO — will seed`);
}

// ── Step 3: Seed (only if row is missing) ────────────────────────────────────

const SALT_ROUNDS = 12;
let seeded = false;

if (!rowExists) {
  console.log('\n=== STEP 3: SEEDING ===');

  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);
  const hashPrefix = passwordHash.substring(0, 7);
  const hashLen = passwordHash.length;

  console.log(`  Hashing with     : bcryptjs`);
  console.log(`  Salt rounds      : ${SALT_ROUNDS}`);
  console.log(`  Hash prefix      : ${hashPrefix}...`);
  console.log(`  Hash length      : ${hashLen}`);

  const upserted = await prisma.adminUser.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: {
      passwordHash,
      updatedAt: new Date(),
    },
    create: {
      email: SUPERADMIN_EMAIL,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  console.log(`  Upsert result    : email=${upserted.email} role=${upserted.role}`);
  console.log(`  id               : ${upserted.id}`);
  seeded = true;
} else {
  console.log('\n=== STEP 3: SEEDING === SKIPPED (row already exists)');
}

// ── Step 4: Post-seed Verify ──────────────────────────────────────────────────

console.log('\n=== STEP 4: POST-SEED VERIFICATION ===');

const verifyRows = await prisma.$queryRaw<
  Array<{
    id: string;
    email: string;
    role: string;
    password_hash: string;
    updated_at: Date;
  }>
>`
  SELECT id, email, role, password_hash, updated_at
  FROM public.admin_users
  WHERE lower(email) = ${SUPERADMIN_EMAIL}
  LIMIT 1
`;

const verified = verifyRows[0];
if (!verified) {
  console.error('[RESCUE FAIL] Row NOT found after seed — upsert did not persist!');
  await prisma.$disconnect();
  process.exit(1);
}

const vHash = verified.password_hash;
const vPrefix = vHash.substring(0, 7);
const vLen = vHash.length;
const isBcrypt = vHash.startsWith('$2a$') || vHash.startsWith('$2b$');

console.log(`  Row found        : YES`);
console.log(`  email            : ${verified.email}`);
console.log(`  role             : ${verified.role}`);
console.log(`  hash prefix      : ${vPrefix}...`);
console.log(`  hash length      : ${vLen}`);
console.log(`  is bcrypt hash   : ${isBcrypt}`);
console.log(`  last updated     : ${verified.updated_at.toISOString()}`);

// ── Step 5: Local password verify (smoke test, no HTTP needed) ───────────────

console.log('\n=== STEP 5: LOCAL PASSWORD COMPARE SMOKE TEST ===');
const compareResult = await bcrypt.compare(SUPERADMIN_PASSWORD, vHash);
console.log(
  `  bcrypt.compare() : ${compareResult ? 'PASS ✓ — credentials will authenticate' : 'FAIL ✗ — hash mismatch!'}`,
);

if (!compareResult) {
  console.error('[RESCUE FAIL] Password compare failed — seeded hash does not match provided password');
  await prisma.$disconnect();
  process.exit(1);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n=== RESCUE SUMMARY ===');
console.log(`  G-W3-SUPERADMIN-RESCUE   : COMPLETE`);
console.log(`  DB                       : ${id.db}`);
console.log(`  Target email             : ${SUPERADMIN_EMAIL}`);
console.log(`  Row seeded this run      : ${seeded ? 'YES' : 'NO (already existed)'}`);
console.log(`  Password compare         : PASS`);
console.log(`  Admin login ready        : YES`);
console.log(`\n  NOTE: Login form must submit email in lowercase format.`);
console.log(
  `  Auth route uses WHERE email = <raw_input> (case-sensitive PostgreSQL text column).`,
);
console.log(`  Submit: ${SUPERADMIN_EMAIL}`);

await prisma.$disconnect();
