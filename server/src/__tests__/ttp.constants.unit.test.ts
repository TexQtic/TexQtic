/**
 * TTP-FOUNDATION-001: Unit tests for ttp.constants.ts
 *
 * These tests verify that every constant:
 *   1. Has the exact string value mandated by the migration SQL seeds.
 *   2. Is not accidentally undefined or empty.
 *   3. Derived sets (terminal states, eligible tiers) contain the correct members.
 *
 * NO database access. NO service calls. Constants only.
 */

import { describe, it, expect } from 'vitest';
import {
  TTP_INVOICE_STATE,
  TTP_INVOICE_TERMINAL_STATES,
  TTP_VPC_STATE,
  TTP_VPC_TERMINAL_STATES,
  TTP_ENTITY_TYPE,
  TTP_FEATURE_FLAG,
  TTP_RISK_TIER,
  TTP_VPC_ELIGIBLE_TIERS,
  TTP_ELIGIBILITY_OUTCOME,
  TTP_ACTOR_TYPE,
  TTP_PARTNER_TYPE,
  TTP_TRANSMISSION_STATUS,
  TTP_GST_FILING_STATUS,
  TTP_GST_REVIEW_OUTCOME,
  TTP_ASSESSMENT_TYPE,
  TTP_AI_REASON_PREFIX,
} from '../ttp/ttp.constants.js';

// ─── §1 TTP_INVOICE_STATE ────────────────────────────────────────────────────

describe('TTP_INVOICE_STATE', () => {
  it('has exactly 9 states matching migration seeds', () => {
    expect(Object.keys(TTP_INVOICE_STATE)).toHaveLength(9);
  });

  it.each([
    ['DRAFT', 'DRAFT'],
    ['SUBMITTED', 'SUBMITTED'],
    ['UNDER_REVIEW', 'UNDER_REVIEW'],
    ['VERIFIED', 'VERIFIED'],
    ['INELIGIBLE', 'INELIGIBLE'],
    ['DISPUTED', 'DISPUTED'],
    ['WITHDRAWN', 'WITHDRAWN'],
    ['EXPIRED', 'EXPIRED'],
    ['SUPERSEDED', 'SUPERSEDED'],
  ] as const)(
    'TTP_INVOICE_STATE.%s === %s (matches migration seed)',
    (key, expected) => {
      expect(TTP_INVOICE_STATE[key]).toBe(expected);
    },
  );

  it('all values are uppercase non-empty strings', () => {
    for (const v of Object.values(TTP_INVOICE_STATE)) {
      expect(v).toMatch(/^[A-Z_]+$/);
      expect(v.length).toBeGreaterThan(0);
    }
  });
});

// ─── §2 TTP_INVOICE_TERMINAL_STATES ──────────────────────────────────────────

describe('TTP_INVOICE_TERMINAL_STATES', () => {
  it('contains exactly the 4 terminal states', () => {
    expect(TTP_INVOICE_TERMINAL_STATES.size).toBe(4);
    expect(TTP_INVOICE_TERMINAL_STATES.has('INELIGIBLE')).toBe(true);
    expect(TTP_INVOICE_TERMINAL_STATES.has('WITHDRAWN')).toBe(true);
    expect(TTP_INVOICE_TERMINAL_STATES.has('EXPIRED')).toBe(true);
    expect(TTP_INVOICE_TERMINAL_STATES.has('SUPERSEDED')).toBe(true);
  });

  it('does NOT include non-terminal states', () => {
    expect(TTP_INVOICE_TERMINAL_STATES.has('DRAFT')).toBe(false);
    expect(TTP_INVOICE_TERMINAL_STATES.has('SUBMITTED')).toBe(false);
    expect(TTP_INVOICE_TERMINAL_STATES.has('UNDER_REVIEW')).toBe(false);
    expect(TTP_INVOICE_TERMINAL_STATES.has('VERIFIED')).toBe(false);
    expect(TTP_INVOICE_TERMINAL_STATES.has('DISPUTED')).toBe(false);
  });
});

// ─── §3 TTP_VPC_STATE ────────────────────────────────────────────────────────

