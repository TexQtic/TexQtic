/**
 * TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Relationship Access Evaluator Tests
 * Slice A: Unit tests for deterministic access decision logic
 *
 * Test coverage includes:
 *   - Missing/null input normalization
 *   - All relationship states (APPROVED, NONE, REQUESTED, REJECTED, BLOCKED, SUSPENDED, EXPIRED, REVOKED)
 *   - All catalog visibility policies (PUBLIC, AUTHENTICATED_ONLY, APPROVED_BUYER_ONLY, HIDDEN)
 *   - All price policies (VISIBLE, RELATIONSHIP_ONLY, HIDDEN)
 *   - All RFQ acceptance modes (OPEN_TO_ALL, APPROVED_BUYERS_ONLY)
 *   - Expiry timestamp handling
 *   - Default policy application
 *   - Deterministic consistency
 *   - Anti-leakage (no forbidden fields in output)
 *   - Client-safe reason mapping
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateBuyerSupplierRelationshipAccess,
  createRelationshipAccessEvaluator,
} from '../services/relationshipAccess.service.js';
import type {
  RelationshipAccessInput,
  RelationshipAccessConfig,
  RelationshipAccessDecision,
  RelationshipState,
} from '../services/relationshipAccess.types.js';

// ─── Shared Test Fixtures ─────────────────────────────────────────────────────

const BUYER_ORG_ID = 'buyer-org-uuid-0000-000000000001';
const SUPPLIER_ORG_ID = 'supplier-org-uuid-00-000000000001';

function makeInput(
  overrides?: Partial<RelationshipAccessInput>,
): RelationshipAccessInput {
  return {
    buyerOrgId: BUYER_ORG_ID,
    supplierOrgId: SUPPLIER_ORG_ID,
    relationshipState: 'NONE',
    ...overrides,
  };
}

// ─── Anti-Leakage Validators ──────────────────────────────────────────────────

/**
 * Verify that output contains no forbidden fields.
 */
