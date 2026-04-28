import { describe, expect, it } from 'vitest';
import {
  evaluateBuyerCatalogVisibility,
  filterBuyerVisibleCatalogItems,
} from '../services/relationshipAccess.service.js';

type TestItem = {
  id: string;
  supplierOrgId: string;
  visibility?: unknown;
};

const BUYER_ORG_ID = 'buyer-org-uuid-0000-000000000001';
const SUPPLIER_ORG_ID = 'supplier-org-uuid-0000-000000000010';

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return {
    id: 'item-1',
    supplierOrgId: SUPPLIER_ORG_ID,
    ...overrides,
  };
}

describe('relationship catalog visibility helpers', () => {
  it('defaults missing visibility policy to authenticated-only launch behavior', () => {
    const result = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
    });

    expect(result.catalogVisibilityPolicy).toBe('AUTHENTICATED_ONLY');
    expect(result.decision.canAccessCatalog).toBe(true);
  });

  it('keeps public and authenticated-only policies visible to authenticated buyers', () => {
    const publicResult = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: 'PUBLIC',
    });
    const authenticatedOnlyResult = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'NONE',
      catalogVisibilityPolicy: 'AUTHENTICATED_ONLY',
    });

    expect(publicResult.decision.canAccessCatalog).toBe(true);
    expect(authenticatedOnlyResult.decision.canAccessCatalog).toBe(true);
  });

  it('allows approved-only visibility only for approved relationships', () => {
    const approved = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
    });

    expect(approved.decision.canAccessCatalog).toBe(true);
    expect(approved.decision.clientSafeReason).toBe('ACCESS_ALLOWED');
  });

  it.each([
    ['NONE', 'REQUEST_ACCESS'],
    ['REQUESTED', 'ACCESS_PENDING'],
    ['REJECTED', 'ACCESS_DENIED'],
    ['BLOCKED', 'ACCESS_DENIED'],
    ['SUSPENDED', 'ACCESS_DENIED'],
    ['EXPIRED', 'REQUEST_ACCESS'],
    ['REVOKED', 'REQUEST_ACCESS'],
  ] as const)(
    'denies approved-only visibility for %s relationships',
    (relationshipState, clientSafeReason) => {
      const denied = evaluateBuyerCatalogVisibility({
        buyerOrgId: BUYER_ORG_ID,
        supplierOrgId: SUPPLIER_ORG_ID,
        relationshipState,
        catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
      });

      expect(denied.decision.canAccessCatalog).toBe(false);
      expect(denied.decision.clientSafeReason).toBe(clientSafeReason);
    },
  );

  it('denies hidden and future region/channel sensitive policies', () => {
    const hidden = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'HIDDEN',
    });
    const futureBoundary = evaluateBuyerCatalogVisibility({
      buyerOrgId: BUYER_ORG_ID,
      supplierOrgId: SUPPLIER_ORG_ID,
      relationshipState: 'APPROVED',
      catalogVisibilityPolicy: 'REGION_CHANNEL_SENSITIVE',
    });

    expect(hidden.decision.canAccessCatalog).toBe(false);
    expect(hidden.decision.clientSafeReason).toBe('NOT_FOUND');
    expect(futureBoundary.decision.canAccessCatalog).toBe(false);
  });

  it('filters unauthorized items without leaking filtered count', () => {
    const items = [
      makeItem({ id: 'public-default' }),
      makeItem({ id: 'approved-only', visibility: 'APPROVED_BUYER_ONLY' }),
      makeItem({ id: 'hidden-item', visibility: 'HIDDEN' }),
    ];

    const visible = filterBuyerVisibleCatalogItems(items, {
      buyerOrgId: BUYER_ORG_ID,
      relationshipState: 'NONE',
      getSupplierOrgId: item => item.supplierOrgId,
      getCatalogVisibilityPolicy: item => item.visibility,
    });

    expect(visible.map(item => item.id)).toEqual(['public-default']);
    expect(visible).toHaveLength(1);
  });

  it('fails closed for wrong tuple supplier context', () => {
    const visible = filterBuyerVisibleCatalogItems(
      [
        makeItem({
          id: 'approved-only',
          supplierOrgId: '',
          visibility: 'APPROVED_BUYER_ONLY',
        }),
      ],
      {
        buyerOrgId: BUYER_ORG_ID,
        relationshipState: 'APPROVED',
        getSupplierOrgId: item => item.supplierOrgId,
        getCatalogVisibilityPolicy: item => item.visibility,
      },
    );

    expect(visible).toHaveLength(0);
  });
});
