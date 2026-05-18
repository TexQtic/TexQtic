/**
 * Public Industry / Cluster Taxonomy — Static Config
 *
 * Authority:  INDUSTRY-CLUSTER-TAXONOMY-DECISION-001
 *             (governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md)
 * Status:     PROPOSED — mirrors authority decision status
 * Created:    2026-05-17
 *
 * PURPOSE
 * -------
 * This file is the canonical static vocabulary registry for the TexQtic
 * public attraction layer. All public surfaces that reference textile
 * industry structure — Industry / Cluster pages, B2C Category browse,
 * D2C Collections, SEO metadata, and Inquiry context intake — MUST import
 * and reuse these values rather than defining their own inline terms.
 *
 * GOVERNANCE RULES
 * ----------------
 * - No term may be added or modified without a corresponding update to
 *   INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 (status must advance to ACCEPTED).
 * - PUBLIC_SAFE terms may appear on static public pages without requiring
 *   live API projection data.
 * - EVIDENCE_GATED terms require API projection backing before use in any
 *   specific claim on a public page.
 * - DEFERRED layers are recorded for orientation only; no runtime use until
 *   the governing unit is approved.
 * - Cluster / region terms MUST NOT include specific city names, country-level
 *   factual assertions, or capability claims without a future approved config
 *   or projection backing.
 *
 * BLOCKS
 * ------
 * This config unblocks:
 *   INDUSTRY-CLUSTER-STATIC-SLUG-PAGES-001
 *   PUBLIC-CLUSTER-PROJECTION-DESIGN-001
 *   TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001
 *   TEXQTIC-D2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001
 */

// ---------------------------------------------------------------------------
// Claim Safety Union
// ---------------------------------------------------------------------------

/** Public claim safety classification for each taxonomy layer. */
export type ClaimSafety = 'PUBLIC_SAFE' | 'EVIDENCE_GATED' | 'DEFERRED';

// ---------------------------------------------------------------------------
// Layer 1: Industry / Segment
// Authority: organizations.primary_segment_key (schema-backed)
//            public B2B projection primarySegment field
// ---------------------------------------------------------------------------

export const INDUSTRY_SEGMENTS = [
  'Yarn & Spinning',
  'Fabrics',
  'Garments',
  'Home Textiles',
  'Technical Textiles',
  'Textile Services',
] as const;

export type IndustrySegment = (typeof INDUSTRY_SEGMENTS)[number];

// ---------------------------------------------------------------------------
// Layer 2: Product Category
// Authority: CatalogItem.productCategory (schema-backed)
//            public B2C projection category field
// ---------------------------------------------------------------------------

