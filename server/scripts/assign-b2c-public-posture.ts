/**
 * assign-b2c-public-posture.ts
 *
 * Bounded data posture assignment script.
 * Slice: B2C_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE
 *
 * Design authority:
 *   governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md §3.1
 *   governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md
 *   governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-READINESS-ASSESSMENT-v1.md
 *
 * Purpose:
 *   Explicitly assign publicEligibilityPosture = PUBLICATION_ELIGIBLE to the qa.b2c tenant
 *   and publication_posture = B2C_PUBLIC to the corresponding org and all three existing
 *   B2C catalog items, so that GET /api/public/b2c/products returns at least one
 *   truthful non-placeholder public-safe B2C browse result.
 *
 * Guardrails:
 *   - ONLY touches posture fields. Does NOT modify name/description/price/moq/imageUrl.
 *   - ONLY targets qa.b2c (slug: 'qa-b2c').
 *   - Catalog item scope: QA-B2C-001, QA-B2C-002, QA-B2C-003 (all three seeded B2C items).
 *   - Idempotent: safe to re-run. Already-set postures are not reset to worse values.
 *   - No schema changes. No product records recreated. No image URLs modified.
 *   - No B2B data touched. No WL data touched.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const QA_B2C_SLUG = 'qa-b2c';

// Full bounded set — all three seeded QA B2C catalog items.
const PRODUCT_PREVIEW_SKUS = ['QA-B2C-001', 'QA-B2C-002', 'QA-B2C-003'];

async function main() {
  console.log('=== B2C_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE ===');
  console.log(`Target tenant slug: ${QA_B2C_SLUG}`);
  console.log(`Product preview SKUs: ${PRODUCT_PREVIEW_SKUS.join(', ')}`);
  console.log();

  // ── Step 1: Resolve tenant anchor ──────────────────────────────────────────
  const tenant = await prisma.tenant.findUnique({
    where: { slug: QA_B2C_SLUG },
    select: {
      id: true,
      slug: true,
      type: true,
      status: true,
      publicEligibilityPosture: true,
    },
  });

  if (!tenant) {
    throw new Error(`[BLOCKER] Tenant with slug '${QA_B2C_SLUG}' not found. Aborting.`);
  }

  console.log(`[FOUND] Tenant: ${tenant.slug} (${tenant.id})`);
  console.log(`  type=${tenant.type}  status=${tenant.status}  currentPosture=${tenant.publicEligibilityPosture}`);

  if (tenant.type !== 'B2C') {
    throw new Error(`[BLOCKER] Tenant type is '${tenant.type}', expected 'B2C'. Aborting.`);
  }

  if (tenant.status !== 'ACTIVE') {
    throw new Error(`[BLOCKER] Tenant status is '${tenant.status}', expected 'ACTIVE'. Aborting.`);
  }

  // ── Step 2: Capture pre-update image URLs for preservation verification ─────
  const preUpdateItems = await prisma.catalogItem.findMany({
    where: {
      tenantId: tenant.id,
      sku: { in: PRODUCT_PREVIEW_SKUS },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      imageUrl: true,
      publicationPosture: true,
      active: true,
    },
  });

  const preUpdateImageUrlMap = new Map(preUpdateItems.map(item => [item.sku, item.imageUrl]));

  console.log();
  console.log('[PRE-UPDATE] Catalog items in scope:');
  for (const item of preUpdateItems) {
    console.log(`  ${item.sku}: posture=${item.publicationPosture}  active=${item.active}  imageUrl=${item.imageUrl}`);
  }

  if (preUpdateItems.length === 0) {
    throw new Error('[BLOCKER] No catalog items found for the target SKUs. Aborting.');
  }

  // ── Step 3: Assign postures (atomic transaction) ────────────────────────────
  await prisma.$transaction(
    async tx => {
      // 3a. Tenant: publicEligibilityPosture = PUBLICATION_ELIGIBLE
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' },
      });

      // 3b. Org: publication_posture = B2C_PUBLIC
      await tx.organizations.update({
        where: { id: tenant.id },
        data: {
          publication_posture: 'B2C_PUBLIC',
          updated_at: new Date(),
        },
      });

      // 3c. Catalog items: publicationPosture = B2C_PUBLIC (posture field only)
      await tx.catalogItem.updateMany({
        where: {
          tenantId: tenant.id,
          sku: { in: PRODUCT_PREVIEW_SKUS },
          active: true,
        },
        data: { publicationPosture: 'B2C_PUBLIC' },
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
      sku: { in: PRODUCT_PREVIEW_SKUS },
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
  console.log(`Org posture:       ${verifyOrg?.publication_posture}  (expected: B2C_PUBLIC)`);
  console.log(`Org type:          ${verifyOrg?.org_type}  (expected: B2C)`);
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
  if (verifyOrg?.publication_posture !== 'B2C_PUBLIC') {
    errors.push('Org publication_posture did not update to B2C_PUBLIC');
  }
  if (verifyOrg?.org_type !== 'B2C') {
    errors.push('Org org_type is not B2C');
  }
  const eligibleStatuses = ['ACTIVE', 'VERIFICATION_APPROVED'];
  if (!verifyOrg?.status || !eligibleStatuses.includes(verifyOrg.status)) {
    errors.push(`Org status '${verifyOrg?.status}' is not in eligible set`);
  }
  const publicItems = verifyItems.filter(
    i => ['B2C_PUBLIC', 'BOTH'].includes(i.publicationPosture ?? '') && i.active,
  );
  if (publicItems.length === 0) {
    errors.push('No active catalog items with B2C_PUBLIC/BOTH posture found after update');
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
    console.log(`   Org: ${verifyOrg?.slug} → B2C_PUBLIC (type=B2C, status=${verifyOrg?.status})`);
    console.log(`   Catalog items with public posture: ${publicItems.length}`);
    console.log(`   Image URLs preserved: YES (zero drift detected)`);
    console.log();
    console.log('Route GET /api/public/b2c/products should now return at least one B2C storefront entry.');
    console.log('Slice: B2C_PUBLIC_DATA_POSTURE_ASSIGNMENT_SLICE — posture assignment complete.');
  }
}

main()
  .catch(err => {
    console.error('❌ Script failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
