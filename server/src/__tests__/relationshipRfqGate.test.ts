/**
 * Slice F — RFQ Relationship Gate Unit Tests
 *
 * Tests for evaluateBuyerRelationshipRfqEligibility() — a pure, deterministic
 * function with no DB or Fastify dependencies.
 *
 * Coverage:
 *   - OPEN_TO_ALL: all non-hard-stop states permit submit; BLOCKED/SUSPENDED deny
 *   - APPROVED_BUYERS_ONLY: only APPROVED state permits submit
 *   - Default mode (undefined/null) → OPEN_TO_ALL behavior
 *   - Unknown/invalid mode → fail-safe deny
 *   - Null/missing buyer or supplier org → deny
 *   - Expiry: APPROVED + expired timestamp → deny (state upgrades to EXPIRED)
 *   - clientSafeReason: correct non-disclosing reason for each case
 *   - Purity: same input always yields same output
 */

import { describe, it, expect } from 'vitest';
import { evaluateBuyerRelationshipRfqEligibility } from '../services/relationshipAccess.service.js';

const BUYER = 'buyer-org-001';
const SUPPLIER = 'supplier-org-001';

// ─── OPEN_TO_ALL ──────────────────────────────────────────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — OPEN_TO_ALL', () => {
  it('F-S01: OPEN_TO_ALL + NONE → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'NONE',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(true);
    expect(result.clientSafeReason).toBe('ACCESS_ALLOWED');
  });

  it('F-S02: OPEN_TO_ALL + REQUESTED → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REQUESTED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(true);
  });

  it('F-S03: OPEN_TO_ALL + APPROVED → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(true);
    expect(result.clientSafeReason).toBe('ACCESS_ALLOWED');
  });

  it('F-S04: OPEN_TO_ALL + REJECTED → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REJECTED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(true);
  });

  it('F-S05: OPEN_TO_ALL + EXPIRED → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'EXPIRED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(true);
  });

  it('F-S06: OPEN_TO_ALL + REVOKED → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REVOKED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(true);
  });

  it('F-S07: OPEN_TO_ALL + BLOCKED → canSubmit: false (hard-stop)', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'BLOCKED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('ACCESS_DENIED');
  });

  it('F-S08: OPEN_TO_ALL + SUSPENDED → canSubmit: false (hard-stop)', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'SUSPENDED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('ACCESS_DENIED');
  });
});

// ─── APPROVED_BUYERS_ONLY ─────────────────────────────────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — APPROVED_BUYERS_ONLY', () => {
  it('F-S09: APPROVED_BUYERS_ONLY + NONE → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'NONE',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('F-S10: APPROVED_BUYERS_ONLY + REQUESTED → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REQUESTED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('ACCESS_PENDING');
  });

  it('F-S11: APPROVED_BUYERS_ONLY + APPROVED → canSubmit: true', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(true);
    expect(result.clientSafeReason).toBe('ACCESS_ALLOWED');
  });

  it('F-S12: APPROVED_BUYERS_ONLY + REJECTED → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REJECTED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('ACCESS_DENIED');
  });

  it('F-S13: APPROVED_BUYERS_ONLY + BLOCKED → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'BLOCKED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('ACCESS_DENIED');
  });

  it('F-S14: APPROVED_BUYERS_ONLY + SUSPENDED → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'SUSPENDED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('ACCESS_DENIED');
  });

  it('F-S15: APPROVED_BUYERS_ONLY + EXPIRED → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'EXPIRED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('F-S16: APPROVED_BUYERS_ONLY + REVOKED → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REVOKED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('REQUEST_ACCESS');
  });
});