export const PRODUCT_CATEGORIES = [
  'Yarn products',
  'Fabric products',
  'Finished garments',
  'Home textile products',
  'Technical textile products',
  'Textile services',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Layer 3: Material / Fabric Properties
// Authority: CatalogItem.material (schema-backed)
//            public B2C projection material and fabricType fields
// ---------------------------------------------------------------------------

export const MATERIAL_TYPES = [
  'Cotton',
  'Polyester',
  'Wool',
  'Blended materials',
  'Silk',
  'Linen',
  'Synthetic fibers',
  'Natural fibers',
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

// ---------------------------------------------------------------------------
// Layer 4: Cluster / Region (Broad)
// Authority: Reference-only; no schema model exists.
// Constraint: No specific city names, no unsupported factual assertions about
//             cluster composition or capabilities.
// ---------------------------------------------------------------------------

export const CLUSTER_LABELS = [
  'Textile manufacturing hubs',
  'Export-ready supplier networks',
  'Regional sourcing ecosystems',
  'MSME textile clusters',
  'Global supplier networks',
] as const;

export type ClusterLabel = (typeof CLUSTER_LABELS)[number];

// ---------------------------------------------------------------------------
// Layer 5: Role / Value-Chain Position
// Authority: organizations.role_positions junction table (schema-backed)
//            public B2B projection rolePositions[] array
// ---------------------------------------------------------------------------

export const ROLE_POSITIONS = [
  'Raw material suppliers',
  'Spinner',
  'Weaver',
  'Dyer',
  'Finisher',
  'Garment manufacturer',
  'Exporter',
  'Trader',
  'Service provider',
] as const;

export type RolePosition = (typeof ROLE_POSITIONS)[number];

// ---------------------------------------------------------------------------
// Layer 6: Trust / Origin / DPP Evidence Language
// Authority: public B2B projection certificationCount, certificationTypes[],
//            hasTraceabilityEvidence; public B2C projection publicPassportId,
//            trustSignals[]
// Rule: ALL terms in this layer MUST be paired with conditionality language
//       ("where available", "where applicable", or equivalent).
//       No universal coverage claims are permitted.
// ---------------------------------------------------------------------------

export const TRUST_LANGUAGE = [
  'Where available',
  'Public-safe',
  'Verified',
  'Traceability evidence available',
  'Certification status',
  'Public passport record',
] as const;

export type TrustLanguage = (typeof TRUST_LANGUAGE)[number];

/**
 * Evidence conditions required before each trust language term may be used
 * in a specific claim on a public page.
 * "Where available" and "Public-safe" require no backing data but must be
 * used as qualification language, not assertion language.
 */
export const TRUST_LANGUAGE_EVIDENCE: Readonly<Record<TrustLanguage, string>> = {
  'Where available':
    'No evidence required. Use only as qualification language, never as an assertion.',
  'Public-safe':
    'No evidence required. Use only for structural orientation language.',
  'Verified':
    'Requires certificationCount > 0 OR hasTraceabilityEvidence === true from public B2B projection.',
  'Traceability evidence available':
    'Requires hasTraceabilityEvidence === true from public B2B projection.',
  'Certification status':
    'Requires certificationCount > 0 from public B2B projection.',
  'Public passport record':
    'Requires publicPassportId to be present in public B2C projection response.',
};

// ---------------------------------------------------------------------------
// Layer 7: Public Inquiry Context Terms
// Status: DEFERRED — pending INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001.
// No runtime use until that unit is approved and schema is confirmed.
// ---------------------------------------------------------------------------

export const INQUIRY_CONTEXT_TERMS = [
  'Industry of interest',
  'Product category of interest',
  'Supplier role of interest',
  'Geographic region of interest',
  'Inquiry type',
] as const;

export type InquiryContextTerm = (typeof INQUIRY_CONTEXT_TERMS)[number];

// ---------------------------------------------------------------------------
// Layer 8: Authenticated Continuation Layer
// Status: DEFERRED — belongs to authenticated surfaces only.
// Recorded here for orientation; never rendered on public pages.
// ---------------------------------------------------------------------------

export const AUTHENTICATED_CONTINUATION_LABELS = [
  'Supplier discovery with filtering',
  'RFQ workflows',
  'Inquiry follow-up and communication',
  'Negotiation and contracting',
  'Order management',
  'Commercial intelligence and recommendations',
] as const;

export type AuthenticatedContinuationLabel =
  (typeof AUTHENTICATED_CONTINUATION_LABELS)[number];

// ---------------------------------------------------------------------------
// Claim Safety Classification
// Maps each vocabulary layer to its public claim safety status.
// ---------------------------------------------------------------------------

/** Claim safety status for each taxonomy layer, keyed by layer name. */
export const LAYER_CLAIM_SAFETY: Readonly<Record<string, ClaimSafety>> = {
  INDUSTRY_SEGMENTS: 'PUBLIC_SAFE',
  PRODUCT_CATEGORIES: 'PUBLIC_SAFE',
  MATERIAL_TYPES: 'PUBLIC_SAFE',
  CLUSTER_LABELS: 'PUBLIC_SAFE',
  ROLE_POSITIONS: 'PUBLIC_SAFE',
  TRUST_LANGUAGE: 'EVIDENCE_GATED',
  INQUIRY_CONTEXT_TERMS: 'DEFERRED',
  AUTHENTICATED_CONTINUATION_LABELS: 'DEFERRED',
};

// ---------------------------------------------------------------------------
// Forbidden Claim Patterns — Governance Reference
// Source: INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 Section 8 (Forbidden Claims)
// These strings document patterns that MUST NOT appear on public pages.
// This list is non-exhaustive; consult the authority decision for the full list.
// ---------------------------------------------------------------------------

/**
 * Non-exhaustive reference list of claim patterns forbidden on all public pages.
 * Defined in INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 §8.
 * This constant exists for governance documentation and lint reference only;
 * it is not intended for runtime evaluation logic.
 */
export const FORBIDDEN_CLAIM_PATTERNS = [
  'All suppliers are verified',
  'All suppliers are certified',
  'Every product has a passport',
  'All participating organizations are certified',
  'Top suppliers',
  'Best products',
  'Ranking',
  'AI-generated recommendations',
  'Scoring',
  'Buyer intent',
  'Pricing',
  'Inventory levels',
  'Committed to sustainability',
] as const;

export type ForbiddenClaimPattern = (typeof FORBIDDEN_CLAIM_PATTERNS)[number];
