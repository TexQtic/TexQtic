/**
 * supplierMatch.types.ts — Supplier Matching Contract Types
 *
 * Canonical TypeScript contract types for the AI Supplier Matching system.
 * Implements TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 §15 (type contracts) — Slice A.
 *
 * RULES:
 * - Pure types — no IO, no DB calls, no provider calls, no logic.
 * - isSafe: true on every SupplierMatchSignal guarantees only builder-approved signals exist.
 * - buyerOrgId MUST always originate from JWT-trusted server context (never request body).
 * - price, publicationPosture, risk_score, audit metadata, and relationship graph are
 *   constitutionally excluded from every type defined here.
 * - Future-facing stub types (SupplierMatchCandidate, etc.) are stubs only; no field
 *   is authoritative until the implementing slice gates it.
 *
 * @module supplierMatch.types
 */

import type { RelationshipState } from '../../relationshipAccess.types.js';

// ─── Signal Type ──────────────────────────────────────────────────────────────

/**
 * Discriminator for each safe matching signal.
 * Mirrors the 14 permitted signal types from design §5.
 */
export type SupplierMatchSignalType =
  | 'CATALOG_STAGE'
  | 'PRODUCT_CATEGORY'
  | 'MATERIAL'
  | 'FABRIC_TYPE'
  | 'COMPOSITION'
  | 'GSM'
  | 'CERTIFICATION'
  | 'GEOGRAPHY'
  | 'MOQ'
  | 'RFQ_INTENT'
  | 'RELATIONSHIP_APPROVED'
  | 'SUPPLIER_CAPABILITY'
  | 'DPP_PUBLISHED'
  | 'PRICE_DISCLOSURE_METADATA';

// ─── Source Entity ────────────────────────────────────────────────────────────

/**
 * Trusted server-side entity from which a signal originates.
 * Mirrors §5 source column.
 */
export type SupplierMatchSourceEntity =
  | 'CATALOG_ITEM'
  | 'RFQ'
  | 'ORG_PROFILE'
  | 'DPP_PUBLISHED'
  | 'RELATIONSHIP_ACCESS'
  | 'PRICE_DISCLOSURE';

// ─── Match Category ───────────────────────────────────────────────────────────

/**
 * High-level match category for grouping and explaining signals.
 * Used by downstream ranker and explainability layers (Slices C+).
 */
export type SupplierMatchCategory =
  | 'MATERIAL_FIT'
  | 'CATEGORY_FIT'
  | 'COMPLIANCE_FIT'
  | 'RFQ_FIT'
  | 'GEOGRAPHY_FIT'
  | 'MOQ_FIT'
  | 'RELATIONSHIP_APPROVED';

// ─── Core Signal ──────────────────────────────────────────────────────────────

/**
 * A single, constitutionally safe matching signal emitted by SupplierMatchSignalBuilder.
 *
 * Invariant: isSafe is always the literal `true`.
 * The builder never emits a signal with isSafe = false.
 * Consumers may assert `signal.isSafe === true` at boundaries.
 *
 * Fields intentionally absent:
 * - price / amount / any monetary value — constitutionally forbidden from all AI paths
 * - publicationPosture — constitutionally forbidden from all AI paths
 * - risk_score — control-plane only; tenant AI hard boundary
 * - confidence / score / ranking score — no numeric AI score is exposed (design §7)
 * - audit metadata, private notes, relationship graph — internal only
 */
export interface SupplierMatchSignal {
  /** Signal discriminator — 14-value union. */
  signalType: SupplierMatchSignalType;
  /** Normalized, length-bounded text value (trimmed, max SIGNAL_VALUE_MAX_LENGTH chars). */
  value: string;
  /** Trusted server-side source entity. */
  sourceEntity: SupplierMatchSourceEntity;
  /**
   * Opaque reference ID to the source record.
   * Safe server-side identifier only — never exposes price, policy, or audit state.
   */
  sourceId?: string;
  /**
   * Constitutional safety brand — always `true`.
   * The builder strips all forbidden fields before emitting any signal.
   */
  isSafe: true;
}

// ─── Buyer Request ────────────────────────────────────────────────────────────

/**
 * Caller-provided matching parameters.
 *
 * CRITICAL: buyerOrgId MUST be sourced from the authenticated JWT / dbContext
 * by the calling route handler. It MUST NEVER be populated from the HTTP request body.
 */
export interface BuyerSupplierMatchRequest {
  /** JWT-derived buyer org ID — never from request body. */
  buyerOrgId: string;
  /** Optional catalog stage filter (CatalogStage enum value). */
  catalogStage?: string;
  /** Optional product category filter. */
  productCategory?: string;
  /** Optional material preference. */
  material?: string;
  /** Optional RFQ ID for context enrichment (must be buyer-owned). */
  rfqId?: string;
  /** Optional geography / jurisdiction preference. */
  geographyPreference?: string;
  /** Optional minimum order quantity requirement. */
  moqRequirement?: number;
  /** Maximum candidates to return (default: 10, max: 50). */
  maxCandidates?: number;
}