describe('TTP_VPC_STATE', () => {
  it('has exactly 5 states matching migration seeds', () => {
    expect(Object.keys(TTP_VPC_STATE)).toHaveLength(5);
  });

  it.each([
    ['ACTIVE', 'ACTIVE'],
    ['ROUTING_READY', 'ROUTING_READY'],
    ['TRANSMITTED', 'TRANSMITTED'],
    ['VOIDED', 'VOIDED'],
    ['EXPIRED', 'EXPIRED'],
  ] as const)(
    'TTP_VPC_STATE.%s === %s (matches migration seed)',
    (key, expected) => {
      expect(TTP_VPC_STATE[key]).toBe(expected);
    },
  );

  it('all values are uppercase non-empty strings', () => {
    for (const v of Object.values(TTP_VPC_STATE)) {
      expect(v).toMatch(/^[A-Z_]+$/);
    }
  });
});

// ─── §4 TTP_VPC_TERMINAL_STATES ──────────────────────────────────────────────

describe('TTP_VPC_TERMINAL_STATES', () => {
  it('contains exactly the 3 terminal VPC states', () => {
    expect(TTP_VPC_TERMINAL_STATES.size).toBe(3);
    expect(TTP_VPC_TERMINAL_STATES.has('TRANSMITTED')).toBe(true);
    expect(TTP_VPC_TERMINAL_STATES.has('VOIDED')).toBe(true);
    expect(TTP_VPC_TERMINAL_STATES.has('EXPIRED')).toBe(true);
  });

  it('does NOT include non-terminal VPC states', () => {
    expect(TTP_VPC_TERMINAL_STATES.has('ACTIVE')).toBe(false);
    expect(TTP_VPC_TERMINAL_STATES.has('ROUTING_READY')).toBe(false);
  });
});

// ─── §5 TTP_ENTITY_TYPE ──────────────────────────────────────────────────────

describe('TTP_ENTITY_TYPE', () => {
  it('has exactly 2 entity types', () => {
    expect(Object.keys(TTP_ENTITY_TYPE)).toHaveLength(2);
  });

  it('INVOICE and VPC match migration entity_type values', () => {
    expect(TTP_ENTITY_TYPE.INVOICE).toBe('INVOICE');
    expect(TTP_ENTITY_TYPE.VPC).toBe('VPC');
  });
});

// ─── §6 TTP_FEATURE_FLAG ─────────────────────────────────────────────────────

