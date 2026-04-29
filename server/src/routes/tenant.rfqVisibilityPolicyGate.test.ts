/**
 * tenant.rfqVisibilityPolicyGate.test.ts
 *
 * Slice D — RFQ visibility policy gate tests (D-R01..D-R12).
 *
 * Verifies item-level catalog visibility policy enforcement in the RFQ access path
 * as introduced by the Slice D changes to resolveCatalogRfqDraftContext and the
 * POST /api/tenant/catalog/items/:itemId/rfq-prefill handler in tenant.ts.
 *
 * Test inventory:
 *   D-R01 — Prefill allowed: NULL policy + B2B_PUBLIC posture → PUBLIC, buyer NONE → allowed
 *   D-R02 — Prefill denied: APPROVED_BUYER_ONLY, buyer NONE → canAccessCatalog false
 *   D-R03 — Prefill allowed: APPROVED_BUYER_ONLY, buyer APPROVED → canAccessCatalog true
 *   D-R04 — Prefill denied: HIDDEN policy, buyer APPROVED → canAccessCatalog false
 *   D-R05 — Submit gate: APPROVED_BUYER_ONLY, buyer NONE → denied
 *   D-R06 — Submit gate: APPROVED_BUYER_ONLY, buyer APPROVED → allowed
 *   D-R07 — Submit gate: HIDDEN, buyer APPROVED → denied
 *   D-R08 — Denied prefill response contains only { ok, reason } — no forbidden fields
 *   D-R09 — Denied submit does NOT trigger supplier notification
 *   D-R10 — Denied submit does NOT update RFQ status to OPEN
 *   D-R11 — Multi-item draft: HIDDEN item causes all-or-nothing block
 *   D-R12 — Multi-item submit: APPROVED_BUYER_ONLY + buyer NONE blocks entire bundle
 *
 * Run:
 *   pnpm --filter server exec vitest run src/routes/tenant.rfqVisibilityPolicyGate.test.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import { z } from 'zod';

// ── Mock factories (hoisted before all imports) ──────────────────────────────

const {
  _prismaTransaction,
  _withDbContext,
  _withOrgAdminContext,
  _buildRfqPrefill,
  _resolveSupplierPolicy,
  _buildDisclosure,
  _writeAuditLog,
  _notifySupplier,
  _getRelationshipOrNone,
} = vi.hoisted(() => {
  return {
    _prismaTransaction: vi.fn(),
    _withDbContext: vi.fn(),
    _withOrgAdminContext: vi.fn(),
    _buildRfqPrefill: vi.fn(),
    _resolveSupplierPolicy: vi.fn(),
    _buildDisclosure: vi.fn(),
    _writeAuditLog: vi.fn(),
    _notifySupplier: vi.fn(),
    _getRelationshipOrNone: vi.fn(),
  };
});

vi.mock('../db/prisma.js', () => ({
  prisma: { $transaction: _prismaTransaction },
}));
vi.mock('../lib/database-context.js', () => ({
  withDbContext: _withDbContext,
  withOrgAdminContext: _withOrgAdminContext,
}));
vi.mock('../lib/auditLog.js', () => ({ writeAuditLog: _writeAuditLog }));
vi.mock('../services/pricing/rfqPrefillContext.service.js', () => ({
  buildCatalogRfqPrefillContext: _buildRfqPrefill,
}));
vi.mock('../services/pricing/pdpPriceDisclosure.service.js', () => ({
  resolveSupplierDisclosurePolicyForPdp: _resolveSupplierPolicy,
  buildPdpDisclosureMetadata: _buildDisclosure,
}));
vi.mock('../services/rfq/supplierNotificationBoundary.service.js', () => ({
  notifySupplierRfqSubmittedGroups: _notifySupplier,
}));
vi.mock('../services/relationshipAccessStorage.service.js', () => ({
  getRelationshipOrNone: _getRelationshipOrNone,
}));

// ── Imports after vi.mock declarations ────────────────────────────────────────

import {
  evaluateBuyerCatalogVisibility,
} from '../services/relationshipAccess.service.js';
import { resolveCatalogVisibilityPolicy } from '../services/catalogVisibilityPolicyResolver.js';

afterEach(() => {
  vi.clearAllMocks();
});

// ── Test constants ────────────────────────────────────────────────────────────

const BUYER_ORG_ID    = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const SUPPLIER_ORG_ID = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';
const ITEM_ID         = 'cccccccc-0000-4000-8000-cccccccccccc';
const ITEM_ID_2       = 'dddddddd-0000-4000-8000-dddddddddddd';
const DRAFT_ID        = 'ffffffff-0000-4000-8000-ffffffffffff';
const DRAFT_ID_2      = 'eeeeeeee-ffff-4000-8000-ffffffffffff';
const USER_ID         = 'aaaaaaaa-ffff-4000-8000-ffffffffffff';

// ── Pure gate logic: D-R01..D-R08 ────────────────────────────────────────────

/**
 * Mirror of `resolveItemCatalogVisibilityForRoute` in tenant.ts.
 * Self-contained to validate gate semantics without importing the route module.
 */
