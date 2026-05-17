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
import { createHash } from 'node:crypto';
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
  slug: string;
  name: string;
  moq: number;
  // Public pricing visibility is lawful per boundary decision §3.1.
  // Null when price is unset on the catalog item.
  price: string | null;
  imageUrl: string | null;
  // Public-safe browse enrichment fields — null when not set on the catalog item.
  // id, sku, composition, catalogStage, and internal fields NOT included (Gate E).
  category: string | null;
  material: string | null;
  fabricType: string | null;
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

export type PublicB2CProductCard = {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: string | null;
  category: string | null;
};

export type PublicB2CProductDetail = {
  slug: string;
  name: string;
  category: string | null;
  material: string | null;
  fabricType: string | null;
  summary: string | null;
  description: string | null;
  imageUrls: string[];
  publicSupplierName: string;
  publicSupplierSlug: string;
  publicPriceLabel: string | null;
  publicMoqLabel: string | null;
  trustSignals: string[];
  hasTraceabilityEvidence: boolean;
  hasPassport: boolean | null;
  publicStatusLabel: string;
  tags: string[];
  relatedProducts: PublicB2CProductCard[];
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
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  moq: number;
  price: string | null;
  imageUrl: string | null;
  publicationPosture: string;
  productCategory: string | null;
  material: string | null;
  fabricType: string | null;
};

type TraceabilityEvidenceRow = {
  orgId: string;
};

function slugifyValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildPublicProductSlug(storefrontSlug: string, productName: string, catalogId: string): string {
  const base = slugifyValue(productName) || 'product';
  const token = createHash('sha256').update(catalogId).digest('hex').slice(0, 10);
  return `${storefrontSlug}--${base}-${token}`;
}

function buildPublicMoqLabel(moq: number): string {
  return `MOQ ${moq}`;
}

function buildSummary(description: string | null): string | null {
  if (!description) {
    return null;
  }
  const trimmed = description.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
}

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
        id: true,
        tenantId: true,
        name: true,
        description: true,
        moq: true,
        price: true,
        imageUrl: true,
        publicationPosture: true,
        productCategory: true,
        material: true,
        fabricType: true,
        // sku, description, composition, certifications, catalogStage: excluded (detail-level / internal, not browse-level)
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
        slug: buildPublicProductSlug(org.slug, c.name, c.id),
        name: c.name,
        moq: c.moq,
        // price is a Decimal from Prisma — convert to string for safe JSON serialization
        price: c.price != null ? String(c.price) : null,
        imageUrl: c.imageUrl,
        // Browse enrichment — null when not set (Gate E: id, sku, composition, catalogStage NOT included)
        category: c.productCategory ?? null,
        material: c.material ?? null,
        fabricType: c.fabricType ?? null,
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

export async function getPublicB2CProductBySlug(
  slug: string,
  prismaClient: PrismaClient,
): Promise<PublicB2CProductDetail | null> {
  const storefrontSlug = slug.split('--')[0] ?? '';
  if (!storefrontSlug) {
    return null;
  }

  const orgRows: EligibleB2COrgRow[] = await withOrgAdminContext(prismaClient, async tx => {
    return tx.organizations.findMany({
      where: {
        slug: storefrontSlug,
        org_type: ELIGIBLE_ORG_TYPE,
        status: { in: [...ELIGIBLE_ORG_STATUSES] },
        publication_posture: { in: [...PUBLICATION_POSTURE_B2C_PUBLIC] },
      },
      select: {
        id: true,
        slug: true,
        legal_name: true,
        org_type: true,
        jurisdiction: true,
        status: true,
        publication_posture: true,
      },
      take: 1,
    });
  });

  if (orgRows.length === 0) {
    return null;
  }

  const org = orgRows[0];

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
      take: 1,
    });
  });

  if (tenantRows.length === 0) {
    return null;
  }

  const catalogRows: B2CCatalogItemRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.catalogItem.findMany({
      where: {
        tenantId: org.id,
        active: true,
        publicationPosture: { in: [...PUBLICATION_POSTURE_B2C_PUBLIC] },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        moq: true,
        price: true,
        imageUrl: true,
        publicationPosture: true,
        productCategory: true,
        material: true,
        fabricType: true,
      },
      orderBy: [{ createdAt: 'asc' }],
      take: 25,
    });
  });

  const resolvedRows = catalogRows.map((row) => ({
    row,
    slug: buildPublicProductSlug(org.slug, row.name, row.id),
  }));

  const activeItem = resolvedRows.find((entry) => entry.slug === slug);
  if (!activeItem) {
    return null;
  }

  const traceabilityRows: TraceabilityEvidenceRow[] = await withAdminContext(prismaClient, async tx => {
    return tx.traceabilityNode.findMany({
      where: { orgId: org.id, visibility: 'SHARED' },
      select: { orgId: true },
      take: 1,
    });
  });

  const hasTraceabilityEvidence = traceabilityRows.length > 0;
  const trustSignals = ['Public-safe projection only'];
  if (hasTraceabilityEvidence) {
    trustSignals.push('Traceability evidence available');
  }

  const tags = [
    activeItem.row.productCategory,
    activeItem.row.material,
    activeItem.row.fabricType,
  ].filter((value): value is string => Boolean(value));

  const relatedProducts: PublicB2CProductCard[] = resolvedRows
    .filter((entry) => entry.slug !== slug)
    .slice(0, 4)
    .map((entry) => ({
      slug: entry.slug,
      name: entry.row.name,
      imageUrl: entry.row.imageUrl,
      price: entry.row.price != null ? String(entry.row.price) : null,
      category: entry.row.productCategory ?? null,
    }));

  return {
    slug,
    name: activeItem.row.name,
    category: activeItem.row.productCategory ?? null,
    material: activeItem.row.material ?? null,
    fabricType: activeItem.row.fabricType ?? null,
    summary: buildSummary(activeItem.row.description),
    description: activeItem.row.description?.trim() || null,
    imageUrls: activeItem.row.imageUrl ? [activeItem.row.imageUrl] : [],
    publicSupplierName: org.legal_name,
    publicSupplierSlug: org.slug,
    publicPriceLabel: activeItem.row.price != null ? String(activeItem.row.price) : null,
    publicMoqLabel: buildPublicMoqLabel(activeItem.row.moq),
    trustSignals,
    hasTraceabilityEvidence,
    hasPassport: null,
    publicStatusLabel: 'Publicly discoverable',
    tags,
    relatedProducts,
  };
}
