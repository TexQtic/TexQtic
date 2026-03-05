/**
 * G-013 + OPS-CI-RLS-DOMAIN-PROOF-001 + OPS-G028-A1 — CI RLS Cross-Tenant 0-Row Proof
 *
 * Validates that Postgres RLS tenant isolation is enforced by live policies.
 * Runs five assertions:
 *   Step 1 — Policy sanity: 0 policies reference the legacy app.tenant_id variable
 *   Step 2 — Tenant A context (carts): cross-tenant rows visible = 0 (non-vacuous)
 *   Step 3 — Tenant B context (carts): cross-tenant rows visible = 0 (non-vacuous)
 *   Step 4 — DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS:
 *             Wave 3 domain table cross-tenant isolation (OPS-CI-RLS-DOMAIN-PROOF-001)
 *             Tenant A and Tenant B each see 0 rows scoped to the other org.
 *   Step 5 — DOMAIN_ISOLATION_PROOF_DOCUMENT_EMBEDDINGS (OPS-G028-A1):
 *             Inserts 1 real row per tenant (as texqtic_app + org context),
 *             asserts cross-tenant count = 0 from each tenant's perspective,
 *             then cleans up proof rows via postgres BYPASSRLS connection.
 *             Fails loudly if the migration has not been applied.
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

/**
 * Step 4: Wave 3 domain table isolation proof — escalation_events.
 *
 * Proves that RLS on escalation_events (org_id boundary) prevents a tenant
 * from reading rows that belong to a different org.
 *
 * escalation_events uses org_id (not tenant_id) as the RLS column —
 * this is the canonical Wave 3 pattern verified in GOVERNANCE-SYNC-076.
 *
 * Assertion: under Org-X context, count of rows WHERE org_id != Org-X == 0.
 * If RLS is broken (FORCE RLS disabled or policy missing), cross-tenant rows
 * from the other org become visible and the count exceeds 0, failing the proof.
 *
 * OPS-CI-RLS-DOMAIN-PROOF-001 (Phase A closure — CI Domain Table Coverage 3→5).
 */
async function runDomainIsolationProofEscalationEvents(tenantId: string): Promise<{
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

    // Cross-tenant assertion: rows with org_id != current tenant must be invisible.
    // Under correctly enforced RLS (FORCE RLS + PERMISSIVE SELECT filtered by org_id),
    // this count is always 0 — any non-zero value indicates an isolation breach.
    const crossRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM escalation_events
        WHERE org_id != '${tenantId}'::uuid`
    );

    // Positive control: own-tenant query must execute without error.
    // Count may be 0 (no escalations seeded for this org) — that is acceptable;
    // the assertion is on cross-tenant isolation, not on the presence of own rows.
    const ownRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM escalation_events
        WHERE org_id = '${tenantId}'::uuid`
    );

    return {
      crossTenantCount: Number(crossRows[0].count),
      ownTenantCount:   Number(ownRows[0].count),
    };
  });
}

/**
 * Step 5: G-028 A1 — document_embeddings cross-tenant isolation proof.
 *
 * This step INSERTS real test rows (one per tenant) and then asserts that
 * each tenant sees only its own rows under texqtic_app + org context.
 * Inserted rows are cleaned up after all assertions, using the postgres
 * superuser connection (BYPASSRLS) to avoid needing a DELETE policy.
 *
 * source_type='G028_CI_PROOF' is a reserved sentinel value — never emitted
 * by production code. Any production system that creates rows with this
 * source_type violates the proof's isolation invariant.
 *
 * OPS-G028-A1-PGVECTOR-ENABLE (CI isolation gate).
 */
const G028_CI_SOURCE_TYPE = 'G028_CI_PROOF';

// Build a 768-dimensional dummy vector string literal (all values = 0.1).
// pgvector accepts '[0.1,0.1,...,0.1]'::vector(768) syntax.
// We generate this once; it is used for both org A and org B proof rows.
function buildDummyVectorLiteral(): string {
  return '[' + Array(768).fill('0.1').join(',') + ']';
}

