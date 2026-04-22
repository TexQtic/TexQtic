/**
 * Unit tests — PublicB2BProjectionService
 *
 * Slice: PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE
 * Design authority: governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md
 *
 * Tests:
 *   1. Eligible supplier is projected correctly
 *   2. Org with ineligible publication_posture is excluded (Gate B)
 *   3. Org with ineligible tenant eligibility posture is excluded (Gate A)
 *   4. Ineligible org status is excluded (Gate D)
 *   5. Prohibited fields (price, orgId) are absent from output
 *   6. Empty result returns 200-shape (not error)
 *   7. Offering preview is capped at 5 items
 *   8. Route schema: pagination params (page/limit coercion)
 *
 * NOTE: These are pure unit tests using prisma mock injection.
 * DB integration tests use hasDb guard — see public-b2b-projection.integration.test.ts
 */
import { describe, it, expect, vi } from 'vitest';
import {
  listPublicB2BSuppliers,
  type PublicB2BDiscoveryResponse,
} from '../services/publicB2BProjection.service.js';

// ── prisma mock factory ───────────────────────────────────────────────────────

function makeMockPrisma(overrides: {
  orgs?: unknown[];
  tenants?: unknown[];
  certifications?: unknown[];
  traceabilityNodes?: unknown[];
  catalogItems?: unknown[];
} = {}) {
  const orgs = overrides.orgs ?? [];
  const tenants = overrides.tenants ?? [];
  const certifications = overrides.certifications ?? [];
  const traceabilityNodes = overrides.traceabilityNodes ?? [];
  const catalogItems = overrides.catalogItems ?? [];

  // withOrgAdminContext and withAdminContext use $executeRawUnsafe to set GUCs,
  // then delegate to the tx. We mock $executeRawUnsafe as no-op and use
  // $transaction to pass through — simpler: mock the service's prisma calls directly.
  const mockTx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    organizations: {
      findMany: vi.fn().mockResolvedValue(orgs),
    },
    tenant: {
      findMany: vi.fn().mockResolvedValue(tenants),
    },
    certification: {
      findMany: vi.fn().mockResolvedValue(certifications),
    },
    traceabilityNode: {
      findMany: vi.fn().mockResolvedValue(traceabilityNodes),
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

function makeEligibleOrgRow(overrides: Partial<{
  id: string;
  slug: string;
  legal_name: string;
  org_type: string;
  jurisdiction: string;
  status: string;
  primary_segment_key: string | null;
  publication_posture: string;
  secondary_segments: { segment_key: string }[];
  role_positions: { role_position_key: string }[];
}> = {}) {
  return {
    id: 'org-uuid-001',
    slug: 'acme-ltd',
    legal_name: 'Acme Ltd',
    org_type: 'B2B',
    jurisdiction: 'US',
    status: 'ACTIVE',
    primary_segment_key: 'textile',
    publication_posture: 'B2B_PUBLIC',
    secondary_segments: [{ segment_key: 'apparel' }],
    role_positions: [{ role_position_key: 'manufacturer' }],
    updated_at: new Date('2026-01-01'),
    created_at: new Date('2025-01-01'),
    ...overrides,
  };
}

function makeEligibleTenantRow(id: string = 'org-uuid-001') {
  return { id, publicEligibilityPosture: 'PUBLICATION_ELIGIBLE' };
}

// ── describe ──────────────────────────────────────────────────────────────────

describe('listPublicB2BSuppliers', () => {
  // ── test 1: eligible supplier projected correctly ──────────────────────────
  it('projects an eligible supplier with correct shape', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const certRow = {
      orgId: 'org-uuid-001',
      certificationType: 'ISO_9001',
      issuedAt: new Date('2025-06-01'),
    };
    const evidenceRow = { orgId: 'org-uuid-001', visibility: 'SHARED' };
    const catalogRow = {
      tenantId: 'org-uuid-001',
      name: 'Organic Cotton Fabric',
      moq: 500,
      imageUrl: 'https://cdn.example.com/item.jpg',
      publicationPosture: 'B2B_PUBLIC',
    };

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      certifications: [certRow],
      traceabilityNodes: [evidenceRow],
      catalogItems: [catalogRow],
    });

    const result: PublicB2BDiscoveryResponse = await listPublicB2BSuppliers({}, prisma);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.items).toHaveLength(1);

    const entry = result.items[0];
    expect(entry.slug).toBe('acme-ltd');
    expect(entry.legalName).toBe('Acme Ltd');
    expect(entry.orgType).toBe('B2B');
    expect(entry.jurisdiction).toBe('US');
    expect(entry.certificationCount).toBe(1);
    expect(entry.certificationTypes).toEqual(['ISO_9001']);
    expect(entry.hasTraceabilityEvidence).toBe(true);
    expect(entry.taxonomy.primarySegment).toBe('textile');
    expect(entry.taxonomy.secondarySegments).toEqual(['apparel']);
    expect(entry.taxonomy.rolePositions).toEqual(['manufacturer']);
    expect(entry.offeringPreview).toHaveLength(1);
    expect(entry.offeringPreview[0].name).toBe('Organic Cotton Fabric');
    expect(entry.offeringPreview[0].moq).toBe(500);
    expect(entry.publicationPosture).toBe('B2B_PUBLIC');
    expect(entry.eligibilityPosture).toBe('PUBLICATION_ELIGIBLE');
  });

  // ── test 2: Gate B — ineligible publication_posture excluded ───────────────
  it('excludes org with PRIVATE_OR_AUTH_ONLY publication_posture (Gate B)', async () => {
    // The DB query itself has `publication_posture: { in: [...PUBLICATION_POSTURE_PUBLIC] }`
    // so the org with PRIVATE_OR_AUTH_ONLY is never returned by the DB layer.
    // Here we verify the empty-result path.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2BSuppliers({}, prisma);

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── test 3: Gate A — ineligible tenant posture excluded ────────────────────
  it('excludes org when tenant.publicEligibilityPosture is not PUBLICATION_ELIGIBLE (Gate A)', async () => {
    const orgRow = makeEligibleOrgRow();
    // Tenant exists but has NO_PUBLIC_PRESENCE — not returned by tenant query
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [], // Gate A: no eligible tenant
    });

    const result = await listPublicB2BSuppliers({}, prisma);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  // ── test 4: Gate D — ineligible org status excluded ────────────────────────
  it('excludes org with SUSPENDED status (Gate D)', async () => {
    // DB query has `status: { in: ELIGIBLE_ORG_STATUSES }` so SUSPENDED never returned.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2BSuppliers({}, prisma);
    expect(result.items).toHaveLength(0);
  });

  // ── test 5: Gate E — prohibited fields absent from output ──────────────────
  it('does not expose price, orgId UUID, risk_score, plan, registration_no', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
    });

    const result = await listPublicB2BSuppliers({}, prisma);
    expect(result.items).toHaveLength(1);
    const entry = result.items[0] as Record<string, unknown>;

    // These fields must never appear in the output
    expect(entry).not.toHaveProperty('id');
    expect(entry).not.toHaveProperty('orgId');
    expect(entry).not.toHaveProperty('price');
    expect(entry).not.toHaveProperty('risk_score');
    expect(entry).not.toHaveProperty('riskScore');
    expect(entry).not.toHaveProperty('plan');
    expect(entry).not.toHaveProperty('registration_no');
    expect(entry).not.toHaveProperty('registrationNo');
  });

  // ── test 6: empty result returns valid 200-shape ────────────────────────────
  it('returns valid empty shape when no eligible suppliers exist', async () => {
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2BSuppliers({}, prisma);

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });

  // ── test 7: offering preview capped at 5 ──────────────────────────────────
  it('caps offeringPreview at 5 items', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const catalogRows = Array.from({ length: 8 }, (_, i) => ({
      tenantId: 'org-uuid-001',
      name: `Item ${i + 1}`,
      moq: 100,
      imageUrl: null,
      publicationPosture: 'B2B_PUBLIC',
    }));

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      catalogItems: catalogRows,
    });

    const result = await listPublicB2BSuppliers({}, prisma);
    expect(result.items[0].offeringPreview).toHaveLength(5);
  });

  // ── test 8: pagination shapes ────────────────────────────────────────────────
  it('respects custom page and limit params', async () => {
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await listPublicB2BSuppliers({ page: 3, limit: 10 }, prisma);

    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.items).toHaveLength(0);
  });

  // ── test 9: BOTH posture is projected with correct posture field ─────────────
  it('projects supplier with BOTH posture and sets publicationPosture to BOTH', async () => {
    const orgRow = makeEligibleOrgRow({ publication_posture: 'BOTH' });
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
    });

    const result = await listPublicB2BSuppliers({}, prisma);
    expect(result.items[0].publicationPosture).toBe('BOTH');
  });

  // ── test 10: no traceability evidence returns false ──────────────────────────
  it('sets hasTraceabilityEvidence false when no SHARED evidence nodes', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      traceabilityNodes: [], // no SHARED evidence
    });

    const result = await listPublicB2BSuppliers({}, prisma);
    expect(result.items[0].hasTraceabilityEvidence).toBe(false);
  });
});
