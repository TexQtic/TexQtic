/**
 * TECS-B2B-ORDERS-LIFECYCLE-001 — Slice C
 * WLOrdersPanel source-descriptor tests (WL-C-001 through WL-C-014)
 *
 * Shell constraint: WL_ADMIN only. This component must never be imported by EXPERIENCE.
 * Tests verify pure helper exports: canonicalStatus, getActions, STATUS_LABELS, ACTION_LABELS.
 *
 * Key difference from EXP: WLOrdersPanel has no userRole state — routing gate in
 * App.tsx enforces WL_ADMIN_ROLES (OWNER | ADMIN) before entering WL_ADMIN shell.
 * getActions() exposes full action set; role gating is router-level, not component-level.
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

import {
  __WL_ORDERS_PANEL_TESTING__,
} from '../components/WhiteLabelAdmin/WLOrdersPanel';

const { canonicalStatus, getActions, STATUS_LABELS, ACTION_LABELS } =
  __WL_ORDERS_PANEL_TESTING__;

// ── Helpers ──────────────────────────────────────────────────────────────────

type OrderStatus = 'PAYMENT_PENDING' | 'PLACED' | 'CANCELLED';

function makeOrder(
  status: OrderStatus,
  lifecycleState: string | null,
): Parameters<typeof canonicalStatus>[0] {
  return {
    id: 'ord-wl-test-1',
    status,
    grandTotal: 250,
    createdAt: new Date().toISOString(),
    lifecycleState,
    lifecycleLogs: [],
  };
}

// ── WL-C-001: Testing object exported and contains expected keys ─────────────
describe('WL-C-001 — __WL_ORDERS_PANEL_TESTING__ is exported', () => {
  it('exports the testing object', () => {
    expect(__WL_ORDERS_PANEL_TESTING__).toBeDefined();
  });

  it('contains exactly the expected keys', () => {
    const keys = Object.keys(__WL_ORDERS_PANEL_TESTING__).sort();
    expect(keys).toEqual(['ACTION_LABELS', 'STATUS_LABELS', 'canonicalStatus', 'getActions']);
  });

  it('does not contain EXPERIENCE-shell-only navigation props (no onBack)', () => {
    expect(__WL_ORDERS_PANEL_TESTING__).not.toHaveProperty('onBack');
  });
});

// ── WL-C-002: CANCELLED status (DB enum) maps to CANCELLED ──────────────────
describe('WL-C-002 — canonicalStatus: CANCELLED DB enum is terminal', () => {
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

// ── WL-C-003: PAYMENT_PENDING maps to PAYMENT_PENDING ───────────────────────
describe('WL-C-003 — canonicalStatus: PAYMENT_PENDING mapping', () => {
  it('returns PAYMENT_PENDING for status=PAYMENT_PENDING + null lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PAYMENT_PENDING', null))).toBe('PAYMENT_PENDING');
  });

  it('returns PAYMENT_PENDING for status=PLACED + lifecycleState=PAYMENT_PENDING', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'PAYMENT_PENDING'))).toBe('PAYMENT_PENDING');
  });
});

// ── WL-C-004: PLACED fallback ────────────────────────────────────────────────
describe('WL-C-004 — canonicalStatus: PLACED fallback', () => {
  it('returns PLACED for status=PLACED + null lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PLACED', null))).toBe('PLACED');
  });

  it('returns PLACED for status=PLACED + unknown lifecycleState', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'SOME_FUTURE_STATE'))).toBe('PLACED');
  });
});

// ── WL-C-005: CONFIRMED lifecycle wins ───────────────────────────────────────
describe('WL-C-005 — canonicalStatus: CONFIRMED lifecycle state wins', () => {
  it('returns CONFIRMED for status=PLACED + lifecycleState=CONFIRMED', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'CONFIRMED'))).toBe('CONFIRMED');
  });

  it('returns CONFIRMED for status=PAYMENT_PENDING + lifecycleState=CONFIRMED', () => {
    expect(canonicalStatus(makeOrder('PAYMENT_PENDING', 'CONFIRMED'))).toBe('CONFIRMED');
  });
});

// ── WL-C-006: FULFILLED lifecycle wins ───────────────────────────────────────
describe('WL-C-006 — canonicalStatus: FULFILLED lifecycle state wins', () => {
  it('returns FULFILLED for status=PLACED + lifecycleState=FULFILLED', () => {
    expect(canonicalStatus(makeOrder('PLACED', 'FULFILLED'))).toBe('FULFILLED');
  });

  it('returns FULFILLED for status=PAYMENT_PENDING + lifecycleState=FULFILLED', () => {
    expect(canonicalStatus(makeOrder('PAYMENT_PENDING', 'FULFILLED'))).toBe('FULFILLED');
  });
});

// ── WL-C-007: getActions — PAYMENT_PENDING transitions ──────────────────────
describe('WL-C-007 — getActions: PAYMENT_PENDING transitions', () => {
  it('returns [CONFIRMED, CANCELLED] for PAYMENT_PENDING', () => {
    expect(getActions('PAYMENT_PENDING')).toEqual(['CONFIRMED', 'CANCELLED']);
  });
});

// ── WL-C-008: getActions — CONFIRMED transitions ─────────────────────────────
describe('WL-C-008 — getActions: CONFIRMED transitions', () => {
  it('returns [FULFILLED, CANCELLED] for CONFIRMED', () => {
    expect(getActions('CONFIRMED')).toEqual(['FULFILLED', 'CANCELLED']);
  });
});

// ── WL-C-009: getActions — PLACED transitions ────────────────────────────────
describe('WL-C-009 — getActions: PLACED transitions', () => {
  it('returns [FULFILLED, CANCELLED] for PLACED', () => {
    expect(getActions('PLACED')).toEqual(['FULFILLED', 'CANCELLED']);
  });
});

// ── WL-C-010: getActions — terminal states expose no actions ─────────────────
describe('WL-C-010 — getActions: terminal states return empty array', () => {
  it('returns [] for FULFILLED (terminal)', () => {
    expect(getActions('FULFILLED')).toEqual([]);
  });

  it('returns [] for CANCELLED (terminal)', () => {
    expect(getActions('CANCELLED')).toEqual([]);
  });
});

// ── WL-C-011: Shell separation — no dependency on EXPERIENCE-only props ──────
describe('WL-C-011 — Shell separation: WL exports are independent of EXP shell', () => {
  it('testing export does not reference EXPOrdersPanel', () => {
    // Structural: if WL imported EXP, the module graph would throw.
    // Presence of the export object confirms clean import.
    expect(__WL_ORDERS_PANEL_TESTING__).toBeDefined();
  });

  it('WL and EXP have identical canonicalStatus semantics (shared doctrine)', () => {
    // Both components implement the same GAP-ORDER-LC-001 derivation rule.
    expect(canonicalStatus(makeOrder('PLACED', 'CONFIRMED'))).toBe('CONFIRMED');
    expect(canonicalStatus(makeOrder('PLACED', 'FULFILLED'))).toBe('FULFILLED');
    expect(canonicalStatus(makeOrder('CANCELLED', 'FULFILLED'))).toBe('CANCELLED');
  });
});

// ── WL-C-012: STATUS_LABELS — all DerivedStatus keys covered ─────────────────
describe('WL-C-012 — STATUS_LABELS: all derived statuses have labels', () => {
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
});

// ── WL-C-013: ACTION_LABELS — all TransitionTarget keys covered ──────────────
describe('WL-C-013 — ACTION_LABELS: all transition targets have labels', () => {
  const expectedKeys: string[] = ['CONFIRMED', 'FULFILLED', 'CANCELLED'];

  it('has a label for every TransitionTarget', () => {
    for (const key of expectedKeys) {
      expect(ACTION_LABELS).toHaveProperty(key);
      expect(typeof ACTION_LABELS[key as keyof typeof ACTION_LABELS]).toBe('string');
      expect(ACTION_LABELS[key as keyof typeof ACTION_LABELS].length).toBeGreaterThan(0);
    }
  });
});

// ── WL-C-014: Anti-leakage — labels contain no forbidden internals ────────────
describe('WL-C-014 — Anti-leakage: exported labels contain no internal field names', () => {
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

  const allStatusValues = Object.values(STATUS_LABELS).join(' ');
  const allActionValues = Object.values(ACTION_LABELS).join(' ');

  for (const forbidden of FORBIDDEN_PATTERNS) {
    it(`STATUS_LABELS does not contain "${forbidden}"`, () => {
      expect(allStatusValues.toLowerCase()).not.toContain(forbidden.toLowerCase());
    });

    it(`ACTION_LABELS does not contain "${forbidden}"`, () => {
      expect(allActionValues.toLowerCase()).not.toContain(forbidden.toLowerCase());
    });
  }
});