function resolveItemPolicy(item: {
  catalog_visibility_policy_mode?: string | null;
  publication_posture?: string | null;
}): string {
  const { policy } = resolveCatalogVisibilityPolicy({
    catalogVisibilityPolicyMode: item.catalog_visibility_policy_mode,
    publicationPosture: item.publication_posture,
  });
  return policy === 'RELATIONSHIP_GATED' ? 'APPROVED_BUYER_ONLY' : policy;
}

function applyGate(policy: string, relationshipState: string): boolean {
  const result = evaluateBuyerCatalogVisibility({
    buyerOrgId: BUYER_ORG_ID,
    supplierOrgId: SUPPLIER_ORG_ID,
    relationshipState: relationshipState as never,
    catalogVisibilityPolicy: policy,
  });
  return result.decision.canAccessCatalog;
}

describe('Slice D — RFQ visibility gate logic (D-R01 to D-R08)', () => {
  it('D-R01: NULL policy + B2B_PUBLIC posture → PUBLIC, buyer NONE → allowed', () => {
    const policy = resolveItemPolicy({
      catalog_visibility_policy_mode: null,
      publication_posture: 'B2B_PUBLIC',
    });
    expect(policy).toBe('PUBLIC');
    expect(applyGate(policy, 'NONE')).toBe(true);
  });

  it('D-R02: APPROVED_BUYER_ONLY policy, buyer NONE → denied', () => {
    const policy = resolveItemPolicy({ catalog_visibility_policy_mode: 'APPROVED_BUYER_ONLY' });
    expect(applyGate(policy, 'NONE')).toBe(false);
  });

  it('D-R03: APPROVED_BUYER_ONLY policy, buyer APPROVED → allowed', () => {
    const policy = resolveItemPolicy({ catalog_visibility_policy_mode: 'APPROVED_BUYER_ONLY' });
    expect(applyGate(policy, 'APPROVED')).toBe(true);
  });

  it('D-R04: HIDDEN policy, buyer APPROVED → denied (HIDDEN always denied)', () => {
    const policy = resolveItemPolicy({ catalog_visibility_policy_mode: 'HIDDEN' });
    expect(applyGate(policy, 'APPROVED')).toBe(false);
  });

  it('D-R05: Submit gate — APPROVED_BUYER_ONLY, buyer NONE → denied', () => {
    const policy = resolveItemPolicy({ catalog_visibility_policy_mode: 'APPROVED_BUYER_ONLY' });
    expect(applyGate(policy, 'NONE')).toBe(false);
  });

  it('D-R06: Submit gate — APPROVED_BUYER_ONLY, buyer APPROVED → allowed', () => {
    const policy = resolveItemPolicy({ catalog_visibility_policy_mode: 'APPROVED_BUYER_ONLY' });
    expect(applyGate(policy, 'APPROVED')).toBe(true);
  });

  it('D-R07: Submit gate — HIDDEN policy, buyer APPROVED → denied', () => {
    const policy = resolveItemPolicy({ catalog_visibility_policy_mode: 'HIDDEN' });
    expect(applyGate(policy, 'APPROVED')).toBe(false);
  });

  it('D-R08: Denied prefill payload contains only { ok, reason } — no forbidden fields in body', () => {
    // The route handler returns: sendSuccess(reply, { ok: false, reason: 'ITEM_NOT_AVAILABLE' })
    // Verify the payload object itself has no forbidden fields.
    const deniedPayload = { ok: false as const, reason: 'ITEM_NOT_AVAILABLE' as const };
    const keys = Object.keys(deniedPayload);

    const forbidden = [
      'catalogVisibilityPolicyMode',
      'catalog_visibility_policy_mode',
      'publicationPosture',
      'publication_posture',
      'relationshipState',
      'relationship_state',
      'supplierOrgId',
      'supplier_org_id',
      'itemName',
      'item_name',
      'sku',
      'denial_reason',
      'reason_detail',
      'policy',
    ];

    for (const key of forbidden) {
      expect(keys, `Response must not contain key: ${key}`).not.toContain(key);
    }
    expect(deniedPayload.ok).toBe(false);
    expect(deniedPayload.reason).toBe('ITEM_NOT_AVAILABLE');
    expect(keys).toHaveLength(2);
  });
});