function verifyNoForbiddenFields(decision: RelationshipAccessDecision) {
  // Output must NOT include these fields
  const output = decision as unknown as Record<string, unknown>;
  expect(output.allowlist).toBeUndefined();
  expect(output.auditEvent).toBeUndefined();
  expect(output.auditMetadata).toBeUndefined();
  expect(output.relationshipGraph).toBeUndefined();
  expect(output.supplierList).toBeUndefined();
  expect(output.buyerList).toBeUndefined();
  expect(output.riskScore).toBeUndefined();
  expect(output.buyerScore).toBeUndefined();
  expect(output.supplierScore).toBeUndefined();
  expect(output.ranking).toBeUndefined();
  expect(output.publicationPosture).toBeUndefined();
  expect(output.competitorStatus).toBeUndefined();
  expect(output.aiMatchingData).toBeUndefined();
  expect(output.dppUnpublishedEvidence).toBeUndefined();
  expect(output.paymentData).toBeUndefined();
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('RelationshipAccessEvaluator', () => {
  describe('Missing Input Handling', () => {
    // T1: Missing buyer org
    it('T1: Missing buyer org denies all with AUTH_REQUIRED', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ buyerOrgId: null }),
      );

      expect(decision.buyerOrgId).toBeNull();
      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.denialReason).toBe('BUYER_ORG_REQUIRED');
      expect(decision.clientSafeReason).toBe('AUTH_REQUIRED');
    });

    it('T1b: Empty buyer org is treated as null', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ buyerOrgId: '' }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('BUYER_ORG_REQUIRED');
    });

    // T2: Missing supplier org
    it('T2: Missing supplier org denies all', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ supplierOrgId: null }),
      );

      expect(decision.supplierOrgId).toBeNull();
      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.denialReason).toBe('SUPPLIER_ORG_REQUIRED');
      expect(decision.clientSafeReason).toBe('NOT_FOUND');
    });

    it('T2b: Empty supplier org is treated as null', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ supplierOrgId: '' }),
      );

      expect(decision.denialReason).toBe('SUPPLIER_ORG_REQUIRED');
    });
  });

  describe('Relationship State Normalization', () => {
    // T3: Null state normalizes to NONE
    it('T3: Null relationship state normalizes to NONE', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ relationshipState: null }),
      );

      expect(decision.currentState).toBe('NONE');
      expect(decision.hasApprovedRelationship).toBe(false);
    });

    it('T3b: Undefined state normalizes to NONE', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ relationshipState: undefined }),
      );

      expect(decision.currentState).toBe('NONE');
    });

    // T4: Unknown state fails safe
    it('T4: Unknown relationship state fails safe with UNSUPPORTED_POLICY', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'INVALID_STATE' as unknown as RelationshipState,
        }),
      );

      expect(decision.currentState).toBe('NONE');
      expect(decision.denialReason).toBe('UNSUPPORTED_POLICY');
      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
    });
  });

  describe('APPROVED State Behavior', () => {
    // T5: APPROVED grants approved-only catalog access
    it('T5: APPROVED grants APPROVED_BUYER_ONLY catalog access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.hasApprovedRelationship).toBe(true);
      expect(decision.canAccessCatalog).toBe(true);
      expect(decision.denialReason).toBe('NONE');
      expect(decision.clientSafeReason).toBe('ACCESS_ALLOWED');
    });

    // T6: APPROVED grants relationship-only price access
    it('T6: APPROVED grants RELATIONSHIP_ONLY price access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          pricePolicy: 'RELATIONSHIP_ONLY',
        }),
      );

      expect(decision.canViewRelationshipOnlyPrices).toBe(true);
      expect(decision.denialReason).toBe('NONE');
    });

    // T7: APPROVED grants APPROVED_BUYERS_ONLY RFQ
    it('T7: APPROVED grants APPROVED_BUYERS_ONLY RFQ access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        }),
      );

      expect(decision.canSubmitRfq).toBe(true);
      expect(decision.denialReason).toBe('NONE');
    });

    // T8: APPROVED still cannot access HIDDEN catalog
    it('T8: APPROVED cannot access HIDDEN catalog', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          catalogVisibilityPolicy: 'HIDDEN',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('CATALOG_HIDDEN');
    });

    // T9: APPROVED still cannot view HIDDEN price
    it('T9: APPROVED cannot view HIDDEN price', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          pricePolicy: 'HIDDEN',
        }),
      );

      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
      expect(decision.denialReason).toBe('ACCESS_DENIED');
    });
  });

  describe('NONE State Behavior', () => {
    // T10: NONE denies approved-only catalog
    it('T10: NONE denies APPROVED_BUYER_ONLY catalog access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_REQUIRED');
      expect(decision.clientSafeReason).toBe('REQUEST_ACCESS');
    });

    // T11: NONE denies relationship-only price
    it('T11: NONE denies RELATIONSHIP_ONLY price access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          pricePolicy: 'RELATIONSHIP_ONLY',
        }),
      );

      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_REQUIRED');
    });

    // T12: NONE denies approved-buyers-only RFQ
    it('T12: NONE denies APPROVED_BUYERS_ONLY RFQ access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        }),
      );

      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_REQUIRED');
    });
  });

  describe('Relationship State Denials', () => {
    // T13: REQUESTED denies gated access with PENDING reason
    it('T13: REQUESTED denies gated access with pending client reason', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REQUESTED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_PENDING');
      expect(decision.clientSafeReason).toBe('ACCESS_PENDING');
    });

    // T14: REJECTED denies gated access without exposing reason
    it('T14: REJECTED denies gated access without exposing reason', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REJECTED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_REJECTED');
      expect(decision.clientSafeReason).toBe('ACCESS_DENIED');
      // No reason field exposed to client
      expect((decision as unknown as Record<string, unknown>).rejectionReason).toBeUndefined();
    });

    // T15: BLOCKED denies gated access
    it('T15: BLOCKED denies gated access without exposing block reason', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'BLOCKED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_BLOCKED');
      expect(decision.clientSafeReason).toBe('ACCESS_DENIED');
      // Block reason not exposed
      expect((decision as unknown as Record<string, unknown>).blockReason).toBeUndefined();
      expect((decision as unknown as Record<string, unknown>).competitorStatus).toBeUndefined();
    });

    // T16: SUSPENDED denies gated access
    it('T16: SUSPENDED denies gated access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'SUSPENDED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_SUSPENDED');
      expect(decision.clientSafeReason).toBe('ACCESS_DENIED');
    });

    // T17: EXPIRED denies gated access
    it('T17: EXPIRED denies gated access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'EXPIRED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_EXPIRED');
      expect(decision.clientSafeReason).toBe('REQUEST_ACCESS');
    });

    // T18: REVOKED denies gated access
    it('T18: REVOKED denies gated access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REVOKED',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_REVOKED');
      expect(decision.clientSafeReason).toBe('REQUEST_ACCESS');
    });
  });

  describe('Catalog Visibility Policies', () => {
    // T19: PUBLIC/AUTHENTICATED_ONLY accessible to valid buyer context
    it('T19a: PUBLIC catalog accessible to valid buyer regardless of state', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          catalogVisibilityPolicy: 'PUBLIC',
        }),
      );

      expect(decision.canAccessCatalog).toBe(true);
    });

    it('T19b: AUTHENTICATED_ONLY catalog accessible to valid buyer regardless of state', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REQUESTED',
          catalogVisibilityPolicy: 'AUTHENTICATED_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(true);
    });

    // T22: REGION_CHANNEL_SENSITIVE defaults to deny as future boundary
    it('T22: REGION_CHANNEL_SENSITIVE defaults to deny as future boundary', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          catalogVisibilityPolicy: 'REGION_CHANNEL_SENSITIVE',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('UNSUPPORTED_POLICY');
    });
  });

  describe('RFQ Acceptance Modes', () => {
    // T20: OPEN_TO_ALL preserves current open behavior for non-blocked valid context
    it('T20a: OPEN_TO_ALL RFQ allows NONE state (non-blocked)', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canSubmitRfq).toBe(true);
      expect(decision.denialReason).toBe('NONE');
    });

    it('T20b: OPEN_TO_ALL RFQ allows REQUESTED state', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REQUESTED',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canSubmitRfq).toBe(true);
    });

    it('T20c: OPEN_TO_ALL RFQ allows REJECTED state', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REJECTED',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canSubmitRfq).toBe(true);
    });

    it('T20d: OPEN_TO_ALL RFQ allows EXPIRED state', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'EXPIRED',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canSubmitRfq).toBe(true);
    });

    it('T20e: OPEN_TO_ALL RFQ denies BLOCKED state (hard-stop)', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'BLOCKED',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_BLOCKED');
    });

    it('T20f: OPEN_TO_ALL RFQ denies SUSPENDED state (hard-stop)', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'SUSPENDED',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_SUSPENDED');
    });

    // T21: APPROVED_BUYERS_ONLY RFQ only allows APPROVED
    it('T21: APPROVED_BUYERS_ONLY RFQ only allows APPROVED state', () => {
      const approved = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        }),
      );

      expect(approved.canSubmitRfq).toBe(true);

      const none = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        }),
      );

      expect(none.canSubmitRfq).toBe(false);
    });
  });

  describe('Expiry Handling', () => {
    // T23: relationshipExpiresAt before now treats state as EXPIRED
    it('T23a: relationshipExpiresAt in past converts APPROVED to EXPIRED', () => {
      const now = new Date('2026-04-28T12:00:00Z');
      const expired = new Date('2026-04-27T12:00:00Z'); // 1 day ago

      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          relationshipExpiresAt: expired,
          now,
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.currentState).toBe('EXPIRED');
      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_EXPIRED');
    });

    it('T23b: relationshipExpiresAt in future preserves APPROVED state', () => {
      const now = new Date('2026-04-28T12:00:00Z');
      const future = new Date('2026-05-28T12:00:00Z'); // 1 month ahead

      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          relationshipExpiresAt: future,
          now,
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.currentState).toBe('APPROVED');
      expect(decision.canAccessCatalog).toBe(true);
    });

    it('T23c: relationshipExpiresAt with ISO string date', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          relationshipExpiresAt: '2026-04-27T12:00:00Z',
          now: '2026-04-28T12:00:00Z',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        }),
      );

      expect(decision.currentState).toBe('EXPIRED');
    });
  });

  describe('Default Policy Application', () => {
    // T24: Missing policies use safe launch-preserving defaults
    it('T24a: Missing catalogVisibilityPolicy defaults to AUTHENTICATED_ONLY', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          catalogVisibilityPolicy: undefined,
        }),
      );

      // AUTHENTICATED_ONLY allows NONE state access
      expect(decision.canAccessCatalog).toBe(true);
    });

    it('T24b: Missing pricePolicy defaults to VISIBLE', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          pricePolicy: undefined,
        }),
      );

      // VISIBLE allows NONE state access
      expect(decision.canViewRelationshipOnlyPrices).toBe(false); // Still false for non-RELATIONSHIP_ONLY
      expect(decision.denialReason).toBe('NONE');
    });

    it('T24c: Missing rfqAcceptanceMode defaults to OPEN_TO_ALL', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          rfqAcceptanceMode: undefined,
        }),
      );

      // OPEN_TO_ALL allows NONE state RFQ
      expect(decision.canSubmitRfq).toBe(true);
    });

    it('T24d: Custom configuration overrides defaults', () => {
      const config: RelationshipAccessConfig = {
        defaultCatalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        defaultPricePolicy: 'RELATIONSHIP_ONLY',
        defaultRfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      };

      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          catalogVisibilityPolicy: undefined,
          pricePolicy: undefined,
          rfqAcceptanceMode: undefined,
        }),
        config,
      );

      // All defaults to APPROVED_BUYER_ONLY / APPROVED_BUYERS_ONLY
      expect(decision.canAccessCatalog).toBe(false); // NONE cannot access APPROVED_BUYER_ONLY
      expect(decision.canViewRelationshipOnlyPrices).toBe(false); // NONE cannot view RELATIONSHIP_ONLY
      expect(decision.canSubmitRfq).toBe(false); // NONE cannot submit to APPROVED_BUYERS_ONLY
    });
  });

  describe('Anti-Leakage Verification', () => {
    // T25: Output contains no forbidden fields
    it('T25: Output contains no allowlist/audit/graph/internal-risk fields', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ relationshipState: 'APPROVED' }),
      );

      verifyNoForbiddenFields(decision);
    });

    it('T25b: Even denied decisions have clean output', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({ relationshipState: 'BLOCKED' }),
      );

      verifyNoForbiddenFields(decision);
      // Block reason should NOT be exposed
      expect((decision as unknown as Record<string, unknown>).blockReason).toBeUndefined();
    });
  });

  describe('Deterministic Consistency', () => {
    // T26: Same input produces same output repeatedly
    it('T26: Evaluator produces consistent output for repeated input', () => {
      const input = makeInput({
        relationshipState: 'APPROVED',
        catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
        pricePolicy: 'RELATIONSHIP_ONLY',
      });

      const decision1 = evaluateBuyerSupplierRelationshipAccess(input);
      const decision2 = evaluateBuyerSupplierRelationshipAccess(input);
      const decision3 = evaluateBuyerSupplierRelationshipAccess(input);

      expect(decision1).toEqual(decision2);
      expect(decision2).toEqual(decision3);
    });

    it('T26b: Concurrent evaluations produce identical results', () => {
      const input = makeInput({
        relationshipState: 'REQUESTED',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      });

      const decisions = Array.from({ length: 10 }, () =>
        evaluateBuyerSupplierRelationshipAccess(input),
      );

      decisions.forEach((decision) => {
        expect(decision).toEqual(decisions[0]);
      });
    });
  });

  describe('Factory Function', () => {
    it('createRelationshipAccessEvaluator creates configured evaluator', () => {
      const config: RelationshipAccessConfig = {
        defaultCatalogVisibilityPolicy: 'PUBLIC',
      };

      const evaluator = createRelationshipAccessEvaluator(config);

      const decision = evaluator(
        makeInput({
          relationshipState: 'NONE',
          catalogVisibilityPolicy: undefined,
        }),
      );

      // PUBLIC policy allows access regardless of state
      expect(decision.canAccessCatalog).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('Scenario 1: Buyer with no relationship requesting approved-only product', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'NONE',
          catalogVisibilityPolicy: 'APPROVED_BUYER_ONLY',
          pricePolicy: 'RELATIONSHIP_ONLY',
          rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.clientSafeReason).toBe('REQUEST_ACCESS');
    });

    it('Scenario 2: Approved buyer accessing public-gated product', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'APPROVED',
          catalogVisibilityPolicy: 'PUBLIC',
          pricePolicy: 'VISIBLE',
          rfqAcceptanceMode: 'OPEN_TO_ALL',
        }),
      );

      expect(decision.canAccessCatalog).toBe(true);
      expect(decision.canViewRelationshipOnlyPrices).toBe(false); // VISIBLE, not RELATIONSHIP_ONLY
      expect(decision.canSubmitRfq).toBe(true);
      expect(decision.clientSafeReason).toBe('ACCESS_ALLOWED');
    });

    it('Scenario 3: Rejected buyer attempting hidden product access', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'REJECTED',
          catalogVisibilityPolicy: 'HIDDEN',
          pricePolicy: 'HIDDEN',
        }),
      );

      expect(decision.canAccessCatalog).toBe(false);
      expect(decision.canViewRelationshipOnlyPrices).toBe(false);
      expect(decision.denialReason).toBe('CATALOG_HIDDEN'); // Primary reason
      expect(decision.clientSafeReason).toBe('NOT_FOUND');
    });

    it('Scenario 4: Blocked buyer with open RFQ mode should still be blocked', () => {
      const decision = evaluateBuyerSupplierRelationshipAccess(
        makeInput({
          relationshipState: 'BLOCKED',
          rfqAcceptanceMode: 'OPEN_TO_ALL', // Open, but BLOCKED is hard-stop
        }),
      );

      expect(decision.canSubmitRfq).toBe(false);
      expect(decision.denialReason).toBe('RELATIONSHIP_BLOCKED');
    });
  });
});
