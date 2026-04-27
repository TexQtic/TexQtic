/**
 * documentExtractionService.ts — Document Intelligence K-2: Extraction Schema and Prompt Contract
 *
 * Implements TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001, Slice K-2.
 *
 * Provides:
 *   - ExtractedField schema/type
 *   - DocumentExtractionDraft schema/type (in-memory only — no persistence in K-2)
 *   - buildDocumentExtractionPrompt() — prompt builder for document extraction
 *   - parseDocumentExtractionOutput() — AI output parser/validator
 *   - computeOverallConfidence() — field-level confidence aggregator
 *   - Normalization helpers (ISO date, string normalization)
 *
 * RULES:
 * - Pure functions — no IO, no DB calls, no provider calls made in K-2.
 * - humanReviewRequired: true is a structural constant; cannot be overridden.
 * - status is ALWAYS 'draft' for generated output; no AI path may set it to 'reviewed'.
 * - price, publicationPosture, risk_score, ranking, escrow, payment, credit are
 *   constitutionally forbidden from all AI paths.
 * - No persistence, no draft storage, no review route, no certification lifecycle mutation.
 * - No buyer-facing output.
 * - No cross-tenant analysis.
 * - org_id must be supplied by the caller from JWT context; never inferred from document content.
 * - Forbidden keys are stripped from AI output before validation; presence is also logged.
 *
 * Constitutional AI exclusions (TECS-AI-FOUNDATION-DATA-CONTRACTS-001):
 *   price                — forbidden
 *   publicationPosture   — forbidden
 *   risk_score           — forbidden
 *   buyer ranking        — forbidden
 *   supplier ranking     — forbidden
 *   payment/escrow       — forbidden
 *   credit scoring       — forbidden
 *
 * @module documentExtractionService
 */

import { assertNoForbiddenAiFields } from './aiForbiddenData.js';
import {
  type DocumentType,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
} from './documentClassificationService.js';

// ─── ExtractedField ───────────────────────────────────────────────────────────

/**
 * A single field extracted from a document by the AI model.
 *
 * Raw value is always preserved separately from the normalized value.
 * flagged_for_review is set true when confidence < CONFIDENCE_THRESHOLD_MEDIUM
 * or when the field is in the system-only set.
 *
 * reviewer_edited is set only by the human review step (K-5); never by K-2.
 */
export type ExtractedField = {
  /** Canonical field name from EXTRACTED_FIELD_NAMES. */
  field_name: string;
  /** Raw value as returned by AI — never mutated after parsing. */
  raw_value: string | null;
  /** Normalized value (trimmed, date-normalized, empty→null). null if raw_value is null. */
  normalized_value: string | null;
  /** Field-level confidence in [0, 1]. */
  confidence: number;
  /** Text region in the document where the field was located, if provided by model. */
  source_region: string | null;
  /** True when confidence < CONFIDENCE_THRESHOLD_MEDIUM or field was absent from document. */
  flagged_for_review: boolean;
  /**
   * Set to true only when a human reviewer edits the field value.
   * K-2 never sets this; it is reserved for K-5 review submission.
   */
  reviewer_edited?: boolean;
};

// ─── DocumentExtractionDraft ──────────────────────────────────────────────────

/**
 * In-memory extraction draft — primary output type for K-2.
 * No persistence in K-2; persistence and draft storage are deferred to K-3.
 *
 * humanReviewRequired is ALWAYS true — structural constant that cannot be
 * overridden by the AI model output or by any caller.
 *
 * status is ALWAYS 'draft' for AI-generated output.
 * Only human review (K-5) may transition status to 'reviewed' or 'rejected'.
 */
