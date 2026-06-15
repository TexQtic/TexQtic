/**
 * PublicB2BProjectionService
 *
 * Governed public-safe projection layer for B2B supplier discovery.
 *
 * Design authority:
 *   governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md
 * Slice:
 *   PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE
 *
 * SIX PROJECTION SAFETY GATES (all must pass — fail = silently exclude):
 *   Gate A: tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'
 *   Gate B: org.publication_posture IN ('B2B_PUBLIC', 'BOTH')
 *   Gate C: org.org_type === 'B2B'
 *   Gate D: org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')
 *   Gate E: org.is_qa_sentinel === false (QA/test sentinel orgs explicitly excluded)
 *   Output gate: prohibited fields never appear in public payload
 *
 * PROHIBITED IN PUBLIC PAYLOAD (§C of design):
 *   price/pricing, org UUIDs, negotiation state, order/trade state,
 *   admin/governance fields, risk_score, plan, registration_no,
 *   external_orchestration_ref, draft/unpublished data
 *
 * DB ACCESS PATTERN:
 *   Service-role via withAdminContext / withOrgAdminContext (no caller auth token).
 *   Organizations table requires withOrgAdminContext (organizations_control_plane_select RLS
 *   requires app.current_realm() = 'admin').
 */

import { PrismaClient } from '@prisma/client';
import { withAdminContext, withOrgAdminContext } from '../lib/database-context.js';

// ── constants ─────────────────────────────────────────────────────────────────

const MAX_OFFERING_PREVIEW = 5;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CERT_TYPES_LIMIT = 10;

const PUBLICATION_POSTURE_PUBLIC: PublicationPosture[] = ['B2B_PUBLIC', 'BOTH'];
const ELIGIBLE_ORG_STATUSES = ['ACTIVE', 'VERIFICATION_APPROVED'] as const;
const ELIGIBLE_ORG_TYPE = 'B2B' as const;
const ELIGIBLE_TENANT_POSTURE = 'PUBLICATION_ELIGIBLE' as const;
const TRACEABILITY_SHARED_VISIBILITY = 'SHARED' as const;

// ── types ─────────────────────────────────────────────────────────────────────

type PublicationPosture = 'PRIVATE_OR_AUTH_ONLY' | 'B2B_PUBLIC' | 'B2C_PUBLIC' | 'BOTH';

export type PublicB2BSupplierTaxonomy = {
  primarySegment: string | null;
  secondarySegments: string[];
  rolePositions: string[];
};

export type PublicB2BOfferingPreviewItem = {
  name: string;
  moq: number;
  imageUrl: string | null;
};

export type PublicB2BSupplierEntry = {
  slug: string;
  legalName: string;
  logoUrl: string | null;
  orgType: string;
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  taxonomy: PublicB2BSupplierTaxonomy;
  offeringPreview: PublicB2BOfferingPreviewItem[];
  publicationPosture: 'B2B_PUBLIC' | 'BOTH';
  eligibilityPosture: 'PUBLICATION_ELIGIBLE';
  // Approved public company profile fields (PUBLIC-SAFE-COMPANY-PROJECTION-001)
  tagline: string | null;
  description: string | null;
  companySizeBand: string | null;
  capacityBand: string | null;
};

export type PublicB2BDiscoveryResponse = {
  items: PublicB2BSupplierEntry[];
  total: number;
  page: number;
  limit: number;
};

export type PublicB2BDiscoveryParams = {
  segment?: string;
  geo?: string;
  page?: number;
  limit?: number;
};

// ── internal row types ────────────────────────────────────────────────────────

type EligibleOrgRow = {
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
};

type EligibleTenantRow = {
  id: string;
  publicEligibilityPosture: string;
};

// Approved public company profile fields from tenant_profile_details table
// (PUBLIC-SAFE-COMPANY-PROJECTION-001 / PUBLIC-SAFE-COMPANY-PROJECTION-001-HOTFIX)
// PROHIBITED in this select: websiteUrl, businessEmail, phone, phonePublic,
// city, state, cinNumber, udyamNumber, iecNumber — must never appear in public payload.
type TenantProfileDetailRow = {
  tenantId: string;
  tagline: string | null;
  description: string | null;
  companySizeBand: string | null;
  capacityBand: string | null;
};

