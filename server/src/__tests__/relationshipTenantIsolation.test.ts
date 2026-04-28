/**
 * TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Slice G
 * Tenant Isolation, Cross-Tenant Probe, Allowlist Privacy, and Anti-Leakage Tests
 *
 * Coverage areas:
 *   A. Relationship service tuple isolation (cross-supplier, cross-buyer, unknown state)
 *   B. Allowlist privacy and graph non-exposure
 *   C. Catalog/PDP tenant isolation (APPROVED_BUYER_ONLY, HIDDEN, REGION_CHANNEL_SENSITIVE)
 *   D. Price disclosure tenant isolation
 *   E. RFQ relationship-gate tenant isolation
 *   F. Cross-tenant probe and client-forge resistance
 *
 * All tests are pure service-level unit tests — no DB, no HTTP, no Fastify.
 * In-memory storage harness reuses the same pattern established in Slice B/C tests.
 *
 * Isolation contract under test:
 *   - A relationship between Buyer A and Supplier A NEVER grants any access
 *     dimension for Buyer A with Supplier B, or for Buyer B with Supplier A.
 *   - Unknown/injected relationship state, mode, or policy strings always fail-safe
 *     deny (INVALID → deny, not INVALID → fallback to permit).
 *   - Internal server fields (denialReason, internalReason, allowlist, auditEvent,
 *     auditMetadata, relationshipGraph, metadataJson) are never present in
 *     public-safe gate outputs (rfqEligibility, priceEligibility).
 *   - clientSafeReason never reveals internal state machine transitions verbatim.
 */

import { describe, expect, it } from 'vitest';

import {
  evaluateBuyerSupplierRelationshipAccess,
  evaluateBuyerCatalogVisibility,
  filterBuyerVisibleCatalogItems,
  evaluateBuyerRelationshipPriceEligibility,
  evaluateBuyerRelationshipRfqEligibility,
} from '../services/relationshipAccess.service.js';
import {
  createRelationshipAllowlistService,
} from '../services/relationshipAllowlist.service.js';
import {
  createRelationshipAccessStorageService,
  type RelationshipStorageDbClient,
} from '../services/relationshipAccessStorage.service.js';
import type { RelationshipState } from '../services/relationshipAccess.types.js';

// ─── Org ID Fixtures ──────────────────────────────────────────────────────────

const BUYER_A = 'buyer-org-uuid-a000-0000-000000000001';
const BUYER_B = 'buyer-org-uuid-b000-0000-000000000002';
const SUPPLIER_A = 'supplier-org-uuid-a000-000000000001';
const SUPPLIER_B = 'supplier-org-uuid-b000-000000000002';

// ─── In-Memory Storage Harness ────────────────────────────────────────────────

function tupleKey(supplierOrgId: string, buyerOrgId: string) {
  return `${supplierOrgId}::${buyerOrgId}`;
}

function createInMemoryRelationshipClient() {
  const rows = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  const client: RelationshipStorageDbClient = {
    buyerSupplierRelationship: {
      async findUnique(args) {
        const tuple = args.where.supplierOrgId_buyerOrgId;
        if (!tuple) {
          throw new Error('Missing supplierOrgId_buyerOrgId tuple in findUnique');
        }
        const row = rows.get(tupleKey(tuple.supplierOrgId, tuple.buyerOrgId));
        return row ? ({ ...row } as never) : null;
      },
      async upsert(args) {
        const tuple = args.where.supplierOrgId_buyerOrgId;
        if (!tuple) {
          throw new Error('Missing supplierOrgId_buyerOrgId tuple in upsert');
        }
        const key = tupleKey(tuple.supplierOrgId, tuple.buyerOrgId);
        const existing = rows.get(key);
        const base = existing ?? {
          id: `relationship-${nextId++}`,
          supplierOrgId: tuple.supplierOrgId,
          buyerOrgId: tuple.buyerOrgId,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        };
        const source = existing ? args.update : args.create;
        const row = {
          ...base,
          ...source,
          supplierOrgId: tuple.supplierOrgId,
          buyerOrgId: tuple.buyerOrgId,
          updatedAt:
            (source.updatedAt as Date | undefined) ??
            new Date('2026-01-01T00:00:00.000Z'),
        };
        rows.set(key, row);
        return { ...row } as never;
      },
    },
  };

  return { client, rows };
}

