/**
 * DocumentIntelligenceCard — Tenant Plane
 * TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 — K-4 Frontend Review Panel
 *
 * Supplier-internal only. Must NOT be rendered in:
 *   - Buyer catalog surfaces
 *   - Public surfaces
 *   - RFQ dialog
 *
 * Governance:
 *   - humanReviewRequired label: hardcoded, non-dismissible, never from API response
 *   - Governance label: DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL constant — never
 *     dynamically substituted
 *   - orgId: NEVER sent in request body (D-017-A)
 *   - humanReviewRequired: structural constant; cannot be false
 *   - status: always 'draft' on creation — K-5 scope for review submission
 *   - FORBIDDEN display: price, publicationPosture, risk_score, buyerRanking,
 *     supplierRanking, matchingScore, escrow, paymentDecision, creditScore
 *   - No approve/reject controls in K-4 (K-5 scope)
 *   - No DPP, buyer-facing, or public output
 *   - Error fallback must not expose stack traces, storage paths, or tenant IDs
 *
 * K-4 scope (only):
 *   ✅ Idle state with "Analyse Document" button
 *   ✅ Loading state
 *   ✅ Error fallback with safe message
 *   ✅ Extraction review panel with extracted fields
 *   ✅ Governance label
 *   ✅ Field-level confidence indicators
 *   ✅ Flagged field visual treatment
 *   ✅ Null field handling ("Not found in document")
 *   ✅ Re-run trigger (returns to idle)
 *   ❌ Approve/reject controls — K-5 scope
 *   ❌ Review submission — K-5 scope
 *   ❌ Status mutation — K-5 scope
 *   ❌ Certification lifecycle — constitutionally forbidden
 *   ❌ DPP/buyer-facing/public output
 */

import React, { useState, useCallback } from 'react';
import {
  triggerDocumentExtraction,
  classifyExtractionError,
  resolveExtractionErrorMessage,
  resolveConfidenceTier,
  resolveConfidencePercent,
  resolveConfidenceTierLabel,
  resolveConfidenceTierClasses,
  resolveFieldDisplayValue,
  resolveFieldLabel,
  DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL,
  NULL_FIELD_PLACEHOLDER,
  type ExtractionDraft,
  type ExtractedField,
  type ExtractionErrorType,
} from '../../services/documentIntelligenceService';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** UUID of the document to extract. Required. */
  documentId: string;
  /**
   * Full text content of the document to send to extraction API.
   * This is the document text — NOT a file path or storage URL.
   */
  documentText: string;
  /** Optional human-readable title for contextual display. */
  documentTitle?: string;
  /** Optional document type hint (e.g. 'GOTS_CERTIFICATE'). */
  documentType?: string;
}

// ─── Card state machine ───────────────────────────────────────────────────────

type CardStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface CardState {
  status: CardStatus;
  draft: ExtractionDraft | null;
  errorType: ExtractionErrorType | null;
}

// ─── Pure helpers — exported via testing surface ──────────────────────────────

/** Returns the display label for a document type code. */
export function resolveDocumentTypeLabel(documentType: string): string {
  const LABELS: Record<string, string> = {
    GOTS_CERTIFICATE: 'GOTS Certificate',
    OEKO_TEX_CERTIFICATE: 'OEKO-TEX Certificate',
    ISO_9001_CERTIFICATE: 'ISO 9001 Certificate',
    REACH_COMPLIANCE: 'REACH Compliance',
    BCI_CERTIFICATE: 'BCI Certificate',
    BLUESIGN_CERTIFICATE: 'Bluesign Certificate',
    FAIR_TRADE_CERTIFICATE: 'Fair Trade Certificate',
    RECYCLED_CLAIM_STANDARD: 'Recycled Claim Standard',
    MATERIAL_TEST_REPORT: 'Material Test Report',
    INSPECTION_REPORT: 'Inspection Report',
    UNKNOWN: 'Unknown Document Type',
  };
  return LABELS[documentType] ?? documentType;
}

/** Returns the overall confidence display percentage for a draft. */
export function resolveOverallConfidenceDisplay(overallConfidence: number): string {
  return resolveConfidencePercent(overallConfidence);
}

/** Returns true if the draft has any flagged fields. */
export function hasFlaggedFields(extractedFields: ExtractedField[]): boolean {
  return extractedFields.some((f) => f.flagged_for_review);
}

