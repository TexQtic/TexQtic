/**
 * tenant.rfqPrefillHandoff.test.ts
 *
 * Route unit tests (H-R01..H-R23) for:
 *   POST /api/tenant/catalog/items/:itemId/rfq-prefill
 *
 * Tests the HTTP surface by building a minimal Fastify test server that
 * replicates the route handler logic from tenant.ts, with all external
 * dependencies mocked. No real DB or service calls.
 *
 * TECS-B2B-BUYER-RFQ-INTEGRATION-001 — Slice B
 *
 * Tests:
 *   H-R01 — Authenticated buyer + valid item + body → 200 ok: true with context
 *   H-R02 — Authenticated buyer + valid item + empty body → 200 ok: true
 *   H-R03 — Missing dbContext (unauthenticated) → 401
 *   H-R04 — Invalid UUID itemId → 404
 *   H-R05 — Item not found in DB → 200 ok: false ITEM_NOT_AVAILABLE
 *   H-R06 — Supplier not eligible (null supplierData) → 200 ok: false SUPPLIER_NOT_AVAILABLE
 *   H-R07 — ok: true response shape includes itemId, productName, supplierOrgId, buyerOrgId
 *   H-R08 — Response never contains forbidden price-like keys
 *   H-R09 — buyerOrgId in context matches session orgId (not body)
 *   H-R10 — Client-supplied buyerOrgId in body is silently ignored
 *   H-R11 — Client-supplied supplierOrgId in body is silently ignored
 *   H-R12 — selectedQuantity from body passes through to context
 *   H-R13 — buyerNotes from body passes through to context
 *   H-R14 — selectedQuantity < 1 → 400 validation error
 *   H-R15 — buyerNotes over 2000 chars → 400 validation error
 *   H-R16 — buildCatalogRfqPrefillContext is called (not inline logic)
 *   H-R17 — No RFQ records are created (rfq-create service not called)
 *   H-R18 — Disclosure PRICE_ON_REQUEST → ok: true context priceVisible: false
 *   H-R19 — ok: false response shape has exactly { ok, reason }
 *   H-R20 — DB column names (tenant_id, publication_posture) absent from response
 *   H-R21 — Item certifications propagated as complianceRefs
 *   H-R22 — Item with no certifications → complianceRefs empty
 *   H-R23 — supplierIsPublished false → SUPPLIER_NOT_AVAILABLE via builder
 *
 * Run:
 *   pnpm --filter server exec vitest run src/routes/tenant.rfqPrefillHandoff.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z } from 'zod';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_ORG_ID      = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const TEST_SUPPLIER_ID = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const TEST_ITEM_ID     = 'cccccccc-0000-4000-8000-cccccccccccc';
const TEST_USER_ID     = 'dddddddd-0000-4000-8000-dddddddddddd';

type MockItemRow = {
  id: string;
  tenant_id: string;
  name: string;
  active: boolean;
  publication_posture: string;
  price_disclosure_policy_mode: string | null;
  product_category: string | null;
  material: string | null;
  description: string | null;
  moq: number;
  certifications: Array<{ standard: string }> | null;
};

const MOCK_DISCLOSURE: PriceDisclosureMetadata = {
  price_visibility_state: 'PRICE_ON_REQUEST' as const,
  price_display_policy: 'SUPPRESS_VALUE' as const,
  price_value_visible: false,
  price_label: 'Price available on request',
  cta_type: 'REQUEST_QUOTE' as const,
  eligibility_reason: null,
  supplier_policy_source: 'SYSTEM_SAFE_DEFAULT' as const,
  rfq_required: true,
};

const MOCK_ITEM_ROW: MockItemRow = {
  id: TEST_ITEM_ID,
  tenant_id: TEST_SUPPLIER_ID,
  name: 'Cotton Twill Fabric',
  active: true,
  publication_posture: 'B2B_PUBLIC',
  price_disclosure_policy_mode: null,
  product_category: 'FABRIC_WOVEN',
  material: 'Cotton',
  description: '3/1 twill construction, 180 GSM',
  moq: 100,
  certifications: [{ standard: 'GOTS' }, { standard: 'OEKO-TEX' }],
};

const MOCK_SUPPLIER_DATA = {
  isPublished: true,
  isActive: true,
  priceDisclosurePolicyMode: null,
  publicationPosture: 'B2B_PUBLIC',
};

const MOCK_PREFILL_CONTEXT: CatalogRfqPrefillContext = {
  itemId: TEST_ITEM_ID,
  productName: 'Cotton Twill Fabric',
  supplierOrgId: TEST_SUPPLIER_ID,
  buyerOrgId: TEST_ORG_ID,
  category: 'FABRIC_WOVEN',
  material: 'Cotton',
  specSummary: '3/1 twill construction, 180 GSM',
  moq: 100,
  leadTimeDays: null,
  selectedQuantity: null,
  buyerNotes: null,
  complianceRefs: ['GOTS', 'OEKO-TEX'],
  publishedDppRef: null,
  priceVisible: false,
  priceVisibilityState: 'PRICE_ON_REQUEST',
  rfqEntryReason: 'PRICE_ON_REQUEST',
};

// ── Mock module factories ─────────────────────────────────────────────────────

const { _prisma, _withOrgAdminContext, _resolveSupplierPolicy, _buildDisclosure, _buildRfqPrefill } =
  vi.hoisted(() => {
    const mockTransaction = vi.fn();
    const _prisma = { $transaction: mockTransaction };
    const _withOrgAdminContext = vi.fn();
    const _resolveSupplierPolicy = vi.fn();
    const _buildDisclosure = vi.fn();
    const _buildRfqPrefill = vi.fn();
    return { _prisma, _withOrgAdminContext, _resolveSupplierPolicy, _buildDisclosure, _buildRfqPrefill };
  });

vi.mock('../db/prisma.js', () => ({ prisma: _prisma }));

vi.mock('../lib/database-context.js', () => ({
  withOrgAdminContext: _withOrgAdminContext,
  withDbContext: vi.fn(async (_p: unknown, _c: unknown, cb: (tx: unknown) => Promise<unknown>) => cb({})),
}));

vi.mock('../services/pricing/pdpPriceDisclosure.service.js', () => ({
  resolveSupplierDisclosurePolicyForPdp: _resolveSupplierPolicy,
  buildPdpDisclosureMetadata: _buildDisclosure,
  attachPriceDisclosureToPdpView: vi.fn(),
}));

vi.mock('../services/pricing/rfqPrefillContext.service.js', () => ({
  buildCatalogRfqPrefillContext: _buildRfqPrefill,
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { prisma } from '../db/prisma.js';
import { withOrgAdminContext } from '../lib/database-context.js';
import {
  resolveSupplierDisclosurePolicyForPdp,
  buildPdpDisclosureMetadata,
} from '../services/pricing/pdpPriceDisclosure.service.js';
import { buildCatalogRfqPrefillContext } from '../services/pricing/rfqPrefillContext.service.js';
import type {
  CatalogRfqPrefillContext,
  PriceDisclosureMetadata,
  RfqPrefillFailureReason,
} from '../types/index.js';

const mockPrismaTransaction   = vi.mocked(prisma.$transaction);
const mockWithOrgAdminContext  = vi.mocked(withOrgAdminContext);
const mockResolvePolicy        = vi.mocked(resolveSupplierDisclosurePolicyForPdp);
const mockBuildDisclosure      = vi.mocked(buildPdpDisclosureMetadata);
const mockBuildRfqPrefill      = vi.mocked(buildCatalogRfqPrefillContext);

// ── Helpers ───────────────────────────────────────────────────────────────────

type TestReqExtras = {
  userId?: string;
  dbContext?: { orgId: string };
};

function localSendError(
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return reply.status(status).send({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function localSendSuccess(reply: FastifyReply, data: unknown) {
  return reply.status(200).send({ success: true, data });
}

function localSendNotFound(reply: FastifyReply, message: string) {
  return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message } });
}

function localSendUnauthorized(reply: FastifyReply, message: string) {
  return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message } });
}

// ── Minimal test server factory ───────────────────────────────────────────────
//
// Replicates the POST /tenant/catalog/items/:itemId/rfq-prefill handler from
// tenant.ts, using mocked dependencies. Allows HTTP-surface testing without
// loading the full tenant plugin.

async function buildTestApp(authenticated = true): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  // Simulate tenantAuthMiddleware + databaseContextMiddleware
  fastify.addHook('onRequest', async (req) => {
    if (authenticated) {
      (req as unknown as TestReqExtras).userId = TEST_USER_ID;
      (req as unknown as TestReqExtras).dbContext = { orgId: TEST_ORG_ID };
    }
  });

  // Route: POST /tenant/catalog/items/:itemId/rfq-prefill
  fastify.post<{
    Params: { itemId: string };
    Body: Record<string, unknown>;
  }>('/tenant/catalog/items/:itemId/rfq-prefill', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    const dbContext = req.dbContext;

    if (!dbContext) {
      return localSendUnauthorized(reply, 'Missing database context');
    }

    const paramsSchema = z.object({ itemId: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return localSendNotFound(reply, 'Catalog item not found');
    }

    const bodySchema = z.object({
      selectedQuantity: z.number().int().min(1).max(999999).optional().nullable(),
      buyerNotes: z.string().max(2000).optional().nullable(),
    });
    const bodyResult = bodySchema.safeParse(request.body ?? {});
    if (!bodyResult.success) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, bodyResult.error.errors);
    }

    const { selectedQuantity, buyerNotes } = bodyResult.data;

    // buyerOrgId is ALWAYS from dbContext — never from request body.
    const buyerOrgId = dbContext.orgId;

    // Inline row type for cross-tenant read result.
    type RfqPrefillItemRow = {
      id: string; tenant_id: string; name: string; active: boolean;
      publication_posture: string; price_disclosure_policy_mode: string | null;
      product_category: string | null; material: string | null;
      description: string | null; moq: unknown; certifications: unknown;
    };

    // Step 1: Cross-tenant item read — prisma is mocked; callback is irrelevant in tests.
    let itemRows: RfqPrefillItemRow[];
    try {
      itemRows = await prisma.$transaction(async (_tx) => {
        return [] as RfqPrefillItemRow[];
      });
    } catch {
      return localSendError(reply, 'INTERNAL_ERROR', 'Failed to resolve catalog item', 500);
    }

    if (itemRows.length === 0) {
      return localSendSuccess(reply, { ok: false, reason: 'ITEM_NOT_AVAILABLE' });
    }

    const item = itemRows[0];
    const supplierTenantId = item.tenant_id;

    // Step 2: Supplier org eligibility — withOrgAdminContext is mocked; callback irrelevant in tests.
    type SupplierEligibilityData = {
      isPublished: boolean; isActive: boolean;
      priceDisclosurePolicyMode: string | null; publicationPosture: string;
    } | null;

    let supplierData: SupplierEligibilityData;
    try {
      supplierData = await withOrgAdminContext(prisma, async () => {
        return null as SupplierEligibilityData;
      });
    } catch {
      return localSendError(reply, 'INTERNAL_ERROR', 'Failed to resolve supplier context', 500);
    }

    // Step 3: Compliance refs
    const rawCertStandards = Array.isArray(item.certifications)
      ? (item.certifications as Array<{ standard: string }>)
          .filter(c => typeof c?.standard === 'string')
          .map(c => c.standard)
      : [];

    // Steps 4 & 5: Price disclosure + Slice A builder — all mocked at runtime.
    const supplierPolicy = resolveSupplierDisclosurePolicyForPdp({
      buyerOrgId,
      supplierOrgId: supplierTenantId,
      productPolicyMode: item.price_disclosure_policy_mode,
      supplierPolicyMode: supplierData?.priceDisclosurePolicyMode ?? null,
      productPublicationPosture: item.publication_posture,
      supplierPublicationPosture: supplierData?.publicationPosture ?? null,
    });

    const priceDisclosure = buildPdpDisclosureMetadata({
      buyer: {
        isAuthenticated: true,
        isEligible: false,
        buyerOrgId,
        supplierOrgId: supplierTenantId,
      },
      supplierPolicy,
    });

    const result = buildCatalogRfqPrefillContext({
      buyerOrgId,
      authenticatedBuyerOrgId: buyerOrgId,
      isAuthenticated: true,
      item: {
        itemId: item.id,
        productName: item.name,
        supplierOrgId: supplierTenantId,
        supplierIsPublished: supplierData?.isPublished ?? false,
        supplierIsActive: supplierData?.isActive ?? false,
        isPublished: item.publication_posture === 'B2B_PUBLIC' || item.publication_posture === 'BOTH',
        isActive: item.active,
        category: item.product_category,
        material: item.material,
        specSummary: item.description,
        moq: item.moq != null ? Number(item.moq) : null,
        leadTimeDays: null,
        complianceRefs: rawCertStandards,
        publishedDppRef: null,
        isPublishedDppRefSafe: false,
      },
      priceDisclosure,
      draftInput: {
        selectedQuantity: selectedQuantity ?? null,
        buyerNotes: buyerNotes ?? null,
      },
    });

    return localSendSuccess(reply, result);
  });

  await fastify.ready();
  return fastify;
}

// ── Shared mock setup helpers ─────────────────────────────────────────────────

function setupItemFound(row: MockItemRow = MOCK_ITEM_ROW) {
  mockPrismaTransaction.mockResolvedValueOnce([row]);
}

function setupItemNotFound() {
  mockPrismaTransaction.mockResolvedValueOnce([]);
}

function setupSupplierFound(data = MOCK_SUPPLIER_DATA) {
  mockWithOrgAdminContext.mockResolvedValueOnce(data);
}

function setupSupplierNotFound() {
  mockWithOrgAdminContext.mockResolvedValueOnce(null);
}

function setupDisclosure(disclosure: PriceDisclosureMetadata = MOCK_DISCLOSURE) {
  mockResolvePolicy.mockReturnValueOnce(null);
  mockBuildDisclosure.mockReturnValueOnce(disclosure);
}

function setupBuilderOk(context: CatalogRfqPrefillContext = MOCK_PREFILL_CONTEXT) {
  mockBuildRfqPrefill.mockReturnValueOnce({ ok: true, data: context });
}

function setupBuilderFail(reason: RfqPrefillFailureReason) {
  mockBuildRfqPrefill.mockReturnValueOnce({ ok: false, reason });
}

// Sets up a full happy-path mock chain
function setupHappyPath(overrides?: { context?: typeof MOCK_PREFILL_CONTEXT }) {
  setupItemFound();
  setupSupplierFound();
  setupDisclosure();
  setupBuilderOk(overrides?.context ?? MOCK_PREFILL_CONTEXT);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /tenant/catalog/items/:itemId/rfq-prefill', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
    vi.clearAllMocks();
  });

  // H-R01 — Happy path: authenticated buyer + valid item + body → 200 ok: true

  it('H-R01: returns 200 ok: true with context for authenticated buyer and valid item', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { selectedQuantity: 250, buyerNotes: 'Need by Q2' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { ok: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.ok).toBe(true);
  });

  // H-R02 — Empty body still succeeds

  it('H-R02: returns 200 ok: true with no draft body fields', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { ok: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.ok).toBe(true);
  });

  // H-R03 — Missing dbContext → 401

  it('H-R03: returns 401 when dbContext is missing (unauthenticated)', async () => {
    app = await buildTestApp(false);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as { success: boolean };
    expect(body.success).toBe(false);
  });

  // H-R04 — Invalid UUID itemId → 404

  it('H-R04: returns 404 for non-UUID itemId', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/catalog/items/not-a-uuid/rfq-prefill',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(404);
  });

  // H-R05 — Item not in DB → ITEM_NOT_AVAILABLE

  it('H-R05: returns ok: false ITEM_NOT_AVAILABLE when item not found', async () => {
    setupItemNotFound();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { ok: boolean; reason: string } };
    expect(body.success).toBe(true);
    expect(body.data.ok).toBe(false);
    expect(body.data.reason).toBe('ITEM_NOT_AVAILABLE');
  });

  // H-R06 — Supplier not eligible → builder returns SUPPLIER_NOT_AVAILABLE

  it('H-R06: returns ok: false SUPPLIER_NOT_AVAILABLE when supplier is not eligible', async () => {
    setupItemFound();
    setupSupplierNotFound();
    setupDisclosure();
    setupBuilderFail('SUPPLIER_NOT_AVAILABLE');
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: { ok: boolean; reason: string } };
    expect(body.success).toBe(true);
    expect(body.data.ok).toBe(false);
    expect(body.data.reason).toBe('SUPPLIER_NOT_AVAILABLE');
  });

  // H-R07 — ok: true response shape includes required context fields

  it('H-R07: ok: true response includes itemId, productName, supplierOrgId, buyerOrgId', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { ok: boolean; data: { itemId: string; productName: string; supplierOrgId: string; buyerOrgId: string } };
    };
    expect(body.data.ok).toBe(true);
    expect(body.data.data.itemId).toBe(TEST_ITEM_ID);
    expect(body.data.data.productName).toBe('Cotton Twill Fabric');
    expect(body.data.data.supplierOrgId).toBe(TEST_SUPPLIER_ID);
    expect(body.data.data.buyerOrgId).toBe(TEST_ORG_ID);
  });

  // H-R08 — Response never contains forbidden price-like keys

  it('H-R08: serialized response contains no forbidden price-like keys', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    const FORBIDDEN_KEYS = [
      'price',
      'amount',
      'unitPrice',
      'basePrice',
      'listPrice',
      'costPrice',
      'supplierPrice',
      'negotiatedPrice',
      'internalMargin',
      'margin',
      'commercialTerms',
      'price_disclosure_policy_mode',
      'supplierPolicy',
      'policyId',
      'policyAudit',
      'approvedBy',
      'risk_score',
      'publicationPosture',
      'buyerScore',
      'supplierScore',
      'ranking',
    ] as const;

    for (const key of FORBIDDEN_KEYS) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(res.body).not.toMatch(new RegExp(`"${escaped}"\\s*:`, 'i'));
    }
  });

  // H-R09 — buyerOrgId in context matches session orgId

  it('H-R09: buyerOrgId in context matches authenticated session orgId', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    // Verify the builder was called with the session orgId, not any client-supplied value
    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerOrgId: TEST_ORG_ID,
        authenticatedBuyerOrgId: TEST_ORG_ID,
      }),
    );
  });

  // H-R10 — Client-supplied buyerOrgId in body is silently ignored

  it('H-R10: client-supplied buyerOrgId in body is ignored; session orgId is used', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const ROGUE_ORG_ID = 'eeeeeeee-0000-4000-8000-eeeeeeeeeeee';
    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { buyerOrgId: ROGUE_ORG_ID },
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({ buyerOrgId: TEST_ORG_ID }),
    );
    // The rogue org id must not appear in the builder call
    const call = mockBuildRfqPrefill.mock.calls[0];
    const serialized = JSON.stringify(call?.[0]);
    expect(serialized).not.toContain(ROGUE_ORG_ID);
  });

  // H-R11 — Client-supplied supplierOrgId in body is silently ignored

  it('H-R11: client-supplied supplierOrgId in body is ignored; DB-derived supplierOrgId is used', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const ROGUE_SUPPLIER_ID = 'ffffffff-0000-4000-8000-ffffffffffff';
    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { supplierOrgId: ROGUE_SUPPLIER_ID },
    });

    const call = mockBuildRfqPrefill.mock.calls[0];
    expect((call?.[0] as { item: { supplierOrgId: string } } | undefined)?.item.supplierOrgId).toBe(TEST_SUPPLIER_ID);
  });

  // H-R12 — selectedQuantity from body passes through to builder draftInput

  it('H-R12: selectedQuantity from body is passed to buildCatalogRfqPrefillContext draftInput', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { selectedQuantity: 500 },
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        draftInput: expect.objectContaining({ selectedQuantity: 500 }),
      }),
    );
  });

  // H-R13 — buyerNotes from body passes through to builder draftInput

  it('H-R13: buyerNotes from body is passed to buildCatalogRfqPrefillContext draftInput', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { buyerNotes: 'Please include material swatches' },
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        draftInput: expect.objectContaining({ buyerNotes: 'Please include material swatches' }),
      }),
    );
  });

  // H-R14 — selectedQuantity < 1 → 400 validation error

  it('H-R14: selectedQuantity < 1 returns 400 validation error', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { selectedQuantity: 0 },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { success: boolean };
    expect(body.success).toBe(false);
  });

  // H-R15 — buyerNotes over 2000 chars → 400 validation error

  it('H-R15: buyerNotes over 2000 chars returns 400 validation error', async () => {
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: { buyerNotes: 'x'.repeat(2001) },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as { success: boolean };
    expect(body.success).toBe(false);
  });

  // H-R16 — buildCatalogRfqPrefillContext is called (not inline logic)

  it('H-R16: buildCatalogRfqPrefillContext is invoked on every successful request', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledTimes(1);
  });

  // H-R17 — No RFQ records created (rfq-create service not called)

  it('H-R17: no RFQ mutation service is invoked during prefill', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    // Verify the builder is called (read-only path) but no create/mutation mock is invoked
    expect(mockBuildRfqPrefill).toHaveBeenCalledTimes(1);
    // The $transaction is called once (item read) — no second write transaction
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
  });

  // H-R18 — PRICE_ON_REQUEST disclosure → ok: true with priceVisible: false

  it('H-R18: PRICE_ON_REQUEST disclosure state produces priceVisible: false in context', async () => {
    const ctxWithPriceOff: CatalogRfqPrefillContext = {
      ...MOCK_PREFILL_CONTEXT,
      priceVisible: false,
      priceVisibilityState: 'PRICE_ON_REQUEST',
    };
    setupHappyPath({ context: ctxWithPriceOff });
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    const body = JSON.parse(res.body) as { data: { ok: boolean; data: { priceVisible: boolean; priceVisibilityState: string } } };
    expect(body.data.ok).toBe(true);
    expect(body.data.data.priceVisible).toBe(false);
    expect(body.data.data.priceVisibilityState).toBe('PRICE_ON_REQUEST');
  });

  // H-R19 — ok: false response shape

  it('H-R19: ok: false response contains exactly ok and reason fields (no context data)', async () => {
    setupItemNotFound();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    const body = JSON.parse(res.body) as { success: boolean; data: Record<string, unknown> };
    expect(body.success).toBe(true);
    expect(body.data.ok).toBe(false);
    expect(typeof body.data.reason).toBe('string');
    // No context data present in failure path
    expect(body.data.data).toBeUndefined();
    expect(body.data.itemId).toBeUndefined();
    expect(body.data.productName).toBeUndefined();
  });

  // H-R20 — Raw DB column names absent from response

  it('H-R20: raw DB column names (tenant_id, publication_posture) are absent from response', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    const RAW_DB_COLUMNS = [
      '"tenant_id"',
      '"publication_posture"',
      '"price_disclosure_policy_mode"',
      '"product_category"',
      '"active"',
    ];
    for (const col of RAW_DB_COLUMNS) {
      expect(res.body).not.toContain(col);
    }
  });

  // H-R21 — Item certifications propagated as complianceRefs

  it('H-R21: item certifications are extracted and passed as complianceRefs to the builder', async () => {
    const itemWithCerts = { ...MOCK_ITEM_ROW, certifications: [{ standard: 'GOTS' }, { standard: 'OEKO-TEX' }] };
    setupItemFound(itemWithCerts);
    setupSupplierFound();
    setupDisclosure();
    setupBuilderOk();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          complianceRefs: ['GOTS', 'OEKO-TEX'],
        }),
      }),
    );
  });

  // H-R22 — Item with no certifications → complianceRefs empty

  it('H-R22: item with null certifications passes empty complianceRefs to builder', async () => {
    const itemNoCerts = { ...MOCK_ITEM_ROW, certifications: null };
    setupItemFound(itemNoCerts);
    setupSupplierFound();
    setupDisclosure();
    setupBuilderOk();
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          complianceRefs: [],
        }),
      }),
    );
  });

  // H-R23 — supplierIsPublished false → builder receives correct flags

  it('H-R23: ineligible supplier (not published) causes supplierIsPublished: false passed to builder', async () => {
    const ineligibleSupplier = { ...MOCK_SUPPLIER_DATA, isPublished: false };
    setupItemFound();
    setupSupplierFound(ineligibleSupplier);
    setupDisclosure();
    setupBuilderFail('SUPPLIER_NOT_AVAILABLE');
    app = await buildTestApp(true);

    await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(mockBuildRfqPrefill).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          supplierIsPublished: false,
        }),
      }),
    );
  });

  it('E-R01: cross-tenant denial path does not leak product or supplier internals', async () => {
    setupItemNotFound();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('Cotton Twill Fabric');
    expect(res.body).not.toContain(TEST_SUPPLIER_ID);

    for (const forbidden of [
      'price_disclosure_policy_mode',
      'supplierPolicy',
      'policyId',
      'policyAudit',
      'commercialTerms',
      'supplierEmail',
      'supplierPhone',
      'publicationPosture',
      'unpublishedEvidence',
      'aiExtractionDraft',
      'ranking',
      'risk_score',
    ]) {
      expect(res.body).not.toContain(forbidden);
    }
  });

  it('E-R02: client buyerOrgId override is ignored and session org remains authoritative', async () => {
    setupHappyPath();
    app = await buildTestApp(true);

    const res = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {
        buyerOrgId: 'eeeeeeee-0000-4000-8000-eeeeeeeeeeee',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { ok: boolean; data: { buyerOrgId: string } } };
    expect(body.data.ok).toBe(true);
    expect(body.data.data.buyerOrgId).toBe(TEST_ORG_ID);
  });

  it('E-R03: repeated prefill calls remain read-only and do not auto-create RFQs', async () => {
    setupHappyPath();
    setupHappyPath();
    app = await buildTestApp(true);

    const first = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    const second = await app.inject({
      method: 'POST',
      url: `/tenant/catalog/items/${TEST_ITEM_ID}/rfq-prefill`,
      headers: { 'content-type': 'application/json' },
      payload: {},
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(2);
    expect(first.body).not.toContain('draft_id');
    expect(second.body).not.toContain('draft_id');
  });
});
