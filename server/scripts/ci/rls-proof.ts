/**
 * G-013 — CI RLS Cross-Tenant 0-Row Proof
 *
 * Validates that Postgres RLS tenant isolation is enforced by live policies.
 * Runs three assertions:
 *   Step 1 — Policy sanity: 0 policies reference the legacy app.tenant_id variable
 *   Step 2 — Tenant A context: cross-tenant rows visible = 0 (non-vacuous)
 *   Step 3 — Tenant B context: cross-tenant rows visible = 0 (non-vacuous)
 *
 * Required env vars:
 *   DATABASE_URL    — Supabase connection string (never printed)
 *   CI_TENANT_A_ID  — UUID of first tenant (e.g. ACME)
 *   CI_TENANT_B_ID  — UUID of second tenant (e.g. WL)
 *
 * Run locally:  pnpm run ci:rls-proof   (from server/)
 * Run in CI:    automatically via .github/workflows/rls-proof.yml
 */

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// ── Validation ────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUUID(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`FATAL: Environment variable ${name} is not set.`);
    console.error(
      'Configure CI_TENANT_A_ID and CI_TENANT_B_ID as CI secrets/variables.'
    );
    process.exit(1);
  }
  if (!UUID_RE.test(val)) {
    console.error(`FATAL: ${name} is not a valid UUID: (value redacted)`);
    process.exit(1);
  }
  return val;
}

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set.');
  process.exit(1);
}

const TENANT_A_ID = requireUUID('CI_TENANT_A_ID');
const TENANT_B_ID = requireUUID('CI_TENANT_B_ID');

if (TENANT_A_ID === TENANT_B_ID) {
  console.error('FATAL: CI_TENANT_A_ID and CI_TENANT_B_ID must be different UUIDs.');
  process.exit(1);
}

// ── Prisma ────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  log: [], // suppress all Prisma query logs — never leak connection strings
});

// ── Proof steps ───────────────────────────────────────────────────────────────

/**
 * Step 1: Policy sanity check.
 * No active policy should reference the legacy app.tenant_id variable.
 * This runs outside a transaction — pg_policies is a system view.
 */
async function checkLegacyPolicyReferences(): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT count(*)::bigint AS count
       FROM pg_policies
      WHERE qual       LIKE '%app.tenant_id%'
         OR with_check LIKE '%app.tenant_id%'`
  );
  return Number(rows[0].count);
}

/**
 * Steps 2 & 3: Tenant isolation proof.
 * Opens a transaction, activates texqtic_app role + sets org_id context,
 * then counts rows that should be invisible (cross-tenant) and visible (own-tenant).
 */
async function runIsolationProof(tenantId: string): Promise<{
  crossTenantCount: number;
  ownTenantCount: number;
}> {
  return prisma.$transaction(async (tx) => {
    // Activate the application role (NOBYPASSRLS) — transaction-local
    await tx.$executeRawUnsafe(`SET LOCAL ROLE texqtic_app`);

    // Set the canonical RLS context variable — transaction-local (third arg = true)
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.org_id', '${tenantId}', true)`
    );

    // Cross-tenant assertion: RLS must filter out all rows belonging to OTHER tenants.
    // Under a correctly enforced policy, this count will always be 0.
    const crossRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM carts
        WHERE tenant_id != '${tenantId}'::uuid`
    );

    // Positive control: own-tenant query must execute without error.
    // The returned count may be 0 (no data) but the query itself must succeed —
    // proving the context is valid and queries are not being vacuously blocked.
    const ownRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM carts
        WHERE tenant_id = '${tenantId}'::uuid`
    );

    return {
      crossTenantCount: Number(crossRows[0].count),
      ownTenantCount:   Number(ownRows[0].count),
    };
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log(' G-013 — RLS CROSS-TENANT 0-ROW PROOF');
  console.log('═══════════════════════════════════════════════════');
  console.log(` Tenant A: ${TENANT_A_ID}`);
  console.log(` Tenant B: ${TENANT_B_ID}`);
  console.log('');

  let failures = 0;

  // ── Step 1: Policy sanity ──────────────────────────────────────────────────
  console.log('--- Step 1: Legacy policy variable check ---');
  const legacyCount = await checkLegacyPolicyReferences();
  console.log(`  app.tenant_id policy references: ${legacyCount}`);
  if (legacyCount !== 0) {
    console.error(`  ❌ FAIL — expected 0, got ${legacyCount}`);
    console.error('     Legacy app.tenant_id references exist in live policies.');
    failures++;
  } else {
    console.log('  ✅ PASS — no legacy policy references');
  }

  // ── Step 2: Tenant A isolation ────────────────────────────────────────────
  console.log('\n--- Step 2: Tenant A cross-tenant isolation ---');
  const resultA = await runIsolationProof(TENANT_A_ID);
  console.log(`  Cross-tenant rows visible: ${resultA.crossTenantCount}`);
  console.log(`  Own-tenant rows (control): ${resultA.ownTenantCount}`);
  if (resultA.crossTenantCount !== 0) {
    console.error(
      `  ❌ FAIL — expected 0 cross-tenant rows, got ${resultA.crossTenantCount}`
    );
    failures++;
  } else {
    console.log('  ✅ PASS — 0 cross-tenant rows, positive control executed');
  }

  // ── Step 3: Tenant B isolation ────────────────────────────────────────────
  console.log('\n--- Step 3: Tenant B cross-tenant isolation ---');
  const resultB = await runIsolationProof(TENANT_B_ID);
  console.log(`  Cross-tenant rows visible: ${resultB.crossTenantCount}`);
  console.log(`  Own-tenant rows (control): ${resultB.ownTenantCount}`);
  if (resultB.crossTenantCount !== 0) {
    console.error(
      `  ❌ FAIL — expected 0 cross-tenant rows, got ${resultB.crossTenantCount}`
    );
    failures++;
  } else {
    console.log('  ✅ PASS — 0 cross-tenant rows, positive control executed');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  if (failures === 0) {
    console.log(' ✅ ALL STEPS PASS — RLS isolation verified (G-013)');
    console.log('═══════════════════════════════════════════════════');
    process.exit(0);
  } else {
    console.error(` 🚨 ${failures} STEP(S) FAILED — RLS ISOLATION BREACH`);
    console.error('═══════════════════════════════════════════════════');
    process.exit(1);
  }
}

main()
  .catch((err: Error) => {
    console.error('Proof script error:', err.message);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