/** Returns the count of flagged fields in a draft. */
export function countFlaggedFields(extractedFields: ExtractedField[]): number {
  return extractedFields.filter((f) => f.flagged_for_review).length;
}

/** Returns true if the raw value is null or empty. */
export function isNullField(rawValue: string | null): boolean {
  return rawValue === null || rawValue === '';
}

// ─── Testing surface ──────────────────────────────────────────────────────────

export const __DOCUMENT_INTELLIGENCE_CARD_TESTING__ = {
  resolveDocumentTypeLabel,
  resolveOverallConfidenceDisplay,
  hasFlaggedFields,
  countFlaggedFields,
  isNullField,
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
  SAFE_FALLBACK_MESSAGE: 'Document analysis failed. Please try again or contact support if the issue persists.',
};

// ─── Private constants ────────────────────────────────────────────────────────

const SAFE_FALLBACK_MESSAGE =
  'Document analysis failed. Please try again or contact support if the issue persists.';

// ─── Sub-components ───────────────────────────────────────────────────────────

const ConfidenceBadge: React.FC<{
  confidence: number;
  fieldName: string;
}> = ({ confidence, fieldName }) => {
  const tier = resolveConfidenceTier(confidence);
  const label = resolveConfidenceTierLabel(tier);
  const pct = resolveConfidencePercent(confidence);
  const classes = resolveConfidenceTierClasses(tier);

  return (
    <span
      className={classes}
      aria-label={label}
      data-testid={`extraction-confidence-indicator-${fieldName}`}
    >
      {pct}
    </span>
  );
};

const FlaggedBadge: React.FC<{ fieldName: string }> = ({ fieldName }) => (
  <span
    className="inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700"
    aria-label="Flagged for review"
    data-testid={`extraction-flagged-${fieldName}`}
  >
    Flagged
  </span>
);

