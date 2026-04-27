/**
 * TexQtic Document Intelligence Service
 * TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 — K-4 Frontend Review Panel
 *
 * Client-side service for the document extraction API.
 * Calls the K-3 backend route: POST /api/tenant/documents/:documentId/extract
 *
 * Constitutional compliance:
 *   D-017-A  orgId NEVER appears in any request body from the client.
 *            tenantPost enforces TENANT realm; server derives orgId from JWT.
 *   HOTFIX-MODEL-TX-001  AI call is handled server-side outside Prisma tx.
 *                        Client has no visibility into this; it simply calls
 *                        the extract endpoint and receives a draft.
 *
 * Governance:
 *   - humanReviewRequired is always true — structural constant at both
 *     server and client level. The client NEVER overrides this.
 *   - status on creation is always 'draft' — K-5 scope for review submission.
 *   - No approve/reject in this service — K-5 scope.
 *   - No DPP, buyer-facing, or public data paths in this service.
 *   - Forbidden fields (price, risk_score, publicationPosture, etc.) are never
 *     sent to the server or displayed from the server response.
 *
 * Out of scope (K-4 only):
 *   ❌  Review submission / approve / reject — K-5
 *   ❌  Draft status mutation — K-5
 *   ❌  Certification lifecycle — constitutionally forbidden in K-4
 *   ❌  DPP passport output — future unit
 *   ❌  Buyer-facing/public output — future gate
 */

import { tenantPost } from './tenantApiClient';

// ─── Document type enum (subset — matches server DocumentType union) ──────────

export type DocumentType =
  | 'GOTS_CERTIFICATE'
  | 'OEKO_TEX_CERTIFICATE'
  | 'ISO_9001_CERTIFICATE'
  | 'REACH_COMPLIANCE'
  | 'BCI_CERTIFICATE'
  | 'BLUESIGN_CERTIFICATE'
  | 'FAIR_TRADE_CERTIFICATE'
  | 'RECYCLED_CLAIM_STANDARD'
  | 'MATERIAL_TEST_REPORT'
  | 'INSPECTION_REPORT'
  | 'UNKNOWN';

// ─── Extracted field shape (mirrors server ExtractedField) ───────────────────

export interface ExtractedField {
  field_name: string;
  raw_value: string | null;
  normalized_value: string | null;
  /** [0, 1] — field-level extraction confidence */
  confidence: number;
  source_region: string | null;
  flagged_for_review: boolean;
  /** Set to true if a human reviewer has overridden this value (K-5 scope) */
  reviewer_edited?: boolean;
}

// ─── Extraction draft (mirrors server DocumentExtractionDraft) ───────────────

export interface ExtractionDraft {
  id: string;
  documentId: string;
  /** orgId is present in server response but must never be displayed in UI */
  orgId: string;
  documentType: string;
  extractedFields: ExtractedField[];
  /** [0, 1] — overall confidence across all fields */
  overallConfidence: number;
  /** Structural constant — always true; cannot be false from any server response */
  humanReviewRequired: true;
  /** Always 'draft' on creation — K-5 scope for status mutation */
  status: 'draft' | 'reviewed' | 'rejected';
  extractionNotes: string | null;
  extractedAt: string;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
}

// ─── API response envelope ────────────────────────────────────────────────────

export interface ExtractionResponse {
  draft: ExtractionDraft;
  /** Echoed at envelope level — must be true */
  humanReviewRequired: true;
  /** Governance label — hardcoded on server, echoed here, hardcoded in UI */
  governanceLabel: string;
}

// ─── Request body ─────────────────────────────────────────────────────────────

export interface TriggerExtractionInput {
  /** Document text content — required. D-017-A: orgId MUST NOT be included. */
  documentText: string;
  /** Optional human-readable title for logging/display purposes. */
  documentTitle?: string;
  /** Optional type hint — server may auto-classify if omitted. */
  documentType?: string;
}

// ─── Confidence tier ─────────────────────────────────────────────────────────

export type ConfidenceTier = 'HIGH' | 'NEEDS_REVIEW' | 'FLAGGED';

/**
 * Maps a confidence value [0, 1] to the display tier.
 *
 * | Confidence | Tier        |
 * |------------|-------------|
 * | >= 0.85    | HIGH        |
 * | 0.50–0.84  | NEEDS_REVIEW|
 * | < 0.50     | FLAGGED     |
 *
 * Does NOT imply approval at any tier (per design spec Section H).
 */
export function resolveConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.50) return 'NEEDS_REVIEW';
  return 'FLAGGED';
}

/**
 * Converts a [0, 1] confidence value to a display percentage string.
 * e.g. 0.85 → "85%"
 */
export function resolveConfidencePercent(confidence: number): string {
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;
}

/**
 * Returns the display label for a confidence tier.
 * Used for aria-label and tooltip text.
 */
export function resolveConfidenceTierLabel(tier: ConfidenceTier): string {
  switch (tier) {
    case 'HIGH': return 'High confidence';
    case 'NEEDS_REVIEW': return 'Needs review';
    case 'FLAGGED': return 'Flagged for review';
    default: return tier;
  }
}

/**
 * Returns the Tailwind CSS classes for a confidence indicator badge
 * at the given tier.
 */
