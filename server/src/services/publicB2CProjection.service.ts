/**
 * PublicB2CProjectionService
 *
 * Governed public-safe projection layer for B2C storefront browse.
 *
 * Slice:
 *   PUBLIC_B2C_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE
 * Design authority:
 *   governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1.md
 *   governance/decisions/TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1.md
 *   governance/decisions/TEXQTIC-B2C-PUBLIC-BROWSE-READINESS-ASSESSMENT-v1.md
 *
 * FIVE PROJECTION SAFETY GATES (all must pass — fail = silently exclude):
 *   Gate A: tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'
 *   Gate B: org.publication_posture IN ('B2C_PUBLIC', 'BOTH')
 *   Gate C: org.org_type === 'B2C'
 *   Gate D: org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')
 *   Gate E: only allowed payload categories; prohibited fields NEVER in output
 *
 * PROHIBITED IN PUBLIC PAYLOAD (Gate E):
 *   org UUIDs (id field), risk_score, plan, registration_no,
 *   external_orchestration_ref, admin/governance fields,
 *   negotiation state, order/trade state, draft/unpublished data,
 *   authenticated checkout or account continuity
 *
 * ALLOWED PER BOUNDARY DECISION §3.1:
 *   storefront identity, catalog browse metadata, public pricing visibility,
 *   shopper-facing trust signals, publication posture
 *
 * DB ACCESS PATTERN:
 *   Service-role via withAdminContext / withOrgAdminContext (no caller auth token).
 *   Organizations table requires withOrgAdminContext (organizations_control_plane_select RLS
 *   requires app.current_realm() = 'admin').
 *
 * EMPTY RESULT:
 *   Lawful — no B2C-public data has yet been posture-assigned.
 *   Returns { items: [], total: 0, page, limit } — NOT an error.
 */

import { PrismaClient } from '@prisma/client';
import { withAdminContext, withOrgAdminContext } from '../lib/database-context.js';

// ── constants ─────────────────────────────────────────────────────────────────

const MAX_PRODUCT_PREVIEW = 5;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const PUBLICATION_POSTURE_B2C_PUBLIC: PublicationPosture[] = ['B2C_PUBLIC', 'BOTH'];
const ELIGIBLE_ORG_STATUSES = ['ACTIVE', 'VERIFICATION_APPROVED'] as const;
const ELIGIBLE_ORG_TYPE = 'B2C' as const;
const ELIGIBLE_TENANT_POSTURE = 'PUBLICATION_ELIGIBLE' as const;

// ── types ─────────────────────────────────────────────────────────────────────

type PublicationPosture = 'PRIVATE_OR_AUTH_ONLY' | 'B2B_PUBLIC' | 'B2C_PUBLIC' | 'BOTH';

export type PublicB2CProductPreviewItem = {
  name: string;
  moq: number;
  // Public pricing visibility is lawful per boundary decision §3.1.
  // Null when price is unset on the catalog item.
  price: string | null;
  imageUrl: string | null;
};

export type PublicB2CStorefrontEntry = {
  slug: string;
  legalName: string;
  orgType: string;
  jurisdiction: string;
  productsPreview: PublicB2CProductPreviewItem[];
  publicationPosture: 'B2C_PUBLIC' | 'BOTH';
  eligibilityPosture: 'PUBLICATION_ELIGIBLE';
};

export type PublicB2CBrowseResponse = {
  items: PublicB2CStorefrontEntry[];
  total: number;
  page: number;
  limit: number;
};

export type PublicB2CBrowseParams = {
  geo?: string;
  page?: number;
  limit?: number;
};

// ── internal row types ────────────────────────────────────────────────────────

type EligibleB2COrgRow = {
  id: string;
  slug: string;
  legal_name: string;
  org_type: string;
  jurisdiction: string;
  status: string;
  publication_posture: string;
};

type EligibleTenantRow = {
  id: string;
  publicEligibilityPosture: string;
};

type B2CCatalogItemRow = {
  tenantId: string;
  name: string;
  moq: number;
  price: string | null;
  imageUrl: string | null;
  publicationPosture: string;
};

// ── main service function ─────────────────────────────────────────────────────

