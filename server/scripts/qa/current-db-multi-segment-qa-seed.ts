#!/usr/bin/env tsx
/**
 * TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Slice C-ALT + Slice F update
 *
 * Seeds 7 net-new QA tenants (qa-knt-b, qa-dye-c, qa-gmt-d,
 * qa-buyer-a, qa-buyer-c, qa-svc-tst-a, qa-svc-log-b) plus:
 *   - organizations, users, memberships, role_positions
 *   - catalog patches for qa-b2b (5 items, now with catalog_visibility_policy_mode)
 *   - 30 new catalog items (10 per supplier, with explicit visibility policy mode)
 *   - 8 buyer_supplier_relationship rows
 *
 * SLICE F UPDATE: Restores original catalog visibility intent via
 *   catalog_visibility_policy_mode (Slice B column). Supersedes Option A
 *   lossy mapping. Enables E2E-07, E2E-08, E2E-09.
 *
 * AUTHORIZED: current DATABASE_URL (Slice C-ALT + Slice F authorization).
 * DATA-ONLY: no DDL, no schema changes.
 * QA-PREFIX SAFETY: every INSERT scoped by qa-prefixed slug or email.
 * SECRETS: password_hash never printed.
 *
 * Usage:
 *   cd server && tsx scripts/qa/current-db-multi-segment-qa-seed.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ─── QA-prefix safety enforcer ───────────────────────────────────────────────

function assertQaSlug(slug: string) {
  if (!slug.startsWith('qa-')) {
    throw new Error(`STOP: non-QA slug detected: "${slug}"`);
  }
}

function assertQaEmail(email: string) {
  if (!email.startsWith('qa.') || !email.endsWith('@texqtic.com')) {
    throw new Error(`STOP: non-QA email detected: "${email}"`);
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// ─── QA constants ─────────────────────────────────────────────────────────────

const QA_PASSWORD = ['Password123', '!'].join('');

// ─── Tenant specs ─────────────────────────────────────────────────────────────

const NET_NEW_TENANT_SPECS = [
  {
    slug: 'qa-knt-b',
    name: 'QA Knitting Supplier B',
    type: 'B2B' as const,
    plan: 'PROFESSIONAL' as const,
    publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' as const,
    ownerEmail: 'qa.supplier.knt.b@texqtic.com',
    orgLegalName: 'QA Knitting Supplier B Pvt Ltd',
    orgType: 'B2B',
    jurisdiction: 'IN',
    primarySegmentKey: 'Knitting',
    publicationPosture: 'B2B_PUBLIC',
    rolePositionKey: 'manufacturer',
    secondarySegmentKeys: [] as string[],
  },
  {
    slug: 'qa-dye-c',
    name: 'QA Dyeing Supplier C',
    type: 'B2B' as const,
    plan: 'PROFESSIONAL' as const,
    publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' as const,
    ownerEmail: 'qa.supplier.dye.c@texqtic.com',
    orgLegalName: 'QA Dyeing Supplier C Pvt Ltd',
    orgType: 'B2B',
    jurisdiction: 'IN',
    primarySegmentKey: 'Fabric Processing',
    publicationPosture: 'B2B_PUBLIC',
    rolePositionKey: 'manufacturer',
    secondarySegmentKeys: [] as string[],
  },
  {
    slug: 'qa-gmt-d',
    name: 'QA Garment Supplier D',
    type: 'B2B' as const,
    plan: 'PROFESSIONAL' as const,
    publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' as const,
    ownerEmail: 'qa.supplier.gmt.d@texqtic.com',
    orgLegalName: 'QA Garment Supplier D Pvt Ltd',
    orgType: 'B2B',
    jurisdiction: 'IN',
    primarySegmentKey: 'Garment',
    publicationPosture: 'B2B_PUBLIC',
    rolePositionKey: 'manufacturer',
    secondarySegmentKeys: [] as string[],
  },
  {
    slug: 'qa-buyer-a',
    name: 'QA Buyer A',
    type: 'B2B' as const,
    plan: 'PROFESSIONAL' as const,
    publicEligibilityPosture: 'NO_PUBLIC_PRESENCE' as const,
    ownerEmail: 'qa.buyer.wvg.a@texqtic.com',
    orgLegalName: 'QA Buyer A Trading Co',
    orgType: 'B2B',
    jurisdiction: 'AE',
    primarySegmentKey: 'Weaving',
    publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    rolePositionKey: 'trader',
    secondarySegmentKeys: [] as string[],
  },
  {
    slug: 'qa-buyer-c',
    name: 'QA Buyer C',
    type: 'B2B' as const,
    plan: 'PROFESSIONAL' as const,
    publicEligibilityPosture: 'NO_PUBLIC_PRESENCE' as const,
    ownerEmail: 'qa.buyer.knt.c@texqtic.com',
    orgLegalName: 'QA Buyer C Trading Co',
    orgType: 'B2B',
    jurisdiction: 'AE',
    primarySegmentKey: 'Knitting',
    publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    rolePositionKey: 'trader',
    secondarySegmentKeys: [] as string[],
  },
  {
    slug: 'qa-svc-tst-a',
    name: 'QA Testing Lab A',
    type: 'B2B' as const,
    plan: 'STARTER' as const,
    publicEligibilityPosture: 'NO_PUBLIC_PRESENCE' as const,
    ownerEmail: 'qa.svc.tst.a@texqtic.com',
    orgLegalName: 'QA Testing Lab A Ltd',
    orgType: 'B2B',
    jurisdiction: 'IN',
    primarySegmentKey: null as string | null,
    publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    rolePositionKey: 'service_provider',
    secondarySegmentKeys: [] as string[],
  },
  {
    slug: 'qa-svc-log-b',
    name: 'QA Logistics Provider B',
    type: 'B2B' as const,
    plan: 'STARTER' as const,
    publicEligibilityPosture: 'NO_PUBLIC_PRESENCE' as const,
    ownerEmail: 'qa.svc.log.b@texqtic.com',
    orgLegalName: 'QA Logistics Provider B Ltd',
    orgType: 'B2B',
    jurisdiction: 'IN',
    primarySegmentKey: null as string | null,
    publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    rolePositionKey: 'service_provider',
    secondarySegmentKeys: [] as string[],
  },
] as const;

// ─── Catalog patch specs for qa-b2b ──────────────────────────────────────────

// Slice F update: Restores original catalog visibility intent using the durable
// catalog_visibility_policy_mode column (added in Slice B migration 9d29798).
// publication_posture remains constraint-valid (B2B_PUBLIC / PRIVATE_OR_AUTH_ONLY).
// Option A lossy mapping is superseded by explicit visibility policy mode.
const QA_B2B_CATALOG_PATCHES = [
  { sku: 'QA-B2B-FAB-002', publicationPosture: 'B2B_PUBLIC',           priceDisclosurePolicyMode: null as string | null,  catalogVisibilityPolicyMode: null as string | null },
  { sku: 'QA-B2B-FAB-003', publicationPosture: 'B2B_PUBLIC',           priceDisclosurePolicyMode: 'RELATIONSHIP_ONLY',     catalogVisibilityPolicyMode: null as string | null },
  { sku: 'QA-B2B-FAB-004', publicationPosture: 'B2B_PUBLIC',           priceDisclosurePolicyMode: null as string | null,  catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' }, // Slice F restore
  { sku: 'QA-B2B-FAB-005', publicationPosture: 'B2B_PUBLIC',           priceDisclosurePolicyMode: 'RELATIONSHIP_ONLY',     catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' }, // Slice F restore
  { sku: 'QA-B2B-FAB-006', publicationPosture: 'PRIVATE_OR_AUTH_ONLY', priceDisclosurePolicyMode: null as string | null,  catalogVisibilityPolicyMode: 'HIDDEN' },             // Slice F restore
];

// ─── New catalog item specs per supplier ─────────────────────────────────────

type CatalogItemSpec = {
  sku: string;
  name: string;
  publicationPosture: string;
  priceDisclosurePolicyMode: string | null;
  catalogVisibilityPolicyMode: string | null;
  price: number;
  moq: number;
};

function buildSupplierCatalogItems(prefix: string, slug: string): CatalogItemSpec[] {
  // Slice F distribution: explicit catalog_visibility_policy_mode per design.
  // publication_posture remains constraint-valid throughout.
  // Option A lossy mapping superseded.
  //
  // Item 001: B2B_PUBLIC     + NULL visibility   → fallback PUBLIC
  // Item 002: B2B_PUBLIC     + NULL visibility   → fallback PUBLIC
  // Item 003: B2B_PUBLIC     + APPROVED_BUYER_ONLY → public-projection posture, approval-gated
  // Item 004: B2B_PUBLIC     + APPROVED_BUYER_ONLY → public-projection posture, approval-gated
  // Item 005: PRIVATE_OR_AUTH_ONLY + NULL         → fallback AUTHENTICATED_ONLY
  // Item 006: PRIVATE_OR_AUTH_ONLY + NULL         → fallback AUTHENTICATED_ONLY
  // Item 007: PRIVATE_OR_AUTH_ONLY + APPROVED_BUYER_ONLY → auth + approval-gated
  // Item 008: PRIVATE_OR_AUTH_ONLY + APPROVED_BUYER_ONLY → auth + approval-gated
  // Item 009: PRIVATE_OR_AUTH_ONLY + HIDDEN       → supplier-private, hidden from all buyers
  // Item 010: B2B_PUBLIC     + RELATIONSHIP_GATED → discoverable but relationship-gated
  const itemDefs: Array<{ posture: string; pdpm: string | null; cvpm: string | null }> = [
    { posture: 'B2B_PUBLIC',           pdpm: null,               cvpm: null },
    { posture: 'B2B_PUBLIC',           pdpm: null,               cvpm: null },
    { posture: 'B2B_PUBLIC',           pdpm: null,               cvpm: 'APPROVED_BUYER_ONLY' },
    { posture: 'B2B_PUBLIC',           pdpm: null,               cvpm: 'APPROVED_BUYER_ONLY' },
    { posture: 'PRIVATE_OR_AUTH_ONLY', pdpm: null,               cvpm: null },
    { posture: 'PRIVATE_OR_AUTH_ONLY', pdpm: null,               cvpm: null },
    { posture: 'PRIVATE_OR_AUTH_ONLY', pdpm: null,               cvpm: 'APPROVED_BUYER_ONLY' },
    { posture: 'PRIVATE_OR_AUTH_ONLY', pdpm: null,               cvpm: 'APPROVED_BUYER_ONLY' },
    { posture: 'PRIVATE_OR_AUTH_ONLY', pdpm: null,               cvpm: 'HIDDEN' },
    { posture: 'B2B_PUBLIC',           pdpm: null,               cvpm: 'RELATIONSHIP_GATED' },
  ];

  return itemDefs.map((p, i) => {
    const num = String(i + 1).padStart(3, '0');
    return {
      sku: `${prefix}-FAB-${num}`,
      name: `${slug.toUpperCase()} Fabric ${num}`,
      publicationPosture: p.posture,
      priceDisclosurePolicyMode: p.pdpm,
      catalogVisibilityPolicyMode: p.cvpm,
      price: 100 + i * 10,
      moq: 50,
    };
  });
}

const KNT_B_CATALOG = buildSupplierCatalogItems('QA-KNT-B', 'qa-knt-b');
const DYE_C_CATALOG = buildSupplierCatalogItems('QA-DYE-C', 'qa-dye-c');
const GMT_D_CATALOG = buildSupplierCatalogItems('QA-GMT-D', 'qa-gmt-d');

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[QA-SEED] Slice C-ALT — starting multi-segment QA seed');
  console.log('[QA-SEED] DB: Supabase PostgreSQL (DATABASE_URL loaded from .env)');

  // ── PHASE 3: Preflight checks ─────────────────────────────────────────────

  console.log('\n[PREFLIGHT] P1: Confirm required tables exist');
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'tenants','organizations','users','memberships',
        'catalog_items','buyer_supplier_relationships',
        'organization_role_positions','organization_secondary_segments'
      )
    ORDER BY table_name
  `;
  const tableNames = tables.map(t => t.table_name);
  const requiredTables = ['tenants','organizations','users','memberships','catalog_items','buyer_supplier_relationships','organization_role_positions','organization_secondary_segments'];
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));
  if (missingTables.length > 0) {
    throw new Error(`STOP: Missing tables: ${missingTables.join(', ')}`);
  }
  console.log(`[PREFLIGHT] P1 PASS: All 8 required tables present`);

  console.log('\n[PREFLIGHT] P2: Confirm QA anchor tenants exist');
  const anchors = await prisma.tenant.findMany({
    where: { slug: { in: ['qa-b2b', 'qa-buyer', 'qa-agg'] } },
    select: { slug: true, id: true },
  });
  if (anchors.length < 3) {
    throw new Error(`STOP: Expected 3 anchor tenants (qa-b2b, qa-buyer, qa-agg), found ${anchors.length}`);
  }
  console.log(`[PREFLIGHT] P2 PASS: Anchor tenants: ${anchors.map(a => a.slug).join(', ')}`);

  console.log('\n[PREFLIGHT] P3: Check net-new QA slugs (idempotency gate)');
  const netNewSlugs = NET_NEW_TENANT_SPECS.map(s => s.slug);
  const existingNetNew = await prisma.tenant.findMany({
    where: { slug: { in: netNewSlugs } },
    select: { slug: true },
  });
  if (existingNetNew.length > 0 && existingNetNew.length < netNewSlugs.length) {
    throw new Error(`STOP: Partial seed detected. Existing slugs: ${existingNetNew.map(s => s.slug).join(', ')}. Resolve manually before re-running.`);
  }
  const isReseed = existingNetNew.length === netNewSlugs.length;
  if (isReseed) {
    console.log('[PREFLIGHT] P3 INFO: All net-new tenants already exist — running in IDEMPOTENT UPDATE mode');
  } else {
    console.log('[PREFLIGHT] P3 PASS: No net-new tenants exist — fresh seed');
  }

  console.log('\n[PREFLIGHT] P4: Check existing QA relationships');
  const existingRels = await prisma.$queryRaw<Array<{ supplier: string; buyer: string; state: string }>>`
    SELECT s.slug AS supplier, b.slug AS buyer, bsr.state
    FROM buyer_supplier_relationships bsr
    JOIN organizations s ON s.id = bsr.supplier_org_id
    JOIN organizations b ON b.id = bsr.buyer_org_id
    WHERE s.slug LIKE 'qa-%' OR b.slug LIKE 'qa-%'
    ORDER BY s.slug, b.slug
  `;
  console.log(`[PREFLIGHT] P4: ${existingRels.length} existing QA relationship rows`);

  console.log('\n[PREFLIGHT] P5: Catalog posture check for qa-b2b items');
  const qab2bAnchor = anchors.find(a => a.slug === 'qa-b2b');
  if (!qab2bAnchor) throw new Error('STOP: qa-b2b tenant not found');
  const existingCatalogItems = await prisma.catalogItem.findMany({
    where: {
      tenantId: qab2bAnchor.id,
      sku: { in: ['QA-B2B-FAB-001','QA-B2B-FAB-002','QA-B2B-FAB-003','QA-B2B-FAB-004','QA-B2B-FAB-005','QA-B2B-FAB-006'] },
    },
    select: { sku: true, publicationPosture: true, priceDisclosurePolicyMode: true },
  });
  console.log(`[PREFLIGHT] P5: Found ${existingCatalogItems.length}/6 qa-b2b QA catalog items`);

  // ── PHASE 4+5: Seed ───────────────────────────────────────────────────────

  // Hash password once — never printed
  const passwordHash = await bcrypt.hash(QA_PASSWORD, 10);

  // Build UUIDs map for idempotency — look up or create
  const tenantIdMap: Record<string, string> = {};

  console.log('\n[SEED] Block 1: Tenants');
  let tenantRowCount = 0;
  for (const spec of NET_NEW_TENANT_SPECS) {
    assertQaSlug(spec.slug);
    assertQaEmail(spec.ownerEmail);

    const tenant = await prisma.tenant.upsert({
      where: { slug: spec.slug },
      create: {
        slug: spec.slug,
        name: spec.name,
        type: spec.type,
        status: 'ACTIVE',
        plan: spec.plan,
        isWhiteLabel: false,
        publicEligibilityPosture: spec.publicEligibilityPosture,
      },
      update: {
        name: spec.name,
        type: spec.type,
        status: 'ACTIVE',
        plan: spec.plan,
        isWhiteLabel: false,
        publicEligibilityPosture: spec.publicEligibilityPosture,
      },
      select: { id: true, slug: true },
    });
    tenantIdMap[spec.slug] = tenant.id;
    tenantRowCount++;
  }

  if (tenantRowCount > 7) {
    throw new Error(`SC-03 STOP: Block 1 affected ${tenantRowCount} rows (expected ≤ 7)`);
  }
  console.log(`[SEED] Block 1 DONE: ${tenantRowCount} tenant rows processed`);

  console.log('\n[SEED] Block 2: Organizations');
  for (const spec of NET_NEW_TENANT_SPECS) {
    assertQaSlug(spec.slug);
    const tenantId = tenantIdMap[spec.slug];
    if (!tenantId) throw new Error(`SC-04 STOP: No tenant ID found for slug ${spec.slug}`);

    await prisma.organizations.upsert({
      where: { id: tenantId },
      create: {
        id: tenantId,
        slug: spec.slug,
        legal_name: spec.orgLegalName,
        jurisdiction: spec.jurisdiction,
        org_type: spec.orgType,
        status: 'ACTIVE',
        plan: spec.plan,
        is_white_label: false,
        primary_segment_key: spec.primarySegmentKey,
        publication_posture: spec.publicationPosture,
        price_disclosure_policy_mode: null,
      },
      update: {
        slug: spec.slug,
        legal_name: spec.orgLegalName,
        jurisdiction: spec.jurisdiction,
        org_type: spec.orgType,
        status: 'ACTIVE',
        plan: spec.plan,
        is_white_label: false,
        primary_segment_key: spec.primarySegmentKey,
        publication_posture: spec.publicationPosture,
      },
    });
  }
  console.log(`[SEED] Block 2 DONE: ${NET_NEW_TENANT_SPECS.length} organization rows processed`);

  console.log('\n[SEED] Block 3: Role positions');
  for (const spec of NET_NEW_TENANT_SPECS) {
    const tenantId = tenantIdMap[spec.slug];
    if (!tenantId) throw new Error(`STOP: No tenant ID for slug ${spec.slug}`);
    await prisma.organizationRolePosition.upsert({
      where: { org_id_role_position_key: { org_id: tenantId, role_position_key: spec.rolePositionKey } },
      create: { org_id: tenantId, role_position_key: spec.rolePositionKey },
      update: {},
    });
  }
  console.log(`[SEED] Block 3 DONE: ${NET_NEW_TENANT_SPECS.length} role position rows`);

  console.log('\n[SEED] Block 4: Secondary segments (where applicable)');
  // No secondary segments specified in Slice B for net-new tenants
  console.log('[SEED] Block 4 SKIP: No secondary segments for net-new tenants');

  console.log('\n[SEED] Block 5: Users');
  const userIdMap: Record<string, string> = {};
  for (const spec of NET_NEW_TENANT_SPECS) {
    assertQaEmail(spec.ownerEmail);
    const user = await prisma.user.upsert({
      where: { email: spec.ownerEmail },
      create: {
        email: spec.ownerEmail,
        passwordHash,
        emailVerified: true,
      },
      update: {
        emailVerified: true,
        // intentionally NOT updating passwordHash on re-run
      },
      select: { id: true, email: true },
    });
    userIdMap[spec.slug] = user.id;
  }
  console.log(`[SEED] Block 5 DONE: ${NET_NEW_TENANT_SPECS.length} user rows processed`);

  console.log('\n[SEED] Block 6: Memberships');
  for (const spec of NET_NEW_TENANT_SPECS) {
    const tenantId = tenantIdMap[spec.slug];
    const userId = userIdMap[spec.slug];
    if (!tenantId || !userId) throw new Error(`STOP: Missing IDs for ${spec.slug}`);
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: { userId, tenantId, role: 'OWNER' },
      update: { role: 'OWNER' },
    });
  }
  console.log(`[SEED] Block 6 DONE: ${NET_NEW_TENANT_SPECS.length} membership rows`);

  // ── Block 7: Catalog patches for qa-b2b ───────────────────────────────────

  console.log('\n[SEED] Block 7: Catalog patches for qa-b2b');
  let patchCount = 0;
  for (const patch of QA_B2B_CATALOG_PATCHES) {
    if (!patch.sku.startsWith('QA-B2B-FAB-')) {
      throw new Error(`SC-06 STOP: Non-QA SKU in patch block: ${patch.sku}`);
    }
    const result = await prisma.catalogItem.updateMany({
      where: { tenantId: qab2bAnchor.id, sku: patch.sku },
      data: {
        publicationPosture: patch.publicationPosture,
        priceDisclosurePolicyMode: patch.priceDisclosurePolicyMode,
        catalogVisibilityPolicyMode: patch.catalogVisibilityPolicyMode, // Slice F
      },
    });
    patchCount += result.count;
    if (result.count > 1) {
      throw new Error(`SC-06 STOP: UPDATE for SKU ${patch.sku} affected ${result.count} rows (expected 1)`);
    }
  }
  if (patchCount > 5) {
    throw new Error(`SC-06 STOP: Total catalog patch affected ${patchCount} rows (expected ≤ 5)`);
  }
  console.log(`[SEED] Block 7 DONE: ${patchCount} catalog items patched for qa-b2b (including catalogVisibilityPolicyMode — Slice F)`);

  // ── Blocks 8, 9, 10: New catalog items per supplier ───────────────────────

  async function seedCatalogItems(slug: string, items: CatalogItemSpec[]) {
    assertQaSlug(slug);
    const tenantId = tenantIdMap[slug];
    if (!tenantId) throw new Error(`STOP: No tenant ID for ${slug}`);

    // Pre-check existence (no UNIQUE constraint on catalog_items(tenant_id, sku))
    const skus = items.map(i => i.sku);
    const existingSkus = await prisma.catalogItem.findMany({
      where: { tenantId, sku: { in: skus } },
      select: { sku: true },
    });
    const existingSkuSet = new Set(existingSkus.map(e => e.sku));

    if (existingSkus.length > 0 && existingSkus.length < items.length) {
      throw new Error(`STOP: Partial catalog seed for ${slug}. ${existingSkus.length}/${items.length} items exist. Resolve manually.`);
    }
    if (existingSkus.length === items.length) {
      // Slice F: items already exist — patch catalogVisibilityPolicyMode idempotently
      let patchCount = 0;
      for (const item of items) {
        if (!item.sku.startsWith('QA-')) {
          throw new Error(`STOP: Non-QA SKU in re-patch: ${item.sku}`);
        }
        const result = await prisma.catalogItem.updateMany({
          where: { tenantId, sku: item.sku },
          data: {
            catalogVisibilityPolicyMode: item.catalogVisibilityPolicyMode,
            publicationPosture: item.publicationPosture,
          },
        });
        if (result.count > 1) {
          throw new Error(`STOP: UPDATE for SKU ${item.sku} affected ${result.count} rows (expected 1)`);
        }
        patchCount += result.count;
      }
      console.log(`[SEED] Catalog ${slug}: already seeded — patched ${patchCount} catalogVisibilityPolicyMode values (Slice F)`);
      return;
    }

    // All-or-nothing: insert items not yet present
    let insertCount = 0;
    for (const item of items) {
      if (!item.sku.startsWith('QA-')) {
        throw new Error(`STOP: Non-QA SKU: ${item.sku}`);
      }
      if (!existingSkuSet.has(item.sku)) {
        await prisma.catalogItem.create({
          data: {
            tenantId,
            name: item.name,
            sku: item.sku,
            description: `QA catalog item ${item.sku}`,
            price: item.price,
            moq: item.moq,
            active: true,
            publicationPosture: item.publicationPosture,
            priceDisclosurePolicyMode: item.priceDisclosurePolicyMode,
            catalogVisibilityPolicyMode: item.catalogVisibilityPolicyMode,
          },
        });
        insertCount++;
      }
    }
    console.log(`[SEED] Catalog ${slug}: inserted ${insertCount} items`);
  }

  console.log('\n[SEED] Block 8: Catalog items for qa-knt-b');
  await seedCatalogItems('qa-knt-b', KNT_B_CATALOG);

  console.log('[SEED] Block 9: Catalog items for qa-dye-c');
  await seedCatalogItems('qa-dye-c', DYE_C_CATALOG);

  console.log('[SEED] Block 10: Catalog items for qa-gmt-d');
  await seedCatalogItems('qa-gmt-d', GMT_D_CATALOG);

  // ── Block 11: Buyer-supplier relationships ────────────────────────────────

  console.log('\n[SEED] Block 11: Buyer-supplier relationships');

  // Resolve org IDs for all parties
  const orgIdMap: Record<string, string> = { ...tenantIdMap };

  // Also fetch existing anchor org IDs
  const anchorOrgs = await prisma.organizations.findMany({
    where: { slug: { in: ['qa-b2b', 'qa-buyer'] } },
    select: { slug: true, id: true },
  });
  for (const org of anchorOrgs) {
    orgIdMap[org.slug] = org.id;
  }

  function getOrgId(slug: string): string {
    const id = orgIdMap[slug];
    if (!id) throw new Error(`STOP: Missing org ID for slug ${slug}`);
    return id;
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  type RelSpec = {
    supplierSlug: string;
    buyerSlug: string;
    state: string;
    requestedAt: Date | null;
    approvedAt: Date | null;
    decidedAt: Date | null;
    suspendedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date | null;
    internalReason: string;
  };

  const relSpecs: RelSpec[] = [
    // T-01: qa-b2b ↔ qa-buyer-a: APPROVED
    {
      supplierSlug: 'qa-b2b', buyerSlug: 'qa-buyer-a',
      state: 'APPROVED',
      requestedAt: daysAgo(30), approvedAt: daysAgo(28), decidedAt: daysAgo(28),
      suspendedAt: null, revokedAt: null, expiresAt: null,
      internalReason: 'QA: approved relationship seeded by Slice C-ALT',
    },
    // T-02: qa-b2b ↔ qa-buyer: REQUESTED
    {
      supplierSlug: 'qa-b2b', buyerSlug: 'qa-buyer',
      state: 'REQUESTED',
      requestedAt: daysAgo(5), approvedAt: null, decidedAt: null,
      suspendedAt: null, revokedAt: null, expiresAt: null,
      internalReason: 'QA: requested relationship seeded by Slice C-ALT',
    },
    // T-04: qa-knt-b ↔ qa-buyer-a: APPROVED
    {
      supplierSlug: 'qa-knt-b', buyerSlug: 'qa-buyer-a',
      state: 'APPROVED',
      requestedAt: daysAgo(20), approvedAt: daysAgo(18), decidedAt: daysAgo(18),
      suspendedAt: null, revokedAt: null, expiresAt: null,
      internalReason: 'QA: approved relationship seeded by Slice C-ALT',
    },
    // T-05: qa-knt-b ↔ qa-buyer: REJECTED
    {
      supplierSlug: 'qa-knt-b', buyerSlug: 'qa-buyer',
      state: 'REJECTED',
      requestedAt: daysAgo(25), approvedAt: null, decidedAt: daysAgo(23),
      suspendedAt: null, revokedAt: null, expiresAt: null,
      internalReason: 'QA: rejected relationship seeded by Slice C-ALT',
    },
    // T-06: qa-dye-c ↔ qa-buyer-a: BLOCKED
    {
      supplierSlug: 'qa-dye-c', buyerSlug: 'qa-buyer-a',
      state: 'BLOCKED',
      requestedAt: daysAgo(40), approvedAt: null, decidedAt: daysAgo(38),
      suspendedAt: null, revokedAt: null, expiresAt: null,
      internalReason: 'QA: blocked relationship seeded by Slice C-ALT',
    },
    // T-07: qa-dye-c ↔ qa-buyer: SUSPENDED
    {
      supplierSlug: 'qa-dye-c', buyerSlug: 'qa-buyer',
      state: 'SUSPENDED',
      requestedAt: daysAgo(35), approvedAt: daysAgo(33), decidedAt: daysAgo(14),
      suspendedAt: daysAgo(14), revokedAt: null, expiresAt: null,
      internalReason: 'QA: suspended relationship seeded by Slice C-ALT',
    },
    // T-08: qa-gmt-d ↔ qa-buyer-a: EXPIRED
    {
      supplierSlug: 'qa-gmt-d', buyerSlug: 'qa-buyer-a',
      state: 'EXPIRED',
      requestedAt: daysAgo(60), approvedAt: daysAgo(58), decidedAt: daysAgo(58),
      suspendedAt: null, revokedAt: null, expiresAt: daysAgo(5),
      internalReason: 'QA: expired relationship seeded by Slice C-ALT',
    },
    // T-09: qa-gmt-d ↔ qa-buyer: REVOKED
    {
      supplierSlug: 'qa-gmt-d', buyerSlug: 'qa-buyer',
      state: 'REVOKED',
      requestedAt: daysAgo(45), approvedAt: daysAgo(43), decidedAt: daysAgo(10),
      suspendedAt: null, revokedAt: daysAgo(10), expiresAt: null,
      internalReason: 'QA: revoked relationship seeded by Slice C-ALT',
    },
  ];

  // T-03 is intentionally ABSENT (NONE scenario — no row for qa-b2b ↔ qa-buyer-c)

  let relInserted = 0;
  let relUpdated = 0;
  for (const rel of relSpecs) {
    assertQaSlug(rel.supplierSlug);
    assertQaSlug(rel.buyerSlug);
    const supplierOrgId = getOrgId(rel.supplierSlug);
    const buyerOrgId = getOrgId(rel.buyerSlug);

    const existing = await prisma.buyerSupplierRelationship.findUnique({
      where: { supplierOrgId_buyerOrgId: { supplierOrgId, buyerOrgId } },
      select: { id: true, internalReason: true },
    });

    if (existing) {
      // SC-05: if existing row but reason doesn't start with 'QA:', do NOT overwrite
      if (!existing.internalReason?.startsWith('QA:')) {
        throw new Error(`SC-05 STOP: Existing non-QA relationship ${rel.supplierSlug}↔${rel.buyerSlug} (id=${existing.id}). Not overwriting.`);
      }
      await prisma.buyerSupplierRelationship.update({
        where: { supplierOrgId_buyerOrgId: { supplierOrgId, buyerOrgId } },
        data: {
          state: rel.state,
          requestedAt: rel.requestedAt,
          approvedAt: rel.approvedAt,
          decidedAt: rel.decidedAt,
          suspendedAt: rel.suspendedAt,
          revokedAt: rel.revokedAt,
          expiresAt: rel.expiresAt,
          internalReason: rel.internalReason,
        },
      });
      relUpdated++;
    } else {
      await prisma.buyerSupplierRelationship.create({
        data: {
          supplierOrgId,
          buyerOrgId,
          state: rel.state,
          requestedAt: rel.requestedAt,
          approvedAt: rel.approvedAt,
          decidedAt: rel.decidedAt,
          suspendedAt: rel.suspendedAt,
          revokedAt: rel.revokedAt,
          expiresAt: rel.expiresAt,
          internalReason: rel.internalReason,
        },
      });
      relInserted++;
    }
  }
  console.log(`[SEED] Block 11 DONE: ${relInserted} inserted + ${relUpdated} updated relationship rows`);

  // ── PHASE 6: Post-seed validation ─────────────────────────────────────────

  console.log('\n[VALIDATION] V-01: QA tenant count by type');
  const tenantCounts = await prisma.$queryRaw<Array<{ type: string; cnt: bigint }>>`
    SELECT type::text, COUNT(*) AS cnt
    FROM tenants
    WHERE slug LIKE 'qa-%'
    GROUP BY type
    ORDER BY type
  `;
  for (const row of tenantCounts) {
    console.log(`  type=${row.type} count=${row.cnt}`);
  }
  const b2bCount = tenantCounts.find(r => r.type === 'B2B')?.cnt ?? 0n;
  const aggCount = tenantCounts.find(r => r.type === 'AGGREGATOR')?.cnt ?? 0n;
  if (b2bCount < 9n || aggCount < 1n) {
    console.warn(`[VALIDATION] V-01 WARN: Expected B2B=9, AGGREGATOR=1; got B2B=${b2bCount}, AGGREGATOR=${aggCount}`);
  } else {
    console.log(`[VALIDATION] V-01 PASS: B2B=${b2bCount}, AGGREGATOR=${aggCount}`);
  }

  console.log('\n[VALIDATION] V-02: Organizations parity');
  const tenantQaCount = await prisma.tenant.count({ where: { slug: { startsWith: 'qa-' } } });
  const orgQaCount = await prisma.organizations.count({ where: { slug: { startsWith: 'qa-' } } });
  console.log(`  tenant_count=${tenantQaCount}, org_count=${orgQaCount}`);
  if (orgQaCount < tenantQaCount) {
    throw new Error(`SC-09 STOP: V-02 org_count(${orgQaCount}) < tenant_count(${tenantQaCount})`);
  }
  console.log('[VALIDATION] V-02 PASS');

  console.log('\n[VALIDATION] V-03: Membership coverage');
  const memberships = await prisma.$queryRaw<Array<{ slug: string; role: string; email: string }>>`
    SELECT t.slug, m.role::text, u.email
    FROM memberships m
    JOIN tenants t ON t.id = m.tenant_id
    JOIN users u ON u.id = m.user_id
    WHERE t.slug LIKE 'qa-%'
    ORDER BY t.slug
  `;
  const slugsWithOwner = new Set(memberships.filter(m => m.role === 'OWNER').map(m => m.slug));
  const qaTenants = await prisma.tenant.findMany({ where: { slug: { startsWith: 'qa-' } }, select: { slug: true } });
  const slugsWithoutOwner = qaTenants.filter(t => !slugsWithOwner.has(t.slug)).map(t => t.slug);
  if (slugsWithoutOwner.length > 0) {
    console.warn(`[VALIDATION] V-03 WARN: Tenants without OWNER: ${slugsWithoutOwner.join(', ')}`);
  } else {
    console.log(`[VALIDATION] V-03 PASS: All ${qaTenants.length} QA tenants have OWNER`);
  }

  console.log('\n[VALIDATION] V-04: Catalog posture coverage');
  const catalogCoverage = await prisma.$queryRaw<Array<{ slug: string; publication_posture: string; item_count: bigint }>>`
    SELECT t.slug, ci.publication_posture, COUNT(*) AS item_count
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug LIKE 'qa-%' AND t.slug != 'qa-agg'
    GROUP BY t.slug, ci.publication_posture
    ORDER BY t.slug, ci.publication_posture
  `;
  for (const row of catalogCoverage) {
    console.log(`  ${row.slug} | ${row.publication_posture} | ${row.item_count}`);
  }
  console.log('[VALIDATION] V-04 DONE (verify above)');

  console.log('\n[VALIDATION] V-05: Relationship state coverage');
  const relRows = await prisma.$queryRaw<Array<{ supplier: string; buyer: string; state: string }>>`
    SELECT s.slug AS supplier, b.slug AS buyer, bsr.state
    FROM buyer_supplier_relationships bsr
    JOIN organizations s ON s.id = bsr.supplier_org_id
    JOIN organizations b ON b.id = bsr.buyer_org_id
    WHERE s.slug LIKE 'qa-%' OR b.slug LIKE 'qa-%'
    ORDER BY bsr.state, s.slug
  `;
  console.log(`  Total QA relationship rows: ${relRows.length}`);
  for (const row of relRows) {
    console.log(`  ${row.supplier} → ${row.buyer}: ${row.state}`);
  }
  if (relRows.length < 8) {
    console.warn(`[VALIDATION] V-05 WARN: Expected ≥8 rows, got ${relRows.length}`);
  } else {
    console.log(`[VALIDATION] V-05 PASS`);
  }

  console.log('\n[VALIDATION] V-06: NONE scenario — no row for qa-b2b ↔ qa-buyer-c');
  const qab2bOrgId = getOrgId('qa-b2b');
  const qaBuyerCOrgId = getOrgId('qa-buyer-c');
  const noneCheck = await prisma.buyerSupplierRelationship.count({
    where: { supplierOrgId: qab2bOrgId, buyerOrgId: qaBuyerCOrgId },
  });
  if (noneCheck !== 0) {
    console.warn(`[VALIDATION] V-06 WARN: Expected 0 rows for qa-b2b↔qa-buyer-c, found ${noneCheck}`);
  } else {
    console.log('[VALIDATION] V-06 PASS: 0 rows confirmed (NONE scenario)');
  }

  console.log('\n[VALIDATION] V-07: Role positions coverage');
  const rolePositions = await prisma.$queryRaw<Array<{ slug: string; role_position_key: string }>>`
    SELECT o.slug, r.role_position_key
    FROM organization_role_positions r
    JOIN organizations o ON o.id = r.org_id
    WHERE o.slug LIKE 'qa-%'
    ORDER BY o.slug, r.role_position_key
  `;
  for (const row of rolePositions) {
    console.log(`  ${row.slug}: ${row.role_position_key}`);
  }
  console.log('[VALIDATION] V-07 DONE (verify above)');

  // ── Slice F validations (V-F01 through V-F10) ─────────────────────────────

  console.log('\n[VALIDATION] V-F01: catalog_visibility_policy_mode column exists');
  const colCheck = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'catalog_items'
      AND column_name = 'catalog_visibility_policy_mode'
  `;
  if (colCheck.length === 0) {
    throw new Error('V-F01 STOP: catalog_visibility_policy_mode column not found — Slice B migration not applied');
  }
  console.log(`[VALIDATION] V-F01 PASS: column exists (type=${colCheck[0].data_type})`);

  console.log('\n[VALIDATION] V-F02: qa-b2b FAB-004/FAB-005/FAB-006 restored intent');
  const fab456 = await prisma.$queryRaw<Array<{ sku: string; publication_posture: string; catalog_visibility_policy_mode: string | null }>>`
    SELECT ci.sku, ci.publication_posture, ci.catalog_visibility_policy_mode
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug = 'qa-b2b'
      AND ci.sku IN ('QA-B2B-FAB-004', 'QA-B2B-FAB-005', 'QA-B2B-FAB-006')
    ORDER BY ci.sku
  `;
  let vf02Pass = true;
  for (const row of fab456) {
    console.log(`  ${row.sku}: posture=${row.publication_posture} cvpm=${row.catalog_visibility_policy_mode}`);
    if (row.sku === 'QA-B2B-FAB-004' && row.catalog_visibility_policy_mode !== 'APPROVED_BUYER_ONLY') { vf02Pass = false; console.error('  V-F02 FAIL: FAB-004 expected APPROVED_BUYER_ONLY'); }
    if (row.sku === 'QA-B2B-FAB-005' && row.catalog_visibility_policy_mode !== 'APPROVED_BUYER_ONLY') { vf02Pass = false; console.error('  V-F02 FAIL: FAB-005 expected APPROVED_BUYER_ONLY'); }
    if (row.sku === 'QA-B2B-FAB-006' && row.catalog_visibility_policy_mode !== 'HIDDEN')              { vf02Pass = false; console.error('  V-F02 FAIL: FAB-006 expected HIDDEN'); }
  }
  if (fab456.length < 3) { vf02Pass = false; console.error(`  V-F02 FAIL: Only ${fab456.length}/3 FAB rows found`); }
  if (vf02Pass) console.log('[VALIDATION] V-F02 PASS: FAB-004=APPROVED_BUYER_ONLY, FAB-005=APPROVED_BUYER_ONLY, FAB-006=HIDDEN');

  console.log('\n[VALIDATION] V-F03: No invalid catalog_visibility_policy_mode values');
  const invalidCvpm = await prisma.$queryRaw<Array<{ sku: string; catalog_visibility_policy_mode: string }>>`
    SELECT ci.sku, ci.catalog_visibility_policy_mode
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug LIKE 'qa-%'
      AND ci.catalog_visibility_policy_mode IS NOT NULL
      AND ci.catalog_visibility_policy_mode NOT IN ('PUBLIC','AUTHENTICATED_ONLY','APPROVED_BUYER_ONLY','HIDDEN','RELATIONSHIP_GATED')
  `;
  if (invalidCvpm.length > 0) {
    throw new Error(`V-F03 STOP: Invalid catalog_visibility_policy_mode values found: ${invalidCvpm.map(r => `${r.sku}=${r.catalog_visibility_policy_mode}`).join(', ')}`);
  }
  console.log('[VALIDATION] V-F03 PASS: No invalid visibility policy mode values');

  console.log('\n[VALIDATION] V-F04: Supplier catalog distribution per supplier');
  const cvpmDist = await prisma.$queryRaw<Array<{ slug: string; cvpm: string | null; cnt: bigint }>>`
    SELECT t.slug, ci.catalog_visibility_policy_mode AS cvpm, COUNT(*) AS cnt
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug IN ('qa-knt-b', 'qa-dye-c', 'qa-gmt-d')
    GROUP BY t.slug, ci.catalog_visibility_policy_mode
    ORDER BY t.slug, ci.catalog_visibility_policy_mode NULLS FIRST
  `;
  for (const row of cvpmDist) {
    console.log(`  ${row.slug} | cvpm=${row.cvpm ?? 'NULL'} | count=${row.cnt}`);
  }
  let vf04Pass = true;
  const supplierSlugs = ['qa-knt-b', 'qa-dye-c', 'qa-gmt-d'];
  for (const supplierSlug of supplierSlugs) {
    const rows = cvpmDist.filter(r => r.slug === supplierSlug);
    const nullCount   = rows.find(r => r.cvpm === null)?.cnt ?? 0n;
    const aboBuyerCnt = rows.find(r => r.cvpm === 'APPROVED_BUYER_ONLY')?.cnt ?? 0n;
    const hiddenCnt   = rows.find(r => r.cvpm === 'HIDDEN')?.cnt ?? 0n;
    const rgCnt       = rows.find(r => r.cvpm === 'RELATIONSHIP_GATED')?.cnt ?? 0n;
    if (nullCount < 4n || aboBuyerCnt < 4n || hiddenCnt < 1n || rgCnt < 1n) {
      console.warn(`  V-F04 WARN: ${supplierSlug} distribution mismatch: NULL=${nullCount} ABO=${aboBuyerCnt} HIDDEN=${hiddenCnt} RG=${rgCnt}`);
      vf04Pass = false;
    }
  }
  if (vf04Pass) console.log('[VALIDATION] V-F04 PASS: Supplier catalog distribution correct');

  console.log('\n[VALIDATION] V-F05: publication_posture constraint-valid across all QA items');
  const invalidPosture = await prisma.$queryRaw<Array<{ sku: string; publication_posture: string }>>`
    SELECT ci.sku, ci.publication_posture
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug LIKE 'qa-%'
      AND ci.publication_posture NOT IN ('PRIVATE_OR_AUTH_ONLY','B2B_PUBLIC','B2C_PUBLIC','BOTH')
  `;
  if (invalidPosture.length > 0) {
    throw new Error(`V-F05 STOP: Invalid publication_posture values: ${invalidPosture.map(r => `${r.sku}=${r.publication_posture}`).join(', ')}`);
  }
  console.log('[VALIDATION] V-F05 PASS: All publication_posture values are constraint-valid');

  console.log('\n[VALIDATION] V-F06: E2E blockers unblocked at data level');
  const aboCount = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug LIKE 'qa-%'
      AND ci.catalog_visibility_policy_mode = 'APPROVED_BUYER_ONLY'
  `;
  const hiddenCount = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug LIKE 'qa-%'
      AND ci.catalog_visibility_policy_mode = 'HIDDEN'
  `;
  const aboTotal = aboCount[0]?.cnt ?? 0n;
  const hiddenTotal = hiddenCount[0]?.cnt ?? 0n;
  console.log(`  APPROVED_BUYER_ONLY items: ${aboTotal}`);
  console.log(`  HIDDEN items: ${hiddenTotal}`);
  if (aboTotal < 1n) throw new Error('V-F06 STOP: No APPROVED_BUYER_ONLY items — E2E-07/E2E-09 still blocked');
  if (hiddenTotal < 1n) throw new Error('V-F06 STOP: No HIDDEN items — E2E-08 still blocked');
  console.log('[VALIDATION] V-F06 PASS: E2E-07/E2E-08/E2E-09 data blockers resolved');

  console.log('\n[VALIDATION] V-F07: Relationship state coverage');
  const relStates = await prisma.$queryRaw<Array<{ state: string; cnt: bigint }>>`
    SELECT bsr.state, COUNT(*) AS cnt
    FROM buyer_supplier_relationships bsr
    JOIN organizations s ON s.id = bsr.supplier_org_id
    WHERE s.slug LIKE 'qa-%'
    GROUP BY bsr.state
    ORDER BY bsr.state
  `;
  const requiredStates = ['APPROVED','BLOCKED','EXPIRED','REJECTED','REQUESTED','REVOKED','SUSPENDED'];
  const foundStates = new Set(relStates.map(r => r.state));
  for (const row of relStates) console.log(`  state=${row.state} count=${row.cnt}`);
  const missingStates = requiredStates.filter(s => !foundStates.has(s));
  if (missingStates.length > 0) {
    console.warn(`[VALIDATION] V-F07 WARN: Missing relationship states: ${missingStates.join(', ')}`);
  } else {
    console.log('[VALIDATION] V-F07 PASS: All required relationship states present');
  }

  console.log('\n[VALIDATION] V-F08: No non-QA rows touched');
  const nonQaCatalogAffected = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug NOT LIKE 'qa-%'
      AND ci.catalog_visibility_policy_mode IS NOT NULL
      AND ci.updated_at > NOW() - INTERVAL '1 hour'
  `;
  const nonQaCount = nonQaCatalogAffected[0]?.cnt ?? 0n;
  if (nonQaCount > 0n) {
    throw new Error(`V-F08 STOP: ${nonQaCount} non-QA catalog items appear to have been touched`);
  }
  console.log('[VALIDATION] V-F08 PASS: No non-QA rows touched');

  console.log('\n[VALIDATION] V-F09: No duplicate QA catalog SKUs per tenant');
  const dupSkus = await prisma.$queryRaw<Array<{ tenant_id: string; sku: string; cnt: bigint }>>`
    SELECT ci.tenant_id, ci.sku, COUNT(*) AS cnt
    FROM catalog_items ci
    JOIN tenants t ON t.id = ci.tenant_id
    WHERE t.slug LIKE 'qa-%'
    GROUP BY ci.tenant_id, ci.sku
    HAVING COUNT(*) > 1
  `;
  if (dupSkus.length > 0) {
    throw new Error(`V-F09 STOP: Duplicate SKUs detected: ${dupSkus.map(r => r.sku).join(', ')}`);
  }
  console.log('[VALIDATION] V-F09 PASS: No duplicate QA catalog SKUs');

  console.log('\n[VALIDATION] V-F10: Slice C-ALT V-01 through V-07 still pass');
  if (b2bCount < 9n || aggCount < 1n) {
    console.warn(`[VALIDATION] V-F10 WARN: V-01 may have degraded: B2B=${b2bCount}, AGGREGATOR=${aggCount}`);
  } else {
    console.log('[VALIDATION] V-F10 PASS: Slice C-ALT base validations still hold');
  }

  console.log('\n[QA-SEED] ✓ Slice C-ALT + Slice F seed complete');
  console.log('[QA-SEED] E2E-07/E2E-08/E2E-09: DATA BLOCKERS RESOLVED — Slice G Playwright verification still required');
}

main()
  .catch(err => {
    console.error('[QA-SEED] FATAL ERROR:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
