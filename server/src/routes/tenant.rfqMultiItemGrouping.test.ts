import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z } from 'zod';

const BUYER_ORG_ID = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const OTHER_BUYER_ORG_ID = 'eeeeeeee-0000-4000-8000-eeeeeeeeeeee';
const SUPPLIER_1 = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const SUPPLIER_2 = 'cccccccc-0000-4000-8000-cccccccccccc';

const ITEM_SUP1_A = '11111111-1111-4111-8111-111111111111';
const ITEM_SUP1_B = '22222222-2222-4222-8222-222222222222';
const ITEM_SUP2_A = '33333333-3333-4333-8333-333333333333';
const ITEM_LOGIN_REQUIRED = '44444444-4444-4444-8444-444444444444';
const ITEM_ELIGIBILITY_REQUIRED = '55555555-5555-4555-8555-555555555555';
const ITEM_HIDDEN = '66666666-6666-4666-8666-666666666666';
const ITEM_INACTIVE = '77777777-7777-4777-8777-777777777777';
const ITEM_SUPPLIER_INACTIVE = '88888888-8888-4888-8888-888888888888';

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DraftStatus = 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';
type VisibilityState =
  | 'RFQ_ONLY'
  | 'PRICE_ON_REQUEST'
  | 'LOGIN_REQUIRED'
  | 'ELIGIBILITY_REQUIRED'
  | 'HIDDEN';

type CatalogFixture = {
  id: string;
  supplierOrgId: string;
  productName: string;
  active: boolean;
  supplierActive: boolean;
  supplierPublished: boolean;
  visibility: VisibilityState;
};

type DraftRow = {
  id: string;
  orgId: string;
  supplierOrgId: string;
  catalogItemId: string;
  quantity: number;
  buyerMessage: string | null;
  specNotes: string | null;
  status: DraftStatus;
};

type TestReqExtras = {
  dbContext?: { orgId: string };
  userId?: string;
  supplierContext?: { orgId: string };
};

const notifySupplier = vi.fn();
const createTradeFromRfq = vi.fn();