export async function listPublicB2CProducts(
  params: PublicB2CBrowseParams,
  prismaClient: PrismaClient,
): Promise<PublicB2CBrowseResponse> {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  // ── Gate B + Gate C + Gate D: fetch B2C orgs with eligible publication_posture ─
  // withOrgAdminContext required: organizations RLS policy requires admin realm.
  // Gate C (org_type === 'B2C') and Gate D (status eligible) are enforced at DB query level.
  const orgRows: EligibleB2COrgRow[] = await withOrgAdminContext(prismaClient, async tx => {
    return tx.organizations.findMany({
      where: {
        org_type: ELIGIBLE_ORG_TYPE,
        status: { in: [...ELIGIBLE_ORG_STATUSES] },
        publication_posture: { in: [...PUBLICATION_POSTURE_B2C_PUBLIC] },
        // Geo filter: jurisdiction exact match when provided
        ...(params.geo ? { jurisdiction: params.geo } : {}),
      },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        org_type: true,
        jurisdiction: true,
        status: true,
        publication_posture: true,
        // id is selected only for internal lookup — NOT exposed in output (Gate E)
        // risk_score, plan, registration_no, external_orchestration_ref: NOT selected (Gate E)
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

  // Apply Gate A: retain only orgs whose tenant is PUBLICATION_ELIGIBLE
  const eligibleOrgs = orgRows.filter((o) => eligibleTenantIds.has(o.id));

  if (eligibleOrgs.length === 0) {
    return { items: [], total: 0, page, limit };
  }

  const eligibleOrgIds = eligibleOrgs.map((o) => o.id);

  // ── CatalogItems: publication_posture IN (B2C_PUBLIC, BOTH) AND active=true ──
  // Max MAX_PRODUCT_PREVIEW per storefront.
  // Price is selected (lawful per boundary decision §3.1 "public pricing visibility").
  // Internal admin/draft fields NOT selected (Gate E).
  const catalogRows: B2CCatalogItemRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.catalogItem.findMany({
      where: {
        tenantId: { in: eligibleOrgIds },
        active: true,
        publicationPosture: { in: [...PUBLICATION_POSTURE_B2C_PUBLIC] },
      },
      select: {
        tenantId: true,
        name: true,
        moq: true,
        price: true,
        imageUrl: true,
        publicationPosture: true,
        // sku, description: excluded from preview (detail-level, not browse-level)
        // Gate E: id (catalog item UUID), createdAt, updatedAt NOT selected
      },
      orderBy: [{ tenantId: 'asc' }, { createdAt: 'asc' }],
    });
  });

  // ── index helper map for catalog items ───────────────────────────────────────

  const catalogByTenantId = new Map<string, B2CCatalogItemRow[]>();
  for (const row of catalogRows) {
    const items = catalogByTenantId.get(row.tenantId) ?? [];
    if (items.length < MAX_PRODUCT_PREVIEW) {
      items.push(row);
      catalogByTenantId.set(row.tenantId, items);
    }
  }

  // ── build projection entries ──────────────────────────────────────────────────

  const allItems: PublicB2CStorefrontEntry[] = eligibleOrgs.map((org) => {
    const catalog = catalogByTenantId.get(org.id) ?? [];

    // Validated at DB query level, but narrow here for type safety
    const posture = org.publication_posture as 'B2C_PUBLIC' | 'BOTH';

    return {
      slug: org.slug,
      legalName: org.legal_name,
      orgType: org.org_type,
      jurisdiction: org.jurisdiction,
      productsPreview: catalog.map((c) => ({
        name: c.name,
        moq: c.moq,
        // price is a Decimal from Prisma — convert to string for safe JSON serialization
        price: c.price != null ? String(c.price) : null,
        imageUrl: c.imageUrl,
      })),
      publicationPosture: posture,
      eligibilityPosture: 'PUBLICATION_ELIGIBLE',
      // id / orgId NOT exposed — Gate E prohibition
      // risk_score, plan, registration_no, external_orchestration_ref NOT exposed — Gate E
    };
  });

  // Paginate after all gates applied
  const total = allItems.length;
  const items = allItems.slice(offset, offset + limit);

  return { items, total, page, limit };
}
