import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z } from 'zod';

const TEST_ORG_ID = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const OTHER_ORG_ID = 'eeeeeeee-0000-4000-8000-eeeeeeeeeeee';
const TEST_SUPPLIER_ID = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const TEST_ITEM_ID = 'cccccccc-0000-4000-8000-cccccccccccc';
const TEST_DRAFT_ID = 'dddddddd-0000-4000-8000-dddddddddddd';
const TEST_USER_ID = 'ffffffff-0000-4000-8000-ffffffffffff';

type DraftStatus = 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';

type DraftRecord = {
  id: string;
  orgId: string;
  supplierOrgId: string;
  catalogItemId: string;
  quantity: number;
  buyerMessage: string | null;
  status: DraftStatus;
  createdAt: Date;
  updatedAt: Date;
};

type TxLike = {
  rfq: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  rfqSupplierResponse: {
    create: ReturnType<typeof vi.fn>;
  };
  trade: {
    create: ReturnType<typeof vi.fn>;
  };
};

const {
  _prisma,
  _withDbContext,
  _withOrgAdminContext,
  _resolveSupplierPolicy,
  _buildDisclosure,
  _buildRfqPrefill,
  _writeAuditLog,
} = vi.hoisted(() => {
  const _prisma = { $transaction: vi.fn() };
  const _withDbContext = vi.fn();
  const _withOrgAdminContext = vi.fn();
  const _resolveSupplierPolicy = vi.fn();
  const _buildDisclosure = vi.fn();
  const _buildRfqPrefill = vi.fn();
  const _writeAuditLog = vi.fn();
  return {
    _prisma,
    _withDbContext,
    _withOrgAdminContext,
    _resolveSupplierPolicy,
    _buildDisclosure,
    _buildRfqPrefill,
    _writeAuditLog,
  };
});

vi.mock('../db/prisma.js', () => ({ prisma: _prisma }));
vi.mock('../lib/database-context.js', () => ({
  withDbContext: _withDbContext,
  withOrgAdminContext: _withOrgAdminContext,
}));
vi.mock('../services/pricing/pdpPriceDisclosure.service.js', () => ({
  resolveSupplierDisclosurePolicyForPdp: _resolveSupplierPolicy,
  buildPdpDisclosureMetadata: _buildDisclosure,
}));
vi.mock('../services/pricing/rfqPrefillContext.service.js', () => ({
  buildCatalogRfqPrefillContext: _buildRfqPrefill,
}));
vi.mock('../lib/auditLog.js', () => ({ writeAuditLog: _writeAuditLog }));

import { prisma } from '../db/prisma.js';
import { withDbContext, withOrgAdminContext } from '../lib/database-context.js';
import {
  resolveSupplierDisclosurePolicyForPdp,
  buildPdpDisclosureMetadata,
} from '../services/pricing/pdpPriceDisclosure.service.js';
import { buildCatalogRfqPrefillContext } from '../services/pricing/rfqPrefillContext.service.js';
import { writeAuditLog } from '../lib/auditLog.js';

const mockPrismaTransaction = vi.mocked(prisma.$transaction);
const mockWithDbContext = vi.mocked(withDbContext);
const mockWithOrgAdminContext = vi.mocked(withOrgAdminContext);
const mockResolvePolicy = vi.mocked(resolveSupplierDisclosurePolicyForPdp);
const mockBuildDisclosure = vi.mocked(buildPdpDisclosureMetadata);
const mockBuildPrefill = vi.mocked(buildCatalogRfqPrefillContext);
const mockWriteAuditLog = vi.mocked(writeAuditLog);
const notifySupplierBoundary = vi.fn();

type TestReqExtras = {
  userId?: string;
  dbContext?: { orgId: string };
};

function localSendError(reply: FastifyReply, code: string, message: string, status: number, details?: unknown) {
  return reply.status(status).send({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function localSendSuccess(reply: FastifyReply, data: unknown, status = 200) {
  return reply.status(status).send({ success: true, data });
}

function localSendNotFound(reply: FastifyReply, message: string) {
  return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message } });
}