// ─── Default mode (undefined / null) → OPEN_TO_ALL ───────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — default mode', () => {
  it('F-S17: rfqAcceptanceMode undefined → defaults to OPEN_TO_ALL (NONE → canSubmit: true)', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'NONE',
      // rfqAcceptanceMode intentionally omitted
    });
    expect(result.canSubmit).toBe(true);
  });

  it('F-S18: rfqAcceptanceMode null → defaults to OPEN_TO_ALL (NONE → canSubmit: true)', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'NONE',
      rfqAcceptanceMode: null,
    });
    expect(result.canSubmit).toBe(true);
  });

  it('F-S18b: rfqAcceptanceMode undefined + BLOCKED → canSubmit: false (hard-stop honored in default mode)', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'BLOCKED',
    });
    expect(result.canSubmit).toBe(false);
  });
});

// ─── Unknown / invalid rfqAcceptanceMode → fail-safe deny ────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — invalid mode', () => {
  it('F-S19: unknown rfqAcceptanceMode string → fail-safe deny (canSubmit: false)', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'UNKNOWN_POLICY',
    });
    expect(result.canSubmit).toBe(false);
  });
});

// ─── Null / missing org inputs ────────────────────────────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — null org inputs', () => {
  it('F-S20: null buyerOrgId → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: null,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(false);
    expect(result.clientSafeReason).toBe('AUTH_REQUIRED');
  });

  it('F-S21: null supplierOrgId → canSubmit: false', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: null,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.canSubmit).toBe(false);
  });
});

// ─── Expiry handling ──────────────────────────────────────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — expiry', () => {
  it('F-S22: APPROVED_BUYERS_ONLY + APPROVED + past expiry → canSubmit: false (state upgrades to EXPIRED)', () => {
    const expiredAt = new Date(Date.now() - 86_400_000).toISOString(); // 1 day ago
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      relationshipExpiresAt: expiredAt,
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      now: new Date().toISOString(),
    });
    expect(result.canSubmit).toBe(false);
  });

  it('F-S22b: APPROVED_BUYERS_ONLY + APPROVED + future expiry → canSubmit: true', () => {
    const futureAt = new Date(Date.now() + 86_400_000).toISOString(); // 1 day from now
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      relationshipExpiresAt: futureAt,
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
      now: new Date().toISOString(),
    });
    expect(result.canSubmit).toBe(true);
  });
});

// ─── clientSafeReason spot-checks ────────────────────────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — clientSafeReason', () => {
  it('F-S23: OPEN_TO_ALL + BLOCKED → clientSafeReason: ACCESS_DENIED', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'BLOCKED',
      rfqAcceptanceMode: 'OPEN_TO_ALL',
    });
    expect(result.clientSafeReason).toBe('ACCESS_DENIED');
  });

  it('F-S24: APPROVED_BUYERS_ONLY + NONE → clientSafeReason: REQUEST_ACCESS', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'NONE',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.clientSafeReason).toBe('REQUEST_ACCESS');
  });

  it('F-S25: APPROVED_BUYERS_ONLY + REQUESTED → clientSafeReason: ACCESS_PENDING', () => {
    const result = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'REQUESTED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(result.clientSafeReason).toBe('ACCESS_PENDING');
  });
});

// ─── Purity ───────────────────────────────────────────────────────────────────

describe('evaluateBuyerRelationshipRfqEligibility — purity', () => {
  it('F-S26: same input always yields same output (deterministic)', () => {
    const input = {
      buyerOrgId: BUYER,
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    } as const;

    const r1 = evaluateBuyerRelationshipRfqEligibility(input);
    const r2 = evaluateBuyerRelationshipRfqEligibility(input);
    const r3 = evaluateBuyerRelationshipRfqEligibility(input);

    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  it('F-S27: relationshipState is server-resolved only — same state regardless of which field varies', () => {
    // Verify the function only reads state from the input.relationshipState field.
    // Two calls with same state but different buyerOrgId values → both give matching canSubmit.
    const r1 = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: 'buyer-a',
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    const r2 = evaluateBuyerRelationshipRfqEligibility({
      buyerOrgId: 'buyer-b',
      supplierOrgId: SUPPLIER,
      relationshipState: 'APPROVED',
      rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
    });
    expect(r1.canSubmit).toBe(true);
    expect(r2.canSubmit).toBe(true);
    expect(r1.clientSafeReason).toBe(r2.clientSafeReason);
  });
});