type CertificationRow = {
  orgId: string;
  certificationType: string;
  issuedAt: Date | null;
};

type TraceabilityRow = {
  orgId: string;
  visibility: string;
};

type CatalogItemRow = {
  tenantId: string;
  name: string;
  moq: number;
  imageUrl: string | null;
  publicationPosture: string;
  catalogVisibilityPolicyMode: string | null;
};

type BrandingRow = {
  tenantId: string;
  logoUrl: string | null;
};

// ── main service function ─────────────────────────────────────────────────────

export async function listPublicB2BSuppliers(
  params: PublicB2BDiscoveryParams,
  prismaClient: PrismaClient,
): Promise<PublicB2BDiscoveryResponse> {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  // ── Gate A + Gate B: fetch orgs that carry eligible publication_posture ──────
  // withOrgAdminContext required: organizations RLS policy requires admin realm
  const orgRows: EligibleOrgRow[] = await withOrgAdminContext(prismaClient, async tx => {
    return tx.organizations.findMany({
      where: {
        org_type: ELIGIBLE_ORG_TYPE,
        status: { in: [...ELIGIBLE_ORG_STATUSES] },
        publication_posture: { in: [...PUBLICATION_POSTURE_PUBLIC] },
        // Gate E (sentinel): QA/test orgs are always excluded from public projections.
        // is_qa_sentinel is Boolean @default(false) — non-nullable, direct equality filter.
        is_qa_sentinel: false,
        // Geo filter: jurisdiction exact match when provided
        ...(params.geo ? { jurisdiction: params.geo } : {}),
        // Segment filter: primary or secondary segment match
        ...(params.segment
          ? {
              OR: [
                { primary_segment_key: params.segment },
                {
                  secondary_segments: {
                    some: { segment_key: params.segment },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        org_type: true,
        jurisdiction: true,
        status: true,
        primary_segment_key: true,
        publication_posture: true,
        secondary_segments: {
          select: { segment_key: true },
          orderBy: { segment_key: 'asc' },
        },
        role_positions: {
          select: { role_position_key: true },
          orderBy: { role_position_key: 'asc' },
        },
      },
      orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
    });
  });

  if (orgRows.length === 0) {
    return { items: [], total: 0, page, limit };
  }

  const orgIds = orgRows.map((o) => o.id);

  // ── Gate A: filter by tenant publicEligibilityPosture ────────────────────────
  // tenant.id === organization.id (FK relationship in TexQtic schema)
  const tenantRows: EligibleTenantRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.tenant.findMany({
      where: {
        id: { in: orgIds },
        publicEligibilityPosture: ELIGIBLE_TENANT_POSTURE,
      },
      select: {
        id: true,
        publicEligibilityPosture: true,
      },
    });
  });

  const eligibleTenantIds = new Set(tenantRows.map((t) => t.id));

  // Apply gate A: retain only orgs whose tenant is PUBLICATION_ELIGIBLE
  const eligibleOrgs = orgRows.filter((o) => eligibleTenantIds.has(o.id));

  if (eligibleOrgs.length === 0) {
    return { items: [], total: 0, page, limit };
  }

  const eligibleOrgIds = eligibleOrgs.map((o) => o.id);

  // ── Approved company profile fields from tenant_profile_details ──────────────
  // ONLY approved public fields selected. Private fields (email, phone, website,
  // city, state, CIN, UDYAM, IEC) are explicitly NOT selected.
  const profileDetailRows: TenantProfileDetailRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.tenantProfileDetail.findMany({
      where: { tenantId: { in: eligibleOrgIds } },
      select: {
        tenantId: true,
        tagline: true,
        description: true,
        companySizeBand: true,
        capacityBand: true,
        // websiteUrl: NOT selected (out of scope)
        // businessEmail: NOT selected (prohibited — private contact data)
        // phone / phonePublic: NOT selected (prohibited)
        // city / state: NOT selected (not in approved projection list)
        // cinNumber / udyamNumber / iecNumber: NOT selected (private registration data)
      },
    });
  });

  // Tenant branding logo projection for public cards.
  const brandingRows: BrandingRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.tenantBranding.findMany({
      where: {
        tenantId: { in: eligibleOrgIds },
      },
      select: {
        tenantId: true,
        logoUrl: true,
      },
    });
  });

  // ── Certifications: APPROVED only (issuedAt IS NOT NULL) ─────────────────────
  const certRows: CertificationRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.certification.findMany({
      where: {
        orgId: { in: eligibleOrgIds },
        issuedAt: { not: null },
      },
      select: {
        orgId: true,
        certificationType: true,
        issuedAt: true,
      },
      orderBy: [{ orgId: 'asc' }, { issuedAt: 'desc' }],
    });
  });

  // ── TraceabilityNodes: SHARED visibility only (presence signal) ───────────────
  const evidenceRows: TraceabilityRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.traceabilityNode.findMany({
      where: {
        orgId: { in: eligibleOrgIds },
        visibility: TRACEABILITY_SHARED_VISIBILITY,
      },
      select: {
        orgId: true,
        visibility: true,
      },
      orderBy: [{ orgId: 'asc' }],
    });
  });

  // ── CatalogItems: publication_posture IN (B2B_PUBLIC, BOTH) AND active=true ──
  // Max 5 per org. No price field selected (prohibited).
  const catalogRows: CatalogItemRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.catalogItem.findMany({
      where: {
        tenantId: { in: eligibleOrgIds },
        active: true,
        publicationPosture: { in: [...PUBLICATION_POSTURE_PUBLIC] },
        // Visibility fallback: legacy NULL mode must remain publicly discoverable
        // when publicationPosture is public-compatible; explicit PUBLIC also allowed.
        OR: [
          { catalogVisibilityPolicyMode: null },
          { catalogVisibilityPolicyMode: 'PUBLIC' },
        ],
      },
      select: {
        tenantId: true,
        name: true,
        moq: true,
        imageUrl: true,
        publicationPosture: true,
        catalogVisibilityPolicyMode: true,
        // price: explicitly NOT selected (Gate E prohibition)
      },
      orderBy: [{ tenantId: 'asc' }, { createdAt: 'asc' }],
    });
  });

  // ── index helper maps ─────────────────────────────────────────────────────────

  const certsByOrgId = new Map<string, { count: number; types: string[] }>();
  for (const row of certRows) {
    const entry = certsByOrgId.get(row.orgId) ?? { count: 0, types: [] };
    entry.count += 1;
    if (entry.types.length < CERT_TYPES_LIMIT && !entry.types.includes(row.certificationType)) {
      entry.types.push(row.certificationType);
    }
    certsByOrgId.set(row.orgId, entry);
  }

  const hasEvidenceByOrgId = new Set(evidenceRows.map((r) => r.orgId));

  const catalogByTenantId = new Map<string, CatalogItemRow[]>();
  for (const row of catalogRows) {
    const items = catalogByTenantId.get(row.tenantId) ?? [];
    if (items.length < MAX_OFFERING_PREVIEW) {
      items.push(row);
      catalogByTenantId.set(row.tenantId, items);
    }
  }

  const logoByTenantId = new Map<string, string | null>();
  for (const row of brandingRows) {
    logoByTenantId.set(row.tenantId, row.logoUrl ?? null);
  }

  const tenantProfileByOrgId = new Map<string, TenantProfileDetailRow>();
  for (const row of profileDetailRows) {
    tenantProfileByOrgId.set(row.tenantId, row);
  }

  // ── build projection entries ──────────────────────────────────────────────────

  const allItems: PublicB2BSupplierEntry[] = eligibleOrgs.map((org) => {
    const certs = certsByOrgId.get(org.id) ?? { count: 0, types: [] };
    const catalog = catalogByTenantId.get(org.id) ?? [];
    const tenantProfile = tenantProfileByOrgId.get(org.id);

    // Validated at DB query level, but narrow here for type safety
    const posture = org.publication_posture as 'B2B_PUBLIC' | 'BOTH';

    return {
      slug: org.slug,
      legalName: org.legal_name,
      logoUrl: logoByTenantId.get(org.id) ?? null,
      orgType: org.org_type,
      jurisdiction: org.jurisdiction,
      certificationCount: certs.count,
      certificationTypes: certs.types,
      hasTraceabilityEvidence: hasEvidenceByOrgId.has(org.id),
      taxonomy: {
        primarySegment: org.primary_segment_key,
        secondarySegments: org.secondary_segments.map((s) => s.segment_key),
        rolePositions: org.role_positions.map((r) => r.role_position_key),
      },
      offeringPreview: catalog.map((c) => ({
        name: c.name,
        moq: c.moq,
        imageUrl: c.imageUrl,
      })),
      publicationPosture: posture,
      eligibilityPosture: 'PUBLICATION_ELIGIBLE',
      tagline: tenantProfile?.tagline ?? null,
      description: tenantProfile?.description ?? null,
      companySizeBand: tenantProfile?.companySizeBand ?? null,
      capacityBand: tenantProfile?.capacityBand ?? null,
    };
  });

  // Paginate after all gates applied
  const total = allItems.length;
  const items = allItems.slice(offset, offset + limit);

  return { items, total, page, limit };
}

