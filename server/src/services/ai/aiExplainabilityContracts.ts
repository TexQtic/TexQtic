/**
 * aiExplainabilityContracts.ts — AI Explainability Output Schemas
 *
 * Zod schemas and validation helpers for all AI output types. Every AI output
 * delivered to a tenant must include the required explainability fields defined
 * here. Outputs that fail validation must be rejected at the service boundary
 * before returning to the route handler.
 *
 * Implements TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section D.1.
 *
 * RULES:
 * - confidence/score fields must be in [0, 1].
 * - reasoningSummary max 200 chars for match/suggestion results.
 * - humanConfirmationRequired = true is required for all draft/suggest/autofill/
 *   transition-touching outputs.
 * - Source references are IDs + types only — no chunk content.
 * - No provider calls, no IO.
 *
 * @module aiExplainabilityContracts
 */

import { z } from 'zod';
import { AI_REASONING_LOG_LIMITS } from './aiDataContracts.js';

// ─── Shared sub-schemas ────────────────────────────────────────────────────────

/**
 * Source reference schema — IDs and source type only.
 * Chunk content is constitutionally excluded.
 */
export const SourceReferenceSchema = z.object({
  sourceType: z.enum(['CATALOG_ITEM', 'CERTIFICATION', 'DPP_SNAPSHOT', 'SUPPLIER_PROFILE']),
  sourceId: z.string().uuid(),
  similarity: z.number().min(0).max(1).optional(),
});

export type SourceReference = z.infer<typeof SourceReferenceSchema>;

/** Confidence score [0,1]. Rejects values outside the range. */
const confidenceField = z.number().min(0).max(1);

/** Reasoning summary with max-char enforcement per AI_REASONING_LOG_LIMITS. */
const reasoningSummaryField = z
  .string()
  .max(AI_REASONING_LOG_LIMITS.REASONING_SUMMARY_MAX_CHARS);

// ─── SupplierMatchExplanation ──────────────────────────────────────────────────

/**
 * Explainability schema for supplier match results.
 *
 * All fields are required. humanConfirmationRequired must be literal true.
 * sourceReferences must have at least one entry (min(1)).
 */
export const SupplierMatchExplanationSchema = z.object({
  /** Semantic similarity score in [0, 1] */
  matchScore: confidenceField,
  /** Fields from the catalog item that contributed to the match */
  matchedFields: z.array(z.string()).min(1),
  /** Fields whose presence would improve the match quality */
  missingFields: z.array(z.string()),
  /** Source chunk references — IDs + types only; NO chunk content */
  sourceReferences: z.array(SourceReferenceSchema).min(1),
  /** Brief narrative of match reasoning — max 200 chars */
  reasoningSummary: reasoningSummaryField,
  /** Always true for match results presented to users */
  humanConfirmationRequired: z.literal(true),
});

export type SupplierMatchExplanation = z.infer<typeof SupplierMatchExplanationSchema>;

// ─── CatalogCompletenessExplanation ───────────────────────────────────────────

/**
 * Explainability schema for catalog completeness reports.
 *
 * notStored: true enforces the constitutional rule that completeness scores
 * are transient by default (catalogItemAttributeCompleteness() result is not persisted).
 */
export const CatalogCompletenessExplanationSchema = z.object({
  /** Overall completeness score [0, 1] */
  completenessScore: confidenceField,
  /** Fields present in the catalog item */
  presentFields: z.array(z.string()),
  /** Fields missing for the applied stage schema */
  missingFields: z.array(z.string()),
  /** Suggested actions to improve completeness (must not include pricing recommendations) */
  suggestedActions: z.array(z.string()),
  /** Stage schema that was applied for evaluation */
  stageApplied: z.string().min(1),
  /** Always true — completeness score is computed per-request, never stored */
  notStored: z.literal(true),
});

export type CatalogCompletenessExplanation = z.infer<typeof CatalogCompletenessExplanationSchema>;

// ─── RFQDraftExplanation ───────────────────────────────────────────────────────

/**
 * Explainability schema for AI-generated RFQ draft results.
 *
 * humanReviewRequired: true and piiScanned: true are required.
 * Fields where draftConfidence < 0.7 must be listed in uncertainFields.
 */