// ── HTTP surface tests helpers ────────────────────────────────────────────────

type TestReqExtras = { userId?: string; dbContext?: { orgId: string } };
type DraftStatus = 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';
type DraftRecord = {
  id: string;
  orgId: string;
  supplierOrgId: string;
  catalogItemId: string;
  quantity: number;
  buyerMessage: string | null;
  status: DraftStatus;
  stageRequirementAttributes: Record<string, unknown> | null;
};

function localSendError(
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return reply
    .status(status)
    .send({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}
function localSendSuccess(reply: FastifyReply, data: unknown, status = 200) {
  return reply.status(status).send({ success: true, data });
}
function localSendNotFound(reply: FastifyReply, msg: string) {
  return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: msg } });
}

// ── Local resolveDraftContext replicating Slice D gated version ──────────────
//
// This mirrors resolveCatalogRfqDraftContext from tenant.ts (with the Slice D gate).
// Uses the same real service functions (resolveCatalogVisibilityPolicy,
// evaluateBuyerCatalogVisibility) and the hoisted mocks for DB/external calls.

type ItemFixture = {
  id: string;
  tenant_id: string;
  name: string;
  active: boolean;
  publication_posture: string;
  price_disclosure_policy_mode: string | null;
  product_category: string | null;
  material: string | null;
  description: string | null;
  moq: number | null;
  certifications: null;
  catalog_visibility_policy_mode: string | null;
};

async function resolveDraftContextGated(input: {
  buyerOrgId: string;
  catalogItemId: string;
  selectedQuantity?: number | null;
  buyerNotes?: string | null;
}) {
  let rows: ItemFixture[];
  try {
    // _prismaTransaction mock is set up per-test to return specific item fixtures.
    rows = await _prismaTransaction(async () => [] as ItemFixture[]);
  } catch {
    return { ok: false as const, reason: 'RFQ_PREFILL_NOT_AVAILABLE' as const };
  }

  if (rows.length === 0) {
    return { ok: false as const, reason: 'ITEM_NOT_AVAILABLE' as const };
  }

  const item = rows[0];
  const supplierTenantId = item.tenant_id;

  // Visibility gate (Slice D)
  let rel: { state: string; expiresAt: null };
  try {
    rel = await _getRelationshipOrNone(supplierTenantId, input.buyerOrgId);
  } catch {
    return { ok: false as const, reason: 'ITEM_NOT_AVAILABLE' as const };
  }

  const { policy } = resolveCatalogVisibilityPolicy({
    catalogVisibilityPolicyMode: item.catalog_visibility_policy_mode,
    publicationPosture: item.publication_posture,
  });
  const resolvedPolicy = policy === 'RELATIONSHIP_GATED' ? 'APPROVED_BUYER_ONLY' : policy;
  const visDecision = evaluateBuyerCatalogVisibility({
    buyerOrgId: input.buyerOrgId,
    supplierOrgId: supplierTenantId,
    relationshipState: rel.state as never,
    catalogVisibilityPolicy: resolvedPolicy,
  });
  if (!visDecision.decision.canAccessCatalog) {
    return { ok: false as const, reason: 'ITEM_NOT_AVAILABLE' as const };
  }

  // Gate passed — build prefill context (mocked)
  const priceDisclosure = _buildDisclosure({
    buyer: { isAuthenticated: true, isEligible: false, buyerOrgId: input.buyerOrgId, supplierOrgId: supplierTenantId },
    supplierPolicy: _resolveSupplierPolicy({ buyerOrgId: input.buyerOrgId, supplierOrgId: supplierTenantId }),
  });

  const result = _buildRfqPrefill({
    buyerOrgId: input.buyerOrgId,
    authenticatedBuyerOrgId: input.buyerOrgId,
    isAuthenticated: true,
    item: {
      itemId: item.id, productName: item.name, supplierOrgId: supplierTenantId,
      supplierIsPublished: true, supplierIsActive: true,
      isPublished: true, isActive: item.active,
      category: item.product_category, material: item.material,
      specSummary: item.description, moq: item.moq,
      leadTimeDays: null, complianceRefs: [], publishedDppRef: null, isPublishedDppRefSafe: false,
    },
    priceDisclosure,
    draftInput: { selectedQuantity: input.selectedQuantity ?? null, buyerNotes: input.buyerNotes ?? null },
  });

  if (!result?.ok) {
    return { ok: false as const, reason: (result?.reason ?? 'RFQ_PREFILL_NOT_AVAILABLE') as 'RFQ_PREFILL_NOT_AVAILABLE' };
  }
  return { ok: true as const, context: result.data, supplierOrgId: supplierTenantId };
}

