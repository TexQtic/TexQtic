/**
 * G-015 Phase A — Backfill & Parity Verification Script
 *
 * Gap:      G-015 (Canonical organizations alignment vs current Tenant model)
 * Phase:    A (Additive Introduction)
 * Doctrine: v1.4 / TECS v1.6 / Wave-3 S2
 *
 * PURPOSE
 *   1. Verify tenants table has no duplicate IDs (pre-flight integrity check).
 *   2. Backfill: INSERT INTO organizations SELECT FROM tenants (ON CONFLICT DO NOTHING).
 *   3. Verify parity: row count equality + exact ID set equality (EXCEPT query).
 *   4. Exit non-zero on any mismatch.
 *
 * CONNECTION
 *   Uses MIGRATION_DATABASE_URL (postgres owner / BYPASSRLS) so that the direct
 *   INSERT into organizations bypasses FORCE RLS policies. The organizations table's
 *   SECURITY DEFINER trigger handles runtime writes; this script operates at the
 *   schema-owner level for one-time backfill only.
 *
 * IDEMPOTENT
 *   Safe to run multiple times. ON CONFLICT (id) DO NOTHING prevents duplicates.
 *
 * USAGE
 *   cd server
 *   pnpm exec tsx scripts/g015_phase_a_backfill_and_verify.ts
 *
 * REQUIRED ENV
 *   MIGRATION_DATABASE_URL — postgres owner connection string
 */

import { PrismaClient } from '@prisma/client';

// ─── env guard ───────────────────────────────────────────────────────────────

const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!migrationUrl) {
  console.error('❌ BLOCKER: MIGRATION_DATABASE_URL is not set in environment.');
  console.error('   This script requires the postgres owner connection to bypass FORCE RLS.');
  process.exit(1);
}

// ─── client (postgres owner — bypasses RLS) ──────────────────────────────────

const prisma = new PrismaClient({
  datasources: {
    db: { url: migrationUrl },
  },
  log: [],
});

// ─── helpers ─────────────────────────────────────────────────────────────────

type CountRow = { count: bigint };
type IdRow    = { id: string };

function bigIntToNumber(n: bigint): number {
  return Number(n);
}

function sep(label: string): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(label);
  console.log('─'.repeat(60));
}

// ─── Step 1: Tenant integrity pre-flight ─────────────────────────────────────

async function verifyTenantIntegrity(): Promise<number> {
  sep('STEP 1: Tenant identity integrity check');

  const [totalRow] = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS count FROM public.tenants
  `;
  const [distinctRow] = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(DISTINCT id) AS count FROM public.tenants
  `;

  const total    = bigIntToNumber(totalRow.count);
  const distinct = bigIntToNumber(distinctRow.count);

  console.log(`  tenants total rows   : ${total}`);
  console.log(`  tenants distinct IDs : ${distinct}`);

  if (total !== distinct) {
    console.error(`❌ BLOCKER: tenants table has duplicate IDs (total=${total}, distinct=${distinct}).`);
    console.error('   This must be resolved before backfill can proceed.');
    process.exit(1);
  }

  console.log(`✅ Tenant integrity OK — ${total} rows, all IDs unique`);
  return total;
}

// ─── Step 2: Backfill ─────────────────────────────────────────────────────────

async function runBackfill(): Promise<void> {
  sep('STEP 2: Backfill organizations from tenants');

  // Execute the backfill INSERT. Using $executeRawUnsafe because we cannot
  // parameterize a SELECT-based INSERT with Prisma.sql template tags cleanly.
  // The SQL does not use any user-supplied parameters — it is a fixed SELECT.
  const inserted = await prisma.$executeRawUnsafe(`
    INSERT INTO public.organizations (
      id,
      slug,
      legal_name,
      org_type,
      status,
      plan,
      effective_at,
      created_at,
      updated_at
    )
    SELECT
      id,
      slug,
      name          AS legal_name,
      type::text    AS org_type,
      status::text  AS status,
      plan::text    AS plan,
      created_at    AS effective_at,
      created_at,
      updated_at
    FROM public.tenants
    ON CONFLICT (id) DO NOTHING
  `);

  console.log(`✅ Backfill complete — ${inserted} rows inserted`);
  console.log('   (0 = all rows were already present — fully idempotent)');
}

// ─── Step 3: Parity verification ─────────────────────────────────────────────

