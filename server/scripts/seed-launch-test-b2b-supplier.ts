/**
 * seed-launch-test-b2b-supplier.ts
 *
 * CLASSIFICATION: LAUNCH-TEST DATA ONLY.
 * This tenant and its records are NOT a real onboarded supplier, NOT a QA sentinel,
 * and NOT a reference/demo supplier. Exists solely for FAM-09 runtime verification.
 *
 * Slice: FAM-09-SUPPLIER-PROFILE-CATALOG-LAUNCH-TEST-SUPPLIER-SEED-001
 *
 * Purpose:
 *   Seed the minimum data required for FAM-09 runtime verification of:
 *     GET /api/public/b2b/suppliers  → total >= 1, items includes lt-b2b-001
 *     GET /api/public/supplier/lt-b2b-001 → 200 OK with public-safe supplier profile
 *
 * Five-Gate requirements satisfied by this seed:
 *   Gate A: publicEligibilityPosture = PUBLICATION_ELIGIBLE
 *   Gate B: publication_posture = B2B_PUBLIC
 *   Gate C: org_type = B2B
 *   Gate D: status = ACTIVE
 *   Gate E: is_qa_sentinel = false
 *
 * Guardrails:
 *   - ONLY targets slug lt-b2b-001. No real suppliers, no QA orgs, no sentinel records touched.
 *   - Idempotent: safe to re-run. Existing rows are updated, not duplicated.
 *   - Does NOT modify shraddha-industries or any qa-* org.
 *   - Does NOT force is_qa_sentinel = false on any existing org outside this slug.
 *   - Never prints DATABASE_URL, Supabase keys, tokens, or raw UUIDs.
 */

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const LT_SLUG = 'lt-b2b-001';
const LT_NAME = 'Launch Test Supplier B2B 001';
const LT_LEGAL_NAME = 'Launch Test Supplier 001 Pvt Ltd';

const CATALOG_ITEMS = [
  { name: 'LT Fabric Sample 001', sku: 'LT-B2B-001-FAB-001', moq: 100 },
  { name: 'LT Fabric Sample 002', sku: 'LT-B2B-001-FAB-002', moq: 100 },
  { name: 'LT Fabric Sample 003', sku: 'LT-B2B-001-FAB-003', moq: 100 },
] as const;

const OFFERING_PREVIEW_SKUS = CATALOG_ITEMS.map(i => i.sku);

async function updateExistingTenant(tenantId: string): Promise<void> {
  const existingOrg = await prisma.organizations.findUnique({
    where: { id: tenantId },
    select: { slug: true, org_type: true, status: true, publication_posture: true, is_qa_sentinel: true },
  });

  if (!existingOrg) {
    throw new Error(
      `[BLOCKER] Organization row missing for tenant slug=${LT_SLUG}. ` +
        'Data integrity issue — tenant exists but org does not. Manual intervention required.',
    );
  }

  if (existingOrg.is_qa_sentinel === true) {
    throw new Error(
      `[BLOCKER] Organization slug=${LT_SLUG} has is_qa_sentinel=true. ` +
        'This slug is occupied by a QA sentinel. Aborting — manual operator review required.',
    );
  }

  console.log(`[OK] is_qa_sentinel=false confirmed for existing record.`);

  await prisma.$transaction(
    async tx => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' },
      });

      await tx.organizations.update({
        where: { id: tenantId },
        data: { publication_posture: 'B2B_PUBLIC', updated_at: new Date() },
      });
    },
    { timeout: 10000 },
  );

  console.log('[UPDATED] Posture fields ensured: PUBLICATION_ELIGIBLE / B2B_PUBLIC');
}