function localSendError(reply: FastifyReply, code: string, message: string, status: number, details?: unknown) {
  return reply.status(status).send({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

function localSendSuccess(reply: FastifyReply, data: unknown, status = 200) {
  return reply.status(status).send({ success: true, data });
}

function groupBySupplier(lines: Array<{ supplier_org_id: string; line: Record<string, unknown> }>) {
  const map = new Map<string, Array<Record<string, unknown>>>();
  for (const row of lines) {
    const existing = map.get(row.supplier_org_id);
    if (existing) {
      existing.push(row.line);
    } else {
      map.set(row.supplier_org_id, [row.line]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([supplier_org_id, line_items]) => ({
      supplier_org_id,
      line_items: line_items.toSorted((a, b) => {
        const aId = typeof a.catalog_item_id === 'string' ? a.catalog_item_id : '';
        const bId = typeof b.catalog_item_id === 'string' ? b.catalog_item_id : '';
        return aId.localeCompare(bId);
      }),
    }));
}

async function buildTestApp(options?: {
  authenticated?: boolean;
  buyerOrgId?: string;
  supplierOrgId?: string;
  catalog?: CatalogFixture[];
  seededDrafts?: DraftRow[];
}) {
  const authenticated = options?.authenticated ?? true;
  const buyerOrgId = options?.buyerOrgId ?? BUYER_ORG_ID;
  const supplierOrgId = options?.supplierOrgId ?? SUPPLIER_1;

  const catalog = new Map<string, CatalogFixture>();
  for (const item of options?.catalog ?? []) {
    catalog.set(item.id, item);
  }

  const drafts = new Map<string, DraftRow>();
  for (const draft of options?.seededDrafts ?? []) {
    drafts.set(draft.id, draft);
  }

  const lookupCalls: string[] = [];
  let seq = 0;
  const makeId = () => {
    seq += 1;
    return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
  };

  const app = Fastify({ logger: false });

  app.addHook('onRequest', async req => {
    if (authenticated) {
      (req as unknown as TestReqExtras).dbContext = { orgId: buyerOrgId };
      (req as unknown as TestReqExtras).supplierContext = { orgId: supplierOrgId };
      (req as unknown as TestReqExtras).userId = '99999999-9999-4999-8999-999999999999';
    }
  });

  async function resolveDraftContext(input: { buyerOrgId: string; catalogItemId: string }) {
    lookupCalls.push(input.catalogItemId);
    const row = catalog.get(input.catalogItemId);
    if (!row?.active) return { ok: false as const, reason: 'ITEM_NOT_AVAILABLE' as const };
    if (!row.supplierPublished || !row.supplierActive) return { ok: false as const, reason: 'SUPPLIER_NOT_AVAILABLE' as const };

    let rfqEntryReason: 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | null = null;
    if (row.visibility === 'RFQ_ONLY') {
      rfqEntryReason = 'RFQ_ONLY';
    } else if (row.visibility === 'PRICE_ON_REQUEST') {
      rfqEntryReason = 'PRICE_ON_REQUEST';
    }

    return {
      ok: true as const,
      supplierOrgId: row.supplierOrgId,
      context: {
        itemId: row.id,
        productName: row.productName,
        buyerOrgId: input.buyerOrgId,
        supplierOrgId: row.supplierOrgId,
        priceVisibilityState: row.visibility,
        rfqEntryReason,
      },
    };
  }

  app.post('/tenant/rfqs/drafts/multi-item', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    if (!req.dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const lineSchema = z.object({
      catalogItemId: z.string().uuid(),
      selectedQuantity: z.number().int().min(1).max(999999).optional().nullable(),
      specNotes: z.string().trim().max(2000).optional().nullable(),
    }).strict();
    const bodySchema = z.object({
      lineItems: z.array(lineSchema).min(1).max(20),
      buyerNotes: z.string().trim().max(2000).optional().nullable(),
      globalNotes: z.string().trim().max(2000).optional().nullable(),
      idempotencyKey: z.string().trim().min(1).max(120).optional(),
    }).strict();

    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, parsed.error.errors);
    }

    const { lineItems, buyerNotes, globalNotes } = parsed.data;
    const dupes = lineItems.map(l => l.catalogItemId).filter((id, i, all) => all.indexOf(id) !== i);
    if (dupes.length > 0) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Duplicate catalogItemId entries are not allowed', 400, {
        duplicate_item_ids: Array.from(new Set(dupes)),
      });
    }

    const blocked: Array<{ catalog_item_id: string; reason: string }> = [];
    const valid: Array<{
      catalogItemId: string;
      selectedQuantity: number;
      specNotes: string | null;
      supplierOrgId: string;
      context: {
        itemId: string;
        productName: string;
        priceVisibilityState: VisibilityState;
        rfqEntryReason: 'RFQ_ONLY' | 'PRICE_ON_REQUEST' | null;
      };
    }> = [];

    for (const line of lineItems) {
      const resolved = await resolveDraftContext({ buyerOrgId: req.dbContext.orgId, catalogItemId: line.catalogItemId });
      if (!resolved.ok) {
        blocked.push({ catalog_item_id: line.catalogItemId, reason: resolved.reason });
        continue;
      }

      const state = resolved.context.priceVisibilityState;
      if (state === 'LOGIN_REQUIRED') {
        blocked.push({ catalog_item_id: line.catalogItemId, reason: 'AUTH_REQUIRED' });
        continue;
      }
      if (state === 'ELIGIBILITY_REQUIRED') {
        blocked.push({ catalog_item_id: line.catalogItemId, reason: 'ELIGIBILITY_REQUIRED' });
        continue;
      }
      if (state === 'HIDDEN') {
        blocked.push({ catalog_item_id: line.catalogItemId, reason: 'RFQ_PREFILL_NOT_AVAILABLE' });
        continue;
      }

      valid.push({
        catalogItemId: line.catalogItemId,
        selectedQuantity: line.selectedQuantity ?? 1,
        specNotes: line.specNotes ?? null,
        supplierOrgId: resolved.supplierOrgId,
        context: {
          itemId: resolved.context.itemId,
          productName: resolved.context.productName,
          priceVisibilityState: resolved.context.priceVisibilityState,
          rfqEntryReason: resolved.context.rfqEntryReason,
        },
      });
    }

    if (blocked.length > 0) {
      return localSendError(reply, 'MULTI_ITEM_BLOCKED', 'One or more line items are not eligible for RFQ draft creation', 409, {
        mode: 'ALL_OR_NOTHING',
        blocked_items: blocked,
      });
    }

    const groupedLines: Array<{ supplier_org_id: string; line: Record<string, unknown> }> = [];
    for (const row of valid) {
      const id = makeId();
      drafts.set(id, {
        id,
        orgId: req.dbContext.orgId,
        supplierOrgId: row.supplierOrgId,
        catalogItemId: row.catalogItemId,
        quantity: row.selectedQuantity,
        buyerMessage: buyerNotes ?? globalNotes ?? null,
        specNotes: row.specNotes,
        status: 'INITIATED',
      });
      groupedLines.push({
        supplier_org_id: row.supplierOrgId,
        line: {
          draft_id: id,
          catalog_item_id: row.catalogItemId,
          item_id: row.context.itemId,
          product_name: row.context.productName,
          quantity: row.selectedQuantity,
          spec_notes: row.specNotes,
          buyer_notes: buyerNotes ?? globalNotes ?? null,
          price_visibility_state: row.context.priceVisibilityState,
          rfq_entry_reason: row.context.rfqEntryReason,
        },
      });
    }

    return localSendSuccess(reply, {
      status: 'INITIATED',
      buyer_org_id: req.dbContext.orgId,
      supplier_group_count: new Set(groupedLines.map(r => r.supplier_org_id)).size,
      line_item_count: groupedLines.length,
      supplier_groups: groupBySupplier(groupedLines),
      submit_boundary: { supplier_visible: false, notified: false, quote_generated: false },
    }, 201);
  });

  app.post('/tenant/rfqs/drafts/multi-item/submit', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    if (!req.dbContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }

    const bodySchema = z.object({
      draftIds: z.array(z.string().uuid()).min(1).max(50),
      idempotencyKey: z.string().trim().min(1).max(120).optional(),
    }).strict();

    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Validation failed', 400, parsed.error.errors);
    }

    const dupes = parsed.data.draftIds.filter((id, i, all) => all.indexOf(id) !== i);
    if (dupes.length > 0) {
      return localSendError(reply, 'VALIDATION_ERROR', 'Duplicate draft IDs are not allowed', 400, {
        duplicate_draft_ids: Array.from(new Set(dupes)),
      });
    }

    const selected: DraftRow[] = [];
    for (const draftId of parsed.data.draftIds) {
      const row = drafts.get(draftId);
      if (row?.orgId !== req.dbContext.orgId) {
        return localSendError(reply, 'NOT_FOUND', 'One or more RFQ drafts were not found for this buyer', 404);
      }
      selected.push(row);
    }

    const invalid = selected.find(d => d.status !== 'INITIATED' && d.status !== 'OPEN');
    if (invalid) {
      return localSendError(reply, 'INVALID_STATUS', 'Only INITIATED or OPEN drafts can be submitted', 409, {
        draft_id: invalid.id,
        status: invalid.status,
      });
    }

    const blocked: Array<{ draft_id: string; reason: string }> = [];
    const lines: Array<{ supplier_org_id: string; line: Record<string, unknown> }> = [];
    for (const draft of selected) {
      const resolved = await resolveDraftContext({ buyerOrgId: req.dbContext.orgId, catalogItemId: draft.catalogItemId });
      if (!resolved.ok) {
        blocked.push({ draft_id: draft.id, reason: resolved.reason });
        continue;
      }
      if (resolved.supplierOrgId !== draft.supplierOrgId) {
        blocked.push({ draft_id: draft.id, reason: 'SUPPLIER_NOT_AVAILABLE' });
        continue;
      }

      const state = resolved.context.priceVisibilityState;
      if (state === 'LOGIN_REQUIRED') {
        blocked.push({ draft_id: draft.id, reason: 'AUTH_REQUIRED' });
        continue;
      }
      if (state === 'ELIGIBILITY_REQUIRED') {
        blocked.push({ draft_id: draft.id, reason: 'ELIGIBILITY_REQUIRED' });
        continue;
      }
      if (state === 'HIDDEN') {
        blocked.push({ draft_id: draft.id, reason: 'RFQ_PREFILL_NOT_AVAILABLE' });
        continue;
      }

      if (draft.status === 'INITIATED') {
        draft.status = 'OPEN';
        drafts.set(draft.id, draft);
      }

      lines.push({
        supplier_org_id: draft.supplierOrgId,
        line: {
          draft_id: draft.id,
          catalog_item_id: draft.catalogItemId,
          item_id: resolved.context.itemId,
          product_name: resolved.context.productName,
          quantity: draft.quantity,
          spec_notes: draft.specNotes,
          buyer_notes: draft.buyerMessage,
          price_visibility_state: resolved.context.priceVisibilityState,
          rfq_entry_reason: resolved.context.rfqEntryReason,
        },
      });
    }

    if (blocked.length > 0) {
      return localSendError(reply, 'MULTI_ITEM_SUBMIT_BLOCKED', 'One or more draft line items are not eligible for submit', 409, {
        mode: 'ALL_OR_NOTHING',
        blocked_drafts: blocked,
      });
    }

    return localSendSuccess(reply, {
      status: 'OPEN',
      buyer_org_id: req.dbContext.orgId,
      supplier_group_count: new Set(lines.map(r => r.supplier_org_id)).size,
      draft_count: lines.length,
      supplier_groups: groupBySupplier(lines),
      submit_boundary: { supplier_visible: true, notified: false, quote_generated: false },
    });
  });

  app.get('/tenant/rfqs/inbox', async (request, reply) => {
    const req = request as unknown as TestReqExtras;
    if (!req.supplierContext) {
      return localSendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);
    }
    const supplierOrgId = req.supplierContext.orgId;

    const rows = Array.from(drafts.values())
      .filter(r => r.status !== 'INITIATED')
      .filter(r => r.supplierOrgId === supplierOrgId)
      .map(r => ({ id: r.id, supplier_org_id: r.supplierOrgId, status: r.status }));

    return localSendSuccess(reply, { rfqs: rows, count: rows.length });
  });

  await app.ready();

  return {
    app,
    lookupCalls,
    drafts,
    notifySupplier,
    createTradeFromRfq,
  };
}

