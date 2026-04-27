/**
 * TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 — Supplier Profile Completeness Card
 *
 * Supplier-internal only. Must NOT be rendered in:
 *   - Buyer catalog surfaces
 *   - RFQ dialog
 *   - Public surfaces
 *
 * Governance:
 *   - humanReviewRequired label: hardcoded, never from API response
 *   - "Supplier-internal only" label: hardcoded, non-dismissible
 *   - Overall score: Math.round(overallCompleteness * 100) + '%'
 *   - RFQ Responsiveness (MVP): shown as informational placeholder
 *   - FORBIDDEN display: price, publicationPosture, risk_score, supplier ranking,
 *     buyer-facing score
 */

import React, { useState } from 'react';
import {
  analyseSupplierProfileCompleteness,
  type SupplierProfileCompletenessResponse,
  type SupplierProfileCompletenessCategoryScores,
  type SupplierProfileCompletenessMissingField,
  type SupplierProfileCompletenessImprovementAction,
  type SupplierProfileCompletenessTrustWarning,
} from '../../services/catalogService';

// Re-export types for test imports
export type {
  SupplierProfileCompletenessResponse,
  SupplierProfileCompletenessCategoryScores,
  SupplierProfileCompletenessMissingField,
  SupplierProfileCompletenessImprovementAction,
  SupplierProfileCompletenessTrustWarning,
};

// ---------------------------------------------------------------------------
// Category display labels (supplier-internal, governance-locked order)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<keyof SupplierProfileCompletenessCategoryScores, string> = {
  profileIdentity: 'Profile Identity',
  businessCapability: 'Business Capability',
  catalogCoverage: 'Catalog Coverage',
  catalogAttributeQuality: 'Catalog Attribute Quality',
  stageTaxonomy: 'Stage Taxonomy',
  certificationsDocuments: 'Certifications & Documents',
  rfqResponsiveness: 'RFQ Responsiveness',
  serviceCapabilityClarity: 'Service Capability Clarity',
  aiReadiness: 'AI Readiness',
  buyerDiscoverability: 'Buyer Discoverability',
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as Array<keyof SupplierProfileCompletenessCategoryScores>;

// ---------------------------------------------------------------------------
// Internal state type
// ---------------------------------------------------------------------------

type CompletenessStatus = 'idle' | 'loading' | 'loaded' | 'error';
type ErrorType = 'parse_error' | 'rate_limit' | 'network' | null;

interface CardState {
  status: CompletenessStatus;
  response: SupplierProfileCompletenessResponse | null;
  errorType: ErrorType;
}

// ---------------------------------------------------------------------------
// Helpers — pure, exported for testing
// ---------------------------------------------------------------------------

/** Resolves the user-facing overall completeness percentage string. */
export function resolveOverallScoreDisplay(overallCompleteness: number): string {
  return `${Math.round(overallCompleteness * 100)}%`;
}

/** Resolves the score bar width (clamped 0–100%). */
export function resolveCategoryScoreBarWidth(score: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return `${pct}%`;
}

/** Maps trust warning severity to display class key. */
export function resolveSeverityLabel(severity: SupplierProfileCompletenessTrustWarning['severity']): string {
  switch (severity) {
    case 'CRITICAL': return 'Critical';
    case 'WARNING': return 'Warning';
    case 'INFO': return 'Info';
    default: return severity;
  }
}

/** Resolves priority display label. */
export function resolvePriorityLabel(priority: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  switch (priority) {
    case 'HIGH': return 'High';
    case 'MEDIUM': return 'Medium';
    case 'LOW': return 'Low';
    default: return priority;
  }
}

/** Determines whether an HTTP error is rate-limit class (status 429). */
export function isRateLimitError(error: unknown): boolean {
  if (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status?: unknown }).status === 429
  ) {
    return true;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'RATE_LIMIT_EXCEEDED'
  ) {
    return true;
  }
  return false;
}

/** Determines whether an HTTP error is a parse-error class (status 422). */
export function isParseError(error: unknown): boolean {
  if (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    (error as { status?: unknown }).status === 422
  ) {
    return true;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'PARSE_ERROR'
  ) {
    return true;
  }
  return false;
}

/** Classifies an error into the internal error type. */
export function classifyCompletenessError(error: unknown): ErrorType {
  if (isRateLimitError(error)) return 'rate_limit';
  if (isParseError(error)) return 'parse_error';
  return 'network';
}

// Export testing surface
export const __AI_SUPPLIER_PROFILE_COMPLETENESS_CARD_TESTING__ = {
  resolveOverallScoreDisplay,
  resolveCategoryScoreBarWidth,
  resolveSeverityLabel,
  resolvePriorityLabel,
  isRateLimitError,
  isParseError,
  classifyCompletenessError,
  CATEGORY_LABELS,
  CATEGORY_KEYS,
};

// ---------------------------------------------------------------------------
// Safe fallback message (used for any error state)
// ---------------------------------------------------------------------------

const SAFE_FALLBACK_MESSAGE =
  'AI profile analysis is unavailable right now. You can still update your profile manually.';

const HUMAN_REVIEW_LABEL =
  'AI-generated analysis · Human review required before acting on any suggestion';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SeverityBadge: React.FC<{ severity: SupplierProfileCompletenessTrustWarning['severity'] }> = ({ severity }) => {
  const label = resolveSeverityLabel(severity);
  const className =
    severity === 'CRITICAL'
      ? 'inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700'
      : severity === 'WARNING'
      ? 'inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700'
      : 'inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700';
  return <span className={className}>{label}</span>;
};