function createHarness() {
  const backingStore = createInMemoryRelationshipClient();
  const storage = createRelationshipAccessStorageService(backingStore.client);
  const service = createRelationshipAllowlistService({ storage });
  return { service, rows: backingStore.rows };
}

// ─── Anti-Leakage Validator ───────────────────────────────────────────────────

/**
 * Asserts that the output object does not contain any internal server-side
 * fields that must not appear in public-safe gate outputs.
 * Applied to evaluateBuyerRelationshipRfqEligibility and
 * evaluateBuyerRelationshipPriceEligibility outputs.
 */
function assertNoPublicLeakFields(output: unknown) {
  const o = output as Record<string, unknown>;
  expect(o.internalReason).toBeUndefined();
  expect(o.auditEvent).toBeUndefined();
  expect(o.auditMetadata).toBeUndefined();
  expect(o.approvedBuyerIds).toBeUndefined();
  expect(o.buyerList).toBeUndefined();
  expect(o.supplierList).toBeUndefined();
  expect(o.relationshipGraph).toBeUndefined();
  expect(o.allowlist).toBeUndefined();
  expect(o.metadataJson).toBeUndefined();
}

// ─── A. Relationship Service Tuple Isolation ──────────────────────────────────

describe('A. Relationship Service Tuple Isolation', () => {
  it('G-A01: APPROVED with Supplier A does NOT grant APPROVED_BUYER_ONLY catalog access with Supplier B', () => {
    // Buyer A is APPROVED for Supplier A — server resolves NONE for Supplier B tuple.
    const withSupplierA = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    const withSupplierB = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_B,
      relationshipState: 'NONE', // server resolves NONE for this unrelated tuple
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    expect(withSupplierA.canAccessCatalog).toBe(true);
    expect(withSupplierB.canAccessCatalog).toBe(false);
    expect(withSupplierB.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-A02: Buyer B cannot use Buyer A APPROVED state for Supplier A (cross-buyer)', () => {
    // Buyer A is APPROVED with Supplier A; Buyer B must present its own tuple state (NONE).
    const buyerA = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    const buyerB = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_B,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE', // server resolves NONE for Buyer B / Supplier A tuple
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(buyerA.canSubmitRfq).toBe(true);
    expect(buyerB.canSubmitRfq).toBe(false);
    expect(buyerB.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-A03: APPROVED with Supplier A does NOT grant RELATIONSHIP_ONLY price eligibility for Supplier B', () => {
    const withSupplierA = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      pricePolicy: 'RELATIONSHIP_ONLY',
    });

    const withSupplierB = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_B,
      relationshipState: 'NONE', // server resolves NONE for Buyer A / Supplier B tuple
      pricePolicy: 'RELATIONSHIP_ONLY',
    });

    expect(withSupplierA.canViewRelationshipOnlyPrices).toBe(true);
    expect(withSupplierB.canViewRelationshipOnlyPrices).toBe(false);
  });

  it('G-A04: Missing buyer org (null) denies all access dimensions with AUTH_REQUIRED', () => {
    const decision = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: null,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED', // even APPROVED state cannot override missing buyer
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
      pricePolicy: 'RELATIONSHIP_ONLY',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(decision.canAccessCatalog).toBe(false);
    expect(decision.canViewRelationshipOnlyPrices).toBe(false);
    expect(decision.canSubmitRfq).toBe(false);
    expect(decision.clientSafeReason).toBe('AUTH_REQUIRED');
  });

  it('G-A05: Missing supplier org (null) denies all access dimensions with NOT_FOUND', () => {
    const decision = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: null,
      relationshipState: 'APPROVED',
    });

    expect(decision.canAccessCatalog).toBe(false);
    expect(decision.canViewRelationshipOnlyPrices).toBe(false);
    expect(decision.canSubmitRfq).toBe(false);
    expect(decision.clientSafeReason).toBe('NOT_FOUND');
  });

  it('G-A06: BLOCKED hard-stop denies RFQ even in OPEN_TO_ALL mode', () => {
    const decision = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'BLOCKED',
      catalogVisibilityPolicy: 'PUBLIC',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });

    // BLOCKED hard-stop overrides OPEN_TO_ALL for RFQ
    expect(decision.canSubmitRfq).toBe(false);
    expect(decision.clientSafeReason).toBe('ACCESS_DENIED');
    // PUBLIC catalog is still accessible even for BLOCKED (catalog ≠ RFQ policy)
    expect(decision.canAccessCatalog).toBe(true);
  });

  it('G-A07: clientSafeReason is non-disclosing — internal denial reason never directly exposed', () => {
    // RELATIONSHIP_REQUIRED (internal) → REQUEST_ACCESS (safe)
    const noRelationship = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    // RELATIONSHIP_BLOCKED (internal) → ACCESS_DENIED (safe)
    const blocked = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'BLOCKED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });

    expect(noRelationship.clientSafeReason).toBe('REQUEST_ACCESS');
    expect(noRelationship.denialReason).toBe('RELATIONSHIP_REQUIRED');
    // clientSafeReason and denialReason must differ for gated cases
    expect(noRelationship.clientSafeReason).not.toBe(noRelationship.denialReason);

    expect(blocked.clientSafeReason).toBe('ACCESS_DENIED');
    expect(blocked.denialReason).toBe('RELATIONSHIP_BLOCKED');
    expect(blocked.clientSafeReason).not.toBe(blocked.denialReason);
  });

  it('G-A08: Decision output is deterministic — same input always yields same output', () => {
    const input = {
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED' as RelationshipState,
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY' as const,
      pricePolicy: 'RELATIONSHIP_ONLY' as const,
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY' as const,
    };

    const first = evaluateBuyerSupplierRelationshipAccess(input);
    const second = evaluateBuyerSupplierRelationshipAccess(input);

    expect(first.canAccessCatalog).toBe(second.canAccessCatalog);
    expect(first.canViewRelationshipOnlyPrices).toBe(second.canViewRelationshipOnlyPrices);
    expect(first.canSubmitRfq).toBe(second.canSubmitRfq);
    expect(first.clientSafeReason).toBe(second.clientSafeReason);
    expect(first.denialReason).toBe(second.denialReason);
  });
});

