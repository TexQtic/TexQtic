/**
 * ai-explainability-contracts.test.ts — AI Explainability Schema Tests
 *
 * Verifies that Zod schemas in aiExplainabilityContracts.ts correctly enforce:
 *   - confidence scores are in [0, 1] — values > 1 or < 0 are rejected
 *   - sourceReferences are required (min(1)) where specified
 *   - humanConfirmationRequired / humanReviewRequired must be literal true
 *   - aiTriggered must be literal true for workflow suggestions (D-020-C)
 *   - reasoningSummary is capped at 200 chars
 *
 * Coverage requirements from TECS-AI-FOUNDATION-DATA-CONTRACTS-001:
 *   #10 explainability schema rejects confidence > 1
 *   #11 explainability schema requires source references
 *   #14 no provider/model call is made (satisfied: no AI provider imports)
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/ai-explainability-contracts.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  SupplierMatchExplanationSchema,
  RFQDraftExplanationSchema,
  WorkflowSuggestionExplanationSchema,
  DocumentExtractionExplanationSchema,
  CatalogCompletenessExplanationSchema,
  RiskWarningExplanationSchema,
  validateConfidenceScore,
  validateReasoningSummaryLength,
} from '../aiExplainabilityContracts.js';

// ─── SupplierMatchExplanationSchema ───────────────────────────────────────────

describe('SupplierMatchExplanationSchema', () => {
  const validMatch = {
    matchScore: 0.85,
    matchedFields: ['material', 'catalogStage', 'gsm'],
    missingFields: ['composition'],
    sourceReferences: [
      { sourceType: 'CATALOG_ITEM' as const, sourceId: '00000000-0000-0000-0000-000000000001', similarity: 0.85 },
    ],
    reasoningSummary: 'Cotton fabric at RAW_MATERIAL stage matched buyer requirement.',
    humanConfirmationRequired: true as const,
  };

  it('parses a valid match explanation', () => {
    const result = SupplierMatchExplanationSchema.safeParse(validMatch);
    expect(result.success).toBe(true);
  });

  it('rejects matchScore > 1', () => {
    const result = SupplierMatchExplanationSchema.safeParse({ ...validMatch, matchScore: 1.1 });
    expect(result.success).toBe(false);
  });

  it('rejects matchScore < 0', () => {
    const result = SupplierMatchExplanationSchema.safeParse({ ...validMatch, matchScore: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects empty sourceReferences (min(1) required)', () => {
    const result = SupplierMatchExplanationSchema.safeParse({ ...validMatch, sourceReferences: [] });
    expect(result.success).toBe(false);
  });

  it('rejects empty matchedFields (min(1) required)', () => {
    const result = SupplierMatchExplanationSchema.safeParse({ ...validMatch, matchedFields: [] });
    expect(result.success).toBe(false);
  });

  it('rejects humanConfirmationRequired: false', () => {
    const result = SupplierMatchExplanationSchema.safeParse({
      ...validMatch,
      humanConfirmationRequired: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects reasoningSummary exceeding 200 chars', () => {
    const result = SupplierMatchExplanationSchema.safeParse({
      ...validMatch,
      reasoningSummary: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('accepts reasoningSummary of exactly 200 chars', () => {
    const result = SupplierMatchExplanationSchema.safeParse({
      ...validMatch,
      reasoningSummary: 'x'.repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it('rejects sourceId that is not a UUID', () => {
    const result = SupplierMatchExplanationSchema.safeParse({
      ...validMatch,
      sourceReferences: [{ sourceType: 'CATALOG_ITEM', sourceId: 'not-a-uuid', similarity: 0.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty missingFields array', () => {
    const result = SupplierMatchExplanationSchema.safeParse({ ...validMatch, missingFields: [] });
    expect(result.success).toBe(true);
  });
});

// ─── RFQDraftExplanationSchema ─────────────────────────────────────────────────

describe('RFQDraftExplanationSchema', () => {
  const validDraft = {
    draftConfidence: 0.78,
    fieldsUsed: ['catalogItemText', 'buyerRequirementText'],
    uncertainFields: [],
    piiScanned: true as const,
    humanReviewRequired: true as const,
  };

  it('parses a valid RFQ draft explanation', () => {
    expect(RFQDraftExplanationSchema.safeParse(validDraft).success).toBe(true);
  });

  it('rejects draftConfidence > 1', () => {
    expect(RFQDraftExplanationSchema.safeParse({ ...validDraft, draftConfidence: 1.5 }).success).toBe(false);
  });

  it('rejects draftConfidence < 0', () => {
    expect(RFQDraftExplanationSchema.safeParse({ ...validDraft, draftConfidence: -0.01 }).success).toBe(false);
  });

  it('rejects piiScanned: false', () => {
    expect(RFQDraftExplanationSchema.safeParse({ ...validDraft, piiScanned: false }).success).toBe(false);
  });

  it('rejects humanReviewRequired: false', () => {
    expect(RFQDraftExplanationSchema.safeParse({ ...validDraft, humanReviewRequired: false }).success).toBe(false);
  });

  it('rejects empty fieldsUsed (min(1) required)', () => {
    expect(RFQDraftExplanationSchema.safeParse({ ...validDraft, fieldsUsed: [] }).success).toBe(false);
  });
});

// ─── WorkflowSuggestionExplanationSchema ─────────────────────────────────────

describe('WorkflowSuggestionExplanationSchema', () => {
  const validSuggestion = {
    suggestionType: 'NEXT_TRANSITION',
    relevantState: 'AWAITING_CONFIRMATION',
    suggestedNextState: 'CONFIRMED',
    aiTriggered: true as const,
    humanConfirmationRequired: true as const,
    sourceReferences: [],
    reasoningSummary: 'Trade is awaiting buyer confirmation — suggest CONFIRM transition.',
  };

  it('parses a valid workflow suggestion', () => {
    expect(WorkflowSuggestionExplanationSchema.safeParse(validSuggestion).success).toBe(true);
  });

  it('rejects aiTriggered: false (D-020-C: AI never writes autonomously)', () => {
    expect(
      WorkflowSuggestionExplanationSchema.safeParse({ ...validSuggestion, aiTriggered: false }).success,
    ).toBe(false);
  });

  it('rejects humanConfirmationRequired: false', () => {
    expect(
      WorkflowSuggestionExplanationSchema.safeParse({
        ...validSuggestion,
        humanConfirmationRequired: false,
      }).success,
    ).toBe(false);
  });

  it('accepts suggestedNextState as null (informational suggestion)', () => {
    expect(
      WorkflowSuggestionExplanationSchema.safeParse({ ...validSuggestion, suggestedNextState: null }).success,
    ).toBe(true);
  });

  it('rejects empty suggestionType', () => {
    expect(
      WorkflowSuggestionExplanationSchema.safeParse({ ...validSuggestion, suggestionType: '' }).success,
    ).toBe(false);
  });

  it('rejects reasoningSummary exceeding 200 chars', () => {
    expect(
      WorkflowSuggestionExplanationSchema.safeParse({
        ...validSuggestion,
        reasoningSummary: 'y'.repeat(201),
      }).success,
    ).toBe(false);
  });
});

// ─── DocumentExtractionExplanationSchema ─────────────────────────────────────

describe('DocumentExtractionExplanationSchema', () => {
  const validExtraction = {
    extractionConfidence: 0.92,
    extractedFields: { certificationType: 'GOTS', issuedAt: '2026-01-15', expiresAt: '2027-01-14' },
    uncertainExtractions: [],
    sourceDocId: '00000000-0000-0000-0000-000000000002',
    humanReviewRequired: true as const,
  };

  it('parses a valid extraction explanation', () => {
    expect(DocumentExtractionExplanationSchema.safeParse(validExtraction).success).toBe(true);
  });

  it('rejects extractionConfidence > 1', () => {
    expect(
      DocumentExtractionExplanationSchema.safeParse({ ...validExtraction, extractionConfidence: 1.01 }).success,
    ).toBe(false);
  });

  it('rejects humanReviewRequired: false', () => {
    expect(
      DocumentExtractionExplanationSchema.safeParse({ ...validExtraction, humanReviewRequired: false }).success,
    ).toBe(false);
  });

  it('rejects sourceDocId that is not a UUID', () => {
    expect(
      DocumentExtractionExplanationSchema.safeParse({ ...validExtraction, sourceDocId: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});

// ─── CatalogCompletenessExplanationSchema ─────────────────────────────────────

describe('CatalogCompletenessExplanationSchema', () => {
  const validCompleteness = {
    completenessScore: 0.72,
    presentFields: ['name', 'sku', 'material', 'gsm'],
    missingFields: ['composition', 'widthCm'],
    suggestedActions: ['Add composition field', 'Add width in cm'],
    stageApplied: 'FABRIC',
    notStored: true as const,
  };

  it('parses a valid completeness explanation', () => {
    expect(CatalogCompletenessExplanationSchema.safeParse(validCompleteness).success).toBe(true);
  });

  it('rejects completenessScore > 1', () => {
    expect(
      CatalogCompletenessExplanationSchema.safeParse({ ...validCompleteness, completenessScore: 2 }).success,
    ).toBe(false);
  });

  it('rejects notStored: false (score must never be stored without schema migration)', () => {
    expect(
      CatalogCompletenessExplanationSchema.safeParse({ ...validCompleteness, notStored: false }).success,
    ).toBe(false);
  });

  it('rejects empty stageApplied', () => {
    expect(
      CatalogCompletenessExplanationSchema.safeParse({ ...validCompleteness, stageApplied: '' }).success,
    ).toBe(false);
  });
});

// ─── RiskWarningExplanationSchema ─────────────────────────────────────────────

describe('RiskWarningExplanationSchema', () => {
  const validWarning = {
    warningType: 'CERTIFICATION_EXPIRY',
    triggeredByField: 'Certification.expiresAt',
    triggeredByValue: '2026-04-30',
    severity: 'HIGH' as const,
    recommendedAction: 'Renew GOTS certification before 2026-04-30',
  };

  it('parses a valid risk warning', () => {
    expect(RiskWarningExplanationSchema.safeParse(validWarning).success).toBe(true);
  });

  it('rejects invalid severity values', () => {
    expect(
      RiskWarningExplanationSchema.safeParse({ ...validWarning, severity: 'CRITICAL' }).success,
    ).toBe(false);
  });

  it('accepts all valid severity levels', () => {
    for (const severity of ['LOW', 'MEDIUM', 'HIGH']) {
      expect(
        RiskWarningExplanationSchema.safeParse({ ...validWarning, severity }).success,
      ).toBe(true);
    }
  });

  it('rejects empty triggeredByField', () => {
    expect(
      RiskWarningExplanationSchema.safeParse({ ...validWarning, triggeredByField: '' }).success,
    ).toBe(false);
  });
});

// ─── validateConfidenceScore ──────────────────────────────────────────────────

describe('validateConfidenceScore', () => {
  it('returns true for 0', () => {
    expect(validateConfidenceScore(0)).toBe(true);
  });

  it('returns true for 1', () => {
    expect(validateConfidenceScore(1)).toBe(true);
  });

  it('returns true for 0.5', () => {
    expect(validateConfidenceScore(0.5)).toBe(true);
  });

  it('returns false for values > 1', () => {
    expect(validateConfidenceScore(1.01)).toBe(false);
    expect(validateConfidenceScore(2)).toBe(false);
  });

  it('returns false for values < 0', () => {
    expect(validateConfidenceScore(-0.01)).toBe(false);
    expect(validateConfidenceScore(-1)).toBe(false);
  });
});

// ─── validateReasoningSummaryLength ──────────────────────────────────────────

describe('validateReasoningSummaryLength', () => {
  it('returns true for text within 200 chars', () => {
    expect(validateReasoningSummaryLength('Short summary')).toBe(true);
  });

  it('returns true for exactly 200 chars', () => {
    expect(validateReasoningSummaryLength('a'.repeat(200))).toBe(true);
  });

  it('returns false for text exceeding 200 chars', () => {
    expect(validateReasoningSummaryLength('a'.repeat(201))).toBe(false);
  });
});