async function resolveDraftContext(input: {
  buyerOrgId: string;
  catalogItemId: string;
  selectedQuantity?: number | null;
  buyerNotes?: string | null;
}) {
  const rows = await prisma.$transaction(async () => [] as Array<{
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
  }>);

  if (rows.length === 0) {
    return { ok: false as const, reason: 'ITEM_NOT_AVAILABLE' as const };
  }

  const item = rows[0];
  const supplierData = await withOrgAdminContext({} as never, async () => {
    return null as {
      isPublished: boolean;
      isActive: boolean;
      priceDisclosurePolicyMode: string | null;
      publicationPosture: string;
    } | null;
  });

  const supplierPolicy = resolveSupplierDisclosurePolicyForPdp({
    buyerOrgId: input.buyerOrgId,
    supplierOrgId: item.tenant_id,
    productPolicyMode: item.price_disclosure_policy_mode,
    supplierPolicyMode: supplierData?.priceDisclosurePolicyMode ?? null,
    productPublicationPosture: item.publication_posture,
    supplierPublicationPosture: supplierData?.publicationPosture ?? null,
  });

  const priceDisclosure = buildPdpDisclosureMetadata({
    buyer: {
      isAuthenticated: true,
      isEligible: false,
      buyerOrgId: input.buyerOrgId,
      supplierOrgId: item.tenant_id,
    },
    supplierPolicy,
  });

  const result = buildCatalogRfqPrefillContext({
    buyerOrgId: input.buyerOrgId,
    authenticatedBuyerOrgId: input.buyerOrgId,
    isAuthenticated: true,
    item: {
      itemId: item.id,
      productName: item.name,
      supplierOrgId: item.tenant_id,
      supplierIsPublished: supplierData?.isPublished ?? false,
      supplierIsActive: supplierData?.isActive ?? false,
      isPublished: item.publication_posture === 'B2B_PUBLIC' || item.publication_posture === 'BOTH',
      isActive: item.active,
      category: item.product_category,
      material: item.material,
      specSummary: item.description,
      moq: item.moq,
      leadTimeDays: null,
      complianceRefs: item.certifications?.map(c => c.standard) ?? [],
      publishedDppRef: null,
      isPublishedDppRefSafe: false,
    },
    priceDisclosure,
    draftInput: {
      selectedQuantity: input.selectedQuantity ?? null,
      buyerNotes: input.buyerNotes ?? null,
    },
  });

  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }

  return {
    ok: true as const,
    context: result.data,
    supplierOrgId: item.tenant_id,
    catalogItemId: item.id,
  };
}