// ─── Policy Context ───────────────────────────────────────────────────────────

/**
 * Internal server-side policy context assembled before signal building.
 * NEVER exposed to buyers or serialized to API responses.
 *
 * relationshipStateBySupplierOrgId — server-resolved relationship states (never client-supplied).
 * hiddenCatalogOrgIds — supplier orgs whose catalogs are hidden from this buyer.
 * forbiddenSupplierOrgIds — BLOCKED + SUSPENDED + REJECTED: hard-excluded silently (design §8).
 * activeCatalogStages — CatalogStage values currently in scope for this context.
 */
export interface SupplierMatchPolicyContext {
  /** JWT-derived buyer org ID. */
  buyerOrgId: string;
  /**
   * Map from supplier org ID to server-resolved relationship state.
   * Sourced from relationship_access table; never from request body.
   */
  relationshipStateBySupplierOrgId: Record<string, RelationshipState>;
  /** Supplier orgs with hidden catalog policies — excluded from results. */
  hiddenCatalogOrgIds: ReadonlySet<string>;
  /**
   * Supplier orgs that must be hard-excluded: BLOCKED, SUSPENDED, REJECTED.
   * Exclusion is silent — no hint exposed to buyer (design §8).
   */
  forbiddenSupplierOrgIds: ReadonlySet<string>;
  /** CatalogStage values currently in scope for this matching context. */
  activeCatalogStages: ReadonlySet<string>;
}

// ─── Future-Facing Stubs (Slices C+) ─────────────────────────────────────────

/**
 * Human-readable explanation for a match result.
 * Slice D — explainability layer. Stub only; no implementation authorized yet.
 */
export interface SupplierMatchExplanation {
  /** Primary label shown to buyer (e.g., "Material fit: Organic Cotton"). */
  primaryLabel: string;
  /** Supporting labels for the transparency surface. */
  supportingLabels: string[];
}

/**
 * A single supplier candidate returned by the matching engine.
 * Slice C — ranking layer. Stub only; no implementation authorized yet.
 *
 * No numeric score or confidence value is exposed — rank is ordinal only (design §7).
 */
export interface SupplierMatchCandidate {
  /** Supplier org ID (opaque; scoped to matching context). */
  supplierOrgId: string;
  /** Ordinal rank (1-based). NOT a numeric score — design §7 constraint. */
  rank: number;
  /** Highest-confidence match category for display. */
  primaryCategory: SupplierMatchCategory;
  /** Human-readable explanation (Slice D+). Optional stub. */
  explanation?: SupplierMatchExplanation;
  // No score, no confidence value, no AI numeric output — design §7 requirement.
}

/**
 * Final matching result returned by the matching engine.
 * Slice C+. Stub only; no implementation authorized yet.
 */
export interface SupplierMatchResult {
  /** JWT-derived buyer org ID (echoed for audit). */
  buyerOrgId: string;
  /** Ranked candidates (ordinal only). */
  candidates: SupplierMatchCandidate[];
  /** Total candidates considered before policy filter. */
  candidatesConsidered: number;
  /** Candidates excluded by policy filter (e.g., BLOCKED supplier). */
  candidatesExcludedByPolicy: number;
  /** Signal count used in matching. */
  signalCount: number;
  /** Always true — human confirmation is required before actioning results. */
  humanConfirmationRequired: true;
}

/**
 * Audit envelope for a supplier matching invocation.
 * Slice G — audit layer. Stub only; no implementation authorized yet.
 */
export interface SupplierMatchAuditEnvelope {
  /** Unique invocation ID (caller-generated). */
  requestId: string;
  /** JWT-derived buyer org ID. */
  buyerOrgId: string;
  /** UTC ISO timestamp. */
  timestamp: string;
  /** Signal count submitted. */
  signalCount: number;
  /** Whether the result was served from the policy-gated pool. */
  policyFiltered: boolean;
}

/**
 * Runtime guard result for post-ranking policy enforcement.
 * Slice F — runtime guard. Stub only; no implementation authorized yet.
 */
export interface SupplierMatchRuntimeGuardResult {
  /** Whether all candidates passed the guard. */
  passed: boolean;
  /** Number of candidates blocked by the guard. */
  blockedCandidateCount: number;
  /** Internal block reasons — NOT buyer-facing. */
  blockReasons: string[];
  /** Sanitized candidates after guard pass (ordinal only). */
  sanitizedCandidates: SupplierMatchCandidate[];
}