export const RFQDraftExplanationSchema = z.object({
  /** Draft confidence [0, 1] */
  draftConfidence: confidenceField,
  /** Catalog/context fields used to construct the draft */
  fieldsUsed: z.array(z.string()).min(1),
  /** Fields where confidence < 0.7 — must be flagged as uncertain in UI */
  uncertainFields: z.array(z.string()),
  /** PII guard was applied to buyer requirement text before use */
  piiScanned: z.literal(true),
  /** Human must review draft before send — always required for RFQ drafts */
  humanReviewRequired: z.literal(true),
});

export type RFQDraftExplanation = z.infer<typeof RFQDraftExplanationSchema>;

// ─── DocumentExtractionExplanation ────────────────────────────────────────────

/**
 * Explainability schema for AI-assisted document extraction results.
 *
 * humanReviewRequired: true is mandatory.
 * Fields with extractionConfidence < 0.8 must be listed in uncertainExtractions.
 */
export const DocumentExtractionExplanationSchema = z.object({
  /** Overall extraction confidence [0, 1] */
  extractionConfidence: confidenceField,
  /** Extracted field values — keys are field names, values are extracted strings */
  extractedFields: z.record(z.string()),
  /** Fields where extraction confidence < 0.8 — flagged as uncertain */
  uncertainExtractions: z.array(z.string()),
  /** UUID of the source document */
  sourceDocId: z.string().uuid(),
  /** Human must review before any entity write — always required for extractions */
  humanReviewRequired: z.literal(true),
});

export type DocumentExtractionExplanation = z.infer<typeof DocumentExtractionExplanationSchema>;

// ─── WorkflowSuggestionExplanation ────────────────────────────────────────────

/**
 * Explainability schema for AI-assisted trade workflow suggestions.
 *
 * D-020-C: aiTriggered: true is required. humanConfirmationRequired: true is required.
 * AI must never trigger state transitions autonomously.
 */
export const WorkflowSuggestionExplanationSchema = z.object({
  /** Type of suggestion (e.g., 'NEXT_TRANSITION', 'COMMUNICATION_DRAFT') */
  suggestionType: z.string().min(1),
  /** Current lifecycle state that informed the suggestion */
  relevantState: z.string().min(1),
  /** Suggested next state — null if the suggestion is informational only */
  suggestedNextState: z.string().nullable(),
  /** D-020-C: must be true on any write path — AI never writes autonomously */
  aiTriggered: z.literal(true),
  /** Human must confirm before any state transition — always required */
  humanConfirmationRequired: z.literal(true),
  /** Source references (lifecycle states, transitions) used as context — IDs only */
  sourceReferences: z.array(SourceReferenceSchema),
  /** Brief reasoning summary — max 200 chars */
  reasoningSummary: reasoningSummaryField,
});

export type WorkflowSuggestionExplanation = z.infer<typeof WorkflowSuggestionExplanationSchema>;

// ─── RiskWarningExplanation ────────────────────────────────────────────────────

/**
 * Explainability schema for AI-generated risk or expiry warnings.
 *
 * Must cite the specific field and value that triggered the warning.
 * triggeredByValue must not contain PII or forbidden data — caller responsibility.
 */
export const RiskWarningExplanationSchema = z.object({
  /** Category of warning (e.g., 'CERTIFICATION_EXPIRY', 'COMPLETENESS_GAP') */
  warningType: z.string().min(1),
  /** The specific field that triggered the warning */
  triggeredByField: z.string().min(1),
  /** The value/condition that triggered the warning — must not contain PII or forbidden data */
  triggeredByValue: z.string(),
  /** Severity level */
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  /** Recommended action for the operator/user */
  recommendedAction: z.string().min(1),
});

export type RiskWarningExplanation = z.infer<typeof RiskWarningExplanationSchema>;

// ─── Validation helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the confidence score is a valid value in [0, 1].
 *
 * Use for quick inline validation before constructing a full explainability object.
 */
export function validateConfidenceScore(score: number): boolean {
  return score >= 0 && score <= 1;
}

/**
 * Returns true if the reasoning summary is within the maximum character limit.
 */
export function validateReasoningSummaryLength(summary: string): boolean {
  return summary.length <= AI_REASONING_LOG_LIMITS.REASONING_SUMMARY_MAX_CHARS;
}
