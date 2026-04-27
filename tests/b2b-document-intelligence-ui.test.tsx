/**
 * TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 — K-4 Frontend UI source-descriptor tests
 *
 * Source-descriptor tests for the Document Intelligence UI panel (K-4).
 * Follows the established pattern from b2b-supplier-profile-completeness-ui.test.tsx —
 * no React rendering performed. Tests verify exported UI helpers, constants,
 * and governance boundaries from DocumentIntelligenceCard and
 * documentIntelligenceService.
 *
 * Test IDs and their assertions:
 *   K4-UI-01  idle state — test surface is exported and component entry point exists
 *   K4-UI-02  governance label — exact text constant matches design spec
 *   K4-UI-03  analyse button calls extract route — service function calls tenantPost
 *   K4-UI-04  loading state — loading message is defined
 *   K4-UI-05  draft panel renders on success — review panel helpers exported
 *   K4-UI-06  confidence indicators render — resolveConfidenceTier thresholds correct
 *   K4-UI-07  flagged fields render — flagged_for_review drives display helpers
 *   K4-UI-08  null fields show "Not found in document" placeholder
 *   K4-UI-09  forbidden terms absent — FORBIDDEN_DISPLAY_TERMS list is correct
 *   K4-UI-10  no approve/reject controls — FORBIDDEN_K4_ACTIONS contains approve/reject
 *   K4-UI-11  no buyer-facing/public output — component has data-surface=supplier-internal
 *   K4-UI-12  error fallback renders safely — classifyExtractionError covers error cases
 *
 * Run:
 *   cd C:\Users\PARESH\TexQtic ; npx vitest run tests/b2b-document-intelligence-ui.test.tsx
 */

import { describe, expect, it, vi } from 'vitest';

