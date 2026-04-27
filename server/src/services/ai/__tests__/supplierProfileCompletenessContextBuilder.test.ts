/**
 * supplierProfileCompletenessContextBuilder.test.ts
 *
 * Unit tests for buildSupplierProfileCompletenessContext().
 * Implements TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 Slice 1 test suite.
 *
 * Test IDs: K-001 through K-010
 *
 * K-001  context assembly includes correct org fields
 * K-002  price field is never present in context or orgProfile
 * K-003  publicationPosture is never present in context or orgProfile
 * K-004  risk_score is never present in context or orgProfile
 * K-005  assertNoForbiddenAiFields throws on a contaminated object
 * K-006  redactPii applied to legalName containing PII
 * K-007  completenessScores map is populated for each active item
 * K-008  stageBreakdown map is correct
 * K-009  certifications expose only id / certificationType / expiresAt
 * K-010  no profile writes occur (no create / update / upsert / delete calls)
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/supplierProfileCompletenessContextBuilder.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

// ── Real guards imported directly — no mock, we want real boundary enforcement ──
import { assertNoForbiddenAiFields } from '../aiForbiddenData.js';

// ── SUT ───────────────────────────────────────────────────────────────────────
import {
  buildSupplierProfileCompletenessContext,
} from '../supplierProfileCompletenessContextBuilder.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-0000-4000-8000-000000000001';

const mockOrg = {
  id: ORG_ID,
  slug: 'test-supplier',
  legal_name: 'Test Supplier Pvt Ltd',
  jurisdiction: 'IND',
  registration_no: 'U12345MH2020PTC123456',
  org_type: 'B2B',
  primary_segment_key: 'TEXTILE_YARN',
};

const mockSecondarySegments = [
  { segment_key: 'TEXTILE_FABRIC' },
  { segment_key: 'TEXTILE_GARMENT' },
];

const mockRolePositions = [
  { role_position_key: 'MANUFACTURER' },
  { role_position_key: 'EXPORTER' },
];

const mockCatalogItems = [
  {
    id: 'item-0001-0000-0000-0000-000000000001',
    sku: 'YARN-001',
    name: 'Cotton Yarn 40s',
    catalogStage: 'YARN',
    stageAttributes: {
      yarnType: 'Combed',
      yarnCount: '40s',
      countSystem: 'English',
      ply: 'Single',
      fiber: 'Cotton',
      spinningType: 'Ring',
      coneWeight: '1kg',
      endUse: 'Weaving',
    },
    material: null,
    composition: '100% Cotton',
    moq: 500,
    productCategory: null,
    fabricType: null,
    gsm: null,
    color: null,
    widthCm: null,
    construction: null,
    certifications: [{ standard: 'GOTS' }],
  },
  {
    id: 'item-0002-0000-0000-0000-000000000002',
    sku: 'FAB-001',
    name: 'Denim Fabric',
    catalogStage: null,
    stageAttributes: {},
    material: 'Cotton',
    composition: '98% Cotton 2% Elastane',
    moq: 200,
    productCategory: 'FABRIC',
    fabricType: 'Woven',
    gsm: 320,
    color: 'Indigo',
    widthCm: 150,
    construction: 'Twill',
    certifications: [{ standard: 'OEKO_TEX' }],
  },
];

const mockCertifications = [
  {
    id: 'cert-0001-0000-0000-0000-000000000001',
    certificationType: 'GOTS',
    expiresAt: new Date('2026-12-31'),
  },
  {
    id: 'cert-0002-0000-0000-0000-000000000002',
    certificationType: 'ISO_9001',
    expiresAt: null,
  },
];

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function makeMockPrisma(overrides: Partial<{
  orgResult: typeof mockOrg | null;
  items: typeof mockCatalogItems;
  certs: typeof mockCertifications;
  segments: typeof mockSecondarySegments;
  roles: typeof mockRolePositions;
}> = {}): PrismaClient {
  const {
    orgResult = mockOrg,
    items = mockCatalogItems,
    certs = mockCertifications,
    segments = mockSecondarySegments,
    roles = mockRolePositions,
  } = overrides;

  return {
    organizations: {
      findUniqueOrThrow: vi.fn().mockResolvedValue(orgResult),
    },
    organizationSecondarySegment: {
      findMany: vi.fn().mockResolvedValue(segments),
    },
    organizationRolePosition: {
      findMany: vi.fn().mockResolvedValue(roles),
    },
    catalogItem: {
      findMany: vi.fn().mockResolvedValue(items),
    },
    certification: {
      findMany: vi.fn().mockResolvedValue(certs),
    },
  } as unknown as PrismaClient;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('buildSupplierProfileCompletenessContext', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = makeMockPrisma();
  });

  // K-001 — context assembly includes correct org fields
  it('K-001: assembles correct org fields in orgProfile', async () => {
    const { orgProfile } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(orgProfile.orgId).toBe(ORG_ID);
    expect(orgProfile.slug).toBe('test-supplier');
    expect(orgProfile.legalName).toBe('Test Supplier Pvt Ltd');
    expect(orgProfile.jurisdiction).toBe('IND');
    expect(orgProfile.registrationNo).toBe('U12345MH2020PTC123456');
    expect(orgProfile.orgType).toBe('B2B');
    expect(orgProfile.primarySegmentKey).toBe('TEXTILE_YARN');
    expect(orgProfile.secondarySegmentKeys).toEqual(['TEXTILE_FABRIC', 'TEXTILE_GARMENT']);
    expect(orgProfile.rolePositionKeys).toEqual(['MANUFACTURER', 'EXPORTER']);
  });

  // K-001 (continued) — context orgId matches
  it('K-001: context.orgId matches JWT-derived orgId', async () => {
    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(context.orgId).toBe(ORG_ID);
  });

  // K-002 — price field is never present
  it('K-002: price field is absent from context and orgProfile', async () => {
    const { context, orgProfile } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(context).not.toHaveProperty('price');
    expect(orgProfile).not.toHaveProperty('price');

    for (const item of context.catalogItems) {
      expect(item).not.toHaveProperty('price');
    }
  });

  // K-003 — publicationPosture is never present
  it('K-003: publicationPosture is absent from context, orgProfile, and all catalog items', async () => {
    const { context, orgProfile } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(context).not.toHaveProperty('publicationPosture');
    expect(orgProfile).not.toHaveProperty('publicationPosture');

    for (const item of context.catalogItems) {
      expect(item).not.toHaveProperty('publicationPosture');
    }
  });

  // K-004 — risk_score is never present
  it('K-004: risk_score / riskScore is absent from context and orgProfile', async () => {
    const { context, orgProfile } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(context).not.toHaveProperty('risk_score');
    expect(context).not.toHaveProperty('riskScore');
    expect(orgProfile).not.toHaveProperty('risk_score');
    expect(orgProfile).not.toHaveProperty('riskScore');
  });

  // K-005 — assertNoForbiddenAiFields throws on a contaminated object
  it('K-005: assertNoForbiddenAiFields throws when a forbidden field is present', () => {
    // Test the guard directly — the builder uses it at step 11
    const contaminatedWithPrice = { orgId: ORG_ID, price: 99.99 };
    expect(() => assertNoForbiddenAiFields(contaminatedWithPrice)).toThrow(
      'AI_FORBIDDEN_FIELD_DETECTED',
    );

    const contaminatedWithPosture = { orgId: ORG_ID, publicationPosture: 'PUBLIC' };
    expect(() => assertNoForbiddenAiFields(contaminatedWithPosture)).toThrow(
      'AI_FORBIDDEN_FIELD_DETECTED',
    );

    const contaminatedWithRisk = { orgId: ORG_ID, risk_score: 5 };
    expect(() => assertNoForbiddenAiFields(contaminatedWithRisk)).toThrow(
      'AI_FORBIDDEN_FIELD_DETECTED',
    );
  });

  // K-006 — redactPii applied to legalName containing PII
  it('K-006: legalName containing an email address is redacted', async () => {
    const orgWithPii = {
      ...mockOrg,
      legal_name: 'Test Supplier contact@supplier.com Ltd',
    };
    prisma = makeMockPrisma({ orgResult: orgWithPii });

    const { orgProfile } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(orgProfile.legalName).not.toContain('contact@supplier.com');
    expect(orgProfile.legalName).toContain('[REDACTED]');
  });

  // K-006 (continued) — legalName without PII is preserved unchanged
  it('K-006: legalName without PII is preserved as-is', async () => {
    const { orgProfile } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(orgProfile.legalName).toBe('Test Supplier Pvt Ltd');
  });

  // K-007 — completenessScores map populated for each active item
  it('K-007: completenessScores contains an entry for each catalog item', async () => {
    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    const itemIds = mockCatalogItems.map((i) => i.id);
    for (const id of itemIds) {
      expect(context.completenessScores).toHaveProperty(id);
      const score = context.completenessScores[id];
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  // K-007 (continued) — YARN item with all stage attrs scores highly
  it('K-007: YARN item with full stage attributes scores above 0.8', async () => {
    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    // YARN item has: name ✓, yarnType ✓, yarnCount ✓, countSystem ✓, ply ✓,
    // fiber ✓, composition ✓, spinningType ✓, coneWeight ✓, endUse ✓, certifications ✓
    // = 11/11 = 1.0
    const yarnScore = context.completenessScores['item-0001-0000-0000-0000-000000000001'];
    expect(yarnScore).toBeCloseTo(1.0);
  });

  // K-008 — stageBreakdown map is correct
  it('K-008: stageBreakdown counts items per stage correctly', async () => {
    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    // mockCatalogItems: one YARN, one null → UNKNOWN
    expect(context.stageBreakdown['YARN']).toBe(1);
    expect(context.stageBreakdown['UNKNOWN']).toBe(1);
  });

  it('K-008: stageBreakdown aggregates multiple items in same stage', async () => {
    const twoYarnItems = [
      { ...mockCatalogItems[0] },
      { ...mockCatalogItems[0], id: 'item-0003-0000-0000-0000-000000000003', sku: 'YARN-002' },
    ];
    prisma = makeMockPrisma({ items: twoYarnItems });

    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(context.stageBreakdown['YARN']).toBe(2);
  });

  // K-009 — certifications expose only id / certificationType / expiresAt
  it('K-009: certifications contain only id, certificationType, expiresAt', async () => {
    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(context.certifications).toHaveLength(2);

    for (const cert of context.certifications) {
      const keys = Object.keys(cert);
      expect(keys).toEqual(expect.arrayContaining(['id', 'certificationType', 'expiresAt']));
      // Must NOT expose PII or financial fields
      expect(keys).not.toContain('createdByUserId');
      expect(keys).not.toContain('orgId');
      expect(keys).not.toContain('lifecycleStateId');
      expect(keys).not.toContain('issuedAt');
    }
  });

  it('K-009: certification expiresAt is preserved as Date or null', async () => {
    const { context } = await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    const certWithExpiry = context.certifications.find((c) => c.certificationType === 'GOTS');
    const certNoExpiry = context.certifications.find((c) => c.certificationType === 'ISO_9001');

    expect(certWithExpiry?.expiresAt).toBeInstanceOf(Date);
    expect(certNoExpiry?.expiresAt).toBeNull();
  });

  // K-010 — no profile writes occur
  it('K-010: no write operations are called on the Prisma client', async () => {
    await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    // Verify only read methods are called — no create / update / upsert / delete / deleteMany
    const writeMethods = [
      'create', 'createMany', 'update', 'updateMany',
      'upsert', 'delete', 'deleteMany',
    ];

    const models = [
      prisma.organizations,
      prisma.organizationSecondarySegment,
      prisma.organizationRolePosition,
      prisma.catalogItem,
      prisma.certification,
    ] as unknown as Array<Record<string, unknown>>;

    for (const model of models) {
      for (const method of writeMethods) {
        // Method either doesn't exist on the stub or was never called
        if (typeof model[method] === 'function') {
          expect(vi.isMockFunction(model[method])).toBe(true);
          expect((model[method] as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
        }
      }
    }
  });

  // K-010 (continued) — correct read queries are called
  it('K-010: findUniqueOrThrow on organizations is called with orgId', async () => {
    await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(
      (prisma.organizations.findUniqueOrThrow as ReturnType<typeof vi.fn>),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ORG_ID } }),
    );
  });

  it('K-010: catalogItem.findMany filters by tenantId and active=true', async () => {
    await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(
      (prisma.catalogItem.findMany as ReturnType<typeof vi.fn>),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: ORG_ID, active: true } }),
    );
  });

  it('K-010: certification.findMany filters by orgId', async () => {
    await buildSupplierProfileCompletenessContext(prisma, ORG_ID);

    expect(
      (prisma.certification.findMany as ReturnType<typeof vi.fn>),
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: ORG_ID } }),
    );
  });
});
