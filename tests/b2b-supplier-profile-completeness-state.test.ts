/**
 * TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 — State/helper descriptor tests
 *
 * Pure state and helper tests for the Supplier Profile Completeness feature.
 * These tests do NOT render React components — they exercise the exported pure
 * helpers from SupplierProfileCompletenessCard.
 *
 * Governance:
 *   - humanReviewRequired label is hardcoded, never from API response
 *   - Score is supplier-internal only
 *   - FORBIDDEN: price, publicationPosture, risk_score, supplier ranking
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
  __AI_SUPPLIER_PROFILE_COMPLETENESS_CARD_TESTING__,
} from '../components/Tenant/SupplierProfileCompletenessCard';

const {
  resolveOverallScoreDisplay,
  resolveCategoryScoreBarWidth,
  resolveSeverityLabel,
  resolvePriorityLabel,
  isRateLimitError,
  isParseError,
  classifyCompletenessError,
  CATEGORY_LABELS,
  CATEGORY_KEYS,
} = __AI_SUPPLIER_PROFILE_COMPLETENESS_CARD_TESTING__;

// ---------------------------------------------------------------------------
// T-SPCS-S01: resolveOverallScoreDisplay
// ---------------------------------------------------------------------------
describe('T-SPCS-S01 — resolveOverallScoreDisplay renders percentage correctly', () => {
  it('converts 0.72 to "72%"', () => {
    expect(resolveOverallScoreDisplay(0.72)).toBe('72%');
  });

  it('converts 1.0 to "100%"', () => {
    expect(resolveOverallScoreDisplay(1.0)).toBe('100%');
  });

  it('converts 0 to "0%"', () => {
    expect(resolveOverallScoreDisplay(0)).toBe('0%');
  });

  it('rounds 0.555 to "56%"', () => {
    expect(resolveOverallScoreDisplay(0.555)).toBe('56%');
  });

  it('rounds 0.334 to "33%"', () => {
    expect(resolveOverallScoreDisplay(0.334)).toBe('33%');
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S02: resolveCategoryScoreBarWidth
// ---------------------------------------------------------------------------
describe('T-SPCS-S02 — resolveCategoryScoreBarWidth clamps and formats correctly', () => {
  it('returns "80%" for score 0.8', () => {
    expect(resolveCategoryScoreBarWidth(0.8)).toBe('80%');
  });

  it('clamps values above 1 to "100%"', () => {
    expect(resolveCategoryScoreBarWidth(1.5)).toBe('100%');
  });

  it('clamps negative values to "0%"', () => {
    expect(resolveCategoryScoreBarWidth(-0.1)).toBe('0%');
  });

  it('returns "0%" for 0', () => {
    expect(resolveCategoryScoreBarWidth(0)).toBe('0%');
  });

  it('returns "50%" for 0.5', () => {
    expect(resolveCategoryScoreBarWidth(0.5)).toBe('50%');
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S03: resolveSeverityLabel
// ---------------------------------------------------------------------------
describe('T-SPCS-S03 — resolveSeverityLabel maps severity values', () => {
  it('maps CRITICAL to "Critical"', () => {
    expect(resolveSeverityLabel('CRITICAL')).toBe('Critical');
  });

  it('maps WARNING to "Warning"', () => {
    expect(resolveSeverityLabel('WARNING')).toBe('Warning');
  });

  it('maps INFO to "Info"', () => {
    expect(resolveSeverityLabel('INFO')).toBe('Info');
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S04: resolvePriorityLabel
// ---------------------------------------------------------------------------
describe('T-SPCS-S04 — resolvePriorityLabel maps priority values', () => {
  it('maps HIGH to "High"', () => {
    expect(resolvePriorityLabel('HIGH')).toBe('High');
  });

  it('maps MEDIUM to "Medium"', () => {
    expect(resolvePriorityLabel('MEDIUM')).toBe('Medium');
  });

  it('maps LOW to "Low"', () => {
    expect(resolvePriorityLabel('LOW')).toBe('Low');
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S05: isRateLimitError
// ---------------------------------------------------------------------------
describe('T-SPCS-S05 — isRateLimitError detects rate-limit errors', () => {
  it('returns true for status 429 error object', () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
  });

  it('returns true for code RATE_LIMIT_EXCEEDED error object', () => {
    expect(isRateLimitError({ code: 'RATE_LIMIT_EXCEEDED' })).toBe(true);
  });

  it('returns false for status 422 error object', () => {
    expect(isRateLimitError({ status: 422 })).toBe(false);
  });

  it('returns false for generic Error', () => {
    expect(isRateLimitError(new Error('network error'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRateLimitError(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S06: isParseError
// ---------------------------------------------------------------------------
describe('T-SPCS-S06 — isParseError detects parse errors', () => {
  it('returns true for status 422 error object', () => {
    expect(isParseError({ status: 422 })).toBe(true);
  });

  it('returns true for code PARSE_ERROR error object', () => {
    expect(isParseError({ code: 'PARSE_ERROR' })).toBe(true);
  });

  it('returns false for status 429 error object', () => {
    expect(isParseError({ status: 429 })).toBe(false);
  });

  it('returns false for generic Error', () => {
    expect(isParseError(new Error('timeout'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S07: classifyCompletenessError
// ---------------------------------------------------------------------------
describe('T-SPCS-S07 — classifyCompletenessError classifies error types correctly', () => {
  it('classifies rate-limit error correctly', () => {
    expect(classifyCompletenessError({ status: 429 })).toBe('rate_limit');
  });

  it('classifies parse error correctly', () => {
    expect(classifyCompletenessError({ status: 422 })).toBe('parse_error');
  });

  it('classifies network/unknown error as "network"', () => {
    expect(classifyCompletenessError(new Error('connection refused'))).toBe('network');
  });

  it('classifies null as "network"', () => {
    expect(classifyCompletenessError(null)).toBe('network');
  });

  it('classifies RATE_LIMIT_EXCEEDED code as "rate_limit"', () => {
    expect(classifyCompletenessError({ code: 'RATE_LIMIT_EXCEEDED' })).toBe('rate_limit');
  });

  it('classifies PARSE_ERROR code as "parse_error"', () => {
    expect(classifyCompletenessError({ code: 'PARSE_ERROR' })).toBe('parse_error');
  });
});

// ---------------------------------------------------------------------------
// T-SPCS-S08: CATEGORY_KEYS completeness — all 10 categories present
// ---------------------------------------------------------------------------
describe('T-SPCS-S08 — CATEGORY_KEYS covers all 10 required categories', () => {
  const EXPECTED_KEYS = [
    'profileIdentity',
    'businessCapability',
    'catalogCoverage',
    'catalogAttributeQuality',
    'stageTaxonomy',
    'certificationsDocuments',
    'rfqResponsiveness',
    'serviceCapabilityClarity',
    'aiReadiness',
    'buyerDiscoverability',
  ] as const;

  it('has exactly 10 category keys', () => {
    expect(CATEGORY_KEYS).toHaveLength(10);
  });

  for (const key of EXPECTED_KEYS) {
    it(`contains category key "${key}"`, () => {
      expect(CATEGORY_KEYS).toContain(key);
    });
  }
});

// ---------------------------------------------------------------------------
// T-SPCS-S09: CATEGORY_LABELS has correct display labels for all 10 categories
// ---------------------------------------------------------------------------
describe('T-SPCS-S09 — CATEGORY_LABELS has correct display labels', () => {
  it('profileIdentity label is "Profile Identity"', () => {
    expect(CATEGORY_LABELS.profileIdentity).toBe('Profile Identity');
  });

  it('businessCapability label is "Business Capability"', () => {
    expect(CATEGORY_LABELS.businessCapability).toBe('Business Capability');
  });

  it('catalogCoverage label is "Catalog Coverage"', () => {
    expect(CATEGORY_LABELS.catalogCoverage).toBe('Catalog Coverage');
  });

  it('catalogAttributeQuality label is "Catalog Attribute Quality"', () => {
    expect(CATEGORY_LABELS.catalogAttributeQuality).toBe('Catalog Attribute Quality');
  });

  it('stageTaxonomy label is "Stage Taxonomy"', () => {
    expect(CATEGORY_LABELS.stageTaxonomy).toBe('Stage Taxonomy');
  });

  it('certificationsDocuments label is "Certifications & Documents"', () => {
    expect(CATEGORY_LABELS.certificationsDocuments).toBe('Certifications & Documents');
  });

  it('rfqResponsiveness label is "RFQ Responsiveness"', () => {
    expect(CATEGORY_LABELS.rfqResponsiveness).toBe('RFQ Responsiveness');
  });

  it('serviceCapabilityClarity label is "Service Capability Clarity"', () => {
    expect(CATEGORY_LABELS.serviceCapabilityClarity).toBe('Service Capability Clarity');
  });

  it('aiReadiness label is "AI Readiness"', () => {
    expect(CATEGORY_LABELS.aiReadiness).toBe('AI Readiness');
  });

  it('buyerDiscoverability label is "Buyer Discoverability"', () => {
    expect(CATEGORY_LABELS.buyerDiscoverability).toBe('Buyer Discoverability');
  });
});