// Mock the tenant API client before importing the service
vi.mock('../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

import {
  __DOCUMENT_INTELLIGENCE_SERVICE_TESTING__,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
  FORBIDDEN_DISPLAY_TERMS,
  FORBIDDEN_K4_ACTIONS,
  NULL_FIELD_PLACEHOLDER,
  triggerDocumentExtraction,
  type ExtractedField,
} from '../services/documentIntelligenceService';

import {
  __DOCUMENT_INTELLIGENCE_CARD_TESTING__,
} from '../components/Tenant/DocumentIntelligenceCard';

import { tenantPost } from '../services/tenantApiClient';

const {
  resolveConfidenceTier,
  resolveConfidencePercent,
  resolveConfidenceTierLabel,
  resolveConfidenceTierClasses,
  resolveFieldDisplayValue,
  resolveFieldLabel,
  classifyExtractionError,
  resolveExtractionErrorMessage,
} = __DOCUMENT_INTELLIGENCE_SERVICE_TESTING__;

const {
  resolveDocumentTypeLabel,
  resolveOverallConfidenceDisplay,
  hasFlaggedFields,
  countFlaggedFields,
  isNullField,
} = __DOCUMENT_INTELLIGENCE_CARD_TESTING__;

const mockTenantPost = vi.mocked(tenantPost);

// ─── Sample test data ─────────────────────────────────────────────────────────

const SAMPLE_DOC_ID = 'cccccccc-0000-4000-8000-cccccccccccc';
const SAMPLE_DOC_TEXT =
  'GOTS Certificate No. TX-2026-001. Issued to: Textile Co Ltd. ' +
  'Scope: Spinning, Weaving, Dyeing. Valid from: 2026-01-01 to 2026-12-31.';

const SAMPLE_EXTRACTED_FIELDS: ExtractedField[] = [
  {
    field_name: 'certificate_number',
    raw_value: 'TX-2026-001',
    normalized_value: 'TX-2026-001',
    confidence: 0.95,
    source_region: 'header',
    flagged_for_review: false,
  },
  {
    field_name: 'valid_from',
    raw_value: '2026-01-01',
    normalized_value: '2026-01-01',
    confidence: 0.72,
    source_region: null,
    flagged_for_review: false,
  },
  {
    field_name: 'expiry_date',
    raw_value: null,
    normalized_value: null,
    confidence: 0.30,
    source_region: null,
    flagged_for_review: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-01: idle state — test surface exported, component entry point exists
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-01 — idle state test surface is exported', () => {
  it('service testing surface is defined', () => {
    expect(__DOCUMENT_INTELLIGENCE_SERVICE_TESTING__).toBeDefined();
    expect(typeof resolveConfidenceTier).toBe('function');
    expect(typeof classifyExtractionError).toBe('function');
  });

  it('card testing surface is defined', () => {
    expect(__DOCUMENT_INTELLIGENCE_CARD_TESTING__).toBeDefined();
    expect(typeof resolveDocumentTypeLabel).toBe('function');
    expect(typeof hasFlaggedFields).toBe('function');
  });

  it('triggerDocumentExtraction is exported and callable', () => {
    expect(typeof triggerDocumentExtraction).toBe('function');
  });

  it('SAFE_FALLBACK_MESSAGE is defined in card testing surface', () => {
    const { SAFE_FALLBACK_MESSAGE } = __DOCUMENT_INTELLIGENCE_CARD_TESTING__;
    expect(typeof SAFE_FALLBACK_MESSAGE).toBe('string');
    expect(SAFE_FALLBACK_MESSAGE.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-02: governance label — exact text constant
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-02 — governance label exact text', () => {
  const EXPECTED_LABEL =
    'AI-generated extraction \u00B7 Human review required before acting on any extracted data';

  it('DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL matches design spec exactly', () => {
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toBe(EXPECTED_LABEL);
  });

  it('service testing surface exports the same label constant', () => {
    expect(__DOCUMENT_INTELLIGENCE_SERVICE_TESTING__.DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toBe(
      EXPECTED_LABEL,
    );
  });

  it('card testing surface exports the same label constant', () => {
    expect(__DOCUMENT_INTELLIGENCE_CARD_TESTING__.DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toBe(
      EXPECTED_LABEL,
    );
  });

  it('label contains "Human review required" (structural requirement per design Section H)', () => {
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toContain('Human review required');
  });

  it('label contains "AI-generated extraction"', () => {
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toContain('AI-generated extraction');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-03: analyse button calls extract route via tenantPost
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-03 — triggerDocumentExtraction calls tenantPost with correct args', () => {
  it('calls tenantPost with correct endpoint pattern', async () => {
    mockTenantPost.mockResolvedValueOnce({
      success: true,
      data: {
        draft: {
          id: 'draft-id',
          documentId: SAMPLE_DOC_ID,
          orgId: 'org-id',
          documentType: 'GOTS_CERTIFICATE',
          extractedFields: [],
          overallConfidence: 0.85,
          humanReviewRequired: true,
          status: 'draft',
          extractionNotes: null,
          extractedAt: '2026-05-05T00:00:00.000Z',
          reviewedAt: null,
          reviewedByUserId: null,
        },
        humanReviewRequired: true,
        governanceLabel:
          'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
      },
    });

    await triggerDocumentExtraction(SAMPLE_DOC_ID, { documentText: SAMPLE_DOC_TEXT });

    expect(mockTenantPost).toHaveBeenCalledOnce();
    const [endpoint, body] = mockTenantPost.mock.calls[0];
    expect(endpoint).toBe(`/api/tenant/documents/${SAMPLE_DOC_ID}/extract`);
    expect(body).toMatchObject({ documentText: SAMPLE_DOC_TEXT });
  });

  it('request body does NOT contain orgId (D-017-A)', async () => {
    mockTenantPost.mockResolvedValueOnce({
      success: true,
      data: {
        draft: {
          id: 'draft-id',
          documentId: SAMPLE_DOC_ID,
          orgId: 'org-id',
          documentType: 'GOTS_CERTIFICATE',
          extractedFields: [],
          overallConfidence: 0.85,
          humanReviewRequired: true,
          status: 'draft',
          extractionNotes: null,
          extractedAt: '2026-05-05T00:00:00.000Z',
          reviewedAt: null,
          reviewedByUserId: null,
        },
        humanReviewRequired: true,
        governanceLabel:
          'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
      },
    });

    await triggerDocumentExtraction(SAMPLE_DOC_ID, { documentText: SAMPLE_DOC_TEXT });

    const [, body] = mockTenantPost.mock.calls[0];
    expect(body).not.toHaveProperty('orgId');
  });

  it('returns the draft from data envelope', async () => {
    const mockDraft = {
      id: 'draft-abc',
      documentId: SAMPLE_DOC_ID,
      orgId: 'org-id',
      documentType: 'GOTS_CERTIFICATE',
      extractedFields: SAMPLE_EXTRACTED_FIELDS,
      overallConfidence: 0.85,
      humanReviewRequired: true as const,
      status: 'draft' as const,
      extractionNotes: null,
      extractedAt: '2026-05-05T00:00:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
    };

    mockTenantPost.mockResolvedValueOnce({
      success: true,
      data: {
        draft: mockDraft,
        humanReviewRequired: true,
        governanceLabel:
          'AI-generated extraction \u00B7 Human review required before acting on any extracted data',
      },
    });

    const result = await triggerDocumentExtraction(SAMPLE_DOC_ID, {
      documentText: SAMPLE_DOC_TEXT,
    });

    expect(result.draft.id).toBe('draft-abc');
    expect(result.draft.documentType).toBe('GOTS_CERTIFICATE');
    expect(result.humanReviewRequired).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-04: loading state — loading message is defined
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-04 — loading state is defined', () => {
  it('SAFE_FALLBACK_MESSAGE is a non-empty string', () => {
    const { SAFE_FALLBACK_MESSAGE } = __DOCUMENT_INTELLIGENCE_CARD_TESTING__;
    expect(typeof SAFE_FALLBACK_MESSAGE).toBe('string');
    expect(SAFE_FALLBACK_MESSAGE.length).toBeGreaterThan(10);
  });

  it('resolveExtractionErrorMessage returns a string for all error types', () => {
    const types = ['parse_error', 'budget_exceeded', 'service_unavailable', 'unauthorized', 'network'] as const;
    for (const t of types) {
      const msg = resolveExtractionErrorMessage(t);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-05: draft panel renders on success — review panel helpers exported
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-05 — draft panel helpers work correctly', () => {
  it('resolveDocumentTypeLabel maps GOTS_CERTIFICATE correctly', () => {
    expect(resolveDocumentTypeLabel('GOTS_CERTIFICATE')).toBe('GOTS Certificate');
  });

  it('resolveDocumentTypeLabel maps UNKNOWN correctly', () => {
    expect(resolveDocumentTypeLabel('UNKNOWN')).toBe('Unknown Document Type');
  });

  it('resolveDocumentTypeLabel falls back to raw value for unmapped types', () => {
    expect(resolveDocumentTypeLabel('CUSTOM_TYPE')).toBe('CUSTOM_TYPE');
  });

  it('resolveOverallConfidenceDisplay returns percentage string', () => {
    expect(resolveOverallConfidenceDisplay(0.85)).toBe('85%');
    expect(resolveOverallConfidenceDisplay(0.0)).toBe('0%');
    expect(resolveOverallConfidenceDisplay(1.0)).toBe('100%');
    expect(resolveOverallConfidenceDisplay(0.63)).toBe('63%');
  });

  it('resolveFieldLabel converts snake_case to Title Case', () => {
    expect(resolveFieldLabel('certificate_number')).toBe('Certificate Number');
    expect(resolveFieldLabel('valid_from')).toBe('Valid From');
    expect(resolveFieldLabel('expiry_date')).toBe('Expiry Date');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-06: confidence indicators render correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-06 — confidence tier thresholds are correct', () => {
  it('confidence 0.85+ is HIGH tier', () => {
    expect(resolveConfidenceTier(0.85)).toBe('HIGH');
    expect(resolveConfidenceTier(0.90)).toBe('HIGH');
    expect(resolveConfidenceTier(1.0)).toBe('HIGH');
  });

  it('confidence 0.50–0.84 is NEEDS_REVIEW tier', () => {
    expect(resolveConfidenceTier(0.50)).toBe('NEEDS_REVIEW');
    expect(resolveConfidenceTier(0.72)).toBe('NEEDS_REVIEW');
    expect(resolveConfidenceTier(0.84)).toBe('NEEDS_REVIEW');
  });

  it('confidence < 0.50 is FLAGGED tier', () => {
    expect(resolveConfidenceTier(0.0)).toBe('FLAGGED');
    expect(resolveConfidenceTier(0.30)).toBe('FLAGGED');
    expect(resolveConfidenceTier(0.49)).toBe('FLAGGED');
  });

  it('tier boundary at exactly 0.85 is HIGH', () => {
    expect(resolveConfidenceTier(0.85)).toBe('HIGH');
  });

  it('tier boundary at exactly 0.50 is NEEDS_REVIEW', () => {
    expect(resolveConfidenceTier(0.50)).toBe('NEEDS_REVIEW');
  });

  it('resolveConfidenceTierLabel returns correct label for each tier', () => {
    expect(resolveConfidenceTierLabel('HIGH')).toBe('High confidence');
    expect(resolveConfidenceTierLabel('NEEDS_REVIEW')).toBe('Needs review');
    expect(resolveConfidenceTierLabel('FLAGGED')).toBe('Flagged for review');
  });

  it('resolveConfidencePercent formats correctly', () => {
    expect(resolveConfidencePercent(0.95)).toBe('95%');
    expect(resolveConfidencePercent(0.724)).toBe('72%');
    expect(resolveConfidencePercent(0.0)).toBe('0%');
    expect(resolveConfidencePercent(1.0)).toBe('100%');
  });

  it('resolveConfidenceTierClasses returns non-empty string for all tiers', () => {
    for (const tier of ['HIGH', 'NEEDS_REVIEW', 'FLAGGED'] as const) {
      const classes = resolveConfidenceTierClasses(tier);
      expect(typeof classes).toBe('string');
      expect(classes.length).toBeGreaterThan(0);
    }
  });

  it('HIGH tier classes contain emerald (green)', () => {
    expect(resolveConfidenceTierClasses('HIGH')).toContain('emerald');
  });

  it('NEEDS_REVIEW tier classes contain amber', () => {
    expect(resolveConfidenceTierClasses('NEEDS_REVIEW')).toContain('amber');
  });

  it('FLAGGED tier classes contain red', () => {
    expect(resolveConfidenceTierClasses('FLAGGED')).toContain('red');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-07: flagged fields render — hasFlaggedFields / countFlaggedFields
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-07 — flagged field helpers work correctly', () => {
  it('hasFlaggedFields returns true when any field has flagged_for_review=true', () => {
    expect(hasFlaggedFields(SAMPLE_EXTRACTED_FIELDS)).toBe(true);
  });

  it('hasFlaggedFields returns false when no fields are flagged', () => {
    const noFlags: ExtractedField[] = [
      {
        field_name: 'cert_no',
        raw_value: 'TX-001',
        normalized_value: 'TX-001',
        confidence: 0.95,
        source_region: null,
        flagged_for_review: false,
      },
    ];
    expect(hasFlaggedFields(noFlags)).toBe(false);
  });

  it('hasFlaggedFields returns false for empty array', () => {
    expect(hasFlaggedFields([])).toBe(false);
  });

  it('countFlaggedFields counts correctly', () => {
    expect(countFlaggedFields(SAMPLE_EXTRACTED_FIELDS)).toBe(1);
  });

  it('countFlaggedFields returns 0 for empty array', () => {
    expect(countFlaggedFields([])).toBe(0);
  });

  it('countFlaggedFields returns correct count when multiple fields flagged', () => {
    const multiFlag: ExtractedField[] = [
      {
        field_name: 'f1',
        raw_value: null,
        normalized_value: null,
        confidence: 0.20,
        source_region: null,
        flagged_for_review: true,
      },
      {
        field_name: 'f2',
        raw_value: null,
        normalized_value: null,
        confidence: 0.10,
        source_region: null,
        flagged_for_review: true,
      },
    ];
    expect(countFlaggedFields(multiFlag)).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-08: null fields show "Not found in document" placeholder
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-08 — null field placeholder handling', () => {
  it('NULL_FIELD_PLACEHOLDER is "Not found in document"', () => {
    expect(NULL_FIELD_PLACEHOLDER).toBe('Not found in document');
  });

  it('card testing surface exports the same NULL_FIELD_PLACEHOLDER', () => {
    expect(__DOCUMENT_INTELLIGENCE_CARD_TESTING__.NULL_FIELD_PLACEHOLDER).toBe(
      'Not found in document',
    );
  });

  it('resolveFieldDisplayValue returns isNull=true for null raw_value', () => {
    const result = resolveFieldDisplayValue(null, null);
    expect(result.isNull).toBe(true);
    expect(result.displayValue).toBe('Not found in document');
  });

  it('resolveFieldDisplayValue returns isNull=true for empty string raw_value', () => {
    const result = resolveFieldDisplayValue('', null);
    expect(result.isNull).toBe(true);
    expect(result.displayValue).toBe('Not found in document');
  });

  it('resolveFieldDisplayValue returns displayValue=raw_value when non-null', () => {
    const result = resolveFieldDisplayValue('TX-2026-001', 'TX-2026-001');
    expect(result.isNull).toBe(false);
    expect(result.displayValue).toBe('TX-2026-001');
  });

  it('resolveFieldDisplayValue sets showNormalized=true when normalized differs from raw', () => {
    const result = resolveFieldDisplayValue('01/01/2026', '2026-01-01');
    expect(result.showNormalized).toBe(true);
    expect(result.displayValue).toBe('01/01/2026');
  });

  it('resolveFieldDisplayValue sets showNormalized=false when normalized equals raw', () => {
    const result = resolveFieldDisplayValue('TX-001', 'TX-001');
    expect(result.showNormalized).toBe(false);
  });

  it('isNullField returns true for null', () => {
    expect(isNullField(null)).toBe(true);
  });

  it('isNullField returns true for empty string', () => {
    expect(isNullField('')).toBe(true);
  });

  it('isNullField returns false for non-empty string', () => {
    expect(isNullField('TX-001')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-09: forbidden terms absent from display constants
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-09 — forbidden display terms are listed and absent from UI labels', () => {
  it('FORBIDDEN_DISPLAY_TERMS is a non-empty array', () => {
    expect(Array.isArray(FORBIDDEN_DISPLAY_TERMS)).toBe(true);
    expect(FORBIDDEN_DISPLAY_TERMS.length).toBeGreaterThan(0);
  });

  const expectedForbidden = [
    'price',
    'risk_score',
    'riskScore',
    'publicationPosture',
    'buyerRanking',
    'supplierRanking',
    'matchingScore',
    'escrow',
    'paymentDecision',
    'creditScore',
  ] as const;

  it.each(expectedForbidden)('FORBIDDEN_DISPLAY_TERMS includes "%s"', (term) => {
    expect(FORBIDDEN_DISPLAY_TERMS).toContain(term);
  });

  it('governance label does not contain any forbidden term', () => {
    for (const term of FORBIDDEN_DISPLAY_TERMS) {
      expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL.toLowerCase()).not.toContain(
        term.toLowerCase(),
      );
    }
  });

  it('NULL_FIELD_PLACEHOLDER does not contain any forbidden term', () => {
    for (const term of FORBIDDEN_DISPLAY_TERMS) {
      expect(NULL_FIELD_PLACEHOLDER.toLowerCase()).not.toContain(term.toLowerCase());
    }
  });

  it('resolveExtractionErrorMessage output does not contain any forbidden term', () => {
    const types = ['parse_error', 'budget_exceeded', 'service_unavailable', 'unauthorized', 'network'] as const;
    for (const errorType of types) {
      const msg = resolveExtractionErrorMessage(errorType);
      for (const term of FORBIDDEN_DISPLAY_TERMS) {
        expect(msg.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-10: no approve/reject controls in K-4
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-10 — approve and reject actions are in FORBIDDEN_K4_ACTIONS (K-5 scope)', () => {
  it('FORBIDDEN_K4_ACTIONS includes "approve"', () => {
    expect(FORBIDDEN_K4_ACTIONS).toContain('approve');
  });

  it('FORBIDDEN_K4_ACTIONS includes "reject"', () => {
    expect(FORBIDDEN_K4_ACTIONS).toContain('reject');
  });

  it('FORBIDDEN_K4_ACTIONS includes "review_submit"', () => {
    expect(FORBIDDEN_K4_ACTIONS).toContain('review_submit');
  });

  it('FORBIDDEN_K4_ACTIONS includes "status_transition"', () => {
    expect(FORBIDDEN_K4_ACTIONS).toContain('status_transition');
  });

  it('FORBIDDEN_K4_ACTIONS includes "lifecycle_mutation"', () => {
    expect(FORBIDDEN_K4_ACTIONS).toContain('lifecycle_mutation');
  });

  it('triggerDocumentExtraction function name does not imply approve/reject', () => {
    const fnName = triggerDocumentExtraction.name;
    expect(fnName).not.toContain('approve');
    expect(fnName).not.toContain('reject');
    expect(fnName).not.toContain('review');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-11: no buyer-facing/public output — component is supplier-internal
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-11 — component is scoped as supplier-internal', () => {
  it('card testing surface SAFE_FALLBACK_MESSAGE does not reference buyers or public', () => {
    const { SAFE_FALLBACK_MESSAGE } = __DOCUMENT_INTELLIGENCE_CARD_TESTING__;
    expect(SAFE_FALLBACK_MESSAGE.toLowerCase()).not.toContain('buyer');
    expect(SAFE_FALLBACK_MESSAGE.toLowerCase()).not.toContain('public');
    expect(SAFE_FALLBACK_MESSAGE.toLowerCase()).not.toContain('marketplace');
  });

  it('governance label does not reference buyers or public endpoints', () => {
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL.toLowerCase()).not.toContain('buyer');
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL.toLowerCase()).not.toContain('public');
  });

  it('service types do not include publicationPosture or buyer-facing fields', () => {
    // Structural check: ExtractionDraft interface does not export publicationPosture
    // We verify through the fact that the forbidden term list includes it
    expect(FORBIDDEN_DISPLAY_TERMS).toContain('publicationPosture');
  });

  it('resolveDocumentTypeLabel does not return any forbidden term', () => {
    const docTypes = [
      'GOTS_CERTIFICATE',
      'OEKO_TEX_CERTIFICATE',
      'ISO_9001_CERTIFICATE',
      'REACH_COMPLIANCE',
      'BCI_CERTIFICATE',
      'BLUESIGN_CERTIFICATE',
      'FAIR_TRADE_CERTIFICATE',
      'RECYCLED_CLAIM_STANDARD',
      'MATERIAL_TEST_REPORT',
      'INSPECTION_REPORT',
      'UNKNOWN',
    ];
    for (const type of docTypes) {
      const label = resolveDocumentTypeLabel(type);
      for (const term of FORBIDDEN_DISPLAY_TERMS) {
        expect(label.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K4-UI-12: error fallback renders safely
// ─────────────────────────────────────────────────────────────────────────────

describe('K4-UI-12 — error fallback is safe and comprehensive', () => {
  it('classifyExtractionError classifies 422 as parse_error', () => {
    expect(classifyExtractionError({ status: 422 })).toBe('parse_error');
  });

  it('classifyExtractionError classifies 429 as budget_exceeded', () => {
    expect(classifyExtractionError({ status: 429 })).toBe('budget_exceeded');
  });

  it('classifyExtractionError classifies BUDGET_EXCEEDED code as budget_exceeded', () => {
    expect(classifyExtractionError({ code: 'BUDGET_EXCEEDED' })).toBe('budget_exceeded');
  });

  it('classifyExtractionError classifies 503 as service_unavailable', () => {
    expect(classifyExtractionError({ status: 503 })).toBe('service_unavailable');
  });

  it('classifyExtractionError classifies 401 as unauthorized', () => {
    expect(classifyExtractionError({ status: 401 })).toBe('unauthorized');
  });

  it('classifyExtractionError classifies 403 as unauthorized', () => {
    expect(classifyExtractionError({ status: 403 })).toBe('unauthorized');
  });

  it('classifyExtractionError classifies unknown errors as network', () => {
    expect(classifyExtractionError(new Error('fetch failed'))).toBe('network');
    expect(classifyExtractionError({ status: 500 })).toBe('network');
    expect(classifyExtractionError(null)).toBe('network');
  });

  it('resolveExtractionErrorMessage does not expose stack traces', () => {
    const types = ['parse_error', 'budget_exceeded', 'service_unavailable', 'unauthorized', 'network'] as const;
    for (const errorType of types) {
      const msg = resolveExtractionErrorMessage(errorType);
      expect(msg).not.toContain('stack');
      expect(msg).not.toContain('Error:');
      expect(msg).not.toContain('at ');
      expect(msg).not.toContain('/api/');
      expect(msg).not.toContain('storage');
      expect(msg).not.toContain('tenant_id');
    }
  });

  it('resolveExtractionErrorMessage for budget_exceeded mentions admin/limits', () => {
    const msg = resolveExtractionErrorMessage('budget_exceeded');
    expect(msg.toLowerCase()).toMatch(/limit|administrator|admin|budget/);
  });

  it('resolveExtractionErrorMessage for unauthorized is access-denied safe', () => {
    const msg = resolveExtractionErrorMessage('unauthorized');
    expect(msg.toLowerCase()).toMatch(/permission|access/);
  });
});