async function buildTestApp(authenticated = true, orgId = TEST_ORG_ID): Promise<FastifyInstance> {
  const fastify = Fastify({ logger: false });

  fastify.addHook('onRequest', async req => {
    if (authenticated) {
      (req as unknown as TestReqExtras).userId = TEST_USER_ID;
      (req as unknown as TestReqExtras).dbContext = { orgId };
    }
  });

  fastify.post('/tenant/rfqs/drafts/from-catalog-item', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    if (!req.dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }
    const buyerOrgId = req.dbContext.orgId;

    const bodySchema = z.object({
      catalogItemId: z.string().uuid(),
      selectedQuantity: z.number().int().min(1).max(999999).optional().nullable(),
      buyerNotes: z.string().trim().max(2000).optional().nullable(),
      specNotes: z.string().trim().max(2000).optional().nullable(),
    }).strict();

    const bodyResult = bodySchema.safeParse(request.body ?? {});
    if (!bodyResult.success) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, bodyResult.error.errors);
    }

    const prefill = await resolveDraftContext({
      buyerOrgId: req.dbContext.orgId,
      catalogItemId: bodyResult.data.catalogItemId,
      selectedQuantity: bodyResult.data.selectedQuantity ?? null,
      buyerNotes: bodyResult.data.buyerNotes ?? null,
    });

    if (!prefill.ok) {
      return localSendSuccess(reply, { ok: false, reason: prefill.reason });
    }

    if (prefill.context.priceVisibilityState === 'LOGIN_REQUIRED') {
      return localSendSuccess(reply, { ok: false, reason: 'AUTH_REQUIRED' });
    }
    if (prefill.context.priceVisibilityState === 'HIDDEN') {
      return localSendSuccess(reply, { ok: false, reason: 'RFQ_PREFILL_NOT_AVAILABLE' });
    }

    const result = await withDbContext({} as never, req.dbContext as never, async (tx: TxLike) => {
      const saved: DraftRecord = await tx.rfq.create({
        data: {
          orgId: buyerOrgId,
          supplierOrgId: prefill.supplierOrgId,
          catalogItemId: prefill.catalogItemId,
          quantity: prefill.context.selectedQuantity ?? bodyResult.data.selectedQuantity ?? 1,
          buyerMessage: prefill.context.buyerNotes ?? null,
          status: 'INITIATED',
          createdByUserId: req.userId ?? null,
          stageRequirementAttributes: bodyResult.data.specNotes ? { specNotes: bodyResult.data.specNotes } : null,
        },
      });

      await writeAuditLog(tx, {
        action: 'rfq.RFQ_DRAFT_CREATED',
        entityId: saved.id,
      } as never);

      return {
        draft: {
          id: saved.id,
          buyer_org_id: saved.orgId,
          supplier_org_id: saved.supplierOrgId,
          catalog_item_id: saved.catalogItemId,
          status: saved.status,
          quantity: saved.quantity,
          buyer_notes: saved.buyerMessage,
          item_summary: {
            item_id: prefill.context.itemId,
            product_name: prefill.context.productName,
            price_visibility_state: prefill.context.priceVisibilityState,
          },
        },
      };
    });

    return localSendSuccess(reply, result, 201);
  });

  fastify.post('/tenant/rfqs/drafts/:id/submit', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    if (!req.dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }
    const buyerOrgId = req.dbContext.orgId;

    const paramsSchema = z.object({ id: z.string().uuid() });
    const paramsResult = paramsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, paramsResult.error.errors);
    }

    const draft = await withDbContext({} as never, req.dbContext as never, async (tx: TxLike) => {
      return tx.rfq.findFirst({ where: { id: paramsResult.data.id, orgId: buyerOrgId } });
    });

    if (!draft) {
      return localSendNotFound(reply, 'RFQ draft not found');
    }

    if (draft.status === 'OPEN') {
      return localSendSuccess(reply, {
        rfq: { id: draft.id, status: draft.status },
        idempotent: true,
        submit_boundary: { supplier_visible: true, notified: false, quote_generated: false },
      });
    }

    if (draft.status !== 'INITIATED') {
      return localSendError(reply, 'INVALID_STATUS', 'Only draft RFQs can be submitted', 409);
    }

    const prefill = await resolveDraftContext({
      buyerOrgId,
      catalogItemId: draft.catalogItemId,
      selectedQuantity: draft.quantity,
      buyerNotes: draft.buyerMessage,
    });

    if (!prefill.ok) {
      return localSendSuccess(reply, { ok: false, reason: prefill.reason });
    }

    if (prefill.context.priceVisibilityState === 'ELIGIBILITY_REQUIRED') {
      return localSendSuccess(reply, { ok: false, reason: 'ELIGIBILITY_REQUIRED' });
    }

    if (prefill.context.priceVisibilityState === 'HIDDEN') {
      return localSendSuccess(reply, { ok: false, reason: 'RFQ_PREFILL_NOT_AVAILABLE' });
    }

    const result = await withDbContext({} as never, req.dbContext as never, async (tx: TxLike) => {
      const saved = await tx.rfq.update({ where: { id: draft.id }, data: { status: 'OPEN' } });
      await writeAuditLog(tx, { action: 'rfq.RFQ_SUBMITTED', entityId: saved.id } as never);

      return {
        rfq: {
          id: saved.id,
          status: saved.status,
          supplier_org_id: saved.supplierOrgId,
          catalog_item_id: saved.catalogItemId,
          price_visibility_state: prefill.context.priceVisibilityState,
        },
        idempotent: false,
        submit_boundary: { supplier_visible: true, notified: true, quote_generated: false },
      };
    });

    notifySupplierBoundary({
      trigger: 'EXPLICIT_SUBMIT_ONLY',
      supplier_org_id: result.rfq.supplier_org_id,
      buyer_org_id: buyerOrgId,
      rfq_ids: [result.rfq.id],
      line_items: [
        {
          rfq_id: result.rfq.id,
          catalog_item_id: result.rfq.catalog_item_id,
          item_id: prefill.context.itemId,
          product_name: prefill.context.productName,
          quantity: draft.quantity,
          price_visibility_state: prefill.context.priceVisibilityState,
          rfq_entry_reason: prefill.context.rfqEntryReason ?? null,
        },
      ],
    });

    return localSendSuccess(reply, result);
  });

  await fastify.ready();
  return fastify;
}

