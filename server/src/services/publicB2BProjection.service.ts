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
 * FIVE PROJECTION SAFETY GATES (all must pass — fail = silently exclude):
 *   Gate A: tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'
 *   Gate B: org.publication_posture IN ('B2B_PUBLIC', 'BOTH')
 *   Gate C: org.org_type === 'B2B'
 *   Gate D: org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')
 *   Gate E: only allowed payload categories; prohibited fields NEVER in output
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
  orgType: string;
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  taxonomy: PublicB2BSupplierTaxonomy;
  offeringPreview: PublicB2BOfferingPreviewItem[];
  publicationPosture: 'B2B_PUBLIC' | 'BOTH';
  eligibilityPosture: 'PUBLICATION_ELIGIBLE';
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
      },
      select: {
        tenantId: true,
        name: true,
        moq: true,
        imageUrl: true,
        publicationPosture: true,
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

  // ── build projection entries ──────────────────────────────────────────────────

  const allItems: PublicB2BSupplierEntry[] = eligibleOrgs.map((org) => {
    const certs = certsByOrgId.get(org.id) ?? { count: 0, types: [] };
    const catalog = catalogByTenantId.get(org.id) ?? [];

    // Validated at DB query level, but narrow here for type safety
    const posture = org.publication_posture as 'B2B_PUBLIC' | 'BOTH';

    return {
      slug: org.slug,
      legalName: org.legal_name,
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
    };
  });

  // Paginate after all gates applied
  const total = allItems.length;
  const items = allItems.slice(offset, offset + limit);

  return { items, total, page, limit };
}
