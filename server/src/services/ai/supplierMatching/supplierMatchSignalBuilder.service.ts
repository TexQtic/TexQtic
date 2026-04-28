/**
 * supplierMatchSignalBuilder.service.ts — Safe Supplier Match Signal Builder
 *
 * Extracts constitutionally safe matching signals from trusted server-side inputs.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice A.
 *
 * Constitutional guarantees:
 * - PURE FUNCTION: No DB calls, no AI model calls, no embeddings, no IO of any kind.
 * - SAFE SIGNALS ONLY: Every returned signal has `isSafe: true`.
 * - FORBIDDEN FIELDS STRIPPED: price, publicationPosture, risk_score, and all
 *   forbidden variants are actively excluded at input-field level and at signal
 *   assembly time via stripForbiddenSignalInputFields().
 * - NEVER THROWS: Malformed or missing optional inputs are skipped silently.
 * - DETERMINISTIC: Same inputs always produce the same ordered signal set.
 * - DEDUPLICATION: Signals with identical (signalType, value, sourceEntity)
 *   are collapsed to a single entry.
 * - LENGTH-BOUNDED: All text values are trimmed and capped at SIGNAL_VALUE_MAX_LENGTH.
 *
 * Deterministic signal type ordering (per design §Slice A):
 *   RFQ_INTENT → CATALOG_STAGE → PRODUCT_CATEGORY → MATERIAL → FABRIC_TYPE →
 *   COMPOSITION → GSM → CERTIFICATION → GEOGRAPHY → MOQ →
 *   RELATIONSHIP_APPROVED → SUPPLIER_CAPABILITY → PRICE_DISCLOSURE_METADATA →
 *   DPP_PUBLISHED
 *
 * FORBIDDEN IMPORTS — NEVER add these to this file:
 * - inferenceService  (no AI model calls in this layer)
 * - vectorEmbeddingClient  (no embeddings; this is the signal layer, not the vector layer)
 * - DocumentEmbedding, ReasoningLog, AiUsageMeter  (no AI storage types)
 * - Any AI provider SDK: gemini, openai, anthropic, google-generativeai, etc.
 *
 * @module supplierMatchSignalBuilder.service
 */

import type {
  SupplierMatchSignal,
  SupplierMatchSignalType,
  SupplierMatchSourceEntity,
} from './supplierMatch.types.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum character length for any signal value string after trimming. */
export const SIGNAL_VALUE_MAX_LENGTH = 500 as const;

/**
 * Canonical signal type ordering for deterministic output.
 * Lower index = earlier in the output array.
 */
const SIGNAL_TYPE_ORDER: readonly SupplierMatchSignalType[] = [
  'RFQ_INTENT',
  'CATALOG_STAGE',
  'PRODUCT_CATEGORY',
  'MATERIAL',
  'FABRIC_TYPE',
  'COMPOSITION',
  'GSM',
  'CERTIFICATION',
  'GEOGRAPHY',
  'MOQ',
  'RELATIONSHIP_APPROVED',
  'SUPPLIER_CAPABILITY',
  'PRICE_DISCLOSURE_METADATA',
  'DPP_PUBLISHED',
] as const;

/**
 * Forbidden field names that MUST be excluded from any signal input.
 * These are checked at runtime as a defense-in-depth layer on top of
 * the typed safe-input interfaces (which already exclude these fields at
 * compile time). Both layers must hold.
 *
 * Covers: monetary fields, pricing policy fields, publication posture,
 * risk scoring, relationship/allowlist graph metadata, AI scoring,
 * audit metadata, auth credentials, escrow data, and PII.
 */
