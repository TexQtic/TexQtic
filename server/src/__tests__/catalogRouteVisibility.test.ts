/**
 * Slice C — Route-layer catalog visibility gating tests (I-01 through I-10).
 *
 * Tests combine resolveCatalogVisibilityPolicy (Slice A) with evaluateBuyerCatalogVisibility /
 * filterBuyerVisibleCatalogItems to assert the route-layer gating behavior introduced by Slice C.
 *
 * RELATIONSHIP_GATED → APPROVED_BUYER_ONLY mapping is exercised (Slice C semantics).
 * Backward-compat tests (I-09, I-10) verify NULL catalogVisibilityPolicyMode falls back to
 * publicationPosture correctly.
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateBuyerCatalogVisibility,
  filterBuyerVisibleCatalogItems,
} from '../services/relationshipAccess.service.js';
import { resolveCatalogVisibilityPolicy } from '../services/catalogVisibilityPolicyResolver.js';

const BUYER_ORG_ID = 'buyer-org-uuid-slice-c-000000001';
const SUPPLIER_ORG_ID = 'supplier-org-uuid-slice-c-00000010';

/**
 * Mirrors the route-layer helper `resolveItemCatalogVisibilityForRoute` in tenant.ts.
 * Duplicating the logic here keeps the tests self-contained and validates the spec
 * without importing the route module.
 */
function resolveItemCatalogVisibilityForRoute(item: Record<string, unknown>): string {
  const { policy } = resolveCatalogVisibilityPolicy({
    catalogVisibilityPolicyMode:
      item['catalogVisibilityPolicyMode'] ?? item['catalog_visibility_policy_mode'],
    publicationPosture: item['publicationPosture'] ?? item['publication_posture'],
  });
  if (policy === 'RELATIONSHIP_GATED') {
    return 'APPROVED_BUYER_ONLY';
  }
  return policy;
}

type TestItem = { id: string; supplierOrgId: string; catalogVisibilityPolicyMode?: string | null; publicationPosture?: string | null };

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return { id: 'item-1', supplierOrgId: SUPPLIER_ORG_ID, ...overrides };
}

describe('Slice C — catalog route visibility gating (I-01 to I-10)', () => {
  // ─── Browse-layer filtering ────────────────────────────────────────────────

  it('I-01: APPROVED_BUYER_ONLY item is included for APPROVED buyer', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' });
    const visible = filterBuyerVisibleCatalogItems([item], {
      buyerOrgId: BUYER_ORG_ID,
      relationshipState: 'APPROVED',
      getSupplierOrgId: i => i.supplierOrgId,
      getCatalogVisibilityPolicy: i =>
        resolveItemCatalogVisibilityForRoute(i as unknown as Record<string, unknown>),
    });
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('item-1');
  });

  it('I-02: APPROVED_BUYER_ONLY item is excluded for buyer with NONE relationship', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' });
    const visible = filterBuyerVisibleCatalogItems([item], {
      buyerOrgId: BUYER_ORG_ID,
      relationshipState: 'NONE',
      getSupplierOrgId: i => i.supplierOrgId,
      getCatalogVisibilityPolicy: i =>
        resolveItemCatalogVisibilityForRoute(i as unknown as Record<string, unknown>),
    });
    expect(visible).toHaveLength(0);
  });

  it('I-03: HIDDEN item is excluded for any buyer, even APPROVED relationship', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'HIDDEN' });
    const visible = filterBuyerVisibleCatalogItems([item], {
      buyerOrgId: BUYER_ORG_ID,
      relationshipState: 'APPROVED',
      getSupplierOrgId: i => i.supplierOrgId,
      getCatalogVisibilityPolicy: i =>
        resolveItemCatalogVisibilityForRoute(i as unknown as Record<string, unknown>),
    });
    expect(visible).toHaveLength(0);
  });

  // ─── PDP-layer access ──────────────────────────────────────────────────────

  it('I-04: APPROVED_BUYER_ONLY, buyer APPROVED → canAccessCatalog true', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: policy as never,
    });
    expect(result.decision.canAccessCatalog).toBe(true);
  });

  it('I-05: APPROVED_BUYER_ONLY, buyer NONE → canAccessCatalog false', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: policy as never,
    });
    expect(result.decision.canAccessCatalog).toBe(false);
  });

  it('I-06: HIDDEN item, buyer APPROVED → canAccessCatalog false', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'HIDDEN' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: policy as never,
    });
    expect(result.decision.canAccessCatalog).toBe(false);
  });

  // ─── Catalog gate as RFQ prerequisite ─────────────────────────────────────

  it('I-07: APPROVED_BUYER_ONLY, buyer NONE → catalog gate denies (RFQ prefill prerequisite)', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: policy as never,
    });
    expect(result.decision.canAccessCatalog).toBe(false);
    expect(result.decision.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('I-08: APPROVED_BUYER_ONLY, buyer NONE → catalog gate denies (RFQ submit prerequisite)', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const rfqEligibility = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: policy as never,
    });
    // RFQ submit is gated: catalog access must be true.
    expect(rfqEligibility.decision.canAccessCatalog).toBe(false);
  });

  // ─── Backward compatibility (NULL mode → posture fallback) ────────────────

  it('I-09: NULL mode, B2B_PUBLIC posture, any buyer → ALLOW (backward compat)', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: null, publicationPosture: 'B2B_PUBLIC' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: policy as never,
    });
    expect(result.decision.canAccessCatalog).toBe(true);
  });

  it('I-10: NULL mode, PRIVATE_OR_AUTH_ONLY, authenticated buyer → ALLOW (backward compat)', () => {
    const item = makeItem({ catalogVisibilityPolicyMode: null, publicationPosture: 'PRIVATE_OR_AUTH_ONLY' });
    const policy = resolveItemCatalogVisibilityForRoute(item as unknown as Record<string, unknown>);
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: policy as never,
    });
    // PRIVATE_OR_AUTH_ONLY maps to AUTHENTICATED_ONLY which allows authenticated buyers.
    expect(result.decision.canAccessCatalog).toBe(true);
  });
});