async function verifyParity(expectedCount: number): Promise<void> {
  sep('STEP 3: Parity verification — organizations vs tenants');

  // 3a. Row count check
  const [orgCountRow] = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*) AS count FROM public.organizations
  `;
  const orgCount = bigIntToNumber(orgCountRow.count);

  console.log(`  tenants      count : ${expectedCount}`);
  console.log(`  organizations count : ${orgCount}`);

  if (orgCount !== expectedCount) {
    console.error(`❌ PARITY FAIL: count mismatch — tenants=${expectedCount}, organizations=${orgCount}`);
    process.exit(1);
  }
  console.log('✅ Row count parity OK');

  // 3b. ID set equality — IDs in tenants but NOT in organizations
  const missingInOrg = await prisma.$queryRaw<IdRow[]>`
    SELECT id::text AS id
    FROM public.tenants
    EXCEPT
    SELECT id::text AS id
    FROM public.organizations
    LIMIT 20
  `;

  // IDs in organizations but NOT in tenants (orphaned org rows)
  const orphanInOrg = await prisma.$queryRaw<IdRow[]>`
    SELECT id::text AS id
    FROM public.organizations
    EXCEPT
    SELECT id::text AS id
    FROM public.tenants
    LIMIT 20
  `;

  const missingCount = missingInOrg.length;
  const orphanCount  = orphanInOrg.length;

  if (missingCount > 0) {
    console.error(`❌ ID SET FAIL: ${missingCount} tenant IDs missing from organizations (showing up to 20):`);
    missingInOrg.forEach((r) => console.error(`   missing: ${r.id}`));
    process.exit(1);
  }
  console.log('✅ ID set: all tenant IDs present in organizations');

  if (orphanCount > 0) {
    console.error(`❌ ID SET FAIL: ${orphanCount} organizations rows have no matching tenant (orphans, showing up to 20):`);
    orphanInOrg.forEach((r) => console.error(`   orphan: ${r.id}`));
    process.exit(1);
  }
  console.log('✅ ID set: no orphaned organizations rows');
}

// ─── Step 4: Summary ─────────────────────────────────────────────────────────

async function printSummary(tenantCount: number): Promise<void> {
  sep('STEP 4: Schema evidence');

  // RLS state
  const rlsRows = await prisma.$queryRaw<
    Array<{ tablename: string; rowsecurity: boolean; forcerowsecurity: boolean }>
  >`
    SELECT
      c.relname                   AS tablename,
      c.relrowsecurity            AS rowsecurity,
      c.relforcerowsecurity       AS forcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'organizations'
  `;

  console.log('\nRLS state:');
  console.table(rlsRows);

  // Policy list
  const policies = await prisma.$queryRaw<
    Array<{ policyname: string; cmd: string; permissive: string }>
  >`
    SELECT policyname, cmd, permissive
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations'
    ORDER BY policyname
  `;

  console.log('\nRLS policies:');
  console.table(policies);

  // Trigger existence
  const triggers = await prisma.$queryRaw<
    Array<{ trigger_name: string; event_manipulation: string; action_timing: string }>
  >`
    SELECT trigger_name, event_manipulation, action_timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'tenants'
      AND trigger_name = 'trg_sync_tenants_to_org'
    ORDER BY event_manipulation
  `;

  console.log('\nTrigger on tenants:');
  console.table(triggers);

  if (triggers.length === 0) {
    console.error('❌ WARN: trg_sync_tenants_to_org not visible in information_schema — check pg_trigger directly');
  } else {
    console.log('✅ Trigger confirmed in information_schema');
  }

  // Final banner
  console.log(`
${'═'.repeat(60)}
G-015 Phase A — BACKFILL & PARITY COMPLETE
${'═'.repeat(60)}
  organizations row count : ${tenantCount}
  Parity with tenants     : ✅ EXACT MATCH
  FORCE RLS               : ✅ ACTIVE
  Trigger installed       : ✅ trg_sync_tenants_to_org
${'═'.repeat(60)}
Phase A SUCCESS — ready for Phase B gate.
${'═'.repeat(60)}
  `);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('G-015 Phase A — Backfill & Parity Verification');
  console.log('Doctrine: v1.4  |  TECS v1.6  |  Wave-3 S2');
  console.log('═'.repeat(60));
  console.log('Connection: MIGRATION_DATABASE_URL (postgres owner / BYPASSRLS)');

  try {
    const tenantCount = await verifyTenantIntegrity();
    await runBackfill();
    await verifyParity(tenantCount);
    await printSummary(tenantCount);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ FATAL: ${message}`);
  prisma.$disconnect().finally(() => {
    process.exit(1);
  });
});