const BASE_CATALOG: CatalogFixture[] = [
  { id: ITEM_SUP1_A, supplierOrgId: SUPPLIER_1, productName: 'Cotton A', active: true, supplierActive: true, supplierPublished: true, visibility: 'RFQ_ONLY' },
  { id: ITEM_SUP1_B, supplierOrgId: SUPPLIER_1, productName: 'Cotton B', active: true, supplierActive: true, supplierPublished: true, visibility: 'PRICE_ON_REQUEST' },
  { id: ITEM_SUP2_A, supplierOrgId: SUPPLIER_2, productName: 'Poly C', active: true, supplierActive: true, supplierPublished: true, visibility: 'RFQ_ONLY' },
  { id: ITEM_LOGIN_REQUIRED, supplierOrgId: SUPPLIER_1, productName: 'Login Item', active: true, supplierActive: true, supplierPublished: true, visibility: 'LOGIN_REQUIRED' },
  { id: ITEM_ELIGIBILITY_REQUIRED, supplierOrgId: SUPPLIER_1, productName: 'Eligible Item', active: true, supplierActive: true, supplierPublished: true, visibility: 'ELIGIBILITY_REQUIRED' },
  { id: ITEM_HIDDEN, supplierOrgId: SUPPLIER_1, productName: 'Hidden Item', active: true, supplierActive: true, supplierPublished: true, visibility: 'HIDDEN' },
  { id: ITEM_INACTIVE, supplierOrgId: SUPPLIER_1, productName: 'Inactive Item', active: false, supplierActive: true, supplierPublished: true, visibility: 'RFQ_ONLY' },
  { id: ITEM_SUPPLIER_INACTIVE, supplierOrgId: SUPPLIER_1, productName: 'Inactive Supplier Item', active: true, supplierActive: false, supplierPublished: false, visibility: 'RFQ_ONLY' },
];

