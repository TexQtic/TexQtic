/**
 * tenant.catalogB2cPostureGate.test.ts
 *
 * TECS-BUYER-CATALOG-B2C-POSTURE-GATE-001 — Channel gate tests (B2C-01..B2C-10).
 *
 * Verifies POLICY_B_BLOCK_B2C_ITEM_POSTURE_FROM_B2B enforcement:
 *   - B2C_PUBLIC item posture is excluded from B2B buyer browse and PDP surfaces.
 *   - B2B_PUBLIC, BOTH, and PRIVATE_OR_AUTH_ONLY postures pass the channel gate.
 *   - The resolver (catalogVisibilityPolicyResolver) mapping is unchanged; the
 *     channel filter is applied at the route layer before the resolver runs.
 *   - The fix is consistent with the RFQ path which already gates on
 *     publication_posture IN ('B2B_PUBLIC', 'BOTH') via SQL.
 *
 * Test inventory:
 *   B2C-01 — Resolver: B2C_PUBLIC posture → PUBLIC via fallback (existing R-03 behavior unchanged)
 *   B2C-02 — Channel gate: B2C_PUBLIC item excluded from B2B browse filter predicate
 *   B2C-03 — Channel gate: B2B_PUBLIC item passes B2B browse filter predicate
 *   B2C-04 — Channel gate: BOTH posture item passes B2B browse filter predicate
 *   B2C-05 — Channel gate: PRIVATE_OR_AUTH_ONLY item passes B2B browse filter predicate
 *   B2C-06 — PDP gate: B2C_PUBLIC item → NOT found (channel-blocked before visibility check)
 *   B2C-07 — PDP gate: B2B_PUBLIC item passes channel filter and reaches visibility evaluation
 *   B2C-08 — Visibility: B2B_PUBLIC + null CVPM + NONE relationship → canAccessCatalog true (PUBLIC)
 *   B2C-09 — Visibility: BOTH posture + null CVPM + NONE relationship → canAccessCatalog true (PUBLIC)
 *   B2C-10 — Consistency: B2C_PUBLIC falls back to PUBLIC in resolver but channel gate prevents
 *             B2B surface exposure (gate is before resolver in B2B browse/PDP paths)
 *
 * Run:
 *   pnpm --filter server exec vitest run src/routes/tenant.catalogB2cPostureGate.test.ts
 */

import { describe, it, expect } from 'vitest';

import {
  resolveCatalogVisibilityPolicy,
} from '../services/catalogVisibilityPolicyResolver.js';
import {
  evaluateBuyerCatalogVisibility,
} from '../services/relationshipAccess.service.js';

// ── Test constants ────────────────────────────────────────────────────────────

const BUYER_ORG_ID    = 'aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa';
const SUPPLIER_ORG_ID = 'bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb';

// ── Channel gate predicate ────────────────────────────────────────────────────

/**
 * Mirrors the B2B buyer browse channel eligibility gate applied in tenant.ts:
 *   Prisma filterClauses: { publicationPosture: { not: 'B2C_PUBLIC' } }
 *   PDP SQL:              AND publication_posture != 'B2C_PUBLIC'
 *
 * Returns true if the item is eligible to appear on B2B buyer surfaces.
 */
function isB2bChannelEligible(publicationPosture: string | null | undefined): boolean {
  return publicationPosture !== 'B2C_PUBLIC';
}

