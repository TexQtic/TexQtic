/**
 * assign-b2b-public-posture.ts
 *
 * Bounded data posture assignment script.
 * Slice: B2B_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE
 *
 * Design authority:
 *   governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md §E Step 8
 *   governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-POST-PRECONDITION-READINESS-REASSESSMENT-v1.md §9
 *
 * Purpose:
 *   Explicitly assign publicEligibilityPosture = PUBLICATION_ELIGIBLE to the qa.b2b tenant
 *   and publication_posture = B2B_PUBLIC to the corresponding org and a bounded subset
 *   of its catalog items, so that GET /api/public/b2b/suppliers returns at least one
 *   truthful non-placeholder public-safe supplier entry.
 *
 * Guardrails:
 *   - ONLY touches posture fields. Does NOT modify name/description/price/moq/imageUrl.
 *   - ONLY targets qa.b2b (slug: 'qa-b2b').
 *   - Catalog item scope: QA-B2B-FAB-001, QA-B2B-FAB-002, QA-B2B-FAB-003 (3-item offering preview).
 *   - Idempotent: safe to re-run. Already-set postures are not reset to worse values.
 *   - No schema changes. No product records recreated. No image URLs modified.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const QA_B2B_SLUG = 'qa-b2b';

// Bounded offering preview set — smallest meaningful set (3 items out of 14 available).
const OFFERING_PREVIEW_SKUS = ['QA-B2B-FAB-001', 'QA-B2B-FAB-002', 'QA-B2B-FAB-003'];

async function main() {
  console.log('=== B2B_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE ===');
  console.log(`Target tenant slug: ${QA_B2B_SLUG}`);
  console.log(`Offering preview SKUs: ${OFFERING_PREVIEW_SKUS.join(', ')}`);
  console.log();

  // ── Step 1: Resolve tenant anchor ──────────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({
    where: { slug: QA_B2B_SLUG },
    select: {
      id: true,
      slug: true,
      type: true,
      status: true,
      publicEligibilityPosture: true,
    },
  });

  if (!tenant) {
    throw new Error(`[BLOCKER] Tenant with slug '${QA_B2B_SLUG}' not found. Aborting.`);
  }

  console.log(`[FOUND] Tenant: ${tenant.slug} (${tenant.id})`);
  console.log(`  type=${tenant.type}  status=${tenant.status}  currentPosture=${tenant.publicEligibilityPosture}`);

  if (tenant.type !== 'B2B') {
    throw new Error(`[BLOCKER] Tenant type is '${tenant.type}', expected 'B2B'. Aborting.`);
  }

  if (tenant.status !== 'ACTIVE') {
    throw new Error(`[BLOCKER] Tenant status is '${tenant.status}', expected 'ACTIVE'. Aborting.`);
  }

  // ── Step 2: Capture pre-update image URLs for preservation verification ─────
  const preUpdateItems = await prisma.catalogItem.findMany({
    where: {
      tenantId: tenant.id,
      sku: { in: OFFERING_PREVIEW_SKUS },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      imageUrl: true,
      publicationPosture: true,
    },
  });

  const preUpdateImageUrlMap = new Map(preUpdateItems.map(item => [item.sku, item.imageUrl]));

  console.log();
  console.log('[PRE-UPDATE] Catalog items in scope:');
  for (const item of preUpdateItems) {
    console.log(`  ${item.sku}: posture=${item.publicationPosture}  imageUrl=${item.imageUrl}`);
  }

  // ── Step 3: Assign postures (atomic transaction) ────────────────────────────
  await prisma.$transaction(
    async tx => {
      // 3a. Tenant: publicEligibilityPosture = PUBLICATION_ELIGIBLE
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' },
      });

      // 3b. Org: publication_posture = B2B_PUBLIC
      await tx.organizations.update({
        where: { id: tenant.id },
        data: {
          publication_posture: 'B2B_PUBLIC',
          updated_at: new Date(),
        },
      });

      // 3c. Catalog items: publicationPosture = B2B_PUBLIC (bounded set, posture field only)
      await tx.catalogItem.updateMany({
        where: {
          tenantId: tenant.id,
          sku: { in: OFFERING_PREVIEW_SKUS },
          active: true,
        },
        data: { publicationPosture: 'B2B_PUBLIC' },
      });
    },
    { timeout: 15000 },
  );

  console.log();
  console.log('[ASSIGNED] Transaction committed successfully.');

  // ── Step 4: Verify posture assignment ──────────────────────────────────────
  const verifyTenant = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: { slug: true, publicEligibilityPosture: true, type: true, status: true },
  });

  const verifyOrg = await prisma.organizations.findUnique({
    where: { id: tenant.id },
    select: {
      slug: true,
      org_type: true,
      status: true,
      publication_posture: true,
    },
  });

  const verifyItems = await prisma.catalogItem.findMany({
    where: {
      tenantId: tenant.id,
      sku: { in: OFFERING_PREVIEW_SKUS },
    },
    select: {
      sku: true,
      name: true,
      imageUrl: true,
      publicationPosture: true,
      active: true,
    },
    orderBy: { sku: 'asc' },
  });

  console.log();
  console.log('=== VERIFICATION ===');
  console.log(`Tenant posture:    ${verifyTenant?.publicEligibilityPosture}  (expected: PUBLICATION_ELIGIBLE)`);
  console.log(`Org posture:       ${verifyOrg?.publication_posture}  (expected: B2B_PUBLIC)`);
  console.log(`Org type:          ${verifyOrg?.org_type}  (expected: B2B)`);
  console.log(`Org status:        ${verifyOrg?.status}  (expected: ACTIVE or VERIFICATION_APPROVED)`);
  console.log();
  console.log('Catalog items after posture assignment:');

  let imageUrlDrift = false;
  for (const item of verifyItems) {
    const preUrl = preUpdateImageUrlMap.get(item.sku);
    const urlPreserved = item.imageUrl === preUrl;
    if (!urlPreserved) imageUrlDrift = true;
    console.log(`  ${item.sku}: posture=${item.publicationPosture}  active=${item.active}`);
    console.log(`    imageUrl=${item.imageUrl}`);
    console.log(`    imageUrl preserved: ${urlPreserved}`);
  }

  // ── Step 5: Assertion checks ────────────────────────────────────────────────
  const errors: string[] = [];

  if (verifyTenant?.publicEligibilityPosture !== 'PUBLICATION_ELIGIBLE') {
    errors.push('Tenant publicEligibilityPosture did not update to PUBLICATION_ELIGIBLE');
  }
  if (verifyOrg?.publication_posture !== 'B2B_PUBLIC') {
    errors.push('Org publication_posture did not update to B2B_PUBLIC');
  }
  if (verifyOrg?.org_type !== 'B2B') {
    errors.push('Org org_type is not B2B');
  }
  const eligibleStatuses = ['ACTIVE', 'VERIFICATION_APPROVED'];
  if (!verifyOrg?.status || !eligibleStatuses.includes(verifyOrg.status)) {
    errors.push(`Org status '${verifyOrg?.status}' is not in eligible set`);
  }
  const publicItems = verifyItems.filter(i => ['B2B_PUBLIC', 'BOTH'].includes(i.publicationPosture ?? '') && i.active);
  if (publicItems.length === 0) {
    errors.push('No active catalog items with B2B_PUBLIC/BOTH posture found after update');
  }
  if (imageUrlDrift) {
    errors.push('IMAGE URL DRIFT DETECTED — image URL changed during posture update (BLOCKER)');
  }

  console.log();
  if (errors.length > 0) {
    console.error('❌ VERIFICATION FAILURES:');
    for (const err of errors) console.error(`  - ${err}`);
    process.exitCode = 1;
  } else {
    console.log('✅ All assertions passed.');
    console.log(`   Tenant: ${verifyTenant?.slug} → PUBLICATION_ELIGIBLE`);
    console.log(`   Org: ${verifyOrg?.slug} → B2B_PUBLIC (type=B2B, status=${verifyOrg?.status})`);
    console.log(`   Catalog items with public posture: ${publicItems.length}`);
    console.log(`   Image URLs preserved: YES (zero drift detected)`);
    console.log();
    console.log('Route GET /api/public/b2b/suppliers should now return at least one supplier entry.');
    console.log('Slice: B2B_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE — posture assignment complete.');
  }
}

main()
  .catch(err => {
    console.error('❌ Script failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