async function createNewTenant(): Promise<string> {
  console.log('[CREATE] No existing launch-test tenant found. Creating...');

  // Generate a UUID here so we can reference it for the subsequent org update.
  // The trg_sync_tenants_to_org AFTER INSERT trigger will auto-create the organizations row
  // (with id, slug, legal_name=tenants.name, org_type, status, plan).
  // We must NOT call organizations.create() — the trigger handles that.
  const newId = randomUUID();

  // Step 1: Create tenant. Trigger fires, org row is auto-created.
  await prisma.tenant.create({
    data: {
      id: newId,
      slug: LT_SLUG,
      name: LT_NAME,
      type: 'B2B',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
      isWhiteLabel: false,
    },
  });

  // Step 2: Update org to set B2B-specific posture fields not set by the trigger.
  // (publication_posture, jurisdiction, primary_segment_key, legal_name are not set by trigger)
  await prisma.organizations.update({
    where: { id: newId },
    data: {
      legal_name: LT_LEGAL_NAME,
      jurisdiction: 'IN',
      publication_posture: 'B2B_PUBLIC',
      is_qa_sentinel: false, // explicit — default is false, but state it clearly
      primary_segment_key: 'Weaving',
      updated_at: new Date(),
    },
  });

  console.log(`[CREATED] Launch-test tenant created. Org auto-synced via trigger and updated.`);
  console.log(`  slug: ${LT_SLUG}`);
  console.log(`  legal_name: ${LT_LEGAL_NAME}`);
  console.log(`  is_qa_sentinel: false`);

  return newId;
}

async function ensureCatalogItems(tenantId: string): Promise<void> {
  // CatalogItem.sku has no unique constraint, so we resolve by (tenantId, sku).
  console.log('[CATALOG] Ensuring 3 launch-test catalog items...');

  const existingItems = await prisma.catalogItem.findMany({
    where: { tenantId, sku: { in: [...OFFERING_PREVIEW_SKUS] } },
    select: { id: true, sku: true, publicationPosture: true, active: true },
  });

  const existingSkus = new Set(existingItems.map(i => i.sku));
  const missingItems = CATALOG_ITEMS.filter(i => !existingSkus.has(i.sku));

  if (missingItems.length > 0) {
    await prisma.catalogItem.createMany({
      data: missingItems.map(item => ({
        tenantId,
        name: item.name,
        sku: item.sku,
        moq: item.moq,
        active: true,
        publicationPosture: 'B2B_PUBLIC',
        imageUrl: null,
        // price intentionally omitted — Decimal? field, not required for launch-test offering preview
      })),
    });
    console.log(`  [CREATED] ${missingItems.length} item(s): ${missingItems.map(i => i.sku).join(', ')}`);
  }

  if (existingItems.length > 0) {
    await prisma.catalogItem.updateMany({
      where: { tenantId, sku: { in: [...OFFERING_PREVIEW_SKUS] } },
      data: { active: true, publicationPosture: 'B2B_PUBLIC' },
    });
    console.log(`  [UPDATED] ${existingItems.length} existing item(s) — posture ensured.`);
  }
}