const FORBIDDEN_INPUT_FIELDS: ReadonlySet<string> = new Set<string>([
  // Monetary / pricing
  'price',
  'amount',
  'unitPrice',
  'basePrice',
  'listPrice',
  'costPrice',
  'supplierPrice',
  'negotiatedPrice',
  'internalMargin',
  'margin',
  'grossAmount',
  'commercialTerms',
  // Pricing policy / publication posture
  'price_disclosure_policy_mode',
  'supplierPolicy',
  'supplierDisclosurePolicy',
  'publicationPosture',
  // Risk / scoring
  'riskScore',
  'risk_score',
  'buyerScore',
  'supplierScore',
  'aiMatchingScore',
  'confidenceScore',
  // Relationship / allowlist internal metadata
  'blockedReason',
  'rejectedReason',
  'auditMetadata',
  'privateNotes',
  'allowlistGraph',
  'relationshipGraph',
  // AI draft / unpublished evidence
  'aiDraftData',
  'unpublishedEvidence',
  // Escrow / payment / credit
  'escrow',
  'escrowAccount',
  'escrowAccounts',
  'escrowTransaction',
  'escrowTransactions',
  'paymentTerms',
  'creditLimit',
  // PII / auth credentials
  'email',
  'phone',
  'password',
  'refreshToken',
  'passwordResetToken',
  'token',
  'secret',
]);

// ─── Safe Input Types ─────────────────────────────────────────────────────────

/**
 * AI-safe catalog item input.
 *
 * Only fields constitutionally permitted in AI paths are present.
 * Must be assembled server-side from Prisma query results using explicit field
 * selection — never passed from raw request body.
 *
 * Excluded (type-level + runtime-stripped):
 * - price / publicationPosture — constitutionally forbidden from all AI paths
 * - risk_score — control-plane only; tenant AI hard boundary
 */
export interface SafeCatalogItemInput {
  itemId?: string;
  supplierOrgId?: string;
  catalogStage?: string;
  productCategory?: string;
  material?: string;
  fabricType?: string;
  composition?: string;
  gsm?: number;
  certifications?: string[];
  moq?: number;
  // price: EXCLUDED — constitutionally forbidden
  // publicationPosture: EXCLUDED — constitutionally forbidden
  // risk_score: EXCLUDED — control-plane only
}

/**
 * AI-safe supplier org profile input.
 *
 * Excluded:
 * - risk_score — control-plane only; tenant AI hard boundary
 * - publicationPosture — constitutionally forbidden from all AI paths
 * - is_white_label — platform config; not AI context
 * - plan — commercial tier; not AI context
 */
export interface SafeSupplierOrgProfileInput {
  orgId?: string;
  jurisdiction?: string;
  primarySegmentKey?: string;
  secondarySegmentKeys?: string[];
  rolePositionKeys?: string[];
  // risk_score: EXCLUDED — constitutionally forbidden
  // publicationPosture: EXCLUDED — constitutionally forbidden
  // is_white_label: EXCLUDED — platform config
  // plan: EXCLUDED — commercial tier
}

/**
 * AI-safe RFQ context input.
 *
 * Sourced from a buyer-owned, server-validated RFQ record.
 * Caller must verify rfq.buyerOrgId === buyerOrgId before passing.
 */
export interface SafeRfqContextInput {
  rfqId?: string;
  /** Caller must verify rfq.buyerOrgId === buyerOrgId before passing. */
  buyerOrgId?: string;
  productCategory?: string;
  material?: string;
  moqRequirement?: number;
  geographyPreference?: string;
  /** Buyer intent free-text (length-bounded at signal emit). */
  buyerMessage?: string;
  // price: EXCLUDED — never from RFQ; constitutionally forbidden
}

/**
 * AI-safe relationship context input.
 *
 * Only APPROVED state produces a signal. BLOCKED / SUSPENDED / REJECTED
 * states do NOT produce signals from the builder — they are handled
 * exclusively by the policy filter (Slice B).
 *
 * Excluded:
 * - blockedReason / rejectedReason — internal; never buyer-facing
 * - auditMetadata — internal
 * - allowlistGraph / relationshipGraph — internal graph metadata
 */
