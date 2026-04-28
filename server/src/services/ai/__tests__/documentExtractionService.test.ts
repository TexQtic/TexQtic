/**
 * documentExtractionService.test.ts — Document Extraction Service Tests (K-2)
 *
 * Tests K-2 extraction schema and prompt contract:
 *
 *   Schema / Types
 *   K-E01 — ExtractedField fields are present and typed correctly
 *   K-E02 — DocumentExtractionDraft has humanReviewRequired: true always
 *   K-E03 — DocumentExtractionDraft status is 'draft' always from parser
 *
 *   Confidence Computation
 *   K-E04 — computeOverallConfidence averages field-level scores correctly
 *   K-E05 — computeOverallConfidence returns 0 for empty fields
 *   K-E06 — computeOverallConfidence ignores system-only fields
 *   K-E07 — computeOverallConfidence rounds to 2 decimal places
 *   K-E08 — computeOverallConfidence clamps abnormal confidence inputs
 *
 *   Normalization Helpers
 *   K-E09 — normalizeRawString trims and empty→null
 *   K-E10 — normalizeIsoDate accepts ISO 8601 date
 *   K-E11 — normalizeIsoDate accepts DD/MM/YYYY
 *   K-E12 — normalizeIsoDate accepts YYYY/MM/DD
 *   K-E13 — normalizeIsoDate returns null for malformed date
 *   K-E14 — normalizeDocumentTypeValue returns valid DocumentType for known values
 *   K-E15 — normalizeDocumentTypeValue returns null for unknown values
 *   K-E16 — clampConfidence clamps >1 to 1, <0 to 0, NaN to 0
 *
 *   Prompt Builder
 *   K-E17 — prompt includes human review governance boundary
 *   K-E18 — prompt forbids price / pricing
 *   K-E19 — prompt forbids risk_score / riskScore
 *   K-E20 — prompt forbids publicationPosture
 *   K-E21 — prompt forbids ranking / buyerRanking / supplierRanking
 *   K-E22 — prompt forbids escrow / paymentDecision / creditScore
 *   K-E23 — prompt includes document_type in instructions
 *   K-E24 — prompt echoes documentId in instructions
 *   K-E25 — prompt includes all allowed field names
 *   K-E26 — prompt includes document text
 *   K-E27 — prompt instructs JSON-only output
 *   K-E28 — assertNoForbiddenAiFields is called by buildDocumentExtractionPrompt
 *
 *   Output Parser / Validator
 *   K-E29 — parseDocumentExtractionOutput accepts valid extraction JSON
 *   K-E30 — parseDocumentExtractionOutput rejects non-JSON string
 *   K-E31 — parseDocumentExtractionOutput rejects non-object JSON
 *   K-E32 — parseDocumentExtractionOutput rejects missing extracted_fields
 *   K-E33 — parseDocumentExtractionOutput strips forbidden keys from output
 *   K-E34 — parseDocumentExtractionOutput strips system-only field names from extracted_fields
 *   K-E35 — parseDocumentExtractionOutput enforces humanReviewRequired: true
 *   K-E36 — parseDocumentExtractionOutput sets status to 'draft'
 *   K-E37 — parseDocumentExtractionOutput flags low-confidence fields
 *   K-E38 — parseDocumentExtractionOutput normalizes null/empty to null
 *   K-E39 — parseDocumentExtractionOutput normalizes date fields (issue_date, expiry_date)
 *   K-E40 — parseDocumentExtractionOutput discards fields with forbidden names
 *   K-E41 — malformed field items are silently discarded (no crash)
 *   K-E42 — no lifecycle mutation functions invoked in K-2
 *   K-E43 — no DB writes performed in K-2 (pure functions only)
 *   K-E44 — overall confidence computed from extracted fields
 *   K-E45 — reviewedAt and reviewedByUserId are null in generated draft
 *
 * Run:
 *   pnpm --filter server exec vitest run src/services/ai/__tests__/documentExtractionService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeOverallConfidence,
  normalizeRawString,
  normalizeIsoDate,
  normalizeDocumentTypeValue,
  clampConfidence,
  buildDocumentExtractionPrompt,
  parseDocumentExtractionOutput,
  ExtractionParseError,
  EXTRACTED_FIELD_NAMES,
  type ExtractedField,
} from '../documentExtractionService.js';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../aiForbiddenData.js', () => ({
  assertNoForbiddenAiFields: vi.fn(),
}));

import { assertNoForbiddenAiFields } from '../aiForbiddenData.js';
const mockAssert = vi.mocked(assertNoForbiddenAiFields);

// ── Test constants ────────────────────────────────────────────────────────────

const TEST_DOC_ID = 'cccccccc-0000-4000-8000-cccccccccccc';
const TEST_ORG_ID = 'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa';
const TEST_EXTRACTED_AT = '2026-04-27T10:00:00.000Z';

const VALID_CONTEXT = {
  documentId: TEST_DOC_ID,
  orgId: TEST_ORG_ID,
  documentType: 'GOTS_CERTIFICATE' as const,
  extractedAt: TEST_EXTRACTED_AT,
};

function makeField(overrides: Partial<ExtractedField> = {}): ExtractedField {
  return {
    field_name: 'issuer_name',
    raw_value: 'Test Lab GmbH',
    normalized_value: 'Test Lab GmbH',
    confidence: 0.9,
    source_region: 'Header section',
    flagged_for_review: false,
    ...overrides,
  };
}

function validExtractionJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    document_id: TEST_DOC_ID,
    extracted_fields: [
      {
        field_name: 'issuer_name',
        raw_value: 'GOTS Cert Authority',
        confidence: 0.92,
        source_region: 'Top-left header',
      },
      {
        field_name: 'certificate_number',
        raw_value: 'GOTS-2024-00123',
        confidence: 0.88,
        source_region: 'Certificate ID box',
      },
      {
        field_name: 'issue_date',
        raw_value: '2024-03-15',
        confidence: 0.95,
        source_region: 'Validity section',
      },
    ],
    extraction_notes: null,
    ...overrides,
  });
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── K-E01 — ExtractedField structure ─────────────────────────────────────────

describe('K-E01 — ExtractedField type structure', () => {
  it('has all required fields', () => {
    const field = makeField();
    expect(field).toHaveProperty('field_name');
    expect(field).toHaveProperty('raw_value');
    expect(field).toHaveProperty('normalized_value');
    expect(field).toHaveProperty('confidence');
    expect(field).toHaveProperty('source_region');
    expect(field).toHaveProperty('flagged_for_review');
  });

  it('reviewer_edited is optional', () => {
    const withoutEdit = makeField();
    expect(withoutEdit.reviewer_edited).toBeUndefined();

    const withEdit = makeField({ reviewer_edited: true });
    expect(withEdit.reviewer_edited).toBe(true);
  });
});

// ── K-E02 — humanReviewRequired: true always ─────────────────────────────────

describe('K-E02 — humanReviewRequired: true is structural constant', () => {
  it('parsed draft always has humanReviewRequired: true', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.humanReviewRequired).toBe(true);
  });

  it('cannot be set to false — TypeScript type enforces it', () => {
    // Runtime: even if raw JSON contains humanReviewRequired: false, the parser enforces true
    const jsonWithFalse = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [],
      humanReviewRequired: false,
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(jsonWithFalse, VALID_CONTEXT);
    expect(draft.humanReviewRequired).toBe(true);
  });
});

// ── K-E03 — status: 'draft' always ───────────────────────────────────────────

describe('K-E03 — generated draft status is always draft', () => {
  it('parser always sets status to draft', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.status).toBe('draft');
  });

  it('status cannot be overridden by AI output to reviewed', () => {
    const jsonWithReviewed = validExtractionJson({ status: 'reviewed' });
    const draft = parseDocumentExtractionOutput(jsonWithReviewed, VALID_CONTEXT);
    expect(draft.status).toBe('draft');
  });

  it('status cannot be overridden by AI output to rejected', () => {
    const jsonWithRejected = validExtractionJson({ status: 'rejected' });
    const draft = parseDocumentExtractionOutput(jsonWithRejected, VALID_CONTEXT);
    expect(draft.status).toBe('draft');
  });
});

// ── K-E04 — computeOverallConfidence averages correctly ──────────────────────

describe('K-E04 — computeOverallConfidence averages field-level scores', () => {
  it('averages two fields correctly', () => {
    const fields = [
      makeField({ confidence: 0.8 }),
      makeField({ confidence: 0.6 }),
    ];
    expect(computeOverallConfidence(fields)).toBe(0.7);
  });

  it('averages three fields correctly', () => {
    const fields = [
      makeField({ confidence: 0.9 }),
      makeField({ confidence: 0.8 }),
      makeField({ confidence: 0.7 }),
    ];
    expect(computeOverallConfidence(fields)).toBe(0.8);
  });
});

// ── K-E05 — computeOverallConfidence returns 0 for empty ─────────────────────

describe('K-E05 — computeOverallConfidence returns 0 for empty fields', () => {
  it('returns 0 for empty array', () => {
    expect(computeOverallConfidence([])).toBe(0);
  });
});

// ── K-E06 — computeOverallConfidence ignores system-only fields ───────────────

describe('K-E06 — computeOverallConfidence ignores system-only fields', () => {
  it('excludes system-only fields from average', () => {
    const fields = [
      makeField({ field_name: 'issuer_name', confidence: 0.9 }),
      makeField({ field_name: 'uploaded_by', confidence: 0.0 }), // system-only, should be excluded
    ];
    // Only issuer_name contributes → average = 0.9
    expect(computeOverallConfidence(fields)).toBe(0.9);
  });

  it('all system fields → returns 0', () => {
    const fields = [
      makeField({ field_name: 'uploaded_by', confidence: 0.9 }),
      makeField({ field_name: 'source_file_id', confidence: 0.8 }),
    ];
    expect(computeOverallConfidence(fields)).toBe(0);
  });
});

// ── K-E07 — computeOverallConfidence rounds to 2 decimal places ──────────────

describe('K-E07 — computeOverallConfidence rounds to 2 decimal places', () => {
  it('rounds correctly', () => {
    const fields = [
      makeField({ confidence: 0.333 }),
      makeField({ confidence: 0.333 }),
      makeField({ confidence: 0.333 }),
    ];
    const result = computeOverallConfidence(fields);
    expect(result).toBe(0.33);
    expect(result.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

// ── K-E08 — computeOverallConfidence clamps abnormal inputs ──────────────────

describe('K-E08 — computeOverallConfidence clamps abnormal confidence', () => {
  it('clamps >1 values to 1 before averaging', () => {
    const fields = [
      makeField({ confidence: 1.5 }),  // will be clamped to 1
      makeField({ confidence: 0.5 }),
    ];
    expect(computeOverallConfidence(fields)).toBe(0.75);
  });

  it('clamps <0 values to 0 before averaging', () => {
    const fields = [
      makeField({ confidence: -0.5 }), // clamped to 0
      makeField({ confidence: 1.0 }),
    ];
    expect(computeOverallConfidence(fields)).toBe(0.5);
  });
});

// ── K-E09 — normalizeRawString ────────────────────────────────────────────────

describe('K-E09 — normalizeRawString trims and converts empty to null', () => {
  it('trims whitespace', () => {
    expect(normalizeRawString('  hello  ')).toBe('hello');
  });

  it('returns null for empty string', () => {
    expect(normalizeRawString('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(normalizeRawString('   ')).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizeRawString(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeRawString(undefined)).toBeNull();
  });

  it('returns null for non-string', () => {
    expect(normalizeRawString(42)).toBeNull();
  });
});

// ── K-E10 — normalizeIsoDate accepts ISO 8601 ────────────────────────────────

describe('K-E10 — normalizeIsoDate accepts ISO 8601 date', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(normalizeIsoDate('2024-03-15')).toBe('2024-03-15');
  });

  it('accepts ISO datetime and extracts date part', () => {
    expect(normalizeIsoDate('2024-03-15T00:00:00Z')).toBe('2024-03-15');
  });
});

// ── K-E11 — normalizeIsoDate accepts DD/MM/YYYY ───────────────────────────────

describe('K-E11 — normalizeIsoDate accepts DD/MM/YYYY', () => {
  it('parses DD/MM/YYYY', () => {
    expect(normalizeIsoDate('15/03/2024')).toBe('2024-03-15');
  });

  it('parses DD-MM-YYYY', () => {
    expect(normalizeIsoDate('15-03-2024')).toBe('2024-03-15');
  });
});

// ── K-E12 — normalizeIsoDate accepts YYYY/MM/DD ───────────────────────────────

describe('K-E12 — normalizeIsoDate accepts YYYY/MM/DD', () => {
  it('parses YYYY/MM/DD', () => {
    expect(normalizeIsoDate('2024/03/15')).toBe('2024-03-15');
  });
});

// ── K-E13 — normalizeIsoDate returns null for malformed ──────────────────────

describe('K-E13 — normalizeIsoDate returns null for malformed date', () => {
  it('returns null for invalid date string', () => {
    expect(normalizeIsoDate('not-a-date')).toBeNull();
  });

  it('returns null for null', () => {
    expect(normalizeIsoDate(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeIsoDate('')).toBeNull();
  });
});

// ── K-E14 — normalizeDocumentTypeValue ────────────────────────────────────────

describe('K-E14 — normalizeDocumentTypeValue returns valid DocumentType', () => {
  it('accepts exact enum values', () => {
    expect(normalizeDocumentTypeValue('GOTS_CERTIFICATE')).toBe('GOTS_CERTIFICATE');
    expect(normalizeDocumentTypeValue('LAB_TEST_REPORT')).toBe('LAB_TEST_REPORT');
    expect(normalizeDocumentTypeValue('UNKNOWN')).toBe('UNKNOWN');
  });

  it('accepts lowercase variants', () => {
    expect(normalizeDocumentTypeValue('gots_certificate')).toBe('GOTS_CERTIFICATE');
  });

  it('accepts space-separated variants', () => {
    expect(normalizeDocumentTypeValue('GOTS CERTIFICATE')).toBe('GOTS_CERTIFICATE');
  });
});

// ── K-E15 — normalizeDocumentTypeValue returns null for unknown ───────────────

describe('K-E15 — normalizeDocumentTypeValue returns null for unknown', () => {
  it('returns null for unknown type', () => {
    expect(normalizeDocumentTypeValue('SOME_UNKNOWN_TYPE')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(normalizeDocumentTypeValue(null)).toBeNull();
  });
});

// ── K-E16 — clampConfidence ───────────────────────────────────────────────────

describe('K-E16 — clampConfidence clamps boundary values', () => {
  it('clamps >1 to 1', () => {
    expect(clampConfidence(1.5)).toBe(1);
  });

  it('clamps <0 to 0', () => {
    expect(clampConfidence(-0.1)).toBe(0);
  });

  it('returns 0 for NaN', () => {
    expect(clampConfidence(NaN)).toBe(0);
  });

  it('returns 0 for non-numeric', () => {
    expect(clampConfidence('high')).toBe(0);
  });

  it('passes through valid values unchanged', () => {
    expect(clampConfidence(0.75)).toBe(0.75);
    expect(clampConfidence(0)).toBe(0);
    expect(clampConfidence(1)).toBe(1);
  });
});

// ── K-E17 — prompt: human review governance boundary ─────────────────────────

describe('K-E17 — prompt includes human review governance boundary', () => {
  it('contains instruction that human review is always required', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test document text',
      documentId: TEST_DOC_ID,
    });
    expect(prompt.toLowerCase()).toContain('human review');
  });

  it('contains DRAFT output instruction', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test document text',
      documentId: TEST_DOC_ID,
    });
    expect(prompt.toLowerCase()).toContain('draft');
  });
});

// ── K-E18 — prompt forbids price / pricing ───────────────────────────────────

describe('K-E18 — prompt explicitly forbids price and pricing', () => {
  it('contains explicit prohibition of price', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'LAB_TEST_REPORT',
      documentText: 'Test document',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain('price');
    expect(prompt.toLowerCase()).toContain('forbidden');
  });
});

// ── K-E19 — prompt forbids risk_score / riskScore ────────────────────────────

describe('K-E19 — prompt explicitly forbids risk_score', () => {
  it('contains explicit prohibition of risk_score', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'REACH_COMPLIANCE',
      documentText: 'Test document',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain('risk_score');
  });
});

// ── K-E20 — prompt forbids publicationPosture ────────────────────────────────

describe('K-E20 — prompt explicitly forbids publicationPosture', () => {
  it('contains explicit prohibition of publicationPosture', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'ISO_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain('publicationPosture');
  });
});

// ── K-E21 — prompt forbids ranking ───────────────────────────────────────────

describe('K-E21 — prompt explicitly forbids ranking fields', () => {
  it('mentions buyerRanking, supplierRanking, ranking', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain('buyerRanking');
    expect(prompt).toContain('supplierRanking');
    expect(prompt).toContain('ranking');
  });
});

// ── K-E22 — prompt forbids escrow / payment / credit ─────────────────────────

describe('K-E22 — prompt explicitly forbids escrow/payment/credit', () => {
  it('mentions escrow, paymentDecision, creditScore', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain('escrow');
    expect(prompt).toContain('paymentDecision');
    expect(prompt).toContain('creditScore');
  });
});

// ── K-E23 — prompt includes document_type ────────────────────────────────────

describe('K-E23 — prompt includes document type in instructions', () => {
  it('includes the document type string', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'LAB_TEST_REPORT',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain('LAB_TEST_REPORT');
  });
});

// ── K-E24 — prompt echoes documentId ─────────────────────────────────────────

describe('K-E24 — prompt echoes documentId in instructions', () => {
  it('includes the documentId', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain(TEST_DOC_ID);
  });
});

// ── K-E25 — prompt includes all allowed field names ──────────────────────────

describe('K-E25 — prompt includes all allowed field names', () => {
  it('contains each allowed field name', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    for (const fieldName of EXTRACTED_FIELD_NAMES) {
      expect(prompt).toContain(fieldName);
    }
  });
});

// ── K-E26 — prompt includes document text ────────────────────────────────────

describe('K-E26 — prompt includes document text', () => {
  it('contains the document text', () => {
    const text = 'GOTS Certificate issued by Textile Standards Board on 2024-01-01';
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: text,
      documentId: TEST_DOC_ID,
    });
    expect(prompt).toContain(text);
  });
});

// ── K-E27 — prompt instructs JSON-only output ─────────────────────────────────

describe('K-E27 — prompt instructs JSON-only output', () => {
  it('contains JSON output instruction', () => {
    const prompt = buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(prompt.toLowerCase()).toContain('json');
    expect(prompt.toLowerCase()).toContain('only');
  });
});

// ── K-E28 — assertNoForbiddenAiFields called by buildDocumentExtractionPrompt ─

describe('K-E28 — assertNoForbiddenAiFields called by prompt builder', () => {
  it('calls assertNoForbiddenAiFields on input', () => {
    buildDocumentExtractionPrompt({
      documentType: 'GOTS_CERTIFICATE',
      documentText: 'Test',
      documentId: TEST_DOC_ID,
    });
    expect(mockAssert).toHaveBeenCalledOnce();
  });
});

// ── K-E29 — parseDocumentExtractionOutput accepts valid JSON ─────────────────

describe('K-E29 — parseDocumentExtractionOutput accepts valid extraction JSON', () => {
  it('returns a DocumentExtractionDraft with correct shape', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.documentId).toBe(TEST_DOC_ID);
    expect(draft.orgId).toBe(TEST_ORG_ID);
    expect(draft.documentType).toBe('GOTS_CERTIFICATE');
    expect(draft.humanReviewRequired).toBe(true);
    expect(draft.status).toBe('draft');
    expect(Array.isArray(draft.extractedFields)).toBe(true);
    expect(typeof draft.overallConfidence).toBe('number');
  });
});

// ── K-E30 — parseDocumentExtractionOutput rejects non-JSON string ─────────────

describe('K-E30 — parseDocumentExtractionOutput rejects non-JSON string', () => {
  it('throws ExtractionParseError for non-JSON input', () => {
    expect(() =>
      parseDocumentExtractionOutput('not valid json{{', VALID_CONTEXT),
    ).toThrow(ExtractionParseError);
  });

  it('error code is INVALID_JSON', () => {
    try {
      parseDocumentExtractionOutput('not valid json', VALID_CONTEXT);
    } catch (e) {
      expect(e).toBeInstanceOf(ExtractionParseError);
      expect((e as ExtractionParseError).code).toBe('INVALID_JSON');
    }
  });
});

// ── K-E31 — parseDocumentExtractionOutput rejects non-object JSON ─────────────

describe('K-E31 — parseDocumentExtractionOutput rejects non-object JSON', () => {
  it('throws ExtractionParseError for JSON array', () => {
    expect(() =>
      parseDocumentExtractionOutput('[]', VALID_CONTEXT),
    ).toThrow(ExtractionParseError);
  });

  it('throws ExtractionParseError for JSON null', () => {
    expect(() =>
      parseDocumentExtractionOutput('null', VALID_CONTEXT),
    ).toThrow(ExtractionParseError);
  });

  it('error code is NOT_OBJECT', () => {
    try {
      parseDocumentExtractionOutput('[]', VALID_CONTEXT);
    } catch (e) {
      expect((e as ExtractionParseError).code).toBe('NOT_OBJECT');
    }
  });
});

// ── K-E32 — parseDocumentExtractionOutput rejects missing extracted_fields ────

describe('K-E32 — parseDocumentExtractionOutput rejects missing extracted_fields', () => {
  it('throws ExtractionParseError when extracted_fields missing', () => {
    const json = JSON.stringify({ document_id: TEST_DOC_ID, extraction_notes: null });
    expect(() =>
      parseDocumentExtractionOutput(json, VALID_CONTEXT),
    ).toThrow(ExtractionParseError);
  });

  it('error code is MISSING_EXTRACTED_FIELDS', () => {
    try {
      parseDocumentExtractionOutput(
        JSON.stringify({ document_id: TEST_DOC_ID }),
        VALID_CONTEXT,
      );
    } catch (e) {
      expect((e as ExtractionParseError).code).toBe('MISSING_EXTRACTED_FIELDS');
    }
  });
});

// ── K-E33 — parseDocumentExtractionOutput strips forbidden keys ──────────────

describe('K-E33 — parseDocumentExtractionOutput strips forbidden keys from output', () => {
  it('strips "price" from top-level output', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [],
      price: 99.99,
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    expect(draft).not.toHaveProperty('price');
  });

  it('strips "risk_score" from top-level output', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [],
      risk_score: 0.7,
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    expect(draft).not.toHaveProperty('risk_score');
  });

  it('strips "publicationPosture" from top-level output', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [],
      publicationPosture: 'PUBLIC',
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    expect(draft).not.toHaveProperty('publicationPosture');
  });

  it('strips "ranking" from top-level output', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [],
      ranking: 5,
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    expect(draft).not.toHaveProperty('ranking');
  });
});

// ── K-E34 — strips system-only field names from extracted_fields ──────────────

describe('K-E34 — parseDocumentExtractionOutput strips system-only fields from extracted_fields', () => {
  it('discards fields with system-only names', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'issuer_name', raw_value: 'Org', confidence: 0.9, source_region: null },
        { field_name: 'uploaded_by', raw_value: 'user123', confidence: 0.99, source_region: null },
        { field_name: 'source_file_id', raw_value: 'file-id', confidence: 0.99, source_region: null },
        { field_name: 'human_review_required', raw_value: 'false', confidence: 1.0, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const names = draft.extractedFields.map((f) => f.field_name);
    expect(names).toContain('issuer_name');
    expect(names).not.toContain('uploaded_by');
    expect(names).not.toContain('source_file_id');
    expect(names).not.toContain('human_review_required');
  });
});

// ── K-E35 — humanReviewRequired: true enforced ───────────────────────────────

describe('K-E35 — humanReviewRequired: true enforced by parser', () => {
  it('is always true in output', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.humanReviewRequired).toBe(true);
  });
});

// ── K-E36 — status: draft ────────────────────────────────────────────────────

describe('K-E36 — status is draft for generated output', () => {
  it('status is always draft', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.status).toBe('draft');
  });
});

// ── K-E37 — low-confidence fields flagged ────────────────────────────────────

describe('K-E37 — parseDocumentExtractionOutput flags low-confidence fields', () => {
  it('flags fields with confidence < CONFIDENCE_THRESHOLD_MEDIUM', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'issuer_name', raw_value: 'Maybe Corp', confidence: 0.3, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const field = draft.extractedFields.find((f) => f.field_name === 'issuer_name');
    expect(field?.flagged_for_review).toBe(true);
  });

  it('does not flag fields with confidence >= CONFIDENCE_THRESHOLD_MEDIUM', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'issuer_name', raw_value: 'Cert Body', confidence: 0.85, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const field = draft.extractedFields.find((f) => f.field_name === 'issuer_name');
    expect(field?.flagged_for_review).toBe(false);
  });
});

// ── K-E38 — null/empty normalized to null ────────────────────────────────────

describe('K-E38 — parseDocumentExtractionOutput normalizes null/empty to null', () => {
  it('normalizes empty string raw_value to null', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'report_number', raw_value: '', confidence: 0.5, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const field = draft.extractedFields.find((f) => f.field_name === 'report_number');
    expect(field?.raw_value).toBeNull();
    expect(field?.normalized_value).toBeNull();
  });

  it('flags field with null raw_value for review', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'certificate_number', raw_value: null, confidence: 0.9, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const field = draft.extractedFields.find((f) => f.field_name === 'certificate_number');
    expect(field?.raw_value).toBeNull();
    expect(field?.flagged_for_review).toBe(true);
  });
});

// ── K-E39 — date normalization for date fields ────────────────────────────────

describe('K-E39 — parseDocumentExtractionOutput normalizes date fields', () => {
  it('normalizes issue_date DD/MM/YYYY to YYYY-MM-DD', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'issue_date', raw_value: '15/03/2024', confidence: 0.9, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const field = draft.extractedFields.find((f) => f.field_name === 'issue_date');
    expect(field?.raw_value).toBe('15/03/2024');
    expect(field?.normalized_value).toBe('2024-03-15');
  });

  it('preserves raw_value unchanged even after normalization', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'expiry_date', raw_value: '2025-12-31', confidence: 0.95, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const field = draft.extractedFields.find((f) => f.field_name === 'expiry_date');
    expect(field?.raw_value).toBe('2025-12-31');
    expect(field?.normalized_value).toBe('2025-12-31');
  });
});

// ── K-E40 — discards fields with forbidden names ──────────────────────────────

describe('K-E40 — parseDocumentExtractionOutput discards fields with forbidden names', () => {
  it('discards field named "price"', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'price', raw_value: '100', confidence: 0.99, source_region: null },
        { field_name: 'issuer_name', raw_value: 'Cert Body', confidence: 0.9, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const names = draft.extractedFields.map((f) => f.field_name);
    expect(names).not.toContain('price');
    expect(names).toContain('issuer_name');
  });

  it('discards field named "riskScore"', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: 'riskScore', raw_value: '0.8', confidence: 0.9, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    const names = draft.extractedFields.map((f) => f.field_name);
    expect(names).not.toContain('riskScore');
  });
});

// ── K-E41 — malformed field items silently discarded ─────────────────────────

describe('K-E41 — malformed field items are silently discarded', () => {
  it('ignores null items in extracted_fields', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        null,
        { field_name: 'issuer_name', raw_value: 'Org', confidence: 0.9, source_region: null },
        'not an object',
        42,
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    expect(draft.extractedFields).toHaveLength(1);
    expect(draft.extractedFields[0].field_name).toBe('issuer_name');
  });

  it('ignores items with null field_name', () => {
    const json = JSON.stringify({
      document_id: TEST_DOC_ID,
      extracted_fields: [
        { field_name: null, raw_value: 'Value', confidence: 0.9, source_region: null },
      ],
      extraction_notes: null,
    });
    const draft = parseDocumentExtractionOutput(json, VALID_CONTEXT);
    expect(draft.extractedFields).toHaveLength(0);
  });
});

// ── K-E42 — no lifecycle mutation ────────────────────────────────────────────

describe('K-E42 — no lifecycle mutation functions invoked in K-2', () => {
  it('documentExtractionService exports no lifecycle mutation functions', async () => {
    const module = await import('../documentExtractionService.js');
    const exports = Object.keys(module);
    // Forbidden: approve, reject, setState, updateLifecycle, publishDpp, setCertificationState
    const lifecycleFunctions = exports.filter(
      (key) =>
        key.includes('approve') ||
        key.includes('reject') ||
        key.includes('setLifecycle') ||
        key.includes('publishDpp') ||
        key.includes('setCertification') ||
        key.includes('updateCertification'),
    );
    expect(lifecycleFunctions).toHaveLength(0);
  });
});

// ── K-E43 — no DB writes in K-2 ──────────────────────────────────────────────

describe('K-E43 — no DB writes performed in K-2', () => {
  it('documentExtractionService exports no DB write functions', async () => {
    const module = await import('../documentExtractionService.js');
    const exports = Object.keys(module);
    // Forbidden: saveDraft, persistDraft, writeDraft, storeDraft, insertDraft
    const dbFunctions = exports.filter(
      (key) =>
        key.includes('save') ||
        key.includes('persist') ||
        key.includes('write') ||
        key.includes('store') ||
        key.includes('insert') ||
        key.includes('upsert') ||
        key.includes('delete'),
    );
    expect(dbFunctions).toHaveLength(0);
  });
});

// ── K-E44 — overall confidence computed from extracted fields ─────────────────

describe('K-E44 — overall confidence computed from extracted fields', () => {
  it('draft overallConfidence matches computeOverallConfidence of extractedFields', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    const expected = computeOverallConfidence(draft.extractedFields);
    expect(draft.overallConfidence).toBe(expected);
  });
});

// ── K-E45 — reviewedAt and reviewedByUserId are null in generated draft ────────

describe('K-E45 — reviewedAt and reviewedByUserId null in generated draft', () => {
  it('reviewedAt is null', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.reviewedAt).toBeNull();
  });

  it('reviewedByUserId is null', () => {
    const draft = parseDocumentExtractionOutput(validExtractionJson(), VALID_CONTEXT);
    expect(draft.reviewedByUserId).toBeNull();
  });
});