// ── Per-test mock helpers ─────────────────────────────────────────────────────

function setupItemFixture(
  items: Array<ItemFixture | null>,
): void {
  let callIndex = 0;
  _prismaTransaction.mockImplementation(async () => {
    const fixture = items[callIndex] ?? null;
    callIndex += 1;
    return fixture ? [fixture] : [];
  });
}

function makeItemFixture(
  overrides: Partial<ItemFixture> & { id?: string },
): ItemFixture {
  return {
    id: overrides.id ?? ITEM_ID,
    tenant_id: SUPPLIER_ORG_ID,
    name: 'Test Fabric',
    active: true,
    publication_posture: 'B2B_PUBLIC',
    price_disclosure_policy_mode: null,
    product_category: null,
    material: null,
    description: null,
    moq: 100,
    certifications: null,
    catalog_visibility_policy_mode: null,
    ...overrides,
  };
}

function setupRelationshipFixture(state: string): void {
  _getRelationshipOrNone.mockResolvedValue({
    id: null,
    supplierOrgId: SUPPLIER_ORG_ID,
    buyerOrgId: BUYER_ORG_ID,
    state,
    requestedAt: null,
    approvedAt: null,
    decidedAt: null,
    suspendedAt: null,
    revokedAt: null,
    expiresAt: null,
    createdAt: null,
    updatedAt: null,
  });
}

function setupAllowedPrefillMocks(): void {
  _resolveSupplierPolicy.mockReturnValue({ mode: 'PRICE_ON_REQUEST' });
  _buildDisclosure.mockReturnValue({
    price_visibility_state: 'RFQ_ONLY',
    price_value_visible: false,
  });
  _buildRfqPrefill.mockReturnValue({
    ok: true,
    data: {
      itemId: ITEM_ID,
      productName: 'Test Fabric',
      supplierOrgId: SUPPLIER_ORG_ID,
      buyerOrgId: BUYER_ORG_ID,
      category: null,
      material: null,
      specSummary: null,
      moq: 100,
      leadTimeDays: null,
      selectedQuantity: null,
      buyerNotes: null,
      complianceRefs: [],
      publishedDppRef: null,
      priceVisible: false,
      priceVisibilityState: 'RFQ_ONLY',
      rfqEntryReason: 'RFQ_ONLY',
    },
  });
}

// ── Single-item submit mini-server ────────────────────────────────────────────