export type DocumentExtractionDraft = {
  /** Source document record ID (UUID). Never inferred by AI. */
  documentId: string;
  /** Tenant scope — ALWAYS from JWT/dbContext; never from document content. */
  orgId: string;
  /** Classified document type (from K-1 classifyDocumentType or typeHint). */
  documentType: DocumentType;
  /** All extracted fields with confidence scores and normalization. */
  extractedFields: ExtractedField[];
  /** Aggregate confidence — computed by computeOverallConfidence(). */
  overallConfidence: number;
  /** Structural constant — always true. Cannot be set to false by any path. */
  humanReviewRequired: true;
  /**
   * Lifecycle status.
   * 'draft' — AI-generated; requires human review before any use.
   * 'reviewed' — approved by a human reviewer (K-5 path only).
   * 'rejected' — rejected by a human reviewer (K-5 path only).
   *
   * K-2 generates only 'draft'. Other values are forbidden here.
   */
  status: 'draft' | 'reviewed' | 'rejected';
  /** Optional notes from the AI model on extraction quality or caveats. */
  extractionNotes: string | null;
  /** ISO 8601 timestamp when extraction was performed. */
  extractedAt: string;
  /** ISO 8601 timestamp when a human reviewer submitted their review. Null until K-5. */
  reviewedAt: string | null;
  /** User ID of the reviewer who submitted the review. Null until K-5. */
  reviewedByUserId: string | null;
};

// ─── Confidence Thresholds ────────────────────────────────────────────────────

/** High confidence — field accepted without automatic flag. */
export const CONFIDENCE_THRESHOLD_HIGH = 0.85;
/** Medium confidence — field accepted but requires attention. */
export const CONFIDENCE_THRESHOLD_MEDIUM = 0.50;
// Below CONFIDENCE_THRESHOLD_MEDIUM → field is flagged_for_review: true.

// ─── Extracted Field Names ────────────────────────────────────────────────────

/**
 * Canonical target field names for document extraction.
 *
 * System-set fields (marked with *) must NOT be present in AI model output.
 * They are set by the platform, not by the extraction model.
 *
 * System-set fields: uploaded_by, source_file_id, human_review_required,
 *                    confidence_score, document_type (set by K-1 classifier).
 */
export const EXTRACTED_FIELD_NAMES = [
  'issuer_name',
  'certificate_number',
  'report_number',
  'holder_name',
  'product_name',
  'material_composition',
  'standard_name',
  'test_parameters',
  'test_results',
  'issue_date',
  'expiry_date',
  'validity_status_candidate',
  'country_or_lab_location',
] as const;

export type ExtractedFieldName = (typeof EXTRACTED_FIELD_NAMES)[number];

/**
 * Fields that must NOT appear in AI model output — they are system-controlled.
 * If the AI model returns any of these, they are stripped before validation.
 */
export const SYSTEM_ONLY_FIELD_NAMES: ReadonlySet<string> = new Set([
  'uploaded_by',
  'source_file_id',
  'human_review_required',
  'confidence_score',
  'document_type',
]);

/**
 * Fields that are constitutionally forbidden from ALL AI paths (extraction included).
 * Source: TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section B + K-2 addendum.
 */
export const EXTRACTION_FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  'price',
  'pricing',
  'risk_score',
  'riskScore',
  'publicationPosture',
  'buyerRanking',
  'supplierRanking',
  'ranking',
  'matchingScore',
  'escrow',
  'paymentDecision',
  'creditScore',
  'payment',
  'credit',
]);

// ─── Normalization Helpers ────────────────────────────────────────────────────

/**
 * Normalizes a raw string value from AI output:
 * - Trims whitespace
 * - Converts empty string to null
 *
 * Does not perform type coercion or complex parsing.
 */