const PriorityBadge: React.FC<{ priority: 'HIGH' | 'MEDIUM' | 'LOW' }> = ({ priority }) => {
  const label = resolvePriorityLabel(priority);
  const className =
    priority === 'HIGH'
      ? 'inline-flex items-center rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-700'
      : priority === 'MEDIUM'
      ? 'inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700'
      : 'inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600';
  return <span className={className}>{label}</span>;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const SupplierProfileCompletenessCard: React.FC = () => {
  const [state, setState] = useState<CardState>({
    status: 'idle',
    response: null,
    errorType: null,
  });

  const handleAnalyse = async () => {
    setState({ status: 'loading', response: null, errorType: null });
    try {
      const response = await analyseSupplierProfileCompleteness();
      setState({ status: 'loaded', response, errorType: null });
    } catch (error) {
      setState({
        status: 'error',
        response: null,
        errorType: classifyCompletenessError(error),
      });
    }
  };

  return (
    <section
      data-testid="supplier-profile-completeness-card"
      data-surface="supplier-internal"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            AI Profile Analysis
          </div>
          {/* Supplier-internal label — hardcoded, non-dismissible */}
          <span
            data-testid="supplier-internal-label"
            className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700"
          >
            Supplier-internal only
          </span>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">AI Profile Analysis</h2>
        {/* Governance label — hardcoded, never from API response */}
        <p
          data-testid="human-review-label"
          className="text-xs text-slate-500"
        >
          {HUMAN_REVIEW_LABEL}
        </p>
      </div>

      {/* Analyse button */}
      {(state.status === 'idle' || state.status === 'error') && (
        <div className="mt-4">
          <button
            type="button"
            data-testid="analyse-profile-button"
            onClick={() => { void handleAnalyse(); }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
          >
            Analyse My Profile
          </button>
        </div>
      )}

      {/* Loading state */}
      {state.status === 'loading' && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span
            data-testid="completeness-loading-indicator"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
            aria-label="Analysing profile"
          />
          Analysing your profile…
        </div>
      )}

      {/* Error state — safe fallback, no technical details exposed */}
      {state.status === 'error' && (
        <div
          data-testid="completeness-error-fallback"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {SAFE_FALLBACK_MESSAGE}
        </div>
      )}

      {/* Loaded state */}
      {state.status === 'loaded' && state.response !== null && (() => {
        const { report } = state.response;

        return (
          <div className="mt-5 space-y-6" data-testid="completeness-report">

            {/* Overall score */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
              <div
                data-testid="overall-score-display"
                className="text-4xl font-bold text-indigo-700"
              >
                {resolveOverallScoreDisplay(report.overallCompleteness)}
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-800">Overall Profile Completeness</div>
                <div className="text-xs text-slate-500">{HUMAN_REVIEW_LABEL}</div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="space-y-3" data-testid="category-breakdown">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Category Scores
              </div>
              <div className="space-y-2">
                {CATEGORY_KEYS.map(key => {
                  const score = report.categoryScores[key];
                  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
                  const isPlaceholder = key === 'rfqResponsiveness';

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span
                          data-testid={`category-label-${key}`}
                          className="font-medium text-slate-700"
                        >
                          {CATEGORY_LABELS[key]}
                          {isPlaceholder && (
                            <span className="ml-2 text-[10px] font-normal text-slate-400 normal-case tracking-normal">
                              (placeholder — live data in future)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: resolveCategoryScoreBarWidth(score) }}
                          aria-label={`${CATEGORY_LABELS[key]}: ${pct}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Missing field checklist */}
            {report.missingFields.length > 0 && (
              <div className="space-y-3" data-testid="missing-fields-section">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Missing Fields
                </div>
                <ul className="space-y-2">
                  {report.missingFields.map((item, idx) => (
                    <li
                      key={idx}
                      data-testid="missing-field-item"
                      className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
                    >
                      <PriorityBadge priority={item.priority} />
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800">{item.field}</span>
                        <span className="mx-1 text-slate-400">·</span>
                        <span className="text-slate-500">{item.category}</span>
                        {item.note && (
                          <div className="mt-0.5 text-xs text-slate-400">{item.note}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvement actions */}
            {report.improvementActions.length > 0 && (
              <div className="space-y-3" data-testid="improvement-actions-section">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Improvement Actions
                </div>
                <ul className="space-y-2">
                  {report.improvementActions.map((item, idx) => (
                    <li
                      key={idx}
                      data-testid="improvement-action-item"
                      className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
                    >
                      <PriorityBadge priority={item.priority} />
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800">{item.action}</span>
                        <span className="mx-1 text-slate-400">·</span>
                        <span className="text-slate-500">{item.category}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trust signal warnings */}
            {report.trustSignalWarnings.length > 0 && (
              <div className="space-y-3" data-testid="trust-warnings-section">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Trust Signal Warnings
                </div>
                <ul className="space-y-2">
                  {report.trustSignalWarnings.map((item, idx) => (
                    <li
                      key={idx}
                      data-testid="trust-warning-item"
                      className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-4 py-2.5 text-sm shadow-sm"
                    >
                      <SeverityBadge severity={item.severity} />
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800">{item.warning}</span>
                        {item.affectedCategory && (
                          <span className="ml-2 text-xs text-slate-400">
                            {item.affectedCategory}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reasoning summary */}
            {report.reasoningSummary && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Reasoning Summary
                </div>
                {report.reasoningSummary}
              </div>
            )}

            {/* Re-analyse button */}
            <div>
              <button
                type="button"
                data-testid="analyse-profile-button"
                onClick={() => { void handleAnalyse(); }}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                Analyse My Profile
              </button>
            </div>
          </div>
        );
      })()}
    </section>
  );
};