function setupPrefillSuccess(priceVisibilityState: 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | 'LOGIN_REQUIRED' | 'ELIGIBILITY_REQUIRED' | 'HIDDEN' = 'RFQ_ONLY') {
  let rfqEntryReason: 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | null = null;
  if (priceVisibilityState === 'RFQ_ONLY') {
    rfqEntryReason = 'RFQ_ONLY';
  } else if (priceVisibilityState === 'PRICE_ON_REQUEST') {
    rfqEntryReason = 'PRICE_ON_REQUEST';
  }

  mockPrismaTransaction.mockResolvedValue([
    {
      id: TEST_ITEM_ID,
      tenant_id: TEST_SUPPLIER_ID,
      name: 'Cotton Twill Fabric',
      active: true,
      publication_posture: 'B2B_PUBLIC',
      price_disclosure_policy_mode: null,
      product_category: 'FABRIC',
      material: 'Cotton',
      description: '3/1 Twill',
      moq: 100,
      certifications: [{ standard: 'GOTS' }],
    },
  ]);

  mockWithOrgAdminContext.mockResolvedValue({
    isPublished: true,
    isActive: true,
    priceDisclosurePolicyMode: null,
    publicationPosture: 'B2B_PUBLIC',
  });

  mockResolvePolicy.mockReturnValue(null);
  mockBuildDisclosure.mockReturnValue({
    price_visibility_state: priceVisibilityState,
    price_display_policy: 'SUPPRESS_VALUE',
    price_value_visible: false,
    price_label: 'Price available on request',
    cta_type: 'REQUEST_QUOTE',
    eligibility_reason: null,
    supplier_policy_source: 'SYSTEM_SAFE_DEFAULT',
    rfq_required: true,
  });

  mockBuildPrefill.mockReturnValue({
    ok: true,
    data: {
      itemId: TEST_ITEM_ID,
      productName: 'Cotton Twill Fabric',
      supplierOrgId: TEST_SUPPLIER_ID,
      buyerOrgId: TEST_ORG_ID,
      selectedQuantity: 250,
      buyerNotes: 'Need bulk pricing',
      moq: 100,
      priceVisible: false,
      priceVisibilityState: priceVisibilityState,
      rfqEntryReason,
    },
  });
}

function setupDbTx(options?: {
  draft?: DraftRecord | null;
  createdDraft?: DraftRecord;
  updatedDraft?: DraftRecord;
}) {
  const createdDraft: DraftRecord = options?.createdDraft ?? {
    id: TEST_DRAFT_ID,
    orgId: TEST_ORG_ID,
    supplierOrgId: TEST_SUPPLIER_ID,
    catalogItemId: TEST_ITEM_ID,
    quantity: 250,
    buyerMessage: 'Need bulk pricing',
    status: 'INITIATED',
    createdAt: new Date('2026-04-28T00:00:00.000Z'),
    updatedAt: new Date('2026-04-28T00:00:00.000Z'),
  };

  const updatedDraft: DraftRecord = options?.updatedDraft ?? {
    ...createdDraft,
    status: 'OPEN',
    updatedAt: new Date('2026-04-28T00:01:00.000Z'),
  };

  const resolvedDraft = options && 'draft' in options ? options.draft : createdDraft;

  const tx: TxLike = {
    rfq: {
      create: vi.fn().mockResolvedValue(createdDraft),
      findFirst: vi.fn().mockResolvedValue(resolvedDraft),
      update: vi.fn().mockResolvedValue(updatedDraft),
    },
    rfqSupplierResponse: {
      create: vi.fn(),
    },
    trade: {
      create: vi.fn(),
    },
  };

  mockWithDbContext.mockImplementation(async (_p, _ctx, cb) => cb(tx as never));
  return tx;
}

