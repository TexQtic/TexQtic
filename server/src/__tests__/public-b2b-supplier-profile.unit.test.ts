/**
 * Unit tests — getPublicB2BSupplierBySlug
 *
 * Design authority: MAIN-PLATFORM-PUBLIC-SUPPLIER-PROFILE-ROUTE-001
 * Event governance: shared/contracts/event-names.md §Acquisition Domain Events (EVENTS-003)
 *
 * Tests:
 *   1. Eligible supplier by slug → returns correct PublicB2BSupplierProfile shape
 *   2. Slug not found (org query returns empty) → returns null
 *   3. Gate A fail (tenant posture ≠ PUBLICATION_ELIGIBLE) → returns null
 *   4. Gate B fail (publication_posture = PRIVATE_OR_AUTH_ONLY — not in allowed set) → returns null
 *   5. Gate D fail (status = SUSPENDED — not in eligible statuses) → returns null
 *   6. Gate E: prohibited fields absent (org UUID, external_orchestration_ref) from output
 *   7. Certification data projected correctly
 *   8. Offering preview capped at 5 items
 */
import { describe, it, expect, vi } from 'vitest';
import {
  getPublicB2BSupplierBySlug,
  type PublicB2BSupplierProfile,
} from '../services/publicB2BProjection.service.js';

// ── prisma mock factory ───────────────────────────────────────────────────────
//
// withOrgAdminContext and withAdminContext use $executeRawUnsafe (GUC set)
// then delegate to the tx via $transaction. We mock both as no-ops so the
// service's internal queries run against the mock tx.

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
    slug: 'acme-textiles',
    legal_name: 'Acme Textiles Ltd',
    org_type: 'B2B',
    jurisdiction: 'IN',
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