describe('TTP_FEATURE_FLAG', () => {
  it('has exactly 6 feature flags matching migration seeds', () => {
    expect(Object.keys(TTP_FEATURE_FLAG)).toHaveLength(6);
  });

  it.each([
    ['TTP_ENABLED', 'ttp_enabled'],
    ['MAX_INVOICE_AMOUNT_TIER_1_INR', 'ttp_max_invoice_amount_tier_1_inr'],
    ['MAX_INVOICE_AMOUNT_TIER_2_INR', 'ttp_max_invoice_amount_tier_2_inr'],
    ['MAX_INVOICE_AMOUNT_TIER_3_INR', 'ttp_max_invoice_amount_tier_3_inr'],
    ['MAKER_CHECKER_THRESHOLD_INR', 'ttp_maker_checker_threshold_inr'],
    [
      'ELIGIBILITY_ASSESSMENT_VALIDITY_DAYS',
      'ttp_eligibility_assessment_validity_days',
    ],
  ] as const)(
    'TTP_FEATURE_FLAG.%s === %s (matches migration seed PK)',
    (key, expected) => {
      expect(TTP_FEATURE_FLAG[key]).toBe(expected);
    },
  );

  it('all flag keys are lowercase_snake_case matching DB PK format', () => {
    for (const v of Object.values(TTP_FEATURE_FLAG)) {
      expect(v).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('all flag keys start with ttp_ prefix', () => {
    for (const v of Object.values(TTP_FEATURE_FLAG)) {
      expect(v.startsWith('ttp_')).toBe(true);
    }
  });
});

// ─── §7 TTP_RISK_TIER ────────────────────────────────────────────────────────

describe('TTP_RISK_TIER', () => {
  it('has exactly 4 tiers', () => {
    expect(Object.keys(TTP_RISK_TIER)).toHaveLength(4);
  });

  it('maps to correct SMALLINT values matching schema CHECK (0-3)', () => {
    expect(TTP_RISK_TIER.THIN_FILE).toBe(0);
    expect(TTP_RISK_TIER.LOW).toBe(1);
    expect(TTP_RISK_TIER.MEDIUM).toBe(2);
    expect(TTP_RISK_TIER.HIGH).toBe(3);
  });

  it('all tier values are integers between 0 and 3 inclusive', () => {
    for (const v of Object.values(TTP_RISK_TIER)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(3);
    }
  });
});

// ─── §8 TTP_VPC_ELIGIBLE_TIERS ───────────────────────────────────────────────

describe('TTP_VPC_ELIGIBLE_TIERS', () => {
  it('contains exactly tiers 1, 2, 3 (VPC schema CHECK: risk_tier BETWEEN 1 AND 3)', () => {
    expect(TTP_VPC_ELIGIBLE_TIERS.size).toBe(3);
    expect(TTP_VPC_ELIGIBLE_TIERS.has(1)).toBe(true);
    expect(TTP_VPC_ELIGIBLE_TIERS.has(2)).toBe(true);
    expect(TTP_VPC_ELIGIBLE_TIERS.has(3)).toBe(true);
  });

  it('does NOT include tier 0 (THIN_FILE: not eligible for VPC)', () => {
    expect(TTP_VPC_ELIGIBLE_TIERS.has(0)).toBe(false);
  });
});

// ─── §9 TTP_ELIGIBILITY_OUTCOME ──────────────────────────────────────────────

describe('TTP_ELIGIBILITY_OUTCOME', () => {
  it('has exactly 3 outcomes matching schema CHECK', () => {
    expect(Object.keys(TTP_ELIGIBILITY_OUTCOME)).toHaveLength(3);
  });

  it('values match ttp_eligibility_assessments.eligibility_outcome CHECK', () => {
    expect(TTP_ELIGIBILITY_OUTCOME.ELIGIBLE).toBe('ELIGIBLE');
    expect(TTP_ELIGIBILITY_OUTCOME.INELIGIBLE).toBe('INELIGIBLE');
    expect(TTP_ELIGIBILITY_OUTCOME.MANUAL_REVIEW).toBe('MANUAL_REVIEW');
  });
});

// ─── §10 TTP_ACTOR_TYPE ──────────────────────────────────────────────────────

describe('TTP_ACTOR_TYPE', () => {
  it('has exactly 4 actor types', () => {
    expect(Object.keys(TTP_ACTOR_TYPE)).toHaveLength(4);
  });

  it('values match allowed_transitions.allowed_actor_type seeds', () => {
    expect(TTP_ACTOR_TYPE.TENANT_USER).toBe('TENANT_USER');
    expect(TTP_ACTOR_TYPE.TENANT_ADMIN).toBe('TENANT_ADMIN');
    expect(TTP_ACTOR_TYPE.PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
    expect(TTP_ACTOR_TYPE.SYSTEM_AUTOMATION).toBe('SYSTEM_AUTOMATION');
  });
});

// ─── §11 TTP_PARTNER_TYPE ────────────────────────────────────────────────────

describe('TTP_PARTNER_TYPE', () => {
  it('has exactly 3 partner types matching schema CHECK', () => {
    expect(Object.keys(TTP_PARTNER_TYPE)).toHaveLength(3);
  });

  it('values match partner_routing_stubs.partner_type CHECK', () => {
    expect(TTP_PARTNER_TYPE.NBFC_STUB).toBe('NBFC_STUB');
    expect(TTP_PARTNER_TYPE.BANK_STUB).toBe('BANK_STUB');
    expect(TTP_PARTNER_TYPE.FACTORING_STUB).toBe('FACTORING_STUB');
  });
});

// ─── §12 TTP_TRANSMISSION_STATUS ─────────────────────────────────────────────

describe('TTP_TRANSMISSION_STATUS', () => {
  it('has exactly 3 statuses matching schema CHECK', () => {
    expect(Object.keys(TTP_TRANSMISSION_STATUS)).toHaveLength(3);
  });

  it('values match partner_routing_stubs.transmission_status CHECK', () => {
    expect(TTP_TRANSMISSION_STATUS.PENDING).toBe('PENDING');
    expect(TTP_TRANSMISSION_STATUS.TRANSMITTED).toBe('TRANSMITTED');
    expect(TTP_TRANSMISSION_STATUS.FAILED).toBe('FAILED');
  });
});

// ─── §13 TTP_GST_FILING_STATUS ───────────────────────────────────────────────

describe('TTP_GST_FILING_STATUS', () => {
  it('has exactly 4 statuses matching schema CHECK', () => {
    expect(Object.keys(TTP_GST_FILING_STATUS)).toHaveLength(4);
  });

  it('values match gst_verifications.filing_status CHECK', () => {
    expect(TTP_GST_FILING_STATUS.ACTIVE).toBe('ACTIVE');
    expect(TTP_GST_FILING_STATUS.CANCELLED).toBe('CANCELLED');
    expect(TTP_GST_FILING_STATUS.SUSPENDED).toBe('SUSPENDED');
    expect(TTP_GST_FILING_STATUS.UNKNOWN).toBe('UNKNOWN');
  });
});

// ─── §14 TTP_GST_REVIEW_OUTCOME ──────────────────────────────────────────────

describe('TTP_GST_REVIEW_OUTCOME', () => {
  it('has exactly 3 outcomes matching schema CHECK', () => {
    expect(Object.keys(TTP_GST_REVIEW_OUTCOME)).toHaveLength(3);
  });

  it('values match gst_verifications.review_outcome CHECK', () => {
    expect(TTP_GST_REVIEW_OUTCOME.APPROVED).toBe('APPROVED');
    expect(TTP_GST_REVIEW_OUTCOME.REJECTED).toBe('REJECTED');
    expect(TTP_GST_REVIEW_OUTCOME.NEEDS_MORE_INFO).toBe('NEEDS_MORE_INFO');
  });
});

// ─── §15 TTP_ASSESSMENT_TYPE ─────────────────────────────────────────────────

describe('TTP_ASSESSMENT_TYPE', () => {
  it('has exactly 2 assessment types', () => {
    expect(Object.keys(TTP_ASSESSMENT_TYPE)).toHaveLength(2);
  });

  it('MANUAL is the only Phase 1 assessment type', () => {
    expect(TTP_ASSESSMENT_TYPE.MANUAL).toBe('MANUAL');
  });

  it('BUREAU_API is the Phase 2 stub value', () => {
    expect(TTP_ASSESSMENT_TYPE.BUREAU_API).toBe('BUREAU_API');
  });
});

// ─── §16 TTP_AI_REASON_PREFIX ────────────────────────────────────────────────

describe('TTP_AI_REASON_PREFIX', () => {
  it('is the exact prefix string required by D-020-C', () => {
    expect(TTP_AI_REASON_PREFIX).toBe('HUMAN_CONFIRMED:');
  });

  it('is non-empty and ends with a colon (convention for prefix markers)', () => {
    expect(TTP_AI_REASON_PREFIX.length).toBeGreaterThan(0);
    expect(TTP_AI_REASON_PREFIX.endsWith(':')).toBe(true);
  });

  it('can be used to check a reason string prefixed correctly', () => {
    const validReason = `${TTP_AI_REASON_PREFIX} Admin reviewed AI suggestion.`;
    expect(validReason.startsWith(TTP_AI_REASON_PREFIX)).toBe(true);
  });

  it('a reason without the prefix fails the D-020-C check', () => {
    const invalidReason = 'AI suggested this transition.';
    expect(invalidReason.startsWith(TTP_AI_REASON_PREFIX)).toBe(false);
  });
});

// ─── §17 Cross-constant consistency ─────────────────────────────────────────

describe('cross-constant consistency checks', () => {
  it('terminal INVOICE states are a subset of all INVOICE states', () => {
    const allStates = new Set(Object.values(TTP_INVOICE_STATE));
    for (const s of TTP_INVOICE_TERMINAL_STATES) {
      expect(allStates.has(s)).toBe(true);
    }
  });

  it('terminal VPC states are a subset of all VPC states', () => {
    const allVpcStates = new Set(Object.values(TTP_VPC_STATE));
    for (const s of TTP_VPC_TERMINAL_STATES) {
      expect(allVpcStates.has(s)).toBe(true);
    }
  });

  it('VPC eligible tiers are a subset of defined risk tiers', () => {
    const allTiers = new Set(Object.values(TTP_RISK_TIER));
    for (const t of TTP_VPC_ELIGIBLE_TIERS) {
      expect(allTiers.has(t)).toBe(true);
    }
  });

  it('OQ-TTP-001 tier cap order is correct: tier1 < tier2 < tier3', () => {
    expect(TTP_RISK_TIER.LOW).toBeLessThan(TTP_RISK_TIER.MEDIUM);
    expect(TTP_RISK_TIER.MEDIUM).toBeLessThan(TTP_RISK_TIER.HIGH);
  });

  it('THIN_FILE tier (0) is correctly excluded from VPC eligible tiers', () => {
    expect(TTP_VPC_ELIGIBLE_TIERS.has(TTP_RISK_TIER.THIN_FILE)).toBe(false);
  });

  it('ttp_enabled flag key is present in TTP_FEATURE_FLAG', () => {
    const allKeys = Object.values(TTP_FEATURE_FLAG);
    expect(allKeys).toContain('ttp_enabled');
  });

  it('feature flag count matches number of flags seeded in migration (6)', () => {
    expect(Object.keys(TTP_FEATURE_FLAG)).toHaveLength(6);
  });
});