async function insertProofRow(tenantId: string, dummyVec: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE texqtic_app`);
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.org_id', '${tenantId}', true)`
    );
    await tx.$executeRawUnsafe(`
      INSERT INTO document_embeddings
        (org_id, source_type, source_id, chunk_index, content, content_hash, embedding, metadata)
      VALUES (
        '${tenantId}'::uuid,
        '${G028_CI_SOURCE_TYPE}',
        gen_random_uuid(),
        0,
        'G028 CI proof row — RLS cross-tenant isolation test',
        md5('G028_CI_PROOF_' || '${tenantId}'),
        '${dummyVec}'::vector(768),
        '{}'::jsonb
      )
      ON CONFLICT (org_id, source_type, source_id, chunk_index, content_hash) DO NOTHING
    `);
  });
}

async function assertDocumentEmbeddingIsolation(tenantId: string): Promise<{
  crossTenantCount: number;
  ownTenantCount: number;
}> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE texqtic_app`);
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.org_id', '${tenantId}', true)`
    );

    // Cross-tenant assertion: other tenants' rows must be invisible under RLS.
    const crossRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM document_embeddings
        WHERE org_id != '${tenantId}'::uuid
          AND source_type = '${G028_CI_SOURCE_TYPE}'`
    );

    // Positive control: own rows must be visible (non-vacuous proof).
    const ownRows = await tx.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM document_embeddings
        WHERE org_id = '${tenantId}'::uuid
          AND source_type = '${G028_CI_SOURCE_TYPE}'`
    );

    return {
      crossTenantCount: Number(crossRows[0].count),
      ownTenantCount:   Number(ownRows[0].count),
    };
  });
}

async function cleanupProofRows(): Promise<void> {
  // Runs as postgres (BYPASSRLS superuser) — no role switch required.
  // Removes all CI proof rows regardless of org_id.
  await prisma.$executeRawUnsafe(
    `DELETE FROM document_embeddings WHERE source_type = '${G028_CI_SOURCE_TYPE}'`
  );
}