export interface SafeRelationshipContextInput {
  /** Supplier org ID (opaque reference). */
  supplierOrgId?: string;
  /** Server-resolved relationship state (never from request body). */
  state?: string;
  // blockedReason: EXCLUDED — internal; never buyer-facing
  // rejectedReason: EXCLUDED — internal; never buyer-facing
  // auditMetadata: EXCLUDED — internal
  // allowlistGraph: EXCLUDED — internal graph metadata
}

/**
 * AI-safe price disclosure metadata input.
 *
 * NOTE: This signals THAT a price disclosure policy is configured (mode label),
 * NOT WHAT the price value is. The price value is constitutionally forbidden
 * from all AI paths.
 *
 * Excluded:
 * - price / unitPrice / basePrice / any monetary value — constitutionally forbidden
 */
export interface SafePriceDisclosureContextInput {
  supplierOrgId?: string;
  /** Disclosure mode label — e.g., "RELATIONSHIP_ONLY", "VISIBLE", "HIDDEN". */
  disclosureMode?: string;
  // price: EXCLUDED — constitutionally forbidden from ALL AI paths
  // unitPrice: EXCLUDED
  // basePrice: EXCLUDED
  // negotiatedPrice: EXCLUDED
}

/**
 * AI-safe published DPP context input.
 *
 * Only published DPP records produce signals. The isPublished flag is the
 * safety gate — the builder NEVER signals an unpublished DPP.
 *
 * Excluded:
 * - unpublishedEvidence — unpublished content must never enter AI path
 * - aiDraftData — AI extraction data must not feed back into signal building
 */
export interface SafePublishedDppContextInput {
  dppId?: string;
  supplierOrgId?: string;
  /**
   * True only if the DPP record is in published state (server-validated).
   * Signal is suppressed if isPublished !== true.
   */
  isPublished?: boolean;
  /** Published DPP reference identifier (opaque). */
  publishedRef?: string;
  // unpublishedEvidence: EXCLUDED — never enters AI path
  // aiDraftData: EXCLUDED — AI extraction data must not feed back into signals
}

// ─── Builder Input ────────────────────────────────────────────────────────────

/**
 * Complete trusted input bundle for the signal builder.
 *
 * ALL fields must be assembled server-side from validated, trusted sources.
 * No field may originate from the raw HTTP request body without explicit
 * server-side validation and field selection.
 */
export interface SupplierMatchSignalBuilderInput {
  /** JWT-derived buyer org ID. Never from request body. */
  buyerOrgId: string;
  /** Catalog items from server-side Prisma query (AI-safe fields only). */
  catalogItems?: SafeCatalogItemInput[];
  /** Supplier org profiles from server-side Prisma query (AI-safe fields only). */
  supplierOrgProfiles?: SafeSupplierOrgProfileInput[];
  /** Buyer-owned, server-validated RFQ context. */
  rfqContext?: SafeRfqContextInput;
  /** Server-resolved relationship contexts (multiple suppliers). */
  relationshipContexts?: SafeRelationshipContextInput[];
  /** Server-validated price disclosure metadata (mode label only; never price value). */
  priceDisclosureContexts?: SafePriceDisclosureContextInput[];
  /** Server-validated published DPP contexts. */
  publishedDppContexts?: SafePublishedDppContextInput[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Trim and length-bound a signal value string.
 * Returns null if the value is not a non-empty string after trimming.
 */
function sanitizeSignalValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, SIGNAL_VALUE_MAX_LENGTH);
}

/** Construct a safe signal. isSafe is always `true`. */
function makeSignal(
  signalType: SupplierMatchSignalType,
  value: string,
  sourceEntity: SupplierMatchSourceEntity,
  sourceId?: string,
): SupplierMatchSignal {
  const signal: SupplierMatchSignal = {
    signalType,
    value,
    sourceEntity,
    isSafe: true,
  };
  if (sourceId !== undefined) {
    signal.sourceId = sourceId;
  }
  return signal;
}