describe('Slice C RFQ draft/submit persistence alignment', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
    vi.resetAllMocks();
  });

  it('C-R01: authenticated buyer can create a single-item RFQ draft', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/from-catalog-item',
      payload: { catalogItemId: TEST_ITEM_ID, selectedQuantity: 250, buyerNotes: 'Need bulk pricing' },
    });

    expect(res.statusCode).toBe(201);
    expect(tx.rfq.create).toHaveBeenCalledTimes(1);
    const body = JSON.parse(res.body) as { data: { draft: { status: string } } };
    expect(body.data.draft.status).toBe('INITIATED');
  });

  it('C-R02: draft creation uses server-derived supplier mapping', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/from-catalog-item',
      payload: {
        catalogItemId: TEST_ITEM_ID,
        supplierOrgId: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(tx.rfq.create).not.toHaveBeenCalled();
  });

  it('C-R03: draft creation does not notify supplier', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/from-catalog-item',
      payload: { catalogItemId: TEST_ITEM_ID },
    });

    expect(tx.rfqSupplierResponse.create).not.toHaveBeenCalled();
  });

  it('C-R04: draft creation does not create supplier-visible RFQ status', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/from-catalog-item',
      payload: { catalogItemId: TEST_ITEM_ID },
    });

    const body = JSON.parse(res.body) as { data: { draft: { status: string } } };
    expect(body.data.draft.status).toBe('INITIATED');
  });

  it('C-R05: draft response excludes hidden price and policy internals', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    const serialized = res.body;

    for (const forbidden of ['item_unit_price', 'supplierPolicy', 'price_disclosure_policy_mode', 'policyAudit']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('C-R06: RFQ_ONLY disclosure can create draft', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    expect(res.statusCode).toBe(201);
  });

  it('C-R07: PRICE_ON_REQUEST disclosure can create draft', async () => {
    setupPrefillSuccess('PRICE_ON_REQUEST');
    setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    expect(res.statusCode).toBe(201);
  });

  it('C-R08: LOGIN_REQUIRED cannot create draft', async () => {
    setupPrefillSuccess('LOGIN_REQUIRED');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    const body = JSON.parse(res.body) as { data: { ok: boolean; reason: string } };

    expect(res.statusCode).toBe(200);
    expect(body.data.ok).toBe(false);
    expect(body.data.reason).toBe('AUTH_REQUIRED');
    expect(tx.rfq.create).not.toHaveBeenCalled();
  });

  it('C-R09: missing buyer org cannot create draft', async () => {
    app = await buildTestApp(false);

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    expect(res.statusCode).toBe(401);
  });

  it('C-R10: cross-tenant or unavailable item cannot create draft', async () => {
    mockPrismaTransaction.mockResolvedValueOnce([]);
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    const body = JSON.parse(res.body) as { data: { ok: boolean; reason: string } };

    expect(body.data.ok).toBe(false);
    expect(body.data.reason).toBe('ITEM_NOT_AVAILABLE');
    expect(tx.rfq.create).not.toHaveBeenCalled();
  });

  it('C-R11: buyer can explicitly submit own draft', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    const body = JSON.parse(res.body) as { data: { rfq: { status: string } } };

    expect(res.statusCode).toBe(200);
    expect(body.data.rfq.status).toBe('OPEN');
    expect(tx.rfq.update).toHaveBeenCalledTimes(1);
    expect(notifySupplierBoundary).toHaveBeenCalledTimes(1);
  });

  it('C-R12: buyer cannot submit another org draft', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx({ draft: null });
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(res.statusCode).toBe(404);
  });

  it('C-R13: ELIGIBILITY_REQUIRED cannot submit', async () => {
    setupPrefillSuccess('ELIGIBILITY_REQUIRED');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    const body = JSON.parse(res.body) as { data: { ok: boolean; reason: string } };

    expect(body.data.ok).toBe(false);
    expect(body.data.reason).toBe('ELIGIBILITY_REQUIRED');
    expect(tx.rfq.update).not.toHaveBeenCalled();
    expect(notifySupplierBoundary).not.toHaveBeenCalled();
  });

  it('C-R14: HIDDEN fails safe on submit', async () => {
    setupPrefillSuccess('HIDDEN');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    const body = JSON.parse(res.body) as { data: { ok: boolean; reason: string } };

    expect(body.data.ok).toBe(false);
    expect(body.data.reason).toBe('RFQ_PREFILL_NOT_AVAILABLE');
    expect(tx.rfq.update).not.toHaveBeenCalled();
    expect(notifySupplierBoundary).not.toHaveBeenCalled();
  });

  it('C-R15: submit transition is idempotent for already OPEN draft', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx({
      draft: {
        id: TEST_DRAFT_ID,
        orgId: TEST_ORG_ID,
        supplierOrgId: TEST_SUPPLIER_ID,
        catalogItemId: TEST_ITEM_ID,
        quantity: 250,
        buyerMessage: 'Need bulk pricing',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    const body = JSON.parse(res.body) as { data: { idempotent: boolean } };

    expect(body.data.idempotent).toBe(true);
    expect(tx.rfq.update).not.toHaveBeenCalled();
    expect(notifySupplierBoundary).not.toHaveBeenCalled();
  });

  it('C-R16: submit does not generate quote/trade', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(tx.trade.create).not.toHaveBeenCalled();
  });

  it('C-R17: submit notifies supplier only after explicit submit', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(notifySupplierBoundary).toHaveBeenCalledTimes(1);
    expect(tx.rfqSupplierResponse.create).not.toHaveBeenCalled();
  });

  it('C-R18: submitted response excludes hidden price and policy internals', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    const serialized = res.body;

    for (const forbidden of ['item_unit_price', 'supplierPolicy', 'price_disclosure_policy_mode', 'policyId']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('C-R19: client cannot override status on draft create payload', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/from-catalog-item',
      payload: { catalogItemId: TEST_ITEM_ID, status: 'OPEN' },
    });

    expect(res.statusCode).toBe(400);
    expect(tx.rfq.create).not.toHaveBeenCalled();
  });

  it('C-R20: submit lookup enforces buyer org ownership', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx({ draft: null });
    app = await buildTestApp(true, OTHER_ORG_ID);

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(res.statusCode).toBe(404);
  });

  it('C-R21: draft and submit write audit events', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });

    expect(mockWriteAuditLog).toHaveBeenCalled();
  });

  it('F-R01: draft creation does not trigger supplier notification boundary', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    expect(notifySupplierBoundary).not.toHaveBeenCalled();
  });

  it('F-R02: failed submit does not trigger supplier notification boundary', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx({ draft: null });
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(notifySupplierBoundary).not.toHaveBeenCalled();
  });

  it('F-R03: submit payload includes EXPLICIT_SUBMIT_ONLY trigger marker', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(notifySupplierBoundary).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'EXPLICIT_SUBMIT_ONLY',
        supplier_org_id: TEST_SUPPLIER_ID,
      }),
    );
  });

  it('F-R04: submit notification payload excludes forbidden price and policy internals', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    const payload = notifySupplierBoundary.mock.calls[0]?.[0];
    const serialized = JSON.stringify(payload);

    for (const forbidden of [
      'price_disclosure_policy_mode',
      'supplierPolicy',
      'policyAudit',
      'commercialTerms',
      'risk_score',
      'ranking',
      'unpublishedEvidence',
      'aiExtractionDraft',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('F-R05: duplicate submit does not duplicate notification boundary call', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    tx.rfq.findFirst.mockResolvedValueOnce({
      id: TEST_DRAFT_ID,
      orgId: TEST_ORG_ID,
      supplierOrgId: TEST_SUPPLIER_ID,
      catalogItemId: TEST_ITEM_ID,
      quantity: 250,
      buyerMessage: 'Need bulk pricing',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });

    expect(notifySupplierBoundary).toHaveBeenCalledTimes(1);
  });

  it('E-R01: submit requires trusted buyer dbContext', async () => {
    app = await buildTestApp(false);

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(res.statusCode).toBe(401);
  });

  it('E-R02: cross-tenant submit denial does not leak sensitive draft or policy fields', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    setupDbTx({ draft: null });
    app = await buildTestApp(true, OTHER_ORG_ID);

    const res = await app.inject({ method: 'POST', url: `/tenant/rfqs/drafts/${TEST_DRAFT_ID}/submit` });
    expect(res.statusCode).toBe(404);

    for (const forbidden of [
      'catalog_item_id',
      'supplier_org_id',
      'buyer_notes',
      'product_name',
      'price_disclosure_policy_mode',
      'supplierPolicy',
      'policyAudit',
      'risk_score',
      'ranking',
      'aiExtractionDraft',
    ]) {
      expect(res.body).not.toContain(forbidden);
    }
  });

  it('E-R03: draft create rejects client ownership override fields', async () => {
    setupPrefillSuccess('RFQ_ONLY');
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/from-catalog-item',
      payload: {
        catalogItemId: TEST_ITEM_ID,
        buyerOrgId: OTHER_ORG_ID,
        orgId: OTHER_ORG_ID,
        supplierOrgId: OTHER_ORG_ID,
        createdByUserId: '99999999-9999-4999-8999-999999999999',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(tx.rfq.create).not.toHaveBeenCalled();
  });

  it('E-R04: cross-tenant unavailable item denial on create does not leak supplier identity', async () => {
    mockPrismaTransaction.mockResolvedValueOnce([]);
    const tx = setupDbTx();
    app = await buildTestApp();

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/from-catalog-item', payload: { catalogItemId: TEST_ITEM_ID } });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain(TEST_SUPPLIER_ID);

    for (const forbidden of ['supplierEmail', 'supplierPhone', 'policyId', 'commercialTerms', 'publicationPosture']) {
      expect(res.body).not.toContain(forbidden);
    }
    expect(tx.rfq.create).not.toHaveBeenCalled();
  });
});