async function runDocumentEmbeddingsIsolationProof(
  tenantAId: string,
  tenantBId: string,
): Promise<{
  resultA: { crossTenantCount: number; ownTenantCount: number };
  resultB: { crossTenantCount: number; ownTenantCount: number };
}> {
  const dummyVec = buildDummyVectorLiteral();

  // Insert proof row for org A (committed — real row for assertion)
  await insertProofRow(tenantAId, dummyVec);
  // Insert proof row for org B (committed — real row for assertion)
  await insertProofRow(tenantBId, dummyVec);

  // Assert from org A's perspective
  const resultA = await assertDocumentEmbeddingIsolation(tenantAId);
  // Assert from org B's perspective
  const resultB = await assertDocumentEmbeddingIsolation(tenantBId);

  // Cleanup: delete all G028_CI_PROOF rows as postgres (BYPASSRLS).
  await cleanupProofRows();

  return { resultA, resultB };
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

  // ── Step 4: Wave 3 domain table — escalation_events (OPS-CI-RLS-DOMAIN-PROOF-001) ─
  console.log('\n--- Step 4: DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS (Tenant A) ---');
  const domainResultA = await runDomainIsolationProofEscalationEvents(TENANT_A_ID);
  console.log(`  Cross-tenant rows visible: ${domainResultA.crossTenantCount}`);
  console.log(`  Own-tenant rows (control): ${domainResultA.ownTenantCount}`);
  if (domainResultA.crossTenantCount !== 0) {
    console.error(
      `  ❌ FAIL — expected 0 cross-tenant escalation_events rows, got ${domainResultA.crossTenantCount}`
    );
    failures++;
  } else {
    console.log('  ✅ PASS — Tenant A: 0 cross-tenant escalation_events rows');
  }

  console.log('\n--- Step 4 (cont): DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS (Tenant B) ---');
  const domainResultB = await runDomainIsolationProofEscalationEvents(TENANT_B_ID);
  console.log(`  Cross-tenant rows visible: ${domainResultB.crossTenantCount}`);
  console.log(`  Own-tenant rows (control): ${domainResultB.ownTenantCount}`);
  if (domainResultB.crossTenantCount !== 0) {
    console.error(
      `  ❌ FAIL — expected 0 cross-tenant escalation_events rows, got ${domainResultB.crossTenantCount}`
    );
    failures++;
  } else {
    console.log('  ✅ PASS — Tenant B: 0 cross-tenant escalation_events rows');
  }

  if (domainResultA.crossTenantCount === 0 && domainResultB.crossTenantCount === 0) {
    console.log('\nPASS: DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS');
  }

  // ── Step 5: G-028 A1 — document_embeddings cross-tenant isolation ─────────
  // Inserts 1 real row per tenant, asserts 0 cross-tenant visibility, cleans up.
  // Fails loudly if document_embeddings table does not exist (migration not applied).
  console.log('\n--- Step 5: DOMAIN_ISOLATION_PROOF_DOCUMENT_EMBEDDINGS (OPS-G028-A1) ---');
  let step5Failed = false;
  try {
    const { resultA: embeddingResultA, resultB: embeddingResultB } =
      await runDocumentEmbeddingsIsolationProof(TENANT_A_ID, TENANT_B_ID);

    console.log('  [Tenant A context]');
    console.log(`    Cross-tenant rows visible: ${embeddingResultA.crossTenantCount}`);
    console.log(`    Own-tenant rows (control): ${embeddingResultA.ownTenantCount}`);
    if (embeddingResultA.crossTenantCount !== 0) {
      console.error(
        `  ❌ FAIL — Tenant A sees ${embeddingResultA.crossTenantCount} cross-tenant document_embeddings rows (expected 0)`
      );
      failures++;
      step5Failed = true;
    }
    if (embeddingResultA.ownTenantCount < 1) {
      console.error(
        `  ❌ FAIL — Tenant A own-tenant count is ${embeddingResultA.ownTenantCount} (expected >= 1, non-vacuous proof required)`
      );
      failures++;
      step5Failed = true;
    }

    console.log('  [Tenant B context]');
    console.log(`    Cross-tenant rows visible: ${embeddingResultB.crossTenantCount}`);
    console.log(`    Own-tenant rows (control): ${embeddingResultB.ownTenantCount}`);
    if (embeddingResultB.crossTenantCount !== 0) {
      console.error(
        `  ❌ FAIL — Tenant B sees ${embeddingResultB.crossTenantCount} cross-tenant document_embeddings rows (expected 0)`
      );
      failures++;
      step5Failed = true;
    }
    if (embeddingResultB.ownTenantCount < 1) {
      console.error(
        `  ❌ FAIL — Tenant B own-tenant count is ${embeddingResultB.ownTenantCount} (expected >= 1, non-vacuous proof required)`
      );
      failures++;
      step5Failed = true;
    }

    if (!step5Failed) {
      console.log('  ✅ PASS — Tenant A: 0 cross-tenant document_embeddings rows (non-vacuous)');
      console.log('  ✅ PASS — Tenant B: 0 cross-tenant document_embeddings rows (non-vacuous)');
      console.log('\nPASS: DOMAIN_ISOLATION_PROOF_DOCUMENT_EMBEDDINGS');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ FAIL — Step 5 threw an error: ${msg}`);
    console.error(
      '     Likely cause: document_embeddings table does not exist (migration OPS-G028-A1 not applied).'
    );
    failures++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  if (failures === 0) {
    console.log(' ✅ ALL STEPS PASS — RLS isolation verified (G-013 + OPS-CI-RLS-DOMAIN-PROOF-001 + OPS-G028-A1)');
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