export function resolveConfidenceTierClasses(tier: ConfidenceTier): string {
  switch (tier) {
    case 'HIGH':
      return 'inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700';
    case 'NEEDS_REVIEW':
      return 'inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700';
    case 'FLAGGED':
      return 'inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700';
    default:
      return 'inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600';
  }
}

/**
 * Resolves the display value for a field's raw_value.
 * When the value is null or empty, returns the governance-safe null string.
 */
export function resolveFieldDisplayValue(
  rawValue: string | null,
  normalizedValue: string | null,
): { displayValue: string; isNull: boolean; showNormalized: boolean } {
  const isNull = rawValue === null || rawValue === '';
  if (isNull) {
    return { displayValue: 'Not found in document', isNull: true, showNormalized: false };
  }
  const showNormalized =
    normalizedValue !== null &&
    normalizedValue !== '' &&
    normalizedValue !== rawValue;
  return { displayValue: rawValue, isNull: false, showNormalized };
}

/**
 * Returns a human-readable label for a raw field_name.
 * Converts snake_case to Title Case.
 */
export function resolveFieldLabel(fieldName: string): string {
  return fieldName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Error classification ─────────────────────────────────────────────────────

export type ExtractionErrorType =
  | 'parse_error'
  | 'budget_exceeded'
  | 'service_unavailable'
  | 'unauthorized'
  | 'network';

function isErrorWithStatus(error: unknown, status: number): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status?: unknown }).status === status
  );
}

function isErrorWithCode(error: unknown, code: string): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

/**
 * Classifies a fetch error into a safe display category.
 * Must not expose internal stack traces, storage paths, or tenant IDs.
 */
export function classifyExtractionError(error: unknown): ExtractionErrorType {
  if (isErrorWithStatus(error, 422)) return 'parse_error';
  if (isErrorWithStatus(error, 429) || isErrorWithCode(error, 'BUDGET_EXCEEDED')) {
    return 'budget_exceeded';
  }
  if (isErrorWithStatus(error, 503)) return 'service_unavailable';
  if (isErrorWithStatus(error, 401) || isErrorWithStatus(error, 403)) return 'unauthorized';
  return 'network';
}

/**
 * Maps an extraction error type to a safe user-facing message.
 * Must NOT expose storage paths, tenant IDs, or provider errors.
 */
export function resolveExtractionErrorMessage(errorType: ExtractionErrorType): string {
  switch (errorType) {
    case 'parse_error':
      return 'The document could not be analysed. Please check the document content and try again.';
    case 'budget_exceeded':
      return 'AI usage limit reached for this month. Contact your administrator to increase limits.';
    case 'service_unavailable':
      return 'Document analysis is temporarily unavailable. Please try again shortly.';
    case 'unauthorized':
      return 'You do not have permission to analyse this document.';
    case 'network':
      return 'A network error occurred. Please check your connection and try again.';
    default:
      return 'Document analysis failed. Please try again.';
  }
}

// ─── Governance constant ──────────────────────────────────────────────────────

/**
 * Governance label — must appear on ALL rendered extraction result surfaces.
 * Hardcoded at client level. Never derived from API response.
 */
export const DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL =
  'AI-generated extraction \u00B7 Human review required before acting on any extracted data';

/**
 * Null field placeholder — used when raw_value is null or empty.
 */
export const NULL_FIELD_PLACEHOLDER = 'Not found in document';

// ─── Forbidden display terms ──────────────────────────────────────────────────

/**
 * These terms MUST NOT appear in any extraction display surface.
 * Documented here for test surface assertion.
 */
export const FORBIDDEN_DISPLAY_TERMS = [
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
] as const;

/**
 * These actions MUST NOT appear in K-4 — reserved for K-5.
 */
export const FORBIDDEN_K4_ACTIONS = [
  'approve',
  'reject',
  'review_submit',
  'status_transition',
  'lifecycle_mutation',
] as const;

// ─── API function ─────────────────────────────────────────────────────────────

interface TriggerExtractionApiResponse {
  success: boolean;
  data: ExtractionResponse;
}

/**
 * Triggers document extraction for the given document.
 *
 * Calls: POST /api/tenant/documents/:documentId/extract
 *
 * D-017-A: orgId is NEVER in the request body.
 * tenantPost enforces TENANT realm — will throw REALM_MISMATCH if realm is wrong.
 *
 * @param documentId  UUID of the document to extract
 * @param input       Extraction request body (documentText required)
 * @returns           Extraction response with draft + governance label
 * @throws            APIError with status code if the server rejects the request
 */
export async function triggerDocumentExtraction(
  documentId: string,
  input: TriggerExtractionInput,
): Promise<ExtractionResponse> {
  const response = await tenantPost<TriggerExtractionApiResponse>(
    `/api/tenant/documents/${documentId}/extract`,
    input,
  );
  return response.data;
}

// ─── Testing surface (source-descriptor tests) ────────────────────────────────

export const __DOCUMENT_INTELLIGENCE_SERVICE_TESTING__ = {
  resolveConfidenceTier,
  resolveConfidencePercent,
  resolveConfidenceTierLabel,
  resolveConfidenceTierClasses,
  resolveFieldDisplayValue,
  resolveFieldLabel,
  classifyExtractionError,
  resolveExtractionErrorMessage,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
  NULL_FIELD_PLACEHOLDER,
  FORBIDDEN_DISPLAY_TERMS,
  FORBIDDEN_K4_ACTIONS,
};