/** Build the deduplication key: `signalType|sourceEntity|value`. */
function deduplicationKey(signal: SupplierMatchSignal): string {
  return `${signal.signalType}|${signal.sourceEntity}|${signal.value}`;
}

/**
 * Sort signals by canonical signal type order, then by value for
 * deterministic stability within the same signal type.
 */
function sortSignals(signals: SupplierMatchSignal[]): SupplierMatchSignal[] {
  return [...signals].sort((a, b) => {
    const aIdx = SIGNAL_TYPE_ORDER.indexOf(a.signalType);
    const bIdx = SIGNAL_TYPE_ORDER.indexOf(b.signalType);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.value.localeCompare(b.value);
  });
}

// ─── Section extractors ───────────────────────────────────────────────────────

/** Extract signals from a single catalog item input. */
function extractCatalogItemSignals(item: SafeCatalogItemInput): SupplierMatchSignal[] {
  const signals: SupplierMatchSignal[] = [];
  const sourceId = typeof item.itemId === 'string' ? item.itemId : undefined;

  const catalogStage = sanitizeSignalValue(item.catalogStage);
  if (catalogStage !== null) {
    signals.push(makeSignal('CATALOG_STAGE', catalogStage, 'CATALOG_ITEM', sourceId));
  }

  const productCategory = sanitizeSignalValue(item.productCategory);
  if (productCategory !== null) {
    signals.push(makeSignal('PRODUCT_CATEGORY', productCategory, 'CATALOG_ITEM', sourceId));
  }

  const material = sanitizeSignalValue(item.material);
  if (material !== null) {
    signals.push(makeSignal('MATERIAL', material, 'CATALOG_ITEM', sourceId));
  }

  const fabricType = sanitizeSignalValue(item.fabricType);
  if (fabricType !== null) {
    signals.push(makeSignal('FABRIC_TYPE', fabricType, 'CATALOG_ITEM', sourceId));
  }

  const composition = sanitizeSignalValue(item.composition);
  if (composition !== null) {
    signals.push(makeSignal('COMPOSITION', composition, 'CATALOG_ITEM', sourceId));
  }

  if (typeof item.gsm === 'number' && Number.isFinite(item.gsm) && item.gsm > 0) {
    signals.push(makeSignal('GSM', String(item.gsm), 'CATALOG_ITEM', sourceId));
  }

  if (Array.isArray(item.certifications)) {
    for (const cert of item.certifications) {
      const certValue = sanitizeSignalValue(cert);
      if (certValue !== null) {
        signals.push(makeSignal('CERTIFICATION', certValue, 'CATALOG_ITEM', sourceId));
      }
    }
  }

  if (typeof item.moq === 'number' && Number.isFinite(item.moq) && item.moq > 0) {
    signals.push(makeSignal('MOQ', String(item.moq), 'CATALOG_ITEM', sourceId));
  }

  return signals;
}

/** Extract signals from a supplier org profile input. */
function extractSupplierOrgProfileSignals(profile: SafeSupplierOrgProfileInput): SupplierMatchSignal[] {
  const signals: SupplierMatchSignal[] = [];
  const sourceId = typeof profile.orgId === 'string' ? profile.orgId : undefined;

  const jurisdiction = sanitizeSignalValue(profile.jurisdiction);
  if (jurisdiction !== null) {
    signals.push(makeSignal('GEOGRAPHY', jurisdiction, 'ORG_PROFILE', sourceId));
  }

  const primarySegmentKey = sanitizeSignalValue(profile.primarySegmentKey);
  if (primarySegmentKey !== null) {
    signals.push(makeSignal('SUPPLIER_CAPABILITY', primarySegmentKey, 'ORG_PROFILE', sourceId));
  }

  if (Array.isArray(profile.secondarySegmentKeys)) {
    for (const key of profile.secondarySegmentKeys) {
      const keyValue = sanitizeSignalValue(key);
      if (keyValue !== null) {
        signals.push(makeSignal('SUPPLIER_CAPABILITY', keyValue, 'ORG_PROFILE', sourceId));
      }
    }
  }

  if (Array.isArray(profile.rolePositionKeys)) {
    for (const key of profile.rolePositionKeys) {
      const keyValue = sanitizeSignalValue(key);
      if (keyValue !== null) {
        signals.push(makeSignal('SUPPLIER_CAPABILITY', keyValue, 'ORG_PROFILE', sourceId));
      }
    }
  }

  return signals;
}

/** Extract signals from an RFQ context input. */
function extractRfqContextSignals(rfq: SafeRfqContextInput): SupplierMatchSignal[] {
  const signals: SupplierMatchSignal[] = [];
  const sourceId = typeof rfq.rfqId === 'string' ? rfq.rfqId : undefined;

  const buyerMessage = sanitizeSignalValue(rfq.buyerMessage);
  if (buyerMessage !== null) {
    signals.push(makeSignal('RFQ_INTENT', buyerMessage, 'RFQ', sourceId));
  }

  const productCategory = sanitizeSignalValue(rfq.productCategory);
  if (productCategory !== null) {
    signals.push(makeSignal('PRODUCT_CATEGORY', productCategory, 'RFQ', sourceId));
  }

  const material = sanitizeSignalValue(rfq.material);
  if (material !== null) {
    signals.push(makeSignal('MATERIAL', material, 'RFQ', sourceId));
  }

  const geographyPreference = sanitizeSignalValue(rfq.geographyPreference);
  if (geographyPreference !== null) {
    signals.push(makeSignal('GEOGRAPHY', geographyPreference, 'RFQ', sourceId));
  }

  if (
    typeof rfq.moqRequirement === 'number' &&
    Number.isFinite(rfq.moqRequirement) &&
    rfq.moqRequirement > 0
  ) {
    signals.push(makeSignal('MOQ', String(rfq.moqRequirement), 'RFQ', sourceId));
  }

  return signals;
}

/**
 * Extract signals from a relationship context input.
 * ONLY APPROVED state produces a signal — all other states are suppressed.
 * BLOCKED / SUSPENDED / REJECTED are handled exclusively by the policy filter (Slice B).
 */
function extractRelationshipContextSignals(rel: SafeRelationshipContextInput): SupplierMatchSignal[] {
  if (sanitizeSignalValue(rel.state) !== 'APPROVED') return [];
  const supplierOrgId = sanitizeSignalValue(rel.supplierOrgId);
  if (supplierOrgId === null) return [];
  return [makeSignal('RELATIONSHIP_APPROVED', supplierOrgId, 'RELATIONSHIP_ACCESS')];
}

/**
 * Extract signals from a price disclosure context input.
 * Signals the disclosure MODE LABEL only — never the price value.
 */
function extractPriceDisclosureContextSignals(pd: SafePriceDisclosureContextInput): SupplierMatchSignal[] {
  const disclosureMode = sanitizeSignalValue(pd.disclosureMode);
  if (disclosureMode === null) return [];
  const sourceId = typeof pd.supplierOrgId === 'string' ? pd.supplierOrgId : undefined;
  return [makeSignal('PRICE_DISCLOSURE_METADATA', disclosureMode, 'PRICE_DISCLOSURE', sourceId)];
}

/**
 * Extract signals from a published DPP context input.
 * Published-only gate: isPublished MUST be exactly `true`.
 */