const FieldRow: React.FC<{
  field: ExtractedField;
}> = ({ field }) => {
  const { displayValue, isNull, showNormalized } = resolveFieldDisplayValue(
    field.raw_value,
    field.normalized_value,
  );
  const label = resolveFieldLabel(field.field_name);

  return (
    <div
      className={`p-3 rounded-lg border ${field.flagged_for_review ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'}`}
      data-testid={`extraction-field-${field.field_name}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <ConfidenceBadge confidence={field.confidence} fieldName={field.field_name} />
          {field.flagged_for_review && <FlaggedBadge fieldName={field.field_name} />}
        </div>
      </div>

      {isNull ? (
        <p className="mt-1.5 text-sm italic text-slate-400">{NULL_FIELD_PLACEHOLDER}</p>
      ) : (
        <div className="mt-1.5">
          <p className="text-sm text-slate-800">{displayValue}</p>
          {showNormalized && (
            <p className="mt-0.5 text-xs text-slate-500">
              Normalised: <span className="font-medium">{field.normalized_value}</span>
            </p>
          )}
          {field.source_region && (
            <p className="mt-0.5 text-xs text-slate-400">
              Source region: {field.source_region}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const GovernanceLabel: React.FC = () => (
  <div
    className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5"
    data-testid="extraction-governance-label"
    role="note"
    aria-label="AI governance notice"
  >
    <span className="text-amber-600 mt-0.5 shrink-0" aria-hidden="true">
      ⚠
    </span>
    <p className="text-xs font-medium text-amber-800 leading-relaxed">
      {DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL}
    </p>
  </div>
);

// ─── Loading state sub-component ──────────────────────────────────────────────

const ExtractionLoadingIndicator: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center py-10 gap-3"
    data-testid="extraction-loading-indicator"
    role="status"
    aria-live="polite"
    aria-label="Analysing document"
  >
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    <p className="text-sm text-slate-500">Analysing document…</p>
  </div>
);

// ─── Error fallback sub-component ─────────────────────────────────────────────

const ExtractionErrorFallback: React.FC<{
  errorType: ExtractionErrorType;
  onRetry: () => void;
}> = ({ errorType, onRetry }) => {
  const message = resolveExtractionErrorMessage(errorType);
  const canRetry = errorType !== 'unauthorized';

  return (
    <div
      className="rounded-xl border border-rose-200 bg-rose-50 p-5"
      data-testid="extraction-error-fallback"
      role="alert"
    >
      <p className="text-sm font-semibold text-rose-800 mb-1">Analysis failed</p>
      <p className="text-sm text-rose-700 mb-3">{message}</p>
      {canRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900 transition-colors"
          aria-label="Retry document analysis"
        >
          Try again
        </button>
      )}
    </div>
  );
};

// ─── Extraction review panel ──────────────────────────────────────────────────

const ExtractionReviewPanel: React.FC<{
  draft: ExtractionDraft;
  documentTitle?: string;
  onRerun: () => void;
}> = ({ draft, documentTitle, onRerun }) => {
  const flaggedCount = countFlaggedFields(draft.extractedFields);
  const typeLabel = resolveDocumentTypeLabel(draft.documentType);
  const overallPct = resolveOverallConfidenceDisplay(draft.overallConfidence);
  const overallTier = resolveConfidenceTier(draft.overallConfidence);
  const overallTierLabel = resolveConfidenceTierLabel(overallTier);
  const overallClasses = resolveConfidenceTierClasses(overallTier);

  return (
    <div
      className="space-y-4"
      data-testid="document-extraction-review-panel"
    >
      {/* Governance label — always first, always visible */}
      <GovernanceLabel />

      {/* Draft header */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
              Document Type
            </p>
            <p className="text-sm font-semibold text-slate-800">{typeLabel}</p>
            {documentTitle && (
              <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">{documentTitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Overall Confidence
            </p>
            <span className={overallClasses} aria-label={overallTierLabel}>
              {overallPct}
            </span>
          </div>
        </div>

        {flaggedCount > 0 && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs font-semibold text-red-700">
              {flaggedCount} field{flaggedCount > 1 ? 's' : ''} flagged for human review
            </p>
          </div>
        )}

        {draft.extractionNotes && (
          <div className="mt-3 rounded-md bg-sky-50 border border-sky-200 px-3 py-2">
            <p className="text-xs text-sky-700">{draft.extractionNotes}</p>
          </div>
        )}
      </div>

      {/* Extracted fields list */}
      {draft.extractedFields.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-0.5">
            Extracted Fields ({draft.extractedFields.length})
          </p>
          {draft.extractedFields.map((field) => (
            <FieldRow key={field.field_name} field={field} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-500 italic">No fields extracted from this document.</p>
        </div>
      )}

      {/* Re-run trigger */}
      <div className="pt-1 border-t border-slate-100 flex justify-end">
        <button
          onClick={onRerun}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-700 underline underline-offset-2 transition-colors"
          aria-label="Re-run document analysis"
        >
          Re-analyse document
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const DocumentIntelligenceCard: React.FC<Props> = ({
  documentId,
  documentText,
  documentTitle,
  documentType,
}) => {
  const [state, setState] = useState<CardState>({
    status: 'idle',
    draft: null,
    errorType: null,
  });

  const handleAnalyse = useCallback(async () => {
    setState({ status: 'loading', draft: null, errorType: null });
    try {
      const response = await triggerDocumentExtraction(documentId, {
        documentText,
        documentTitle,
        documentType,
      });
      setState({ status: 'loaded', draft: response.draft, errorType: null });
    } catch (err) {
      const errorType = classifyExtractionError(err);
      setState({ status: 'error', draft: null, errorType });
    }
  }, [documentId, documentText, documentTitle, documentType]);

  const handleRerun = useCallback(() => {
    setState({ status: 'idle', draft: null, errorType: null });
  }, []);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5"
      data-testid="document-intelligence-card"
      data-surface="supplier-internal"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Document Intelligence</h3>
          <p className="text-xs text-slate-500 mt-0.5">AI-assisted field extraction</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">
          Supplier Internal
        </span>
      </div>

      {/* State surfaces */}

      {state.status === 'idle' && (
        <div className="flex flex-col items-center py-8 gap-3">
          <p className="text-sm text-slate-500 text-center max-w-xs">
            Extract structured fields from this document using AI.
            Results require human review before any action is taken.
          </p>
          <button
            onClick={handleAnalyse}
            className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
            data-testid="analyse-document-button"
            aria-label="Analyse document with AI extraction"
          >
            Analyse Document
          </button>
        </div>
      )}

      {state.status === 'loading' && <ExtractionLoadingIndicator />}

      {state.status === 'error' && state.errorType && (
        <ExtractionErrorFallback
          errorType={state.errorType}
          onRetry={handleAnalyse}
        />
      )}

      {state.status === 'loaded' && state.draft && (
        <ExtractionReviewPanel
          draft={state.draft}
          documentTitle={documentTitle}
          onRerun={handleRerun}
        />
      )}
    </div>
  );
};

export default DocumentIntelligenceCard;