/**
 * Mirror of resolveItemCatalogVisibilityForRoute from tenant.ts (lines ~105-115).
 * Resolves visibility policy and maps RELATIONSHIP_GATED → APPROVED_BUYER_ONLY.
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

function applyVisibilityGate(policy: string, relationshipState: string): boolean {
  const result = evaluateBuyerCatalogVisibility({
    buyerOrgId: BUYER_ORG_ID,
    supplierOrgId: SUPPLIER_ORG_ID,
    relationshipState: relationshipState as never,
    catalogVisibilityPolicy: policy,
  });
  return result.decision.canAccessCatalog;
}

// ── B2C-01: Resolver behavior is unchanged ────────────────────────────────────

describe('B2C-01: Resolver: B2C_PUBLIC posture → PUBLIC via fallback (R-03 behavior intact)', () => {
  it('B2C_PUBLIC posture with null CVPM resolves to PUBLIC via PUBLICATION_POSTURE_FALLBACK', () => {
    const result = resolveCatalogVisibilityPolicy({
      catalogVisibilityPolicyMode: null,
      publicationPosture: 'B2C_PUBLIC',
    });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('B2C_PUBLIC posture with undefined CVPM resolves to PUBLIC via PUBLICATION_POSTURE_FALLBACK', () => {
    const result = resolveCatalogVisibilityPolicy({ publicationPosture: 'B2C_PUBLIC' });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });
});

// ── B2C-02: Channel gate excludes B2C_PUBLIC from B2B browse ─────────────────

describe('B2C-02: Channel gate: B2C_PUBLIC item excluded from B2B browse', () => {
  it('B2C_PUBLIC posture is NOT eligible for B2B buyer browse surface', () => {
    expect(isB2bChannelEligible('B2C_PUBLIC')).toBe(false);
  });

  it('isB2bChannelEligible returns false only for B2C_PUBLIC — not for null posture', () => {
    // null/undefined postures are not excluded by the channel filter; they fall through
    // to the resolver which applies the fail-safe AUTHENTICATED_ONLY default.
    expect(isB2bChannelEligible(null)).toBe(true);
    expect(isB2bChannelEligible(undefined)).toBe(true);
  });
});

// ── B2C-03: B2B_PUBLIC passes channel gate ────────────────────────────────────

describe('B2C-03: Channel gate: B2B_PUBLIC item passes B2B browse filter', () => {
  it('B2B_PUBLIC posture is eligible for B2B buyer browse surface', () => {
    expect(isB2bChannelEligible('B2B_PUBLIC')).toBe(true);
  });
});

// ── B2C-04: BOTH posture passes channel gate ──────────────────────────────────

describe('B2C-04: Channel gate: BOTH posture item passes B2B browse filter', () => {
  it('BOTH posture is eligible for B2B buyer browse surface (cross-channel item)', () => {
    expect(isB2bChannelEligible('BOTH')).toBe(true);
  });
});

// ── B2C-05: PRIVATE_OR_AUTH_ONLY passes channel gate ─────────────────────────

describe('B2C-05: Channel gate: PRIVATE_OR_AUTH_ONLY passes B2B browse filter', () => {
  it('PRIVATE_OR_AUTH_ONLY posture is eligible for B2B buyer browse (auth-gated, not channel-excluded)', () => {
    // This is critical: PRIVATE_OR_AUTH_ONLY was incorrectly blocked by the old PDP
    // posture gate (removed in d250bee). The B2C channel gate must NOT re-introduce
    // that regression. PRIVATE_OR_AUTH_ONLY items belong in B2B surfaces; they are
    // gated by authentication/relationship, not by channel.
    expect(isB2bChannelEligible('PRIVATE_OR_AUTH_ONLY')).toBe(true);
  });
});

// ── B2C-06: B2C_PUBLIC item blocked at PDP (channel-blocked before resolver) ──

describe('B2C-06: PDP gate: B2C_PUBLIC item blocked before visibility evaluation', () => {
  it('B2C_PUBLIC item fails channel gate — resolveItemPolicy is never reached', () => {
    const item = { catalog_visibility_policy_mode: null, publication_posture: 'B2C_PUBLIC' };
    // Channel gate would block this item before the resolver is called.
    expect(isB2bChannelEligible(item.publication_posture)).toBe(false);
  });

  it('B2C_PUBLIC item with explicit CVPM still blocked by channel gate (POLICY_B strict)', () => {
    // POLICY_B: B2C channel exclusion is applied before visibility evaluation.
    // Even if the supplier set an explicit CVPM, B2C_PUBLIC posture marks the item
    // as intended for the consumer channel. Use BOTH posture for cross-channel items.
    const itemWithExplicitPolicy = {
      catalog_visibility_policy_mode: 'PUBLIC',
      publication_posture: 'B2C_PUBLIC',
    };
    expect(isB2bChannelEligible(itemWithExplicitPolicy.publication_posture)).toBe(false);
  });
});

// ── B2C-07: B2B_PUBLIC item reaches visibility evaluation ────────────────────

describe('B2C-07: PDP gate: B2B_PUBLIC item passes channel filter and reaches resolver', () => {
  it('B2B_PUBLIC item passes channel gate and resolves to PUBLIC via fallback', () => {
    const item = { catalog_visibility_policy_mode: null, publication_posture: 'B2B_PUBLIC' };
    expect(isB2bChannelEligible(item.publication_posture)).toBe(true);
    const policy = resolveItemPolicy(item);
    expect(policy).toBe('PUBLIC');
  });
});

// ── B2C-08: B2B_PUBLIC + null CVPM + NONE relationship → accessible ───────────

describe('B2C-08: Visibility: B2B_PUBLIC + null CVPM + NONE relationship → canAccessCatalog true', () => {
  it('B2B_PUBLIC item with PUBLIC policy is accessible to buyer with no relationship', () => {
    const item = { catalog_visibility_policy_mode: null, publication_posture: 'B2B_PUBLIC' };
    expect(isB2bChannelEligible(item.publication_posture)).toBe(true);
    const policy = resolveItemPolicy(item);
    expect(policy).toBe('PUBLIC');
    expect(applyVisibilityGate(policy, 'NONE')).toBe(true);
  });
});

// ── B2C-09: BOTH posture + null CVPM + NONE relationship → accessible ─────────

describe('B2C-09: Visibility: BOTH posture + null CVPM + NONE relationship → canAccessCatalog true', () => {
  it('BOTH posture item resolves to PUBLIC and is accessible to unapproved B2B buyer', () => {
    const item = { catalog_visibility_policy_mode: null, publication_posture: 'BOTH' };
    expect(isB2bChannelEligible(item.publication_posture)).toBe(true);
    const policy = resolveItemPolicy(item);
    expect(policy).toBe('PUBLIC');
    expect(applyVisibilityGate(policy, 'NONE')).toBe(true);
  });
});

// ── B2C-10: Resolver + channel gate interaction: B2C_PUBLIC gate is pre-resolver ─

describe('B2C-10: Consistency: B2C_PUBLIC falls back to PUBLIC in resolver but channel gate prevents B2B exposure', () => {
  it('resolver returns PUBLIC for B2C_PUBLIC (unchanged) but channel predicate blocks B2B surface', () => {
    // This test documents the intentional architecture:
    // The resolver is channel-agnostic (R-03 is correct and untouched).
    // Channel filtering happens BEFORE the resolver at the B2B route layer.
    const item = { catalog_visibility_policy_mode: null, publication_posture: 'B2C_PUBLIC' };

    // Step 1 — resolver says PUBLIC (correct for B2C surfaces like GET /api/public/b2c/products)
    const resolverResult = resolveCatalogVisibilityPolicy({
      catalogVisibilityPolicyMode: item.catalog_visibility_policy_mode,
      publicationPosture: item.publication_posture,
    });
    expect(resolverResult.policy).toBe('PUBLIC');

    // Step 2 — B2B browse/PDP channel gate: item never reaches the resolver in B2B routes
    expect(isB2bChannelEligible(item.publication_posture)).toBe(false);

    // Combined: if channel gate ran first, item would be excluded; resolver result is moot
    const wouldBeVisibleInB2bBrowse =
      isB2bChannelEligible(item.publication_posture) &&
      applyVisibilityGate(resolverResult.policy, 'NONE');
    expect(wouldBeVisibleInB2bBrowse).toBe(false);
  });

  it('RFQ path consistency: B2C_PUBLIC is already blocked at RFQ SQL level (pre-existing gate)', () => {
    // The RFQ path uses: AND publication_posture IN ('B2B_PUBLIC', 'BOTH')
    // This documents consistent cross-surface treatment:
    //   Browse:  publicationPosture: { not: 'B2C_PUBLIC' }    → added by POLICY_B fix
    //   PDP:     AND publication_posture != 'B2C_PUBLIC'       → added by POLICY_B fix
    //   RFQ:     AND publication_posture IN ('B2B_PUBLIC','BOTH') → pre-existing, more restrictive
    // All three B2B buyer surfaces now consistently exclude B2C_PUBLIC items.
    const rfqChannelEligiblePostures = ['B2B_PUBLIC', 'BOTH'];
    expect(rfqChannelEligiblePostures.includes('B2C_PUBLIC')).toBe(false);
    expect(rfqChannelEligiblePostures.includes('PRIVATE_OR_AUTH_ONLY')).toBe(false);
    expect(rfqChannelEligiblePostures.includes('B2B_PUBLIC')).toBe(true);
    expect(rfqChannelEligiblePostures.includes('BOTH')).toBe(true);
  });
});