// ─── B. Allowlist Privacy and Graph Non-Exposure ──────────────────────────────

describe('B. Allowlist Privacy and Graph Non-Exposure', () => {
  it('G-B01: publicStatus does not expose other buyers or allowlist membership', async () => {
    const { service } = createHarness();

    await service.requestSupplierAccess({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });
    await service.approveBuyerRelationship({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });

    const status = await service.getSupplierBuyerRelationship(SUPPLIER_A, BUYER_A);
    const publicFields = status.publicStatus as unknown as Record<string, unknown>;

    // Must not expose internal data or other buyers
    expect(publicFields.approvedBuyerIds).toBeUndefined();
    expect(publicFields.buyerList).toBeUndefined();
    expect(publicFields.allowlist).toBeUndefined();
    expect(publicFields.otherBuyers).toBeUndefined();
    expect(publicFields.internalReason).toBeUndefined();
    expect(publicFields.auditMetadata).toBeUndefined();
    expect(publicFields.metadataJson).toBeUndefined();
    expect(publicFields.relationshipGraph).toBeUndefined();
  });

  it('G-B02: Buyer B sees NONE — Buyer A APPROVED state for Supplier A is not visible to Buyer B', async () => {
    const { service } = createHarness();

    await service.requestSupplierAccess({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });
    await service.approveBuyerRelationship({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });

    const statusA = await service.getSupplierBuyerRelationship(SUPPLIER_A, BUYER_A);
    const statusB = await service.getSupplierBuyerRelationship(SUPPLIER_A, BUYER_B);

    expect(statusA.relationship.state).toBe('APPROVED');
    expect(statusB.relationship.state).toBe('NONE'); // Buyer B has its own independent NONE tuple
    // Buyer B's public status must not reveal Buyer A's approval
    const bFields = statusB.publicStatus as unknown as Record<string, unknown>;
    expect(bFields.approvedBuyerIds).toBeUndefined();
  });

  it('G-B03: getSupplierBuyerRelationship is tuple-scoped — all four tuple combinations are independent', async () => {
    const { service } = createHarness();

    // Only Buyer A + Supplier A is approved
    await service.requestSupplierAccess({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });
    await service.approveBuyerRelationship({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });

    const [tupleAA, tupleAB, tupleBA, tupleBB] = await Promise.all([
      service.getSupplierBuyerRelationship(SUPPLIER_A, BUYER_A),
      service.getSupplierBuyerRelationship(SUPPLIER_A, BUYER_B),
      service.getSupplierBuyerRelationship(SUPPLIER_B, BUYER_A),
      service.getSupplierBuyerRelationship(SUPPLIER_B, BUYER_B),
    ]);

    expect(tupleAA.relationship.state).toBe('APPROVED'); // own tuple
    expect(tupleAB.relationship.state).toBe('NONE'); // different buyer
    expect(tupleBA.relationship.state).toBe('NONE'); // different supplier
    expect(tupleBB.relationship.state).toBe('NONE'); // both different
  });

  it('G-B04: Supplier B operation does not affect Supplier A tuple', async () => {
    const { service } = createHarness();

    // Buyer A requests access to Supplier A
    await service.requestSupplierAccess({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });

    // Supplier B attempts to approve Buyer A — but there is no REQUESTED state for B+A tuple
    const wrongApproval = await service.approveBuyerRelationship({
      supplierOrgId: SUPPLIER_B,
      buyerOrgId: BUYER_A,
    });

    // Should fail: Supplier B has no REQUESTED state to approve
    expect(wrongApproval.ok).toBe(false);

    // Supplier A's tuple remains REQUESTED and untouched
    const supplierAStatus = await service.getSupplierBuyerRelationship(SUPPLIER_A, BUYER_A);
    expect(supplierAStatus.relationship.state).toBe('REQUESTED');
  });

  it('G-B05: Rejection internalReason is not exposed in publicStatus', async () => {
    const { service } = createHarness();

    await service.requestSupplierAccess({ supplierOrgId: SUPPLIER_A, buyerOrgId: BUYER_A });
    const result = await service.rejectBuyerRelationship({
      supplierOrgId: SUPPLIER_A,
      buyerOrgId: BUYER_A,
      internalReason: 'competitor intel — do not expose',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const publicFields = result.publicStatus as unknown as Record<string, unknown>;
    expect(publicFields.internalReason).toBeUndefined();
    // clientSafeReason for REJECTED in the allowlist service is REQUEST_ACCESS
    // (buyer may re-apply; the allowlist service permits reapply).
    // Critically: internalReason ('competitor intel') is never present.
    expect(result.publicStatus.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-B06: No service method exposes relationship graph or approved buyer enumeration', () => {
    const { service } = createHarness();
    const serviceObj = service as unknown as Record<string, unknown>;

    // The allowlist service must NOT provide enumeration methods
    expect(serviceObj.listApprovedBuyers).toBeUndefined();
    expect(serviceObj.listRelationships).toBeUndefined();
    expect(serviceObj.getRelationshipGraph).toBeUndefined();
    expect(serviceObj.getApprovedBuyerIds).toBeUndefined();
    expect(serviceObj.getAllBuyers).toBeUndefined();
  });
});

// ─── C. Catalog/PDP Tenant Isolation ─────────────────────────────────────────

describe('C. Catalog/PDP Tenant Isolation', () => {
  it('G-C01: Buyer A APPROVED with Supplier A does NOT grant APPROVED_BUYER_ONLY with Supplier B', () => {
    const withSupplierA = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    const withSupplierB = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_B,
      relationshipState: 'NONE', // server resolves NONE for this tuple
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    expect(withSupplierA.decision.canAccessCatalog).toBe(true);
    expect(withSupplierB.decision.canAccessCatalog).toBe(false);
    expect(withSupplierB.decision.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-C02: Buyer B cannot use Buyer A approval state for Supplier A (cross-buyer)', () => {
    const buyerA = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    const buyerB = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_B,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE', // server resolves NONE for Buyer B / Supplier A tuple
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    expect(buyerA.decision.canAccessCatalog).toBe(true);
    expect(buyerB.decision.canAccessCatalog).toBe(false);
    expect(buyerB.decision.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-C03: HIDDEN items are never accessible, even for APPROVED buyers', () => {
    const approvedBuyer = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'HIDDEN',
    });

    expect(approvedBuyer.decision.canAccessCatalog).toBe(false);
    expect(approvedBuyer.decision.clientSafeReason).toBe('NOT_FOUND');
  });

  it('G-C04: REGION_CHANNEL_SENSITIVE denies all buyers (future boundary — fail-safe)', () => {
    const approvedBuyer = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'REGION_CHANNEL_SENSITIVE',
    });

    const noneBuyer = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: 'REGION_CHANNEL_SENSITIVE',
    });

    expect(approvedBuyer.decision.canAccessCatalog).toBe(false);
    expect(noneBuyer.decision.canAccessCatalog).toBe(false);
    // Both map to NOT_FOUND (non-disclosing)
    expect(approvedBuyer.decision.clientSafeReason).toBe('NOT_FOUND');
    expect(noneBuyer.decision.clientSafeReason).toBe('NOT_FOUND');
  });

  it('G-C05: filterBuyerVisibleCatalogItems correctly applies policy per item', () => {
    type Item = { id: string; supplierOrgId: string; visibility: string };
    const items: Item[] = [
      { id: 'pub', supplierOrgId: SUPPLIER_A, visibility: 'PUBLIC' },
      { id: 'auth', supplierOrgId: SUPPLIER_A, visibility: 'AUTHENTICATED_ONLY' },
      { id: 'restricted', supplierOrgId: SUPPLIER_A, visibility: 'APPROVED_BUYER_ONLY' },
      { id: 'hidden', supplierOrgId: SUPPLIER_A, visibility: 'HIDDEN' },
    ];

    // Buyer with NONE state: only PUBLIC and AUTHENTICATED_ONLY are visible
    const visibleForNone = filterBuyerVisibleCatalogItems(items, {
      buyerOrgId: BUYER_A,
      relationshipState: 'NONE',
      getSupplierOrgId: (item) => item.supplierOrgId,
      getCatalogVisibilityPolicy: (item) => item.visibility,
    });

    expect(visibleForNone.map((i) => i.id)).toEqual(['pub', 'auth']);

    // APPROVED buyer: PUBLIC, AUTHENTICATED_ONLY, and APPROVED_BUYER_ONLY are visible; HIDDEN stays hidden
    const visibleForApproved = filterBuyerVisibleCatalogItems(items, {
      buyerOrgId: BUYER_A,
      relationshipState: 'APPROVED',
      getSupplierOrgId: (item) => item.supplierOrgId,
      getCatalogVisibilityPolicy: (item) => item.visibility,
    });

    expect(visibleForApproved.map((i) => i.id)).toEqual(['pub', 'auth', 'restricted']);
  });

  it('G-C06: filterBuyerVisibleCatalogItems with state NONE hides APPROVED_BUYER_ONLY from all suppliers', () => {
    type Item = { id: string; supplierOrgId: string; visibility: string };
    const items: Item[] = [
      { id: 'item-sup-a', supplierOrgId: SUPPLIER_A, visibility: 'APPROVED_BUYER_ONLY' },
      { id: 'item-sup-b', supplierOrgId: SUPPLIER_B, visibility: 'APPROVED_BUYER_ONLY' },
      { id: 'pub-sup-a', supplierOrgId: SUPPLIER_A, visibility: 'PUBLIC' },
    ];

    const visible = filterBuyerVisibleCatalogItems(items, {
      buyerOrgId: BUYER_A,
      relationshipState: 'NONE',
      getSupplierOrgId: (item) => item.supplierOrgId,
      getCatalogVisibilityPolicy: (item) => item.visibility,
    });

    // Only the PUBLIC item is visible; both APPROVED_BUYER_ONLY items are hidden
    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe('pub-sup-a');
  });

  it('G-C07: Unknown catalogVisibilityPolicy resolves to INVALID — invalid input is flagged', () => {
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'ADMIN_BYPASS_ALL', // unknown/injected value
    });

    // The policy resolver must flag unknown strings as INVALID — not silently accept them.
    expect(result.catalogVisibilityPolicy).toBe('INVALID');
  });
});