export function normalizeRawString(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Normalizes an ISO date string returned by the AI model.
 *
 * Accepts common date formats returned by LLMs:
 *   - 'YYYY-MM-DD' (ISO 8601 date — preferred; returned as-is if valid)
 *   - 'YYYY-MM-DDTHH:mm:ssZ' or similar ISO datetime (date portion extracted)
 *   - 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD' (common document date variants)
 *
 * Returns null for unrecognized or malformed dates.
 * Never throws — failure is always silent null (preserves raw_value for human review).
 */
export function normalizeIsoDate(raw: unknown): string | null {
  const str = normalizeRawString(raw);
  if (str === null) return null;

  // Already ISO 8601 date (YYYY-MM-DD)
  const isoDateRe = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;
  const isoMatch = isoDateRe.exec(str);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(`${y}-${m}-${d}`);
    if (!isNaN(date.getTime())) return `${y}-${m}-${d}`;
    return null;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(str);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(`${y}-${m}-${d}`);
    if (!isNaN(date.getTime())) return `${y}-${m}-${d}`;
    return null;
  }

  // MM/DD/YYYY — only attempt if first part could not be a valid day (> 12 disambiguates)
  // For ambiguous dates (both interpretations valid), prefer DD/MM/YYYY (European standard
  // for international textile documents).
  const mdy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (mdy) {
    const [, maybeM, maybeD, y] = mdy;
    const mNum = parseInt(maybeM, 10);
    const dNum = parseInt(maybeD, 10);
    // Unambiguously MM/DD/YYYY only when first part > 12 (impossible as day)
    if (mNum > 12 && dNum <= 12) {
      // First part is month
      const date = new Date(`${y}-${maybeM.padStart(2, '0')}-${maybeD.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return `${y}-${maybeM.padStart(2, '0')}-${maybeD.padStart(2, '0')}`;
      }
    }
    return null;
  }

  // YYYY/MM/DD
  const ymd = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(str);
  if (ymd) {
    const [, y, m, d] = ymd;
    const date = new Date(`${y}-${m}-${d}`);
    if (!isNaN(date.getTime())) return `${y}-${m}-${d}`;
    return null;
  }

  return null;
}

/**
 * Normalizes a document type value from AI output to a canonical DocumentType.
 * Accepts both exact enum values and common LLM-produced variants.
 * Returns null for unrecognized values (caller may fall back to K-1 classifier result).
 */
export function normalizeDocumentTypeValue(raw: unknown): DocumentType | null {
  const str = normalizeRawString(raw);
  if (str === null) return null;
  const upper = str.toUpperCase().replace(/[\s\-]/g, '_');
  const VALID: ReadonlySet<string> = new Set([
    'GOTS_CERTIFICATE',
    'OEKO_TEX_CERTIFICATE',
    'ISO_CERTIFICATE',
    'REACH_COMPLIANCE',
    'LAB_TEST_REPORT',
    'DECLARATION_OF_CONFORMITY',
    'INSPECTION_REPORT',
    'SUPPLIER_EVIDENCE',
    'UNKNOWN',
  ]);
  if (VALID.has(upper)) return upper as DocumentType;
  return null;
}

/**
 * Clamps a numeric confidence value to [0, 1].
 * Non-numeric values are treated as 0.
 */
export function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

// ─── Confidence Computation ───────────────────────────────────────────────────

/**
 * Computes the overall extraction confidence from individual field-level scores.
 *
 * Rules:
 * - Average of all field-level confidence values.
 * - System-set field names are ignored if present.
 * - Returns 0.0 for empty field arrays.
 * - Result rounded to 2 decimal places.
 * - A high overall confidence score does NOT imply approval; humanReviewRequired
 *   remains true regardless of score.
 *
 * Confidence thresholds:
 *   >= 0.85  → high
 *   0.50–0.84 → medium
 *   < 0.50  → flagged
 */
export function computeOverallConfidence(fields: ExtractedField[]): number {
  const scoreable = fields.filter((f) => !SYSTEM_ONLY_FIELD_NAMES.has(f.field_name));
  if (scoreable.length === 0) return 0;
  const sum = scoreable.reduce((acc, f) => acc + clampConfidence(f.confidence), 0);
  return Math.round((sum / scoreable.length) * 100) / 100;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

/**
 * Input for the document extraction prompt builder.
 *
 * documentId is included for traceability in the prompt (model echoes it in output).
 * documentText is the raw text content of the document to extract from.
 * documentType is the classified type from K-1 to guide field expectations.
 *
 * org_id MUST NOT be included — never passed to the AI model.
 */
export interface BuildExtractionPromptInput {
  documentType: DocumentType;
  documentText: string;
  documentId: string;
}

/**
 * Builds the document extraction prompt for the AI model.
 *
 * The prompt instructs the model to:
 * - Extract only from the provided document text (no assumptions from external knowledge)
 * - Return strict JSON only (no markdown fences, no prose)
 * - Preserve unknowns as null
 * - Include field-level confidence [0, 1]
 * - Include source region where possible
 * - Treat output as draft only; never validate or approve certificates
 * - Never provide legal or regulatory advice
 * - Never infer price, risk score, publication posture, ranking, payment, escrow, or credit
 * - Always require human review (humanReviewRequired: true is structural)
 *
 * The returned string is the complete system + user prompt content ready
 * for submission to the AI provider in K-3.
 *
 * SAFETY: assertNoForbiddenAiFields() is called on input to prevent forbidden
 * data reaching the prompt.
 */
export function buildDocumentExtractionPrompt(
  input: BuildExtractionPromptInput,
): string {
  assertNoForbiddenAiFields(input);

  const fieldList = EXTRACTED_FIELD_NAMES.map((name) => `  "${name}"`).join(',\n');

  return `You are a document intelligence assistant for a B2B textile platform.
Your task is to extract structured data fields from the document text provided below.

## Strict Operating Rules

1. Extract ONLY from the provided document text. Do not use external knowledge.
2. Return ONLY valid JSON. No markdown code fences, no prose, no explanations outside JSON.
3. If a field is absent or unclear in the document, set its value to null.
4. Include a field-level confidence score in [0.0, 1.0] for each field.
5. Include source_region (a short text excerpt from the document) where the field was found.
6. Treat all output as a DRAFT. Your output is never authoritative.
7. Human review is ALWAYS required before any extracted field is used. You must never validate,
   approve, or certify any document or field value.
8. Do NOT provide legal advice, regulatory advice, or compliance verdicts.
9. Do NOT infer, suggest, or output any of the following — they are constitutionally forbidden:
   - price, pricing, cost, unit cost, payment terms
   - risk_score, riskScore, risk assessment, credit score, creditScore
   - publicationPosture, visibility, buyer ranking, supplier ranking, ranking, matchingScore
   - escrow, paymentDecision, payment decision, financial assessment
10. Do NOT set or change certificate validity status. You may extract the stated issue date and
    expiry date from the document text only.
11. Do NOT compare this document to other suppliers or other documents (no cross-tenant analysis).
12. The document type is: ${input.documentType}
13. The document ID is: ${input.documentId} — echo this exactly in your JSON output as "document_id".

## Output Schema

Return a single JSON object with this exact structure:
{
  "document_id": "<echo the document ID>",
  "extracted_fields": [
    {
      "field_name": "<one of the allowed field names listed below>",
      "raw_value": "<exact value as found in the document, or null>",
      "confidence": <float 0.0–1.0>,
      "source_region": "<short excerpt or location hint, or null>"
    }
  ],
  "extraction_notes": "<optional: brief notes on document quality, missing fields, or ambiguities. null if none.>"
}

## Allowed Field Names

Only use field names from this list:
[
${fieldList}
]

Do NOT include any field name outside this list.
Do NOT include fields named: uploaded_by, source_file_id, human_review_required,
confidence_score, document_type, price, pricing, risk_score, riskScore,
publicationPosture, buyerRanking, supplierRanking, ranking, matchingScore,
escrow, paymentDecision, creditScore.

## Document Text

---BEGIN DOCUMENT---
${input.documentText}
---END DOCUMENT---

Return only the JSON object. No other text.`;
}

// ─── AI Output Parser / Validator ─────────────────────────────────────────────

/**
 * ParseError — structured error for AI output parsing failures.
 */
export class ExtractionParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ExtractionParseError';
  }
}

/**
 * Parses and validates raw AI model output into a DocumentExtractionDraft.
 *
 * Validation enforces:
 * - humanReviewRequired: true (structural constant; cannot be false)
 * - status: 'draft' for all generated output (AI cannot set reviewed/rejected)
 * - confidence values clamped to [0, 1]
 * - unknown/missing fields normalized to null
 * - low confidence fields flagged_for_review: true
 * - forbidden keys stripped from parsed output (price, risk_score, etc.)
 * - system-only keys stripped from field list
 *
 * Throws ExtractionParseError if the raw output is structurally invalid
 * (not parseable JSON, missing required fields, etc.).
 *
 * @param raw       - Raw output from AI model (string JSON or already-parsed object)
 * @param context   - Caller context: documentId, orgId, documentType, extractedAt
 */
export function parseDocumentExtractionOutput(
  raw: unknown,
  context: {
    documentId: string;
    orgId: string;
    documentType: DocumentType;
    extractedAt?: string;
  },
): DocumentExtractionDraft {
  // Step 1: Parse JSON if string
  let parsed: unknown;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ExtractionParseError(
        'AI output is not valid JSON',
        'INVALID_JSON',
      );
    }
  } else {
    parsed = raw;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ExtractionParseError(
      'AI output must be a JSON object',
      'NOT_OBJECT',
    );
  }

  const obj = parsed as Record<string, unknown>;

  // Step 2: Strip forbidden top-level keys
  for (const key of EXTRACTION_FORBIDDEN_KEYS) {
    if (key in obj) {
      delete obj[key];
    }
  }

  // Step 3: Strip system-only keys at top level
  for (const key of SYSTEM_ONLY_FIELD_NAMES) {
    if (key in obj) {
      delete obj[key];
    }
  }

  // Step 4: Validate assertNoForbiddenAiFields on the object before processing
  assertNoForbiddenAiFields(obj);

  // Step 5: Parse extracted_fields array
  const rawFields = obj['extracted_fields'];
  if (!Array.isArray(rawFields)) {
    throw new ExtractionParseError(
      'AI output missing required "extracted_fields" array',
      'MISSING_EXTRACTED_FIELDS',
    );
  }

  const extractedFields: ExtractedField[] = rawFields
    .filter((item): item is Record<string, unknown> => {
      return item !== null && typeof item === 'object' && !Array.isArray(item);
    })
    .filter((item) => {
      // Discard items with forbidden or system-only field names
      const name = normalizeRawString(item['field_name']);
      if (name === null) return false;
      if (EXTRACTION_FORBIDDEN_KEYS.has(name)) return false;
      if (SYSTEM_ONLY_FIELD_NAMES.has(name)) return false;
      return true;
    })
    .map((item): ExtractedField => {
      const field_name = normalizeRawString(item['field_name']) ?? 'unknown';
      const raw_value = normalizeRawString(item['raw_value']);
      const confidence = clampConfidence(item['confidence']);
      const source_region = normalizeRawString(item['source_region']);

      // Normalize value: apply ISO date normalization for date fields
      let normalized_value: string | null;
      if (field_name === 'issue_date' || field_name === 'expiry_date') {
        normalized_value = raw_value !== null ? normalizeIsoDate(raw_value) ?? raw_value : null;
      } else {
        normalized_value = raw_value;
      }

      const flagged_for_review = confidence < CONFIDENCE_THRESHOLD_MEDIUM || raw_value === null;

      return {
        field_name,
        raw_value,
        normalized_value,
        confidence,
        source_region,
        flagged_for_review,
      };
    });

  // Step 6: Build extraction notes
  const extraction_notes = normalizeRawString(obj['extraction_notes']);

  // Step 7: Compute overall confidence
  const overallConfidence = computeOverallConfidence(extractedFields);

  // Step 8: Assemble draft — humanReviewRequired is ALWAYS true (structural constant)
  const draft: DocumentExtractionDraft = {
    documentId: context.documentId,
    orgId: context.orgId,
    documentType: context.documentType,
    extractedFields,
    overallConfidence,
    humanReviewRequired: true,   // Structural constant — immutable
    status: 'draft',             // AI output is always draft
    extractionNotes: extraction_notes,
    extractedAt: context.extractedAt ?? new Date().toISOString(),
    reviewedAt: null,
    reviewedByUserId: null,
  };

  return draft;
}

// ─── Re-export governance label for K-2 consumer convenience ─────────────────

export { DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL };
