/**
 * documentClassificationService.ts — Document Intelligence K-1: Classification Foundation
 *
 * Implements TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001, Slice K-1.
 *
 * Pure document type classification utility using keyword/metadata heuristics.
 * No AI inference provider call — K-1 establishes the classification foundation only.
 * AI-backed extraction is deferred to K-2 per the design.
 *
 * RULES:
 * - Pure functions — no IO, no DB calls, no provider calls.
 * - humanReviewRequired: true is a structural constant; cannot be overridden.
 * - price, publicationPosture, risk_score are constitutionally forbidden from all input paths.
 * - No lifecycle state mutation.
 * - No buyer-facing output.
 * - No cross-tenant analysis.
 * - org_id must be supplied by the caller from JWT context; never from document content.
 * - Classification is assistive only — output is draft/internal; never authoritative.
 *
 * Constitutional AI exclusions (TECS-AI-FOUNDATION-DATA-CONTRACTS-001):
 *   price                — forbidden
 *   publicationPosture   — forbidden
 *   risk_score           — forbidden
 *   buyer ranking        — forbidden
 *   payment/escrow       — forbidden
 *
 * @module documentClassificationService
 */

import { assertNoForbiddenAiFields } from './aiForbiddenData.js';

// ─── DocumentType ─────────────────────────────────────────────────────────────

/**
 * DocumentType — canonical document classification union for AI Document Intelligence MVP.
 * Source: TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 Design §I.1.
 */
export type DocumentType =
  | 'GOTS_CERTIFICATE'
  | 'OEKO_TEX_CERTIFICATE'
  | 'ISO_CERTIFICATE'
  | 'REACH_COMPLIANCE'
  | 'LAB_TEST_REPORT'
  | 'DECLARATION_OF_CONFORMITY'
  | 'INSPECTION_REPORT'
  | 'SUPPLIER_EVIDENCE'
  | 'UNKNOWN';

export const DOCUMENT_TYPES: ReadonlyArray<DocumentType> = [
  'GOTS_CERTIFICATE',
  'OEKO_TEX_CERTIFICATE',
  'ISO_CERTIFICATE',
  'REACH_COMPLIANCE',
  'LAB_TEST_REPORT',
  'DECLARATION_OF_CONFORMITY',
  'INSPECTION_REPORT',
  'SUPPLIER_EVIDENCE',
  'UNKNOWN',
] as const;

// ─── Governance Label ─────────────────────────────────────────────────────────

/**
 * Governance label — structural constant.
 * Must appear on every surface that renders AI document intelligence output.
 * Cannot be removed, hidden, or made conditional.
 * Source: TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 Design §D.1.
 */
export const DOCUMENT_INTELLIGENCE_GOVERNANCE_LABEL =
  'AI-generated extraction \u00B7 Human review required before acting on any extracted data' as const;

// ─── Input / Output Types ─────────────────────────────────────────────────────

/**
 * Input for document type classification.
 * All fields are optional — classifier degrades gracefully to UNKNOWN when no
 * classifiable signal is present.
 *
 * Constitutionally forbidden fields MUST NOT appear here:
 *   price, publicationPosture, risk_score, escrow, buyer ranking, payment decisions.
 */
export interface DocumentClassificationInput {
  /** Optional: document title or filename as provided by the uploader. */
  documentTitle?: string | null;
  /** Optional: MIME type of the document (e.g. 'application/pdf', 'image/jpeg'). */
  mimeType?: string | null;
  /** Optional: short text snippet from the document (≤ 1 000 chars recommended). */
  textSnippet?: string | null;
  /**
   * Optional: uploader-provided document type hint string.
   * Treated as an untrusted signal, not authoritative classification.
   */
  typeHint?: string | null;
}

/**
 * Result of document type classification.
 *
 * humanReviewRequired is ALWAYS true — structural constant that cannot be
 * overridden by the classification result or by any caller.
 */
export interface DocumentClassificationResult {
  /** Classified document type. UNKNOWN when classification is uncertain. */
  documentType: DocumentType;
  /** Confidence in [0, 1]. Reflects keyword signal strength. */
  confidence: number;
  /** Structural constant — always true. Cannot be set to false. */
  humanReviewRequired: true;
  /** Optional notes on classification rationale or missing signals. */
  notes?: string;
}

// ─── Classifier Rules ─────────────────────────────────────────────────────────

type ClassifierRule = {
  documentType: DocumentType;
  /** Lowercase keyword patterns. All comparisons are case-insensitive. */
  keywords: string[];
  /** Base confidence for 2+ keyword matches. Single-match scores at 70% of this. */
  baseConfidence: number;
};

const CLASSIFIER_RULES: ReadonlyArray<ClassifierRule> = [
  {
    documentType: 'GOTS_CERTIFICATE',
    keywords: [
      'gots',
      'global organic textile standard',
      'organic textile',
      'gots certificate',
      'gots certified',
      'organic textile standard',
    ],
    baseConfidence: 0.87,
  },
  {
    documentType: 'OEKO_TEX_CERTIFICATE',
    keywords: [
      'oeko-tex',
      'oeko tex',
      'oekotext',
      'oekotex',
      'oeko_tex',
      'standard 100',
      'made in green',
      'bluesign',
    ],
    baseConfidence: 0.87,
  },
  {
    documentType: 'ISO_CERTIFICATE',
    keywords: [
      'iso 9001',
      'iso 14001',
      'iso 45001',
      'iso 50001',
      'iso 13485',
      'iso certificate',
      'iso certified',
      'iso/iec',
      'international organization for standardization',
    ],
    baseConfidence: 0.85,
  },
  {
    documentType: 'REACH_COMPLIANCE',
    keywords: [
      'reach',
      'registration evaluation authorisation',
      'svhc',
      'substance of very high concern',
      'ec no.',
      'regulation (ec) no 1907',
      'chemicals compliance',
      'reach compliance',
    ],
    baseConfidence: 0.82,
  },
  {
    documentType: 'LAB_TEST_REPORT',
    keywords: [
      'lab test',
      'laboratory test',
      'test report',
      'testing report',
      'colorfastness',
      'colour fastness',
      'tensile strength',
      'gsm test',
      'shrinkage test',
      'azo dye',
      'ph test',
      'composition analysis',
      'pilling resistance',
      'dimensional stability',
      'test method',
      'testing results',
    ],
    baseConfidence: 0.82,
  },
  {
    documentType: 'DECLARATION_OF_CONFORMITY',
    keywords: [
      'declaration of conformity',
      'supplier declaration',
      'declaration of compliance',
      'we hereby declare',
      'we hereby certify',
      'conformity declaration',
      'eu declaration',
    ],
    baseConfidence: 0.80,
  },
  {
    documentType: 'INSPECTION_REPORT',
    keywords: [
      'inspection report',
      'factory inspection',
      'audit report',
      'quality inspection',
      'qc report',
      'final inspection',
      'pre-production inspection',
      'during production inspection',
      'initial production check',
      'factory audit',
    ],
    baseConfidence: 0.80,
  },
  {
    documentType: 'SUPPLIER_EVIDENCE',
    keywords: [
      'compliance evidence',
      'supporting document',
      'supplier evidence',
      'proof of compliance',
      'trade license',
      'business registration',
    ],
    baseConfidence: 0.60,
  },
];

// ─── Classification Core ──────────────────────────────────────────────────────

function countKeywordMatches(corpus: string, keywords: string[]): number {
  return keywords.filter(kw => corpus.includes(kw)).length;
}

/**
 * classifyDocumentType — pure document type classification from available metadata.
 *
 * Algorithm:
 *   1. Normalize all input fields to lowercase.
 *   2. For each classifier rule, count keyword matches in the combined corpus.
 *   3. Score: 2+ matches → baseConfidence; 1 match → baseConfidence × 0.70.
 *   4. Select highest-scoring type; return UNKNOWN if no rule matches.
 *
 * Guarantees:
 *   - humanReviewRequired: true is always present (structural constant).
 *   - Returns UNKNOWN gracefully when classification is not possible.
 *   - assertNoForbiddenAiFields guard applied to input object.
 *   - No IO, no DB calls, no AI provider calls.
 *
 * @param input - Optional document metadata signals for classification.
 * @returns DocumentClassificationResult with type, confidence, and humanReviewRequired: true.
 */
export function classifyDocumentType(
  input: DocumentClassificationInput,
): DocumentClassificationResult {
  // Constitutional guard: reject any object carrying forbidden AI field names.
  assertNoForbiddenAiFields(input);

  // Build normalized search corpus from available signals.
  const corpus = [
    input.documentTitle ?? '',
    input.textSnippet ?? '',
    input.typeHint ?? '',
    input.mimeType ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (!corpus.trim()) {
    return {
      documentType: 'UNKNOWN',
      confidence: 0.0,
      humanReviewRequired: true,
      notes: 'No document metadata provided; classification requires at least one input signal.',
    };
  }

  let bestType: DocumentType = 'UNKNOWN';
  let bestScore = 0;
  let bestMatchCount = 0;

  for (const rule of CLASSIFIER_RULES) {
    const matchCount = countKeywordMatches(corpus, rule.keywords);
    if (matchCount === 0) continue;

    const score = matchCount >= 2 ? rule.baseConfidence : rule.baseConfidence * 0.70;

    if (score > bestScore) {
      bestScore = score;
      bestType = rule.documentType;
      bestMatchCount = matchCount;
    }
  }

  if (bestType === 'UNKNOWN' || bestScore === 0) {
    return {
      documentType: 'UNKNOWN',
      confidence: 0.0,
      humanReviewRequired: true,
      notes: 'Document type could not be determined from available metadata signals.',
    };
  }

  return {
    documentType: bestType,
    confidence: Math.round(bestScore * 100) / 100,
    humanReviewRequired: true,
    notes: `Classified from document metadata (${bestMatchCount} keyword signal${bestMatchCount === 1 ? '' : 's'} matched).`,
  };
}