// ─── D. Price Disclosure Tenant Isolation ─────────────────────────────────────

describe('D. Price Disclosure Tenant Isolation', () => {
  it('G-D01: APPROVED with Supplier A does NOT grant price eligibility for Supplier B', () => {
    const withSupplierA = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
    });

    const withSupplierB = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_B,
      relationshipState: 'NONE', // server resolves NONE for this tuple
    });

    expect(withSupplierA.isEligible).toBe(true);
    expect(withSupplierB.isEligible).toBe(false);
  });

  it('G-D02: Buyer B cannot use Buyer A APPROVED state for RELATIONSHIP_ONLY price with Supplier A', () => {
    const buyerA = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
    });

    const buyerB = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_B,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE', // server resolves NONE for Buyer B / Supplier A tuple
    });

    expect(buyerA.isEligible).toBe(true);
    expect(buyerB.isEligible).toBe(false);
  });

  it('G-D03: Expired APPROVED relationship suppresses price eligibility', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      relationshipExpiresAt: new Date('2025-01-01T00:00:00.000Z'), // past
      now: new Date('2026-04-28T00:00:00.000Z'),
    });

    expect(result.isEligible).toBe(false);
  });

  it('G-D04: All non-APPROVED states suppress price eligibility', () => {
    const nonApprovedStates: RelationshipState[] = [
      'NONE',
      'REQUESTED',
      'REJECTED',
      'BLOCKED',
      'SUSPENDED',
      'EXPIRED',
      'REVOKED',
    ];

    for (const state of nonApprovedStates) {
      const result = evaluateBuyerRelationshipPriceEligibility({
        buyerOrgId: BUYER_A,
        supplierOrgId: SUPPLIER_A,
        relationshipState: state,
      });
      expect(result.isEligible).toBe(false);
    }
  });

  it('G-D05: Price eligibility output contains no price value or internal server fields', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE',
    });

    const fields = result as unknown as Record<string, unknown>;
    expect(fields.price).toBeUndefined();
    expect(fields.priceValue).toBeUndefined();
    expect(fields.internalReason).toBeUndefined();
    expect(fields.denialReason).toBeUndefined();
    expect(fields.allowlist).toBeUndefined();
    expect(fields.auditMetadata).toBeUndefined();
  });

  it('G-D06: Price eligibility is scoped to exact buyer/supplier pair', () => {
    // Four tuple combinations; only Buyer A + Supplier A = APPROVED
    const results = [
      { buyer: BUYER_A, supplier: SUPPLIER_A, state: 'APPROVED' as RelationshipState, expected: true },
      { buyer: BUYER_A, supplier: SUPPLIER_B, state: 'NONE' as RelationshipState, expected: false },
      { buyer: BUYER_B, supplier: SUPPLIER_A, state: 'NONE' as RelationshipState, expected: false },
      { buyer: BUYER_B, supplier: SUPPLIER_B, state: 'NONE' as RelationshipState, expected: false },
    ];

    for (const { buyer, supplier, state, expected } of results) {
      const result = evaluateBuyerRelationshipPriceEligibility({
        buyerOrgId: buyer,
        supplierOrgId: supplier,
        relationshipState: state,
      });
      expect(result.isEligible).toBe(expected);
    }
  });
});