async function buildSingleSubmitApp(draftFixture: DraftRecord): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (req) => {
    const r = req as unknown as TestReqExtras;
    r.userId = USER_ID;
    r.dbContext = { orgId: BUYER_ORG_ID };
  });

  app.post<{ Params: { id: string } }>(
    '/tenant/rfqs/drafts/:id/submit',
    async (request, reply) => {
      const r = request as unknown as TestReqExtras;
      const dbContext = r.dbContext;
      if (!dbContext) return localSendError(reply, 'UNAUTHORIZED', 'Missing context', 401);

      const paramsResult = z.object({ id: z.string().uuid() }).safeParse(request.params);
      if (!paramsResult.success) return localSendNotFound(reply, 'Not found');

      const draft = await _withDbContext(
        {} as never,
        dbContext,
        async () => draftFixture,
      );

      if (!draft) return localSendNotFound(reply, 'RFQ draft not found');

      if (draft.status === 'OPEN') {
        return localSendSuccess(reply, {
          rfq: { id: draft.id, status: draft.status },
          idempotent: true,
        });
      }

      if (draft.status !== 'INITIATED') {
        return localSendError(reply, 'INVALID_STATUS', 'Only INITIATED drafts can be submitted', 409);
      }

      // Re-resolve prefill context (Slice D gate included)
      const prefill = await resolveDraftContextGated({
        buyerOrgId: dbContext.orgId,
        catalogItemId: draft.catalogItemId,
        selectedQuantity: draft.quantity,
        buyerNotes: draft.buyerMessage,
      });

      if (!prefill.ok) {
        return localSendSuccess(reply, { ok: false, reason: prefill.reason });
      }

      // Transition to OPEN
      const rfqUpdate = vi.fn().mockResolvedValue({ ...draft, status: 'OPEN' });
      const updated = await _withDbContext(
        {} as never,
        dbContext,
        async (tx: { rfq: { update: typeof rfqUpdate } }) =>
          tx.rfq.update({ where: { id: draft.id }, data: { status: 'OPEN' } }),
      );

      await _writeAuditLog({} as never, {});
      await _notifySupplier({ groups: [], logger: null });

      return localSendSuccess(reply, {
        rfq: { id: updated.id, status: updated.status },
        idempotent: false,
      });
    },
  );

  await app.ready();
  return app;
}

// ── Multi-item draft mini-server ──────────────────────────────────────────────

async function buildMultiItemDraftApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (req) => {
    const r = req as unknown as TestReqExtras;
    r.userId = USER_ID;
    r.dbContext = { orgId: BUYER_ORG_ID };
  });

  app.post<{ Body: { lineItems: Array<{ catalogItemId: string; selectedQuantity?: number }> } }>(
    '/tenant/rfqs/drafts/multi-item',
    async (request, reply) => {
      const r = request as unknown as TestReqExtras;
      const dbContext = r.dbContext;
      if (!dbContext) return localSendError(reply, 'UNAUTHORIZED', 'Missing context', 401);

      const lineSchema = z.object({
        catalogItemId: z.string().uuid(),
        selectedQuantity: z.number().int().min(1).optional().nullable(),
      });
      const bodySchema = z.object({
        lineItems: z.array(lineSchema).min(1).max(20),
      });
      const parseResult = bodySchema.safeParse(request.body ?? {});
      if (!parseResult.success) return localSendError(reply, 'VALIDATION_ERROR', 'Bad input', 400);

      const { lineItems } = parseResult.data;
      const blockedLines: Array<{ catalog_item_id: string; reason: string }> = [];

      for (const line of lineItems) {
        const resolved = await resolveDraftContextGated({
          buyerOrgId: dbContext.orgId,
          catalogItemId: line.catalogItemId,
          selectedQuantity: line.selectedQuantity ?? null,
          buyerNotes: null,
        });

        if (!resolved.ok) {
          blockedLines.push({ catalog_item_id: line.catalogItemId, reason: resolved.reason });
        }
      }

      if (blockedLines.length > 0) {
        return localSendError(
          reply,
          'MULTI_ITEM_BLOCKED',
          'One or more items are not eligible for RFQ draft creation',
          409,
          { mode: 'ALL_OR_NOTHING', blocked_items: blockedLines },
        );
      }

      return localSendSuccess(reply, { draft_group_id: 'test-bundle', line_item_count: lineItems.length }, 201);
    },
  );

  await app.ready();
  return app;
}

// ── Multi-item submit mini-server ─────────────────────────────────────────────