async function verifyAndReport(tenantId: string): Promise<void> {
  const verifyTenant = await prisma.tenant.findUnique({
    where: { slug: LT_SLUG },
    select: { slug: true, type: true, status: true, publicEligibilityPosture: true },
  });

  const verifyOrg = await prisma.organizations.findUnique({
    where: { id: tenantId },
    select: { slug: true, legal_name: true, org_type: true, status: true, publication_posture: true, is_qa_sentinel: true },
  });

  const verifyItems = await prisma.catalogItem.findMany({
    where: { tenantId, sku: { in: [...OFFERING_PREVIEW_SKUS] } },
    select: { sku: true, name: true, active: true, publicationPosture: true, imageUrl: true },
    orderBy: { sku: 'asc' },
  });

  console.log();
  console.log('=== VERIFICATION ===');
  console.log(`Tenant slug:         ${verifyTenant?.slug}`);
  console.log(`Tenant type:         ${verifyTenant?.type}  (expected: B2B)`);
  console.log(`Tenant status:       ${verifyTenant?.status}  (expected: ACTIVE)`);
  console.log(`Tenant posture:      ${verifyTenant?.publicEligibilityPosture}  (expected: PUBLICATION_ELIGIBLE)`);
  console.log(`Org legal_name:      ${verifyOrg?.legal_name}`);
  console.log(`Org org_type:        ${verifyOrg?.org_type}  (expected: B2B)`);
  console.log(`Org status:          ${verifyOrg?.status}  (expected: ACTIVE)`);
  console.log(`Org posture:         ${verifyOrg?.publication_posture}  (expected: B2B_PUBLIC)`);
  console.log(`Org is_qa_sentinel:  ${verifyOrg?.is_qa_sentinel}  (expected: false)`);
  console.log();
  console.log('Catalog items:');
  for (const item of verifyItems) {
    console.log(`  ${item.sku}: active=${item.active}  posture=${item.publicationPosture}  imageUrl=${item.imageUrl ?? 'null'}`);
  }

  const eligibleStatuses = ['ACTIVE', 'VERIFICATION_APPROVED'];
  const errors: string[] = [];

  if (verifyTenant?.publicEligibilityPosture !== 'PUBLICATION_ELIGIBLE') {
    errors.push(`Gate A FAIL: Tenant publicEligibilityPosture is '${verifyTenant?.publicEligibilityPosture}', expected PUBLICATION_ELIGIBLE`);
  }
  if (verifyTenant?.type !== 'B2B') {
    errors.push(`Gate C prerequisite FAIL: Tenant type is '${verifyTenant?.type}', expected B2B`);
  }
  if (verifyTenant?.status !== 'ACTIVE') {
    errors.push(`Gate D prerequisite FAIL: Tenant status is '${verifyTenant?.status}', expected ACTIVE`);
  }
  if (verifyOrg?.publication_posture !== 'B2B_PUBLIC') {
    errors.push(`Gate B FAIL: Org publication_posture is '${verifyOrg?.publication_posture}', expected B2B_PUBLIC`);
  }
  if (verifyOrg?.org_type !== 'B2B') {
    errors.push(`Gate C FAIL: Org org_type is '${verifyOrg?.org_type}', expected B2B`);
  }
  if (!verifyOrg?.status || !eligibleStatuses.includes(verifyOrg.status)) {
    errors.push(`Gate D FAIL: Org status '${verifyOrg?.status}' is not in eligible set [ACTIVE, VERIFICATION_APPROVED]`);
  }
  if (verifyOrg?.is_qa_sentinel !== false) {
    errors.push(`Gate E FAIL: Org is_qa_sentinel is '${verifyOrg?.is_qa_sentinel}', expected false`);
  }
  const publicItems = verifyItems.filter(
    i => ['B2B_PUBLIC', 'BOTH'].includes(i.publicationPosture ?? '') && i.active,
  );
  if (publicItems.length === 0) {
    errors.push('Offering preview FAIL: No active catalog items with B2B_PUBLIC/BOTH posture — supplier profile will show empty offering');
  }

  console.log();
  if (errors.length > 0) {
    console.error('❌ VERIFICATION FAILURES:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exitCode = 1;
  } else {
    console.log('✅ All five gates satisfied for lt-b2b-001:');
    console.log('   Gate A (publicEligibilityPosture=PUBLICATION_ELIGIBLE):  PASS');
    console.log('   Gate B (publication_posture=B2B_PUBLIC):                 PASS');
    console.log('   Gate C (org_type=B2B):                                   PASS');
    console.log('   Gate D (status=ACTIVE):                                  PASS');
    console.log('   Gate E (is_qa_sentinel=false):                           PASS');
    console.log(`   Catalog items public-eligible: ${publicItems.length}`);
    console.log();
    console.log('CLASSIFICATION: launch-test data only. NOT a real supplier.');
    console.log(`GET /api/public/b2b/suppliers should now include slug: ${LT_SLUG}`);
    console.log(`GET /api/public/supplier/${LT_SLUG} should now return 200 OK`);
  }
}

async function main() {
  console.log('=== FAM-09 LAUNCH-TEST SUPPLIER SEED ===');
  console.log('CLASSIFICATION: launch-test data only. NOT a real supplier.');
  console.log(`Target slug: ${LT_SLUG}`);
  console.log();

  // ── Step 1: Pre-flight — DATABASE_URL must be set ───────────────────────────
  if (!process.env.DATABASE_URL) {
    throw new Error('[BLOCKER] DATABASE_URL is not set. Cannot proceed. Set it in server/.env and retry.');
  }

  // ── Step 2: Ensure tenant + org exist with correct posture ──────────────────
  const existing = await prisma.tenant.findUnique({
    where: { slug: LT_SLUG },
    select: { id: true, slug: true },
  });

  let tenantId: string;

  if (existing) {
    console.log(`[FOUND] Launch-test tenant already exists: slug=${existing.slug}`);
    tenantId = existing.id;
    await updateExistingTenant(tenantId);
  } else {
    tenantId = await createNewTenant();
  }

  // ── Step 3: Upsert catalog items ────────────────────────────────────────────
  console.log();
  await ensureCatalogItems(tenantId);

  // ── Steps 4+5: Post-verify gates and report results ──────────────────────────
  await verifyAndReport(tenantId);
}

try {
  await main();
} catch (err) {
  console.error('❌ Script failed:', err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