function extractPublishedDppContextSignals(dpp: SafePublishedDppContextInput): SupplierMatchSignal[] {
  if (dpp.isPublished !== true) return [];
  const publishedRef = sanitizeSignalValue(dpp.publishedRef);
  if (publishedRef === null) return [];
  const sourceId = typeof dpp.dppId === 'string' ? dpp.dppId : undefined;
  return [makeSignal('DPP_PUBLISHED', publishedRef, 'DPP_PUBLISHED', sourceId)];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a constitutionally safe, deduplicated, deterministically ordered list of
 * supplier match signals from trusted server-side inputs.
 *
 * @param input - Complete trusted input bundle; all fields must be server-assembled.
 * @returns Ordered, deduplicated array of safe signals (each with isSafe: true).
 *
 * Guarantees:
 * - Never throws; malformed/null/missing optional inputs are silently skipped.
 * - All returned signals have `isSafe: true`.
 * - No forbidden fields (price, publicationPosture, risk_score, etc.) appear
 *   in any signal value or as a signal key.
 * - Output is stable for identical inputs (deterministic).
 */
export function buildSupplierMatchSignals(
  input: SupplierMatchSignalBuilderInput,
): SupplierMatchSignal[] {
  const rawSignals: SupplierMatchSignal[] = [];

  // 1. RFQ context signals (buyer intent — highest signal priority)
  if (input.rfqContext != null && typeof input.rfqContext === 'object') {
    try {
      rawSignals.push(...extractRfqContextSignals(input.rfqContext));
    } catch {
      // Skip malformed input — never throw
    }
  }

  // 2. Catalog item signals
  if (Array.isArray(input.catalogItems)) {
    for (const item of input.catalogItems) {
      if (item == null || typeof item !== 'object') continue;
      try {
        rawSignals.push(...extractCatalogItemSignals(item));
      } catch {
        // Skip malformed item — never throw
      }
    }
  }

  // 3. Supplier org profile signals
  if (Array.isArray(input.supplierOrgProfiles)) {
    for (const profile of input.supplierOrgProfiles) {
      if (profile == null || typeof profile !== 'object') continue;
      try {
        rawSignals.push(...extractSupplierOrgProfileSignals(profile));
      } catch {
        // Skip malformed profile — never throw
      }
    }
  }

  // 4. Relationship-approved signals (APPROVED state only)
  if (Array.isArray(input.relationshipContexts)) {
    for (const rel of input.relationshipContexts) {
      if (rel == null || typeof rel !== 'object') continue;
      try {
        rawSignals.push(...extractRelationshipContextSignals(rel));
      } catch {
        // Skip malformed context — never throw
      }
    }
  }

  // 5. Price disclosure metadata signals (mode label only — never price value)
  if (Array.isArray(input.priceDisclosureContexts)) {
    for (const pd of input.priceDisclosureContexts) {
      if (pd == null || typeof pd !== 'object') continue;
      try {
        rawSignals.push(...extractPriceDisclosureContextSignals(pd));
      } catch {
        // Skip malformed context — never throw
      }
    }
  }

  // 6. Published DPP signals (published-only gate)
  if (Array.isArray(input.publishedDppContexts)) {
    for (const dpp of input.publishedDppContexts) {
      if (dpp == null || typeof dpp !== 'object') continue;
      try {
        rawSignals.push(...extractPublishedDppContextSignals(dpp));
      } catch {
        // Skip malformed context — never throw
      }
    }
  }

  // Deduplicate by (signalType, sourceEntity, value)
  const seen = new Set<string>();
  const deduplicated: SupplierMatchSignal[] = [];
  for (const signal of rawSignals) {
    const key = deduplicationKey(signal);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(signal);
    }
  }

  // Sort by canonical signal type order, then by value for deterministic stability
  return sortSignals(deduplicated);
}

/**
 * Strip forbidden field names from a plain object at runtime.
 * Returns a new object with all FORBIDDEN_INPUT_FIELDS keys removed.
 *
 * This is a defense-in-depth runtime layer. The typed safe-input interfaces
 * already exclude these fields at compile time — this adds a runtime guarantee.
 *
 * Exposed for testing and governance documentation.
 */
export function stripForbiddenSignalInputFields(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!FORBIDDEN_INPUT_FIELDS.has(key)) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Returns the set of forbidden input field names enforced by this builder.
 * Exposed for testing and governance documentation only.
 */
export function getForbiddenSignalInputFields(): ReadonlySet<string> {
  return FORBIDDEN_INPUT_FIELDS;
}
