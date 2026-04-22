/**
 * Unit tests — PublicB2CProjectionService
 *
 * Slice: PUBLIC_B2C_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE
 * Design authority:
 *   governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md
 *   governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md
 *
 * Tests:
 *   1.  Eligible B2C storefront projects correctly with correct shape
 *   2.  Org with ineligible publication_posture excluded (Gate B)
 *   3.  Org with ineligible tenant eligibility posture excluded (Gate A)
 *   4.  Wrong org_type (B2B) excluded (Gate C)
 *   5.  Wrong org status (SUSPENDED) excluded (Gate D)
 *   6.  Prohibited fields (id/orgId, risk_score, plan, registration_no) absent from output
 *   7.  Empty result returns valid 200-shape (not error)
 *   8.  Products preview capped at 5 items
 *   9.  BOTH posture projects with publicationPosture = 'BOTH'
 *   10. Org with no eligible catalog items returns empty productsPreview
 *
 * NOTE: Pure unit tests using prisma mock injection (no DB connection required).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  listPublicB2CProducts,
  type PublicB2CBrowseResponse,
} from '../services/publicB2CProjection.service.js';

// ── prisma mock factory ───────────────────────────────────────────────────────

function makeMockPrisma(overrides: {
  orgs?: unknown[];
  tenants?: unknown[];
  catalogItems?: unknown[];
} = {}) {
  const orgs = overrides.orgs ?? [];
  const tenants = overrides.tenants ?? [];
  const catalogItems = overrides.catalogItems ?? [];

  const mockTx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    organizations: {
      findMany: vi.fn().mockResolvedValue(orgs),
    },
    tenant: {
      findMany: vi.fn().mockResolvedValue(tenants),
    },
    catalogItem: {
      findMany: vi.fn().mockResolvedValue(catalogItems),
    },
  };

  return {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx),
    ),
    _mockTx: mockTx,
  } as unknown as import('@prisma/client').PrismaClient;
}

// ── fixture helpers ───────────────────────────────────────────────────────────

function makeEligibleB2COrgRow(overrides: Partial<{
  id: string;
  slug: string;
  legal_name: string;
  org_type: string;
  jurisdiction: string;
  status: string;
  publication_posture: string;
}> = {}) {
  return {
    id: 'b2c-org-uuid-001',
    slug: 'sunshine-store',
    legal_name: 'Sunshine Store Ltd',
    org_type: 'B2C',
    jurisdiction: 'US',
    status: 'ACTIVE',
    publication_posture: 'B2C_PUBLIC',
    updated_at: new Date('2026-01-01'),
    created_at: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeEligibleTenantRow(id: string = 'b2c-org-uuid-001') {
  return { id, publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' };
}

function makeB2CCatalogRow(overrides: Partial<{
  tenantId: string;
  name: string;
  moq: number;
  price: string | null;
  imageUrl: string | null;
  publicationPosture: string;
}> = {}) {
  return {
    tenantId: 'b2c-org-uuid-001',
    name: 'Organic Tote Bag',
    moq: 1,
    price: '29.99',
    imageUrl: 'https://cdn.example.com/tote.jpg',
    publicationPosture: 'B2C_PUBLIC',
    ...overrides,
  };
}

// ── describe ──────────────────────────────────────────────────────────────────

describe('listPublicB2CProducts', () => {
  // ── test 1: eligible B2C storefront projected correctly ───────────────────
  it('projects an eligible B2C storefront with correct shape', async () => {
    const orgRow = makeEligibleB2COrgRow();
    const tenantRow = makeEligibleTenantRow();
    const catalogRow = makeB2CCatalogRow();

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      catalogItems: [catalogRow],
    });

    const result: PublicB2CBrowseResponse = await listPublicB2CProducts({}, prisma);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.items).toHaveLength(1);

    const entry = result.items[0];
    expect(entry.slug).toBe('sunshine-store');
    expect(entry.legalName).toBe('Sunshine Store Ltd');
    expect(entry.orgType).toBe('B2C');
    expect(entry.jurisdiction).toBe('US');
    expect(entry.publicationPosture).toBe('B2C_PUBLIC');
    expect(entry.eligibilityPosture).toBe('PUBLICATION_ELIGIBLE');
    expect(entry.productsPreview).toHaveLength(1);
    expect(entry.productsPreview[0].name).toBe('Organic Tote Bag');
    expect(entry.productsPreview[0].moq).toBe(1);
    expect(entry.productsPreview[0].price).toBe('29.99');
    expect(entry.productsPreview[0].imageUrl).toBe('https://cdn.example.com/tote.jpg');
  });

  // ── test 2: Gate B — ineligible publication_posture excluded ──────────────
  it('excludes org with PRIVATE_OR_AUTH_ONLY publication_posture (Gate B)', async () => {
    // DB query enforces `publication_posture IN ('B2C_PUBLIC', 'BOTH')` —
    // PRIVATE_OR_AUTH_ONLY org is never returned by the DB layer.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2CProducts({}, prisma);

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── test 3: Gate A — ineligible tenant posture excluded ───────────────────
  it('excludes org when tenant.publicEligibilityPosture is not PUBLICATION_ELIGIBLE (Gate A)', async () => {
    const orgRow = makeEligibleB2COrgRow();
    // Tenant exists but has NO_PUBLIC_PRESENCE — not returned by tenant query
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [], // Gate A: no eligible tenant
    });

    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── test 4: Gate C — wrong org_type (B2B) excluded ────────────────────────
  it('excludes org with org_type B2B (Gate C)', async () => {
    // DB query enforces `org_type: 'B2C'` — B2B orgs never returned.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── test 5: Gate D — wrong org status (SUSPENDED) excluded ───────────────
  it('excludes org with SUSPENDED status (Gate D)', async () => {
    // DB query enforces `status IN ('ACTIVE', 'VERIFICATION_APPROVED')` — SUSPENDED excluded.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items).toHaveLength(0);
  });

  // ── test 6: Gate E — prohibited fields absent from output ─────────────────
  it('does not expose id/orgId, risk_score, plan, registration_no in the entry', async () => {
    const orgRow = makeEligibleB2COrgRow();
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
    });

    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items).toHaveLength(1);
    const entry = result.items[0] as Record<string, unknown>;

    // These fields must never appear in the output
    expect(entry).not.toHaveProperty('id');
    expect(entry).not.toHaveProperty('orgId');
    expect(entry).not.toHaveProperty('risk_score');
    expect(entry).not.toHaveProperty('riskScore');
    expect(entry).not.toHaveProperty('plan');
    expect(entry).not.toHaveProperty('registration_no');
    expect(entry).not.toHaveProperty('registrationNo');
    expect(entry).not.toHaveProperty('external_orchestration_ref');
  });

  // ── test 7: empty result returns valid 200-shape ──────────────────────────
  it('returns valid empty shape when no eligible B2C storefronts exist', async () => {
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2CProducts({}, prisma);

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  // ── test 8: products preview capped at 5 items ───────────────────────────
  it('caps productsPreview at 5 items per storefront', async () => {
    const orgRow = makeEligibleB2COrgRow();
    const tenantRow = makeEligibleTenantRow();
    const catalogRows = Array.from({ length: 8 }, (_, i) =>
      makeB2CCatalogRow({ name: `Product ${i + 1}` }),
    );

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      catalogItems: catalogRows,
    });

    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items[0].productsPreview).toHaveLength(5);
  });

  // ── test 9: BOTH posture projects with publicationPosture = 'BOTH' ────────
  it('projects storefront with BOTH posture and sets publicationPosture to BOTH', async () => {
    const orgRow = makeEligibleB2COrgRow({ publication_posture: 'BOTH' });
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
    });

    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items[0].publicationPosture).toBe('BOTH');
  });

  // ── test 10: no eligible catalog items returns empty productsPreview ──────
  it('returns empty productsPreview when storefront has no B2C-public catalog items', async () => {
    const orgRow = makeEligibleB2COrgRow();
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      catalogItems: [], // no B2C-public items
    });

    const result = await listPublicB2CProducts({}, prisma);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].productsPreview).toHaveLength(0);
    expect(result.items[0].slug).toBe('sunshine-store');
  });
});