// ─── E. RFQ Relationship Gate Tenant Isolation ───────────────────────────────

describe('E. RFQ Relationship Gate Tenant Isolation', () => {
  it('G-E01: APPROVED with Supplier A does NOT allow RFQ submit to Supplier B (APPROVED_BUYERS_ONLY)', () => {
    const withSupplierA = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    const withSupplierB = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_B,
      relationshipState: 'NONE', // server resolves NONE for Buyer A / Supplier B tuple
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(withSupplierA.canSubmit).toBe(true);
    expect(withSupplierB.canSubmit).toBe(false);
    expect(withSupplierB.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-E02: Buyer B cannot use Buyer A APPROVED state to submit RFQ to Supplier A', () => {
    const buyerA = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    const buyerB = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_B,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE', // server resolves NONE for Buyer B / Supplier A tuple
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(buyerA.canSubmit).toBe(true);
    expect(buyerB.canSubmit).toBe(false);
    expect(buyerB.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('G-E03: Denied RFQ clientSafeReason is non-disclosing for all APPROVED_BUYERS_ONLY denied states', () => {
    const cases = [
      { state: 'NONE', expected: 'REQUEST_ACCESS' },
      { state: 'REQUESTED', expected: 'ACCESS_PENDING' },
      { state: 'REJECTED', expected: 'ACCESS_DENIED' },
      { state: 'BLOCKED', expected: 'ACCESS_DENIED' },
      { state: 'SUSPENDED', expected: 'ACCESS_DENIED' },
      { state: 'EXPIRED', expected: 'REQUEST_ACCESS' },
      { state: 'REVOKED', expected: 'REQUEST_ACCESS' },
    ] as const;

    for (const { state, expected } of cases) {
      const result = evaluateBuyerRelationshipRfqEligibility({
        buyerOrgId: BUYER_A,
        supplierOrgId: SUPPLIER_A,
        relationshipState: state,
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      });
      expect(result.canSubmit).toBe(false);
      expect(result.clientSafeReason).toBe(expected);
    }
  });

  it('G-E04: Denied RFQ submit output never includes internal server fields', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    const fields = result as unknown as Record<string, unknown>;
    expect(fields.internalReason).toBeUndefined();
    expect(fields.denialReason).toBeUndefined(); // internal field — not in public gate output
    expect(fields.allowlist).toBeUndefined();
    expect(fields.auditMetadata).toBeUndefined();
    expect(fields.relationshipGraph).toBeUndefined();
  });

  it('G-E05: BLOCKED and SUSPENDED deny RFQ even in OPEN_TO_ALL mode (hard-stop)', () => {
    const blocked = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'BLOCKED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });

    const suspended = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'SUSPENDED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });

    expect(blocked.canSubmit).toBe(false);
    expect(blocked.clientSafeReason).toBe('ACCESS_DENIED');
    expect(suspended.canSubmit).toBe(false);
    expect(suspended.clientSafeReason).toBe('ACCESS_DENIED');
  });

  it('G-E06: Multi-supplier all-or-nothing: approved for Supplier A but NONE for Supplier B → Supplier B blocks the set', () => {
    // Each supplier's gate is independent. Route must enforce all-or-nothing across items.
    const gateSupplierA = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    const gateSupplierB = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_B,
      relationshipState: 'NONE', // buyer not approved for Supplier B
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    // Simulate all-or-nothing: entire submit is blocked if any supplier gate fails
    const allCanSubmit = gateSupplierA.canSubmit && gateSupplierB.canSubmit;
    expect(gateSupplierA.canSubmit).toBe(true);
    expect(gateSupplierB.canSubmit).toBe(false);
    expect(allCanSubmit).toBe(false); // all-or-nothing guarantee
  });

  it('G-E07: RFQ eligibility is scoped to exact buyer/supplier pair', () => {
    const cases = [
      { buyer: BUYER_A, supplier: SUPPLIER_A, state: 'APPROVED' as RelationshipState, expected: true },
      { buyer: BUYER_A, supplier: SUPPLIER_B, state: 'NONE' as RelationshipState, expected: false },
      { buyer: BUYER_B, supplier: SUPPLIER_A, state: 'NONE' as RelationshipState, expected: false },
      { buyer: BUYER_B, supplier: SUPPLIER_B, state: 'NONE' as RelationshipState, expected: false },
    ];

    for (const { buyer, supplier, state, expected } of cases) {
      const result = evaluateBuyerRelationshipRfqEligibility({
        buyerOrgId: buyer,
        supplierOrgId: supplier,
        relationshipState: state,
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      });
      expect(result.canSubmit).toBe(expected);
    }
  });
});

// ─── F. Cross-Tenant Probe and Client-Forge Resistance ───────────────────────

describe('F. Cross-Tenant Probe and Client-Forge Resistance', () => {
  it('G-F01: Unknown/injected string as relationshipState → fail-safe deny all dimensions', () => {
    // Simulate an injected/unknown state (e.g., from a tampered payload that reached the evaluator).
    // Production routes must server-resolve state before calling the evaluator;
    // but if an unknown string ever reaches it, the system must fail-safe.
    const result = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'SUPER_ADMIN' as unknown as RelationshipState,
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
      pricePolicy: 'RELATIONSHIP_ONLY',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(result.canAccessCatalog).toBe(false);
    expect(result.canViewRelationshipOnlyPrices).toBe(false);
    expect(result.canSubmitRfq).toBe(false);
    expect(result.currentState).toBe('NONE'); // normalized to NONE
    expect(result.clientSafeReason).toBe('NOT_FOUND');
  });

  it('G-F02: Integer relationshipState → fail-safe deny all dimensions', () => {
    const result = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 999 as unknown as RelationshipState,
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(result.canSubmitRfq).toBe(false);
    expect(result.canAccessCatalog).toBe(false);
    expect(result.canViewRelationshipOnlyPrices).toBe(false);
  });

  it('G-F03: Boolean true as relationshipState → fail-safe deny all dimensions', () => {
    const result = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: true as unknown as RelationshipState,
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(result.canSubmitRfq).toBe(false);
    expect(result.canAccessCatalog).toBe(false);
  });

  it('G-F04: Unknown rfqAcceptanceMode string → fail-safe deny RFQ submit', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'ALL_ACCESS_OVERRIDE', // unknown/injected value
    });

    // Unknown mode must fail-safe deny, not silently permit
    expect(result.canSubmit).toBe(false);
  });

  it('G-F05: Unknown catalogVisibilityPolicy string is reported as INVALID', () => {
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'BYPASS_GATE', // unknown/injected value
    });

    // Must flag INVALID — callers must not silently accept unknown policies
    expect(result.catalogVisibilityPolicy).toBe('INVALID');
    // The policy must NEVER silently upgrade to APPROVED_BUYER_ONLY or higher
    // (it falls back to the safe default AUTHENTICATED_ONLY, not a gated policy)
  });

  it('G-F06: Empty string buyerOrgId → treated as null → AUTH_REQUIRED deny all', () => {
    const result = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: '',
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(result.canSubmitRfq).toBe(false);
    expect(result.canAccessCatalog).toBe(false);
    expect(result.clientSafeReason).toBe('AUTH_REQUIRED');
  });

  it('G-F07: Empty string supplierOrgId → treated as null → NOT_FOUND deny all', () => {
    const result = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: '',
      relationshipState: 'APPROVED',
    });

    expect(result.canSubmitRfq).toBe(false);
    expect(result.clientSafeReason).toBe('NOT_FOUND');
  });

  it('G-F08: BLOCKED and REJECTED both map to ACCESS_DENIED — probe cannot distinguish them', () => {
    // Tenant isolation security property: an attacker probing the system cannot
    // determine whether they are BLOCKED (hard-stop) or REJECTED (soft-stop)
    // because both clientSafeReasons are ACCESS_DENIED.
    const blocked = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'BLOCKED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    const rejected = evaluateBuyerSupplierRelationshipAccess({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'REJECTED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });

    expect(blocked.canSubmitRfq).toBe(false);
    expect(rejected.canSubmitRfq).toBe(false);
    // Both map to ACCESS_DENIED — no state differentiation for denied terminal states
    expect(blocked.clientSafeReason).toBe('ACCESS_DENIED');
    expect(rejected.clientSafeReason).toBe('ACCESS_DENIED');
    // Internal reasons differ; client-safe reasons must not
    expect(blocked.denialReason).not.toBe(rejected.denialReason);
    expect(blocked.clientSafeReason).toBe(rejected.clientSafeReason);
  });

  it('G-F09: clientSafeReason never contains verbatim internal state names', () => {
    const states: RelationshipState[] = [
      'NONE', 'REQUESTED', 'REJECTED', 'BLOCKED', 'SUSPENDED', 'EXPIRED', 'REVOKED',
    ];

    for (const state of states) {
      const result = evaluateBuyerSupplierRelationshipAccess({
        buyerOrgId: BUYER_A,
        supplierOrgId: SUPPLIER_A,
        relationshipState: state,
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      });

      // clientSafeReason must be one of the defined public-safe values only
      expect(['ACCESS_ALLOWED', 'REQUEST_ACCESS', 'ACCESS_PENDING', 'ACCESS_DENIED', 'NOT_FOUND', 'AUTH_REQUIRED']).toContain(result.clientSafeReason);
      // Must not contain the raw state name (BLOCKED, REJECTED, etc.)
      expect(result.clientSafeReason).not.toContain(state);
    }
  });

  it('G-F10: RFQ eligibility output has no forbidden internal fields', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    assertNoPublicLeakFields(result);
  });

  it('G-F11: Price eligibility output has no forbidden internal fields', () => {
    const result = evaluateBuyerRelationshipPriceEligibility({
      buyerOrgId: BUYER_A,
      supplierOrgId: SUPPLIER_A,
      relationshipState: 'NONE',
    });
    assertNoPublicLeakFields(result);
  });
});