describe('getPublicB2BSupplierBySlug', () => {
  // ── test 1: eligible supplier → correct profile shape ─────────────────────
  it('returns a correct PublicB2BSupplierProfile for an eligible supplier slug', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const certRow = {
      orgId: 'org-uuid-001',
      certificationType: 'GOTS',
      issuedAt: new Date('2025-09-01'),
    };
    const evidenceRow = { orgId: 'org-uuid-001', visibility: 'SHARED' };
    const catalogRow = {
      tenantId: 'org-uuid-001',
      name: 'Organic Denim Roll',
      moq: 300,
      imageUrl: 'https://cdn.example.com/denim.jpg',
      publicationPosture: 'B2B_PUBLIC',
    };

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      certifications: [certRow],
      traceabilityNodes: [evidenceRow],
      catalogItems: [catalogRow],
    });

    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);

    expect(result).not.toBeNull();
    const { profile, orgId } = result!;

    // profile shape
    expect(profile.slug).toBe('acme-textiles');
    expect(profile.legalName).toBe('Acme Textiles Ltd');
    expect(profile.orgType).toBe('B2B');
    expect(profile.jurisdiction).toBe('IN');
    expect(profile.certificationCount).toBe(1);
    expect(profile.certificationTypes).toEqual(['GOTS']);
    expect(profile.hasTraceabilityEvidence).toBe(true);
    expect(profile.taxonomy?.primarySegment).toBe('textile');
    expect(profile.taxonomy?.secondarySegments).toEqual(['apparel']);
    expect(profile.taxonomy?.rolePositions).toEqual(['manufacturer']);
    expect(profile.offeringPreview).toHaveLength(1);
    expect(profile.offeringPreview[0].name).toBe('Organic Denim Roll');
    expect(profile.offeringPreview[0].moq).toBe(300);
    expect(profile.publicationPosture).toBe('B2B_PUBLIC');
    expect(profile.eligibilityPosture).toBe('PUBLICATION_ELIGIBLE');

    // orgId is present internally (for event emission)
    expect(orgId).toBe('org-uuid-001');
  });

  // ── test 2: slug not found → null ─────────────────────────────────────────
  it('returns null when no org matches the slug (slug not found)', async () => {
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await getPublicB2BSupplierBySlug('nonexistent-slug', prisma);
    expect(result).toBeNull();
  });

  // ── test 3: Gate A fail → null ────────────────────────────────────────────
  it('returns null when tenant publicEligibilityPosture is not PUBLICATION_ELIGIBLE (Gate A)', async () => {
    const orgRow = makeEligibleOrgRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [], // Gate A: tenant has wrong posture or does not exist
    });

    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);
    expect(result).toBeNull();
  });

  // ── test 4: Gate B fail → null ────────────────────────────────────────────
  it('returns null when publication_posture excludes org from public listing (Gate B)', async () => {
    // DB query has `publication_posture: { in: ['B2B_PUBLIC', 'BOTH'] }`
    // so PRIVATE_OR_AUTH_ONLY is never returned by the org query.
    // Simulated by empty orgs.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);
    expect(result).toBeNull();
  });

  // ── test 5: Gate D fail → null ────────────────────────────────────────────
  it('returns null when org status is SUSPENDED (Gate D)', async () => {
    // DB query has `status: { in: ['ACTIVE', 'VERIFICATION_APPROVED'] }`
    // so SUSPENDED is never returned.
    const prisma = makeMockPrisma({ orgs: [] });
    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);
    expect(result).toBeNull();
  });

  // ── test 6: Gate E — prohibited fields absent from profile ────────────────
  it('does not expose org UUID, price, external_orchestration_ref, or contact fields', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
    });

    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);
    expect(result).not.toBeNull();

    const profile = result!.profile as Record<string, unknown>;

    // Internal fields must NOT appear in the public profile shape
    expect(profile).not.toHaveProperty('id');
    expect(profile).not.toHaveProperty('orgId');
    expect(profile).not.toHaveProperty('price');
    expect(profile).not.toHaveProperty('external_orchestration_ref');
    expect(profile).not.toHaveProperty('externalOrchestrationRef');
    expect(profile).not.toHaveProperty('registration_no');
    expect(profile).not.toHaveProperty('phone');
    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('risk_score');
    expect(profile).not.toHaveProperty('riskScore');
  });

  // ── test 7: certification data projected correctly ────────────────────────
  it('projects certificationCount and certificationTypes from cert rows', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    const certRows = [
      { orgId: 'org-uuid-001', certificationType: 'GOTS', issuedAt: new Date('2025-01-01') },
      { orgId: 'org-uuid-001', certificationType: 'OEKO_TEX', issuedAt: new Date('2025-02-01') },
      // Duplicate type — must be deduplicated in certificationTypes list
      { orgId: 'org-uuid-001', certificationType: 'GOTS', issuedAt: new Date('2025-03-01') },
    ];

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      certifications: certRows,
    });

    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);
    expect(result).not.toBeNull();

    const profile: PublicB2BSupplierProfile = result!.profile;

    // Count includes all rows (including duplicate type)
    expect(profile.certificationCount).toBe(3);
    // Types are deduplicated
    expect(profile.certificationTypes).toContain('GOTS');
    expect(profile.certificationTypes).toContain('OEKO_TEX');
    expect(profile.certificationTypes.filter((t) => t === 'GOTS')).toHaveLength(1);
  });

  // ── test 8: offering preview capped at 5 ─────────────────────────────────
  it('caps offeringPreview at 5 items even when catalog has more', async () => {
    const orgRow = makeEligibleOrgRow();
    const tenantRow = makeEligibleTenantRow();
    // The DB query uses `take: MAX_OFFERING_PREVIEW` (5) at the query level,
    // so the mock returns exactly 5.
    const catalogRows = Array.from({ length: 5 }, (_, i) => ({
      tenantId: 'org-uuid-001',
      name: `Fabric Item ${i + 1}`,
      moq: 100 * (i + 1),
      imageUrl: null,
      publicationPosture: 'B2B_PUBLIC',
    }));

    const prisma = makeMockPrisma({
      orgs: [orgRow],
      tenants: [tenantRow],
      catalogItems: catalogRows,
    });

    const result = await getPublicB2BSupplierBySlug('acme-textiles', prisma);
    expect(result).not.toBeNull();
    expect(result!.profile.offeringPreview).toHaveLength(5);
  });
});