// ── ROUTE-001: Single supplier profile by slug ────────────────────────────────

/**
 * Public-safe profile shape for a single supplier (GAP-ACQ-001 / ROUTE-001).
 * Same allowed fields as PublicB2BSupplierEntry — no prohibited fields.
 */
export type PublicB2BSupplierProfile = PublicB2BSupplierEntry;

/**
 * Internal result — carries orgId for event emission only (never surfaced publicly).
 * The route MUST NOT include orgId in the HTTP response.
 */
export type PublicB2BSupplierProfileResult = {
  profile: PublicB2BSupplierProfile;
  /** Internal org UUID — used for audit log + event emission only. */
  orgId: string;
};

/**
 * Retrieve a single public-safe supplier profile by slug.
 *
 * Applies all five projection safety gates (A–E).
 * Returns null if the slug is not found OR if any gate fails — callers must
 * translate null to a safe 404 (no gate-detail leak).
 *
 * ROUTE-001 / GAP-ACQ-001
 */
export async function getPublicB2BSupplierBySlug(
  slug: string,
  prismaClient: PrismaClient,
): Promise<PublicB2BSupplierProfileResult | null> {
  // ── Gate B + Gate C + Gate D: fetch eligible org by slug ─────────────────────
  const orgRows: EligibleOrgRow[] = await withOrgAdminContext(prismaClient, async tx => {
    return tx.organizations.findMany({
      where: {
        slug,
        org_type: ELIGIBLE_ORG_TYPE,
        status: { in: [...ELIGIBLE_ORG_STATUSES] },
        publication_posture: { in: [...PUBLICATION_POSTURE_PUBLIC] },
        // Gate E (sentinel): QA/test orgs are always excluded from public projections.
        is_qa_sentinel: false,
      },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        org_type: true,
        jurisdiction: true,
        status: true,
        primary_segment_key: true,
        publication_posture: true,
        secondary_segments: {
          select: { segment_key: true },
          orderBy: { segment_key: 'asc' },
        },
        role_positions: {
          select: { role_position_key: true },
          orderBy: { role_position_key: 'asc' },
        },
      },
    });
  });

  if (orgRows.length === 0) {
    return null;
  }

  const org = orgRows[0];

  // ── Gate A: verify tenant publicEligibilityPosture ────────────────────────────
  const tenantRows: EligibleTenantRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.tenant.findMany({
      where: {
        id: org.id,
        publicEligibilityPosture: ELIGIBLE_TENANT_POSTURE,
      },
      select: {
        id: true,
        publicEligibilityPosture: true,
      },
    });
  });

  if (tenantRows.length === 0) {
    return null;
  }

  const brandingRow = await withAdminContext(prismaClient, async tx => {
    return tx.tenantBranding.findUnique({
      where: { tenantId: org.id },
      select: { logoUrl: true },
    });
  });

  // ── Approved company profile fields from tenant_profile_details ──────────────
  // ONLY approved public fields selected. Private fields are explicitly NOT selected.
  const profileDetailRow: TenantProfileDetailRow | null = await withAdminContext(prismaClient, async tx => {
    return tx.tenantProfileDetail.findUnique({
      where: { tenantId: org.id },
      select: {
        tenantId: true,
        tagline: true,
        description: true,
        companySizeBand: true,
        capacityBand: true,
        // websiteUrl / businessEmail / phone / city / state / cinNumber etc: NOT selected
      },
    });
  });

  // ── Certifications ────────────────────────────────────────────────────────────
  const certRows: CertificationRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.certification.findMany({
      where: { orgId: org.id, issuedAt: { not: null } },
      select: { orgId: true, certificationType: true, issuedAt: true },
      orderBy: [{ orgId: 'asc' }, { issuedAt: 'desc' }],
    });
  });

  const certCount = certRows.length;
  const certTypes: string[] = [];
  for (const row of certRows) {
    if (certTypes.length < CERT_TYPES_LIMIT && !certTypes.includes(row.certificationType)) {
      certTypes.push(row.certificationType);
    }
  }

  // ── TraceabilityNodes ─────────────────────────────────────────────────────────
  const evidenceRows: TraceabilityRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.traceabilityNode.findMany({
      where: { orgId: org.id, visibility: TRACEABILITY_SHARED_VISIBILITY },
      select: { orgId: true, visibility: true },
    });
  });

  // ── CatalogItems (offering preview) ──────────────────────────────────────────
  const catalogRows: CatalogItemRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.catalogItem.findMany({
      where: {
        tenantId: org.id,
        active: true,
        publicationPosture: { in: [...PUBLICATION_POSTURE_PUBLIC] },
        OR: [
          { catalogVisibilityPolicyMode: null },
          { catalogVisibilityPolicyMode: 'PUBLIC' },
        ],
      },
      select: {
        tenantId: true,
        name: true,
        moq: true,
        imageUrl: true,
        publicationPosture: true,
        catalogVisibilityPolicyMode: true,
        // price: explicitly NOT selected (Gate E prohibition)
      },
      orderBy: [{ createdAt: 'asc' }],
      take: MAX_OFFERING_PREVIEW,
    });
  });

  // ── Gate E: build public-safe projection (prohibited fields excluded) ─────────
  const posture = org.publication_posture as 'B2B_PUBLIC' | 'BOTH';

  const profile: PublicB2BSupplierProfile = {
    slug: org.slug,
    legalName: org.legal_name,
    logoUrl: brandingRow?.logoUrl ?? null,
    orgType: org.org_type,
    jurisdiction: org.jurisdiction,
    certificationCount: certCount,
    certificationTypes: certTypes,
    hasTraceabilityEvidence: evidenceRows.length > 0,
    taxonomy: {
      primarySegment: org.primary_segment_key,
      secondarySegments: org.secondary_segments.map((s) => s.segment_key),
      rolePositions: org.role_positions.map((r) => r.role_position_key),
    },
    offeringPreview: catalogRows.map((c) => ({
      name: c.name,
      moq: c.moq,
      imageUrl: c.imageUrl,
    })),
    publicationPosture: posture,
    eligibilityPosture: 'PUBLICATION_ELIGIBLE',
    tagline: profileDetailRow?.tagline ?? null,
    description: profileDetailRow?.description ?? null,
    companySizeBand: profileDetailRow?.companySizeBand ?? null,
    capacityBand: profileDetailRow?.capacityBand ?? null,
  };

  return { profile, orgId: org.id };
}
