/**
 * TECS-B2B-ORDERS-LIFECYCLE-001 — Slice C
 * EXPOrdersPanel source-descriptor tests (EXP-C-001 through EXP-C-016)
 *
 * Shell constraint: EXPERIENCE only. Tests verify pure helper exports:
 *   canonicalStatus, getActions, STATUS_LABELS, ACTION_LABELS.
 *
 * No React rendering performed. No DOM environment required.
 * Pattern: repo source-descriptor (same as b2b-supplier-profile-completeness-ui.test.tsx).
 *
 * Anti-leakage: exported surface must not contain internal field names,
 * secrets, policy internals, or forbidden keys.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

vi.mock('../services/authService', () => ({
  getCurrentUser: vi.fn(),
}));

import {
  __EXP_ORDERS_PANEL_TESTING__,
} from '../components/Tenant/EXPOrdersPanel';

const { canonicalStatus, getActions, STATUS_LABELS, ACTION_LABELS } =
  __EXP_ORDERS_PANEL_TESTING__;

// ── Helpers ──────────────────────────────────────────────────────────────────

type OrderStatus = 'PAYMENT_PENDING' | 'PLACED' | 'CANCELLED';

function makeOrder(
  status: OrderStatus,
  lifecycleState: string | null,
): Parameters<typeof canonicalStatus>[0] {
  return {
    id: 'ord-test-1',
    status,
    grandTotal: 100,
    createdAt: new Date().toISOString(),
    lifecycleState,
    lifecycleLogs: [],
  };
}

// ── EXP-C-001: Testing object exported and not empty ────────────────────────
describe('EXP-C-001 — __EXP_ORDERS_PANEL_TESTING__ is exported', () => {
  it('exports the testing object', () => {
    expect(__EXP_ORDERS_PANEL_TESTING__).toBeDefined();
  });

  it('contains exactly the expected keys', () => {
    const keys = Object.keys(__EXP_ORDERS_PANEL_TESTING__).sort();
    expect(keys).toEqual(['ACTION_LABELS', 'STATUS_LABELS', 'canonicalStatus', 'getActions']);
  });
});

// ── EXP-C-002: CANCELLED status (DB enum) maps to CANCELLED ─────────────────
describe('EXP-C-002 — canonicalStatus: CANCELLED DB enum is terminal', () => {
  it('returns CANCELLED for status=CANCELLED + null lifecycleState', () => {
    expect(canonicalStatus(makeOrder('CANCELLED', null))).toBe('CANCELLED');
  });

  it('returns CANCELLED for status=CANCELLED even if lifecycleState is FULFILLED', () => {
    expect(canonicalStatus(makeOrder('CANCELLED', 'FULFILLED'))).toBe('CANCELLED');
  });

  it('returns CANCELLED for status=CANCELLED even if lifecycleState is CONFIRMED', () => {
    expect(canonicalStatus(makeOrder('CANCELLED', 'CONFIRMED'))).toBe('CANCELLED');
  });
});

// ── EXP-C-003: PAYMENT_PENDING maps to PAYMENT_PENDING ──────────────────────
describe('EXP-C-003 — canonicalStatus: PAYMENT_PENDING mapping', () => {
  it('returns PAYMENT_PENDING for status=PAYMENT_PENDING + null lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PAYMENT_PENDING', null))).toBe('PAYMENT_PENDING');
  });

  it('returns PAYMENT_PENDING for status=PLACED + lifecycleState=PAYMENT_PENDING', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'PAYMENT_PENDING'))).toBe('PAYMENT_PENDING');
  });
});

// ── EXP-C-004: PLACED fallback ───────────────────────────────────────────────
describe('EXP-C-004 — canonicalStatus: PLACED fallback', () => {
  it('returns PLACED for status=PLACED + null lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PLACED', null))).toBe('PLACED');
  });

  it('returns PLACED for status=PLACED + empty string lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PLACED', ''))).toBe('PLACED');
  });

  it('returns PLACED for status=PLACED + unknown lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'UNKNOWN_STATE'))).toBe('PLACED');
  });
});

// ── EXP-C-005: CONFIRMED lifecycle wins over PLACED DB status ───────────────
describe('EXP-C-005 — canonicalStatus: CONFIRMED lifecycle state wins', () => {
  it('returns CONFIRMED for status=PLACED + lifecycleState=CONFIRMED', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'CONFIRMED'))).toBe('CONFIRMED');
  });

  it('returns CONFIRMED for status=PAYMENT_PENDING + lifecycleState=CONFIRMED', () => {
    expect(canonicalStatus(makeOrder('PAYMENT_PENDING', 'CONFIRMED'))).toBe('CONFIRMED');
  });
});

// ── EXP-C-006: FULFILLED lifecycle wins over PLACED DB status ───────────────
describe('EXP-C-006 — canonicalStatus: FULFILLED lifecycle state wins', () => {
  it('returns FULFILLED for status=PLACED + lifecycleState=FULFILLED', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'FULFILLED'))).toBe('FULFILLED');
  });

  it('returns FULFILLED for status=PAYMENT_PENDING + lifecycleState=FULFILLED', () => {
    expect(canonicalStatus(makeOrder('PAYMENT_PENDING', 'FULFILLED'))).toBe('FULFILLED');
  });
});

// ── EXP-C-007: getActions — PAYMENT_PENDING produces CONFIRMED + CANCELLED ──
describe('EXP-C-007 — getActions: PAYMENT_PENDING transitions', () => {
  it('returns [CONFIRMED, CANCELLED] for PAYMENT_PENDING', () => {
    expect(getActions('PAYMENT_PENDING')).toEqual(['CONFIRMED', 'CANCELLED']);
  });
});

// ── EXP-C-008: getActions — CONFIRMED produces FULFILLED + CANCELLED ─────────
describe('EXP-C-008 — getActions: CONFIRMED transitions', () => {
  it('returns [FULFILLED, CANCELLED] for CONFIRMED', () => {
    expect(getActions('CONFIRMED')).toEqual(['FULFILLED', 'CANCELLED']);
  });
});

// ── EXP-C-009: getActions — PLACED produces FULFILLED + CANCELLED ────────────
describe('EXP-C-009 — getActions: PLACED transitions', () => {
  it('returns [FULFILLED, CANCELLED] for PLACED', () => {
    expect(getActions('PLACED')).toEqual(['FULFILLED', 'CANCELLED']);
  });
});

// ── EXP-C-010: getActions — terminal states expose no actions ────────────────
describe('EXP-C-010 — getActions: terminal states return empty array', () => {
  it('returns [] for FULFILLED (terminal)', () => {
    expect(getActions('FULFILLED')).toEqual([]);
  });

  it('returns [] for CANCELLED (terminal)', () => {
    expect(getActions('CANCELLED')).toEqual([]);
  });
});

// ── EXP-C-011: STATUS_LABELS — all DerivedStatus keys covered ───────────────
describe('EXP-C-011 — STATUS_LABELS: all derived statuses have labels', () => {
  const expectedKeys: string[] = [
    'PAYMENT_PENDING',
    'CONFIRMED',
    'PLACED',
    'FULFILLED',
    'CANCELLED',
  ];

  it('has a label for every DerivedStatus', () => {
    for (const key of expectedKeys) {
      expect(STATUS_LABELS).toHaveProperty(key);
      expect(typeof STATUS_LABELS[key as keyof typeof STATUS_LABELS]).toBe('string');
      expect(STATUS_LABELS[key as keyof typeof STATUS_LABELS].length).toBeGreaterThan(0);
    }
  });

  it('PAYMENT_PENDING label is human-readable (Pending)', () => {
    expect(STATUS_LABELS.PAYMENT_PENDING).toBe('Pending');
  });

  it('CONFIRMED label is human-readable', () => {
    expect(STATUS_LABELS.CONFIRMED).toBe('Confirmed');
  });

  it('PLACED label is human-readable', () => {
    expect(STATUS_LABELS.PLACED).toBe('Placed');
  });

  it('FULFILLED label is human-readable', () => {
    expect(STATUS_LABELS.FULFILLED).toBe('Fulfilled');
  });

  it('CANCELLED label is human-readable', () => {
    expect(STATUS_LABELS.CANCELLED).toBe('Cancelled');
  });
});

// ── EXP-C-012: ACTION_LABELS — all TransitionTarget keys covered ─────────────
describe('EXP-C-012 — ACTION_LABELS: all transition targets have labels', () => {
  const expectedKeys: string[] = ['CONFIRMED', 'FULFILLED', 'CANCELLED'];

  it('has a label for every TransitionTarget', () => {
    for (const key of expectedKeys) {
      expect(ACTION_LABELS).toHaveProperty(key);
      expect(typeof ACTION_LABELS[key as keyof typeof ACTION_LABELS]).toBe('string');
      expect(ACTION_LABELS[key as keyof typeof ACTION_LABELS].length).toBeGreaterThan(0);
    }
  });

  it('CONFIRMED action label is Confirm', () => {
    expect(ACTION_LABELS.CONFIRMED).toBe('Confirm');
  });

  it('FULFILLED action label is Fulfill', () => {
    expect(ACTION_LABELS.FULFILLED).toBe('Fulfill');
  });

  it('CANCELLED action label is Cancel', () => {
    expect(ACTION_LABELS.CANCELLED).toBe('Cancel');
  });
});

// ── EXP-C-013: Unknown/null lifecycle state does not crash ───────────────────
describe('EXP-C-013 — canonicalStatus: resilience to unexpected inputs', () => {
  it('does not throw for null lifecycleState + PLACED status', () => {
    expect(() => canonicalStatus(makeOrder('PLACED', null))).not.toThrow();
  });

  it('does not throw for empty string lifecycleState', () => {
    expect(() => canonicalStatus(makeOrder('PLACED', ''))).not.toThrow();
  });

  it('does not throw for a completely unknown lifecycleState string', () => {
    expect(() => canonicalStatus(makeOrder('PLACED', 'SOME_FUTURE_STATE'))).not.toThrow();
  });

  it('returns a DerivedStatus string for all fallthrough cases', () => {
    const result = canonicalStatus(makeOrder('PLACED', 'SOME_FUTURE_STATE'));
    const validStatuses = ['PAYMENT_PENDING', 'CONFIRMED', 'PLACED', 'FULFILLED', 'CANCELLED'];
    expect(validStatuses).toContain(result);
  });
});

// ── EXP-C-014: getActions does not crash for unexpected inputs ───────────────
describe('EXP-C-014 — getActions: resilience', () => {
  it('returns an array for every valid DerivedStatus', () => {
    const statuses = ['PAYMENT_PENDING', 'CONFIRMED', 'PLACED', 'FULFILLED', 'CANCELLED'] as const;
    for (const s of statuses) {
      expect(Array.isArray(getActions(s))).toBe(true);
    }
  });
});

// ── EXP-C-015: Anti-leakage — STATUS_LABELS contain no forbidden internals ───
describe('EXP-C-015 — Anti-leakage: STATUS_LABELS contain no internal field names', () => {
  const FORBIDDEN_PATTERNS = [
    'dbContext',
    'app.org_id',
    'allowed_transitions',
    'catalogVisibilityPolicyMode',
    'catalog_visibility_policy_mode',
    'relationshipState',
    'supplierPolicy',
    'internalReason',
    'DATABASE_URL',
    'token',
    'secret',
    'password',
    'serviceRole',
    'RLS',
  ];

  const allLabelValues = Object.values(STATUS_LABELS).join(' ');

  for (const forbidden of FORBIDDEN_PATTERNS) {
    it(`STATUS_LABELS does not contain "${forbidden}"`, () => {
      expect(allLabelValues.toLowerCase()).not.toContain(forbidden.toLowerCase());
    });
  }
});

// ── EXP-C-016: Anti-leakage — ACTION_LABELS contain no forbidden internals ───
describe('EXP-C-016 — Anti-leakage: ACTION_LABELS contain no internal field names', () => {
  const FORBIDDEN_PATTERNS = [
    'dbContext',
    'app.org_id',
    'allowed_transitions',
    'catalogVisibilityPolicyMode',
    'catalog_visibility_policy_mode',
    'relationshipState',
    'supplierPolicy',
    'internalReason',
    'DATABASE_URL',
    'token',
    'secret',
    'password',
    'serviceRole',
    'RLS',
  ];

  const allLabelValues = Object.values(ACTION_LABELS).join(' ');

  for (const forbidden of FORBIDDEN_PATTERNS) {
    it(`ACTION_LABELS does not contain "${forbidden}"`, () => {
      expect(allLabelValues.toLowerCase()).not.toContain(forbidden.toLowerCase());
    });
  }
});