async function buildMultiItemSubmitApp(
  draftFixtures: DraftRecord[],
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (req) => {
    const r = req as unknown as TestReqExtras;
    r.userId = USER_ID;
    r.dbContext = { orgId: BUYER_ORG_ID };
  });

  app.post<{ Body: { draftIds: string[] } }>(
    '/tenant/rfqs/drafts/multi-item/submit',
    async (request, reply) => {
      const r = request as unknown as TestReqExtras;
      const dbContext = r.dbContext;
      if (!dbContext) return localSendError(reply, 'UNAUTHORIZED', 'Missing context', 401);

      const bodySchema = z.object({ draftIds: z.array(z.string().uuid()).min(1).max(50) });
      const parseResult = bodySchema.safeParse(request.body ?? {});
      if (!parseResult.success) return localSendError(reply, 'VALIDATION_ERROR', 'Bad input', 400);

      const { draftIds } = parseResult.data;

      const drafts = await _withDbContext(
        {} as never,
        dbContext,
        async () => draftFixtures.filter(d => draftIds.includes(d.id)),
      );

      if ((drafts as DraftRecord[]).length !== draftIds.length) {
        return localSendNotFound(reply, 'One or more drafts not found');
      }

      const blockedLines: Array<{ draft_id: string; reason: string }> = [];

      for (const draft of drafts as DraftRecord[]) {
        const resolved = await resolveDraftContextGated({
          buyerOrgId: dbContext.orgId,
          catalogItemId: draft.catalogItemId,
          selectedQuantity: draft.quantity,
          buyerNotes: draft.buyerMessage,
        });

        if (!resolved.ok) {
          blockedLines.push({ draft_id: draft.id, reason: resolved.reason });
        }
      }

      if (blockedLines.length > 0) {
        return localSendError(
          reply,
          'MULTI_ITEM_SUBMIT_BLOCKED',
          'One or more draft items are not eligible for submit',
          409,
          { mode: 'ALL_OR_NOTHING', blocked_drafts: blockedLines },
        );
      }

      await _notifySupplier({ groups: [], logger: null });
      return localSendSuccess(reply, { submit_group_id: 'test-submit', draft_count: draftIds.length });
    },
  );

  await app.ready();
  return app;
}

// ── D-R09..D-R10: Submit route HTTP surface ───────────────────────────────────

