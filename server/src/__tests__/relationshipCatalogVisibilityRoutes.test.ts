import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  prismaMock,
  getRelationshipOrNoneMock,
  withOrgAdminContextMock,
  scenario,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
  getRelationshipOrNoneMock: vi.fn(),
  withOrgAdminContextMock: vi.fn(),
  scenario: {
    buyerOrgId: 'buyer-org-uuid-0000-000000000001',
    pdpRows: [] as Array<Record<string, unknown>>,
    listItems: [] as Array<Record<string, unknown>>,
    certRows: [] as Array<Record<string, unknown>>,
    org: {
      legal_name: 'Supplier Mills Ltd',
      publication_posture: 'B2B_PUBLIC',
      price_disclosure_policy_mode: null,
    } as Record<string, unknown> | null,
    tenant: {
      publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
    } as Record<string, unknown> | null,
    relationships: new Map<string, {
      id: string | null;
      supplierOrgId: string;
      buyerOrgId: string;
      state: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
      requestedAt: Date | null;
      approvedAt: Date | null;
      decidedAt: Date | null;
      suspendedAt: Date | null;
      revokedAt: Date | null;
      expiresAt: Date | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }>(),
  },
}));

vi.mock('../db/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../middleware/auth.js', () => ({
  tenantAuthMiddleware: async () => undefined,
}));

vi.mock('../middleware/database-context.middleware.js', () => ({
  databaseContextMiddleware: async (request: any) => {
    request.dbContext = {
      orgId: String(request.headers['x-test-buyer-org-id'] ?? scenario.buyerOrgId),
      actorId: 'actor-1',
      realm: 'tenant',
      requestId: 'req-1',
    };
  },
}));

vi.mock('../lib/database-context.js', () => ({
  canonicalizeTenantPlan: (plan: string) => plan,
  withDbContext: async (_prisma: unknown, _context: unknown, callback: (tx: unknown) => Promise<unknown>) => callback({}),
  withOrgAdminContext: withOrgAdminContextMock,
  getOrganizationIdentity: vi.fn(),
  OrganizationNotFoundError: class OrganizationNotFoundError extends Error {},
}));

vi.mock('../services/relationshipAccessStorage.service.js', async () => {
  const actual = await vi.importActual<typeof import('../services/relationshipAccessStorage.service.js')>(
    '../services/relationshipAccessStorage.service.js',
  );

  return {
    ...actual,
    getRelationshipOrNone: getRelationshipOrNoneMock,
  };
});

vi.mock('../services/pricing/pdpPriceDisclosure.service.js', () => ({
  attachPriceDisclosureToPdpView: (view: Record<string, unknown>) => ({
    ...view,
    priceDisclosure: {
      price_visibility_state: 'PRICE_ON_REQUEST',
      price_display_policy: 'SUPPRESS_VALUE',
      price_value_visible: false,
      price_label: 'Price available on request',
      cta_type: 'REQUEST_QUOTE',
      eligibility_reason: null,
      supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
      rfq_required: true,
    },
  }),
  buildPdpDisclosureMetadata: () => ({
    price_visibility_state: 'PRICE_ON_REQUEST',
  }),
  resolveSupplierDisclosurePolicyForPdp: () => ({ mode: 'SAFE_DEFAULT' }),
  resolveSupplierDisclosurePolicyForB2bPdp: () => null,
}));

vi.mock('../routes/tenant/escalation.g022.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/trades.g017.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/escrow.g018.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/settlement.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/certifications.g019.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/traceability.g016.js', () => ({ default: async () => undefined }));
vi.mock('../routes/tenant/documents.js', () => ({ default: async () => undefined }));

import tenantRoutes from '../routes/tenant.js';

const BUYER_ORG_ID = scenario.buyerOrgId;
const SUPPLIER_ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const ITEM_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function makeRelationshipSnapshot(
  supplierOrgId: string,
  buyerOrgId: string,
  state: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED' = 'NONE',
) {
  return {
    id: state === 'NONE' ? null : `rel-${supplierOrgId}-${buyerOrgId}`,
    supplierOrgId,
    buyerOrgId,
    state,
    requestedAt: null,
    approvedAt: state === 'APPROVED' ? new Date('2026-01-01T00:00:00.000Z') : null,
    decidedAt: null,
    suspendedAt: null,
    revokedAt: null,
    expiresAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

function makePdpRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: ITEM_ID,
    tenant_id: SUPPLIER_ORG_ID,
    name: 'Premium Cotton Twill',
    sku: 'COT-TWL-001',
    description: 'Durable cotton twill suitable for industrial use.',
    moq: 100,
    image_url: null,
    publication_posture: 'B2B_PUBLIC',
    price_disclosure_policy_mode: null,
    product_category: 'FABRIC_WOVEN',
    fabric_type: 'Twill',
    gsm: 200,
    material: 'Cotton',
    composition: '100% Cotton',
    color: 'Natural',
    width_cm: 150,
    construction: '3/1 Twill',
    certifications: [],
    catalog_stage: 'FABRIC_WOVEN',
    ...overrides,
  };
}

function makeListItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item-1',
    name: 'Visible Fabric',
    sku: 'VIS-001',
    description: 'Visible item',
    moq: 25,
    imageUrl: null,
    productCategory: 'FABRIC_WOVEN',
    fabricType: 'Twill',
    gsm: 180,
    material: 'Cotton',
    composition: '100% Cotton',
    color: 'Natural',
    widthCm: 150,
    construction: '3/1 Twill',
    certifications: null,
    catalogStage: 'FABRIC_WOVEN',
    stageAttributes: null,
    ...overrides,
  };
}

describe('relationship catalog visibility route integration', () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeEach(async () => {
    scenario.pdpRows = [];
    scenario.listItems = [];
    scenario.certRows = [];
    scenario.org = {
      legal_name: 'Supplier Mills Ltd',
      publication_posture: 'B2B_PUBLIC',
      price_disclosure_policy_mode: null,
    };
    scenario.tenant = {
      publicEligibilityPosture: 'PUBLICATION_ELIGIBLE',
    };
    scenario.relationships.clear();

    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        $executeRaw: vi.fn(),
        $queryRaw: vi.fn(async () => scenario.pdpRows),
        catalogItem: {
          findMany: vi.fn(async () => scenario.listItems),
        },
      };

      return callback(tx);
    });

    withOrgAdminContextMock.mockImplementation(async (_prisma: unknown, callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        organizations: {
          findUnique: vi.fn(async () => scenario.org),
        },
        tenant: {
          findUnique: vi.fn(async () => scenario.tenant),
        },
        certification: {
          findMany: vi.fn(async () => scenario.certRows),
        },
      };

      return callback(tx);
    });

    getRelationshipOrNoneMock.mockImplementation(async (supplierOrgId: string, buyerOrgId: string) => {
      return (
        scenario.relationships.get(`${supplierOrgId}:${buyerOrgId}`) ??
        makeRelationshipSnapshot(supplierOrgId, buyerOrgId, 'NONE')
      );
    });

    app = Fastify({ logger: false });
    await app.register(tenantRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('returns non-disclosing 404 for denied approved-only PDP access', async () => {
    scenario.pdpRows = [
      makePdpRow({ catalog_visibility_policy: 'APPROVED_BUYER_ONLY' }),
    ];

    const response = await app.inject({
      method: 'GET',
      url: `/api/tenant/catalog/items/${ITEM_ID}`,
      headers: {
        'x-test-buyer-org-id': BUYER_ORG_ID,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Catalog item not found',
      },
    });
    expect(response.body).not.toContain('Premium Cotton Twill');
    expect(response.body).not.toContain(SUPPLIER_ORG_ID);
    expect(response.body).not.toContain('APPROVED_BUYER_ONLY');
  });

  it('preserves allowed PDP response shape for approved relationship access', async () => {
    scenario.pdpRows = [
      makePdpRow({ catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY' }),
    ];
    scenario.relationships.set(
      `${SUPPLIER_ORG_ID}:${BUYER_ORG_ID}`,
      makeRelationshipSnapshot(SUPPLIER_ORG_ID, BUYER_ORG_ID, 'APPROVED'),
    );

    const response = await app.inject({
      method: 'GET',
      url: `/api/tenant/catalog/items/${ITEM_ID}`,
      headers: {
        'x-test-buyer-org-id': BUYER_ORG_ID,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      itemId: ITEM_ID,
      supplierId: SUPPLIER_ORG_ID,
      title: 'Premium Cotton Twill',
    });
    expect(body.data).not.toHaveProperty('relationshipState');
    expect(body.data).not.toHaveProperty('catalogVisibilityPolicy');
  });

  it('filters unauthorized browse items and ignores client buyer override input', async () => {
    scenario.listItems = [
      makeListItem({ id: 'visible-default' }),
      makeListItem({
        id: 'approved-only',
        catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
      }),
      makeListItem({
        id: 'hidden-item',
        visibilityTier: 'HIDDEN',
      }),
    ];

    const response = await app.inject({
      method: 'GET',
      url: `/api/tenant/catalog/supplier/${SUPPLIER_ORG_ID}/items?buyerOrgId=attacker-org`,
      headers: {
        'x-test-buyer-org-id': BUYER_ORG_ID,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(1);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].id).toBe('visible-default');
    expect(response.body).not.toContain('approved-only');
    expect(response.body).not.toContain('hidden-item');
    expect(body.data.items[0]).not.toHaveProperty('catalogVisibilityPolicy');
    expect(body.data.items[0]).not.toHaveProperty('visibilityTier');
    expect(getRelationshipOrNoneMock).toHaveBeenCalledWith(
      SUPPLIER_ORG_ID,
      BUYER_ORG_ID,
    );
  });
});