describe('Slice D multi-item grouping and supplier mapping', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
    vi.clearAllMocks();
  });

  it('D-R01: validates non-empty lineItems', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('D-R02: invalid item IDs are rejected safely', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: 'bad' }] } });
    expect(res.statusCode).toBe(400);
  });

  it('D-R03: duplicate item behavior is deterministic (reject)', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP1_A }] } });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('duplicate_item_ids');
  });

  it('D-R04: buyer org is required', async () => {
    const built = await buildTestApp({ authenticated: false, catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    expect(res.statusCode).toBe(401);
  });

  it('D-R05: each item is resolved server-side', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP1_B }] } });
    expect(built.lookupCalls).toEqual([ITEM_SUP1_A, ITEM_SUP1_B]);
  });

  it('D-R06: supplier mapping is server-derived per line item', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/multi-item',
      payload: {
        lineItems: [{ catalogItemId: ITEM_SUP1_A, supplierOrgId: SUPPLIER_2 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('D-R07: same-supplier items group into one supplier group', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP1_B }] } });
    const body = JSON.parse(res.body) as { data: { supplier_group_count: number } };
    expect(res.statusCode).toBe(201);
    expect(body.data.supplier_group_count).toBe(1);
  });

  it('D-R08: cross-supplier items split into separate groups', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP2_A }] } });
    const body = JSON.parse(res.body) as { data: { supplier_group_count: number } };
    expect(body.data.supplier_group_count).toBe(2);
  });

  it('D-R09: sensitive client fields are rejected', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/multi-item',
      payload: {
        lineItems: [{ catalogItemId: ITEM_SUP1_A, negotiatedPrice: 100 }],
        buyerOrgId: OTHER_BUYER_ORG_ID,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('D-R10: RFQ_ONLY item can be included', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    expect(res.statusCode).toBe(201);
  });

  it('D-R11: PRICE_ON_REQUEST item can be included', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_B }] } });
    expect(res.statusCode).toBe(201);
  });

  it('D-R12: LOGIN_REQUIRED item blocks draft creation', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_LOGIN_REQUIRED }] } });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('AUTH_REQUIRED');
  });

  it('D-R13: ELIGIBILITY_REQUIRED item blocks submit', async () => {
    const seeded: DraftRow[] = [{ id: '00000000-0000-4000-8000-000000000001', orgId: BUYER_ORG_ID, supplierOrgId: SUPPLIER_1, catalogItemId: ITEM_ELIGIBILITY_REQUIRED, quantity: 1, buyerMessage: null, specNotes: null, status: 'INITIATED' }];
    const built = await buildTestApp({ catalog: BASE_CATALOG, seededDrafts: seeded });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [seeded[0].id] } });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('ELIGIBILITY_REQUIRED');
  });

  it('D-R14: HIDDEN item fails safe', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_HIDDEN }] } });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('RFQ_PREFILL_NOT_AVAILABLE');
  });

  it('D-R15: inactive/unpublished item fails safe', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_INACTIVE }] } });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('ITEM_NOT_AVAILABLE');
  });

  it('D-R16: inactive/unpublished supplier fails safe', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUPPLIER_INACTIVE }] } });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('SUPPLIER_NOT_AVAILABLE');
  });

  it('D-R17: cross-tenant item fails safely', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG.filter(item => item.id !== ITEM_SUP2_A) });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP2_A }] } });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('ITEM_NOT_AVAILABLE');
  });

  it('D-R18: draft creation does not notify suppliers', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    expect(built.notifySupplier).not.toHaveBeenCalled();
  });

  it('D-R19: draft creation is not supplier-visible', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const createRes = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    expect(createRes.statusCode).toBe(201);

    const inboxRes = await app.inject({ method: 'GET', url: '/tenant/rfqs/inbox' });
    const body = JSON.parse(inboxRes.body) as { data: { count: number } };
    expect(body.data.count).toBe(0);
  });

  it('D-R20: submit is explicit only', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const createRes = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    const createBody = JSON.parse(createRes.body) as { data: { supplier_groups: Array<{ line_items: Array<{ draft_id: string }> }> } };
    const draftId = createBody.data.supplier_groups[0].line_items[0].draft_id;

    const preSubmit = built.drafts.get(draftId);
    expect(preSubmit?.status).toBe('INITIATED');

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [draftId] } });
    const postSubmit = built.drafts.get(draftId);
    expect(postSubmit?.status).toBe('OPEN');
  });

  it('D-R21: submit does not notify suppliers', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const createRes = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    const createBody = JSON.parse(createRes.body) as { data: { supplier_groups: Array<{ line_items: Array<{ draft_id: string }> }> } };

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [createBody.data.supplier_groups[0].line_items[0].draft_id] } });
    expect(built.notifySupplier).not.toHaveBeenCalled();
  });

  it('D-R22: submit does not generate quote/trade/order', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const createRes = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    const createBody = JSON.parse(createRes.body) as { data: { supplier_groups: Array<{ line_items: Array<{ draft_id: string }> }> } };

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [createBody.data.supplier_groups[0].line_items[0].draft_id] } });
    expect(built.createTradeFromRfq).not.toHaveBeenCalled();
  });

  it('D-R23: supplier post-submit visibility is scoped to own group only', async () => {
    const builtBuyer = await buildTestApp({ catalog: BASE_CATALOG, supplierOrgId: SUPPLIER_1 });
    app = builtBuyer.app;
    const createRes = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP2_A }] } });
    const createBody = JSON.parse(createRes.body) as { data: { supplier_groups: Array<{ line_items: Array<{ draft_id: string }> }> } };
    const draftIds = createBody.data.supplier_groups.flatMap(group => group.line_items.map(i => i.draft_id));

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds } });

    const inboxSup1 = await app.inject({ method: 'GET', url: '/tenant/rfqs/inbox' });
    const inboxSup1Body = JSON.parse(inboxSup1.body) as { data: { rfqs: Array<{ supplier_org_id: string }> } };
    expect(inboxSup1Body.data.rfqs.every(r => r.supplier_org_id === SUPPLIER_1)).toBe(true);

    await app.close();

    const builtSupplier2 = await buildTestApp({ catalog: BASE_CATALOG, supplierOrgId: SUPPLIER_2, seededDrafts: Array.from(builtBuyer.drafts.values()) });
    app = builtSupplier2.app;
    const inboxSup2 = await app.inject({ method: 'GET', url: '/tenant/rfqs/inbox' });
    const inboxSup2Body = JSON.parse(inboxSup2.body) as { data: { rfqs: Array<{ supplier_org_id: string }> } };
    expect(inboxSup2Body.data.rfqs.every(r => r.supplier_org_id === SUPPLIER_2)).toBe(true);
  });

  it('D-R24: serialized responses exclude forbidden keys and hidden fixture values', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }] } });
    const serialized = res.body;

    for (const forbidden of ['item_unit_price', 'negotiatedPrice', 'supplierPolicy', 'price_disclosure_policy_mode', 'internalMargin', 'ranking']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('D-R25: draftIds submit validation rejects malformed ids', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: ['bad'] } });
    expect(res.statusCode).toBe(400);
  });

  it('D-R26: submit rejects duplicate draft ids deterministically', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG, seededDrafts: [{ id: '00000000-0000-4000-8000-000000000010', orgId: BUYER_ORG_ID, supplierOrgId: SUPPLIER_1, catalogItemId: ITEM_SUP1_A, quantity: 1, buyerMessage: null, specNotes: null, status: 'INITIATED' }] });
    app = built.app;
    const id = '00000000-0000-4000-8000-000000000010';
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [id, id] } });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('duplicate_draft_ids');
  });

  it('D-R27: created draft ids are UUID-shaped and route is deterministic', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item', payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP2_A }] } });
    const body = JSON.parse(res.body) as { data: { supplier_groups: Array<{ line_items: Array<{ draft_id: string }> }> } };
    const ids = body.data.supplier_groups.flatMap(group => group.line_items.map(l => l.draft_id));
    expect(ids.length).toBe(2);
    expect(ids.every(id => UUID_RX.test(id))).toBe(true);
  });

  it('E-R01: multi-item submit denies cross-buyer draft ownership and does not leak details', async () => {
    const seeded: DraftRow[] = [{
      id: '00000000-0000-4000-8000-000000000031',
      orgId: OTHER_BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_1,
      catalogItemId: ITEM_SUP1_A,
      quantity: 1,
      buyerMessage: 'other buyer draft',
      specNotes: 'secret spec',
      status: 'INITIATED',
    }];
    const built = await buildTestApp({ catalog: BASE_CATALOG, buyerOrgId: BUYER_ORG_ID, seededDrafts: seeded });
    app = built.app;

    const res = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [seeded[0].id] } });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('other buyer draft');
    expect(res.body).not.toContain('secret spec');
    expect(res.body).not.toContain('supplier_org_id');
  });

  it('E-R02: supplier inbox payload excludes buyer draft-only metadata', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;
    const createRes = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/multi-item',
      payload: {
        lineItems: [{ catalogItemId: ITEM_SUP1_A, specNotes: 'private yarn twist' }],
        buyerNotes: 'confidential buyer note',
      },
    });
    const createBody = JSON.parse(createRes.body) as { data: { supplier_groups: Array<{ line_items: Array<{ draft_id: string }> }> } };
    const draftId = createBody.data.supplier_groups[0].line_items[0].draft_id;

    await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds: [draftId] } });
    const inboxRes = await app.inject({ method: 'GET', url: '/tenant/rfqs/inbox' });
    expect(inboxRes.statusCode).toBe(200);

    for (const forbidden of ['buyer_notes', 'spec_notes', 'buyer_org_id', 'policyAudit', 'supplierEmail']) {
      expect(inboxRes.body).not.toContain(forbidden);
    }
  });

  it('E-R03: client-supplied supplier grouping payload is rejected', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/multi-item',
      payload: {
        lineItems: [{ catalogItemId: ITEM_SUP1_A }],
        supplier_groups: [{ supplier_org_id: SUPPLIER_2, line_items: [] }],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('E-R04: cross-tenant blocked multi-item response does not leak product or supplier internals', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG.filter(item => item.id !== ITEM_SUP2_A) });
    app = built.app;

    const res = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/multi-item',
      payload: { lineItems: [{ catalogItemId: ITEM_SUP2_A }] },
    });

    expect(res.statusCode).toBe(409);
    expect(res.body).not.toContain('Poly C');
    expect(res.body).not.toContain(SUPPLIER_2);
    for (const forbidden of [
      'supplierPolicy',
      'price_disclosure_policy_mode',
      'commercialTerms',
      'internalSupplierContact',
      'supplierPhone',
      'publicationPosture',
      'unpublishedEvidence',
      'aiExtractionDraft',
    ]) {
      expect(res.body).not.toContain(forbidden);
    }
  });

  it('E-R05: submit response never returns mixed-supplier line payload within a supplier group', async () => {
    const built = await buildTestApp({ catalog: BASE_CATALOG });
    app = built.app;

    const createRes = await app.inject({
      method: 'POST',
      url: '/tenant/rfqs/drafts/multi-item',
      payload: { lineItems: [{ catalogItemId: ITEM_SUP1_A }, { catalogItemId: ITEM_SUP2_A }] },
    });
    const createBody = JSON.parse(createRes.body) as { data: { supplier_groups: Array<{ supplier_org_id: string; line_items: Array<{ draft_id: string }> }> } };
    const draftIds = createBody.data.supplier_groups.flatMap(group => group.line_items.map(line => line.draft_id));

    const submitRes = await app.inject({ method: 'POST', url: '/tenant/rfqs/drafts/multi-item/submit', payload: { draftIds } });
    const submitBody = JSON.parse(submitRes.body) as {
      data: {
        supplier_groups: Array<{
          supplier_org_id: string;
          line_items: Array<{ draft_id: string }>;
        }>;
      };
    };

    const draftToSupplier = new Map<string, string>();
    for (const row of Array.from(built.drafts.values())) {
      draftToSupplier.set(row.id, row.supplierOrgId);
    }

    for (const group of submitBody.data.supplier_groups) {
      expect(group.line_items.length).toBeGreaterThan(0);
      for (const line of group.line_items) {
        expect(draftToSupplier.get(line.draft_id)).toBe(group.supplier_org_id);
      }
    }
  });
});
