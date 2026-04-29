/**
 * catalogVisibilityPolicyResolver.test.ts — Resolver Unit Tests (Slice A)
 *
 * Tests R-01 through R-15 from TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 design,
 * Section 8.1.
 *
 * Run:
 *   pnpm -C server exec vitest run src/__tests__/catalogVisibilityPolicyResolver.test.ts
 */

import { describe, expect, it } from 'vitest';

import {
  resolveCatalogVisibilityPolicy,
  type CatalogVisibilityPolicyResolverInput,
  type CatalogVisibilityPolicyResolverResult,
} from '../services/catalogVisibilityPolicyResolver.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolve(input: CatalogVisibilityPolicyResolverInput): CatalogVisibilityPolicyResolverResult {
  return resolveCatalogVisibilityPolicy(input);
}

// ─── R-01 through R-05: Fallback from publication_posture ─────────────────────

describe('Fallback mapping from publication_posture (mode absent)', () => {
  it('R-01: B2B_PUBLIC posture → PUBLIC policy via fallback', () => {
    const result = resolve({ publicationPosture: 'B2B_PUBLIC' });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('R-02: PRIVATE_OR_AUTH_ONLY posture → AUTHENTICATED_ONLY policy via fallback', () => {
    const result = resolve({ publicationPosture: 'PRIVATE_OR_AUTH_ONLY' });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('R-03: B2C_PUBLIC posture → PUBLIC policy via fallback', () => {
    const result = resolve({ publicationPosture: 'B2C_PUBLIC' });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('R-04: BOTH posture → PUBLIC policy via fallback', () => {
    const result = resolve({ publicationPosture: 'BOTH' });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('R-05: unknown posture string → AUTHENTICATED_ONLY fail-safe', () => {
    const result = resolve({ publicationPosture: 'UNKNOWN_FUTURE_POSTURE' });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    // falls through posture branch but unknown value maps to fail-safe
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });
});

// ─── R-06 through R-09: Explicit mode overrides posture ───────────────────────

describe('Explicit catalogVisibilityPolicyMode wins over posture', () => {
  it('R-06: APPROVED_BUYER_ONLY explicit mode ignores posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY',
      publicationPosture: 'B2B_PUBLIC',
    });
    expect(result.policy).toBe('APPROVED_BUYER_ONLY');
    expect(result.source).toBe('EXPLICIT_POLICY');
  });

  it('R-07: HIDDEN explicit mode ignores posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'HIDDEN',
      publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    });
    expect(result.policy).toBe('HIDDEN');
    expect(result.source).toBe('EXPLICIT_POLICY');
  });

  it('R-08: RELATIONSHIP_GATED explicit mode ignores posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'RELATIONSHIP_GATED',
      publicationPosture: 'B2B_PUBLIC',
    });
    expect(result.policy).toBe('RELATIONSHIP_GATED');
    expect(result.source).toBe('EXPLICIT_POLICY');
  });

  it('R-09: PUBLIC explicit mode ignores posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'PUBLIC',
      publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('EXPLICIT_POLICY');
  });
});

// ─── R-10: REGION_CHANNEL_SENSITIVE is not accepted in Slice A ────────────────

describe('REGION_CHANNEL_SENSITIVE is rejected in Slice A', () => {
  it('R-10: REGION_CHANNEL_SENSITIVE as explicit mode resolves to fail-safe, not passthrough', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'REGION_CHANNEL_SENSITIVE',
      publicationPosture: 'B2B_PUBLIC',
    });
    // Must NOT be REGION_CHANNEL_SENSITIVE — it is not storable in Slice A.
    expect(result.policy).not.toBe('REGION_CHANNEL_SENSITIVE');
    // Falls back to publication_posture because mode is invalid
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('R-10b: REGION_CHANNEL_SENSITIVE with no posture resolves to AUTHENTICATED_ONLY fail-safe', () => {
    const result = resolve({ catalogVisibilityPolicyMode: 'REGION_CHANNEL_SENSITIVE' });
    expect(result.policy).not.toBe('REGION_CHANNEL_SENSITIVE');
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('FAIL_SAFE_DEFAULT');
  });
});

// ─── R-11: AUTHENTICATED_ONLY explicit mode overrides PUBLIC posture ──────────

describe('AUTHENTICATED_ONLY explicit mode', () => {
  it('R-11: AUTHENTICATED_ONLY explicit mode + B2B_PUBLIC posture → AUTHENTICATED_ONLY', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'AUTHENTICATED_ONLY',
      publicationPosture: 'B2B_PUBLIC',
    });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('EXPLICIT_POLICY');
  });
});

