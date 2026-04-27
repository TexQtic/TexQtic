/**
 * documentClassificationService.test.ts — Document Classification Service Tests
 *
 * Tests K-1 classification utility:
 *   K-C01 — Known document types classified correctly by keyword signals
 *   K-C02 — UNKNOWN fallback when no keywords match
 *   K-C03 — UNKNOWN returned for empty/null input (no signal available)
 *   K-C04 — humanReviewRequired: true always present in every result shape
 *   K-C05 — Forbidden fields absent from result (price, risk_score, publicationPosture,
 *            buyer_ranking, escrow, payment)
 *   K-C06 — assertNoForbiddenAiFields guard is invoked on every call
 *   K-C07 — No lifecycle mutation — function is pure; no side effects
 *   K-C08 — Confidence values are in [0, 1] range
 *   K-C09 — Multi-signal match produces higher confidence than single-signal match
 *   K-C10 — Single weak keyword match still classifies (medium confidence, below threshold)
 *
 * Run:
 *   pnpm --filter server exec vitest run src/services/ai/__tests__/documentClassificationService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyDocumentType,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
  DOCUMENT_TYPES,
  type DocumentClassificationInput,
  type DocumentClassificationResult,
  type DocumentType,
} from '../documentClassificationService.js';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../aiForbiddenData.js', () => ({
  assertNoForbiddenAiFields: vi.fn(),
}));

// Import the mock reference after vi.mock() to access it in assertions
import { assertNoForbiddenAiFields } from '../aiForbiddenData.js';
const mockAssert = vi.mocked(assertNoForbiddenAiFields);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidConfidence(v: unknown): boolean {
  return typeof v === 'number' && v >= 0 && v <= 1;
}

const FORBIDDEN_RESULT_KEYS = [
  'price',
  'risk_score',
  'publicationPosture',
  'buyer_ranking',
  'supplier_ranking',
  'escrow',
  'escrowAccount',
  'escrowTransaction',
  'payment',
];

function assertNoForbiddenResultFields(result: DocumentClassificationResult): void {
  for (const key of FORBIDDEN_RESULT_KEYS) {
    expect(result).not.toHaveProperty(key);
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('classifyDocumentType', () => {
  beforeEach(() => {
    mockAssert.mockClear();
  });

  // K-C01 — Known document types classified correctly

  it('classifies GOTS_CERTIFICATE when title contains "gots"', () => {
    const result = classifyDocumentType({ documentTitle: 'GOTS Certificate of Conformity 2026' });
    expect(result.documentType).toBe('GOTS_CERTIFICATE');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies GOTS_CERTIFICATE when snippet contains "global organic textile standard"', () => {
    const result = classifyDocumentType({
      textSnippet: 'This document confirms that the product meets the Global Organic Textile Standard requirements.',
    });
    expect(result.documentType).toBe('GOTS_CERTIFICATE');
  });

  it('classifies OEKO_TEX_CERTIFICATE when title contains "oeko-tex"', () => {
    const result = classifyDocumentType({ documentTitle: 'OEKO-TEX Standard 100 Certificate' });
    expect(result.documentType).toBe('OEKO_TEX_CERTIFICATE');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies OEKO_TEX_CERTIFICATE when snippet contains "oeko tex" and "standard 100"', () => {
    const result = classifyDocumentType({
      textSnippet: 'Oeko Tex Standard 100 certification issued to the supplier for fabric production.',
    });
    expect(result.documentType).toBe('OEKO_TEX_CERTIFICATE');
  });

  it('classifies ISO_CERTIFICATE when title contains "iso 9001"', () => {
    const result = classifyDocumentType({ documentTitle: 'ISO 9001:2015 Certificate of Registration' });
    expect(result.documentType).toBe('ISO_CERTIFICATE');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies ISO_CERTIFICATE when snippet contains "iso 14001" and "iso certified"', () => {
    const result = classifyDocumentType({
      textSnippet: 'This ISO 14001 environmental management certificate confirms ISO certified compliance.',
    });
    expect(result.documentType).toBe('ISO_CERTIFICATE');
  });

  it('classifies REACH_COMPLIANCE when title contains "reach"', () => {
    const result = classifyDocumentType({ documentTitle: 'REACH Compliance Declaration 2026' });
    expect(result.documentType).toBe('REACH_COMPLIANCE');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies REACH_COMPLIANCE when snippet contains "svhc" and "reach compliance"', () => {
    const result = classifyDocumentType({
      textSnippet: 'No SVHC substances detected. REACH compliance confirmed for all batches.',
    });
    expect(result.documentType).toBe('REACH_COMPLIANCE');
  });

  it('classifies LAB_TEST_REPORT when title contains "test report"', () => {
    const result = classifyDocumentType({ documentTitle: 'Fabric Test Report — Tensile Strength' });
    expect(result.documentType).toBe('LAB_TEST_REPORT');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies LAB_TEST_REPORT when snippet contains "colorfastness" and "gsm test"', () => {
    const result = classifyDocumentType({
      textSnippet: 'Colorfastness to washing: Grade 4. GSM test results confirm 180gsm fabric weight.',
    });
    expect(result.documentType).toBe('LAB_TEST_REPORT');
  });

  it('classifies DECLARATION_OF_CONFORMITY when title contains "declaration of conformity"', () => {
    const result = classifyDocumentType({ documentTitle: 'EU Declaration of Conformity — Textile Products' });
    expect(result.documentType).toBe('DECLARATION_OF_CONFORMITY');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies DECLARATION_OF_CONFORMITY when snippet contains "we hereby declare" and "supplier declaration"', () => {
    const result = classifyDocumentType({
      textSnippet: 'We hereby declare that this product conforms to applicable regulations. This supplier declaration is valid until 2027.',
    });
    expect(result.documentType).toBe('DECLARATION_OF_CONFORMITY');
  });

  it('classifies INSPECTION_REPORT when title contains "inspection report"', () => {
    const result = classifyDocumentType({ documentTitle: 'Final Inspection Report — Batch 2026-04' });
    expect(result.documentType).toBe('INSPECTION_REPORT');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('classifies INSPECTION_REPORT when snippet contains "factory inspection" and "qc report"', () => {
    const result = classifyDocumentType({
      textSnippet: 'Factory inspection carried out on 2026-04-15. QC report indicates no critical defects.',
    });
    expect(result.documentType).toBe('INSPECTION_REPORT');
  });

  it('classifies SUPPLIER_EVIDENCE when title contains "compliance evidence"', () => {
    const result = classifyDocumentType({ documentTitle: 'Compliance Evidence Package — Supplier A' });
    expect(result.documentType).toBe('SUPPLIER_EVIDENCE');
    expect(result.humanReviewRequired).toBe(true);
  });

  // K-C02 — UNKNOWN fallback when no keywords match

  it('returns UNKNOWN when no keyword matches', () => {
    const result = classifyDocumentType({
      documentTitle: 'Shipping Invoice for Batch 2026',
      textSnippet: 'Delivery details: 500 units dispatched to warehouse.',
    });
    expect(result.documentType).toBe('UNKNOWN');
    expect(result.confidence).toBe(0.0);
    expect(result.humanReviewRequired).toBe(true);
  });

  it('returns UNKNOWN when snippet is only generic business text', () => {
    const result = classifyDocumentType({
      textSnippet: 'Dear valued customer, please find attached the document for your records.',
    });
    expect(result.documentType).toBe('UNKNOWN');
    expect(result.humanReviewRequired).toBe(true);
  });

  // K-C03 — UNKNOWN returned for empty/null input

  it('returns UNKNOWN with zero confidence when all inputs are null', () => {
    const result = classifyDocumentType({
      documentTitle: null,
      textSnippet: null,
      mimeType: null,
      typeHint: null,
    });
    expect(result.documentType).toBe('UNKNOWN');
    expect(result.confidence).toBe(0.0);
    expect(result.humanReviewRequired).toBe(true);
  });

  it('returns UNKNOWN with zero confidence when called with empty object', () => {
    const result = classifyDocumentType({});
    expect(result.documentType).toBe('UNKNOWN');
    expect(result.confidence).toBe(0.0);
    expect(result.humanReviewRequired).toBe(true);
  });

  it('returns UNKNOWN with zero confidence when all inputs are empty strings', () => {
    const result = classifyDocumentType({
      documentTitle: '',
      textSnippet: '',
      mimeType: '',
      typeHint: '',
    });
    expect(result.documentType).toBe('UNKNOWN');
    expect(result.confidence).toBe(0.0);
    expect(result.humanReviewRequired).toBe(true);
  });

  // K-C04 — humanReviewRequired: true always present

  it('humanReviewRequired is true for a known type classification', () => {
    const result = classifyDocumentType({ documentTitle: 'GOTS Certificate 2026' });
    expect(result.humanReviewRequired).toBe(true);
  });

  it('humanReviewRequired is true for UNKNOWN result', () => {
    const result = classifyDocumentType({});
    expect(result.humanReviewRequired).toBe(true);
  });

  it('humanReviewRequired is literally true (not truthy) on all DOCUMENT_TYPES inputs', () => {
    const inputs: DocumentClassificationInput[] = [
      { documentTitle: 'GOTS Certificate' },
      { documentTitle: 'OEKO-TEX Certificate' },
      { documentTitle: 'ISO 9001 Certificate' },
      { documentTitle: 'REACH Compliance' },
      { documentTitle: 'Lab Test Report' },
      { documentTitle: 'Declaration of Conformity' },
      { documentTitle: 'Inspection Report' },
      { documentTitle: 'Compliance Evidence' },
      {},
    ];
    for (const input of inputs) {
      const result = classifyDocumentType(input);
      expect(result.humanReviewRequired).toBe(true);
    }
  });

  // K-C05 — Forbidden fields absent from result

  it('result object does not contain any forbidden field names', () => {
    const result = classifyDocumentType({ documentTitle: 'GOTS Certificate 2026' });
    assertNoForbiddenResultFields(result);
  });

  it('UNKNOWN result does not contain any forbidden field names', () => {
    const result = classifyDocumentType({});
    assertNoForbiddenResultFields(result);
  });

  // K-C06 — assertNoForbiddenAiFields guard is invoked

  it('calls assertNoForbiddenAiFields on every invocation', () => {
    classifyDocumentType({ documentTitle: 'GOTS Certificate' });
    expect(mockAssert).toHaveBeenCalledTimes(1);
    classifyDocumentType({});
    expect(mockAssert).toHaveBeenCalledTimes(2);
  });

  it('assertNoForbiddenAiFields receives the exact input object', () => {
    const input: DocumentClassificationInput = { documentTitle: 'Test Report', mimeType: 'application/pdf' };
    classifyDocumentType(input);
    expect(mockAssert).toHaveBeenCalledWith(input);
  });

  // K-C07 — No lifecycle mutation (pure function — no side effects)

  it('calling classifyDocumentType does not mutate the input object', () => {
    const input: DocumentClassificationInput = {
      documentTitle: 'GOTS Certificate',
      textSnippet: 'Global Organic Textile Standard compliant.',
    };
    const originalTitle = input.documentTitle;
    const originalSnippet = input.textSnippet;
    classifyDocumentType(input);
    expect(input.documentTitle).toBe(originalTitle);
    expect(input.textSnippet).toBe(originalSnippet);
  });

  it('two calls with identical input return identical results (pure function)', () => {
    const input: DocumentClassificationInput = { documentTitle: 'GOTS Certificate 2026', textSnippet: 'gots certified' };
    const first = classifyDocumentType(input);
    const second = classifyDocumentType(input);
    expect(first.documentType).toBe(second.documentType);
    expect(first.confidence).toBe(second.confidence);
    expect(first.humanReviewRequired).toBe(second.humanReviewRequired);
  });

  // K-C08 — Confidence values are in [0, 1] range

  it('confidence is between 0 and 1 for a classified type', () => {
    const result = classifyDocumentType({ documentTitle: 'GOTS Certificate 2026' });
    expect(isValidConfidence(result.confidence)).toBe(true);
  });

  it('confidence is 0.0 for UNKNOWN result', () => {
    const result = classifyDocumentType({});
    expect(result.confidence).toBe(0.0);
  });

  it('confidence is in [0, 1] range for every test fixture', () => {
    const fixtures: DocumentClassificationInput[] = [
      { documentTitle: 'GOTS Certificate' },
      { documentTitle: 'OEKO-TEX Standard 100 Certificate' },
      { documentTitle: 'ISO 9001 Certification' },
      { documentTitle: 'REACH Compliance Declaration' },
      { documentTitle: 'Lab Test Report' },
      { documentTitle: 'Declaration of Conformity' },
      { documentTitle: 'Inspection Report' },
      { documentTitle: 'Compliance Evidence' },
      {},
    ];
    for (const fixture of fixtures) {
      const r = classifyDocumentType(fixture);
      expect(isValidConfidence(r.confidence)).toBe(true);
    }
  });

  // K-C09 — Multi-signal match produces higher confidence than single-signal match

  it('two keyword matches produce higher confidence than one keyword match', () => {
    // 'colorfastness' is an unambiguous single-keyword signal (no substring duplicates)
    const singleMatch = classifyDocumentType({
      documentTitle: 'Colorfastness Testing',
    });
    const multiMatch = classifyDocumentType({
      documentTitle: 'Colorfastness Testing',
      textSnippet: 'lab test results confirm tensile strength values.',
    });
    expect(multiMatch.confidence).toBeGreaterThan(singleMatch.confidence);
  });

  // K-C10 — Single weak keyword match still classifies

  it('single keyword match produces a non-zero confidence', () => {
    const result = classifyDocumentType({ documentTitle: 'REACH document' });
    expect(result.confidence).toBeGreaterThan(0);
  });

  // DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL — constant check

  it('DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL contains the required human review text', () => {
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toContain('Human review required');
    expect(DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL).toContain('AI-generated extraction');
  });

  // DOCUMENT_TYPES — completeness check

  it('DOCUMENT_TYPES contains UNKNOWN as the fallback type', () => {
    expect(DOCUMENT_TYPES).toContain('UNKNOWN');
  });

  it('DOCUMENT_TYPES contains all expected certification types', () => {
    const expectedTypes: DocumentType[] = [
      'GOTS_CERTIFICATE',
      'OEKO_TEX_CERTIFICATE',
      'ISO_CERTIFICATE',
      'REACH_COMPLIANCE',
      'LAB_TEST_REPORT',
      'DECLARATION_OF_CONFORMITY',
      'INSPECTION_REPORT',
      'SUPPLIER_EVIDENCE',
      'UNKNOWN',
    ];
    for (const t of expectedTypes) {
      expect(DOCUMENT_TYPES).toContain(t);
    }
  });
});