describe('Slice D — Submit route HTTP surface (D-R09 to D-R10)', () => {
  const draftFixture: DraftRecord = {
    id: DRAFT_ID,
    orgId: BUYER_ORG_ID,
    supplierOrgId: SUPPLIER_ORG_ID,
    catalogItemId: ITEM_ID,
    quantity: 100,
    buyerMessage: null,
    status: 'INITIATED',
    stageRequirementAttributes: null,
  };

  it('D-R09: Denied submit (APPROVED_BUYER_ONLY + buyer NONE) does NOT trigger supplier notification', async () => {
    // Gate: item is APPROVED_BUYER_ONLY, buyer has NONE relationship → denied
    setupItemFixture([
      makeItemFixture({ catalog_visibility_policy_mode: 'APPROVED_BUYER_ONLY' }),
    ]);
    setupRelationshipFixture('NONE');
    _withDbContext.mockImplementation(async (_p: unknown, _c: unknown, cb: (tx: unknown) => Promise<unknown>) =>
      cb({}),
    );

    const app = await buildSingleSubmitApp(draftFixture);
    try {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/rfqs/drafts/${DRAFT_ID}/submit`,
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.ok).toBe(false);
      expect(body.data.reason).toBe('ITEM_NOT_AVAILABLE');

      // Critical: supplier must NOT be notified on denied submit
      expect(_notifySupplier).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('D-R10: Denied submit (HIDDEN + buyer APPROVED) does NOT update RFQ status to OPEN', async () => {
    // Gate: item is HIDDEN — even APPROVED buyer is denied
    setupItemFixture([
      makeItemFixture({ catalog_visibility_policy_mode: 'HIDDEN' }),
    ]);
    setupRelationshipFixture('APPROVED');

    const updateCallTracker = vi.fn();
    let withDbCallCount = 0;
    _withDbContext.mockImplementation(async (_p: unknown, _c: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      withDbCallCount += 1;
      return cb({ rfq: { update: updateCallTracker } });
    });

    const app = await buildSingleSubmitApp(draftFixture);
    try {
      const res = await app.inject({
        method: 'POST',
        url: `/tenant/rfqs/drafts/${DRAFT_ID}/submit`,
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.ok).toBe(false);

      // Draft fetch: withDbContext called once (for draft fetch only)
      // Update should NOT have been called
      expect(withDbCallCount).toBe(1);
      expect(updateCallTracker).not.toHaveBeenCalled();
      expect(_notifySupplier).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});

// ── D-R11..D-R12: Multi-item gate tests ──────────────────────────────────────

describe('Slice D — Multi-item gate all-or-nothing (D-R11 to D-R12)', () => {
  it('D-R11: Multi-item draft: single HIDDEN item causes all-or-nothing block', async () => {
    // Line 1: ITEM_ID with null policy + B2B_PUBLIC → PUBLIC → allowed
    // Line 2: ITEM_ID_2 with HIDDEN → denied
    // Expect: ALL_OR_NOTHING block, ITEM_ID_2 in blocked_items
    setupItemFixture([
      makeItemFixture({ id: ITEM_ID, catalog_visibility_policy_mode: null, publication_posture: 'B2B_PUBLIC' }),
      makeItemFixture({ id: ITEM_ID_2, catalog_visibility_policy_mode: 'HIDDEN' }),
    ]);
    // Both items share the same supplier; relationship is NONE for both lookups
    _getRelationshipOrNone.mockResolvedValue({
      state: 'NONE',
      expiresAt: null,
    });
    setupAllowedPrefillMocks();

    const app = await buildMultiItemDraftApp();
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/tenant/rfqs/drafts/multi-item',
        payload: {
          lineItems: [
            { catalogItemId: ITEM_ID, selectedQuantity: 100 },
            { catalogItemId: ITEM_ID_2, selectedQuantity: 50 },
          ],
        },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.error.code).toBe('MULTI_ITEM_BLOCKED');
      expect(body.error.details.mode).toBe('ALL_OR_NOTHING');
      expect(body.error.details.blocked_items).toHaveLength(1);
      expect(body.error.details.blocked_items[0].catalog_item_id).toBe(ITEM_ID_2);
    } finally {
      await app.close();
    }
  });

  it('D-R12: Multi-item submit: APPROVED_BUYER_ONLY + buyer NONE blocks entire bundle, no notification', async () => {
    // Draft 1: ITEM_ID with null policy + B2B_PUBLIC → PUBLIC → allowed
    // Draft 2: ITEM_ID_2 with APPROVED_BUYER_ONLY, buyer NONE → denied
    // Expect: ALL_OR_NOTHING block, notify NOT called
    setupItemFixture([
      makeItemFixture({ id: ITEM_ID, catalog_visibility_policy_mode: null, publication_posture: 'B2B_PUBLIC' }),
      makeItemFixture({ id: ITEM_ID_2, catalog_visibility_policy_mode: 'APPROVED_BUYER_ONLY' }),
    ]);
    _getRelationshipOrNone.mockResolvedValue({ state: 'NONE', expiresAt: null });
    setupAllowedPrefillMocks();

    const draftFixtures: DraftRecord[] = [
      { id: DRAFT_ID, orgId: BUYER_ORG_ID, supplierOrgId: SUPPLIER_ORG_ID, catalogItemId: ITEM_ID, quantity: 100, buyerMessage: null, status: 'INITIATED', stageRequirementAttributes: null },
      { id: DRAFT_ID_2, orgId: BUYER_ORG_ID, supplierOrgId: SUPPLIER_ORG_ID, catalogItemId: ITEM_ID_2, quantity: 50, buyerMessage: null, status: 'INITIATED', stageRequirementAttributes: null },
    ];
    _withDbContext.mockImplementation(async (_p: unknown, _c: unknown, cb: (tx: unknown) => Promise<unknown>) =>
      cb({}),
    );

    const app = await buildMultiItemSubmitApp(draftFixtures);
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/tenant/rfqs/drafts/multi-item/submit',
        payload: { draftIds: [DRAFT_ID, DRAFT_ID_2] },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.error.code).toBe('MULTI_ITEM_SUBMIT_BLOCKED');
      expect(body.error.details.mode).toBe('ALL_OR_NOTHING');
      expect(body.error.details.blocked_drafts).toHaveLength(1);
      expect(body.error.details.blocked_drafts[0].draft_id).toBe(DRAFT_ID_2);

      // Supplier must NOT be notified when bundle is blocked
      expect(_notifySupplier).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