// ─── R-12: Unknown explicit policy string does not pass through ───────────────

describe('Unknown explicit policy string safety', () => {
  it('R-12: completely unknown explicit mode string resolves safely, not passthrough', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'TOTALLY_MADE_UP_VALUE',
      publicationPosture: 'B2B_PUBLIC',
    });
    expect(result.policy).not.toBe('TOTALLY_MADE_UP_VALUE');
    // Unknown mode → falls back to posture mapping
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });
});

// ─── R-13: Empty string explicit policy resolves safely ───────────────────────

describe('Empty / whitespace explicit policy safety', () => {
  it('R-13: empty string explicit mode → falls back to posture mapping', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: '',
      publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('R-13b: whitespace-only explicit mode → falls back to posture mapping', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: '   ',
      publicationPosture: 'B2C_PUBLIC',
    });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });
});

// ─── R-14: Resolver is deterministic ─────────────────────────────────────────

describe('Resolver determinism', () => {
  it('R-14: same input returns identical result on repeated calls', () => {
    const input: CatalogVisibilityPolicyResolverInput = {
      catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY',
      publicationPosture: 'B2B_PUBLIC',
    };
    const first = resolve(input);
    const second = resolve(input);
    const third = resolve(input);

    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });

  it('R-14b: fallback path is also deterministic', () => {
    const input: CatalogVisibilityPolicyResolverInput = {
      publicationPosture: 'BOTH',
    };
    const first = resolve(input);
    const second = resolve(input);
    expect(first).toEqual(second);
  });
});

// ─── R-15: Resolver output contains no sensitive metadata ────────────────────

describe('Resolver output field safety', () => {
  it('R-15: output contains only policy and source — no org IDs, relationship state, or raw unknown strings', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 'APPROVED_BUYER_ONLY',
      publicationPosture: 'B2B_PUBLIC',
    });

    const keys = Object.keys(result);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('policy');
    expect(keys).toContain('source');

    // No leakage of org identifiers, relationship data, or audit fields
    expect(keys).not.toContain('buyerOrgId');
    expect(keys).not.toContain('supplierOrgId');
    expect(keys).not.toContain('relationshipState');
    expect(keys).not.toContain('rawMode');
    expect(keys).not.toContain('rawPosture');
    expect(keys).not.toContain('auditId');
  });

  it('R-15b: fallback output contains only policy and source', () => {
    const result = resolve({ publicationPosture: 'PRIVATE_OR_AUTH_ONLY' });
    expect(Object.keys(result)).toHaveLength(2);
    expect(Object.keys(result)).toContain('policy');
    expect(Object.keys(result)).toContain('source');
  });
});

// ─── Fail-safe default (both inputs absent) ───────────────────────────────────

describe('Fail-safe default when both inputs absent', () => {
  it('resolves to AUTHENTICATED_ONLY with FAIL_SAFE_DEFAULT source when no inputs provided', () => {
    const result = resolve({});
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('FAIL_SAFE_DEFAULT');
  });

  it('resolves to AUTHENTICATED_ONLY when both inputs are explicitly undefined', () => {
    const result = resolve({ catalogVisibilityPolicyMode: undefined, publicationPosture: undefined });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('FAIL_SAFE_DEFAULT');
  });

  it('resolves to AUTHENTICATED_ONLY when both inputs are null', () => {
    const result = resolve({ catalogVisibilityPolicyMode: null, publicationPosture: null });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('FAIL_SAFE_DEFAULT');
  });
});

// ─── Non-string explicit mode types ───────────────────────────────────────────

describe('Non-string explicit mode type safety', () => {
  it('numeric mode value is ignored and falls back to posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: 42,
      publicationPosture: 'B2B_PUBLIC',
    });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('boolean mode value is ignored and falls back to posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: true,
      publicationPosture: 'PRIVATE_OR_AUTH_ONLY',
    });
    expect(result.policy).toBe('AUTHENTICATED_ONLY');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });

  it('object mode value is ignored and falls back to posture', () => {
    const result = resolve({
      catalogVisibilityPolicyMode: { mode: 'APPROVED_BUYER_ONLY' },
      publicationPosture: 'B2B_PUBLIC',
    });
    expect(result.policy).toBe('PUBLIC');
    expect(result.source).toBe('PUBLICATION_POSTURE_FALLBACK');
  });
});
