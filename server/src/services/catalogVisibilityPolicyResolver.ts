/**
 * catalogVisibilityPolicyResolver.ts — Catalog Visibility Policy Resolver (Slice A)
 *
 * Deterministic, pure resolver that maps the current `publication_posture` storage
 * (public-projection vocabulary) into the canonical `CatalogVisibilityPolicyMode`
 * access-control vocabulary.
 *
 * This module is the single authoritative call site for resolving effective
 * catalog item visibility policy.  No ad hoc reads of `catalogVisibilityPolicy`,
 * `catalog_visibility_policy`, `visibilityTier`, or `visibility_tier` are permitted
 * in route or service code — all consumers must call `resolveCatalogVisibilityPolicy`.
 *
 * When `catalog_visibility_policy_mode` is stored in DB (Slice B) and selected in
 * Prisma queries (Slice C), pass it as `catalogVisibilityPolicyMode`.  Until then,
 * the field is absent / undefined and the fallback mapping applies automatically.
 *
 * Constitutional guarantees:
 *   - Resolver is pure and side-effect-free; same input → same output.
 *   - Unknown or unsupported policy values fail safe to AUTHENTICATED_ONLY.
 *   - REGION_CHANNEL_SENSITIVE is NOT an accepted storable mode in Slice A.
 *   - No buyer org ID, supplier org ID, relationship state, or audit metadata
 *     is present in resolver input or output.
 *   - Resolver output must never be serialized directly to buyer-facing responses.
 *
 * Implements TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 Section 4.2.
 */

// ─── Storable Mode Vocabulary ─────────────────────────────────────────────────

/**
 * Allowed values for the future `catalog_visibility_policy_mode` DB column.
 * Mirrors the CHECK constraint proposed in Design Section 4.1.
 *
 * Note: REGION_CHANNEL_SENSITIVE is intentionally absent — it is a future
 * boundary value that must NOT be stored or resolved until Slice B explicitly
 * expands the DB constraint and Slice A receives authorization to handle it.
 */
export const CATALOG_VISIBILITY_POLICY_MODES = [
  'PUBLIC',
  'AUTHENTICATED_ONLY',
  'APPROVED_BUYER_ONLY',
  'HIDDEN',
  'RELATIONSHIP_GATED',
] as const;

export type CatalogVisibilityPolicyMode = (typeof CATALOG_VISIBILITY_POLICY_MODES)[number];

// ─── Publication Posture Vocabulary ───────────────────────────────────────────

/**
 * Allowed values for `catalog_items.publication_posture` (existing DB column).
 * Mirrors the CHECK constraint in migration
 * `20260422000000_b2b_public_projection_preconditions`.
 */
export const CATALOG_PUBLICATION_POSTURES = [
  'PRIVATE_OR_AUTH_ONLY',
  'B2B_PUBLIC',
  'B2C_PUBLIC',
  'BOTH',
] as const;

export type CatalogPublicationPosture = (typeof CATALOG_PUBLICATION_POSTURES)[number];

// ─── Resolver Input / Output ──────────────────────────────────────────────────

export type CatalogVisibilityPolicyResolverSource =
  | 'EXPLICIT_POLICY'              // Explicit `catalog_visibility_policy_mode` field present and valid
  | 'PUBLICATION_POSTURE_FALLBACK' // Mapped from `publication_posture`
  | 'FAIL_SAFE_DEFAULT';           // Unknown / missing input; AUTHENTICATED_ONLY applied

export interface CatalogVisibilityPolicyResolverInput {
  /**
   * The future `catalog_visibility_policy_mode` value from DB / Prisma result.
   * Accepts `unknown` so callers can pass raw Prisma output without pre-casting.
   * Invalid strings are treated as absent.
   */
  catalogVisibilityPolicyMode?: unknown;
  /**
   * The existing `publication_posture` value from DB / Prisma result.
   * Accepts `unknown` so callers can pass raw Prisma output without pre-casting.
   * Used only when `catalogVisibilityPolicyMode` is absent or invalid.
   */
  publicationPosture?: unknown;
}

export interface CatalogVisibilityPolicyResolverResult {
  /** The resolved access-control policy — the single value authoritative for gating. */
  policy: CatalogVisibilityPolicyMode;
  /** How the policy was derived — for logging and diagnostic use only; not for buyers. */
  source: CatalogVisibilityPolicyResolverSource;
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Normalise an unknown value into a `CatalogVisibilityPolicyMode` or null.
 * Returns null for empty strings, non-strings, and any value not in the
 * CATALOG_VISIBILITY_POLICY_MODES allowlist.
 *
 * REGION_CHANNEL_SENSITIVE is explicitly rejected here (not in allowlist).
 */
function normalizeMode(value: unknown): CatalogVisibilityPolicyMode | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const normalised = value.trim() as CatalogVisibilityPolicyMode;
  if ((CATALOG_VISIBILITY_POLICY_MODES as readonly string[]).includes(normalised)) {
    return normalised;
  }
  return null;
}

/**
 * Map a `publication_posture` value to `CatalogVisibilityPolicyMode`.
 * Returns AUTHENTICATED_ONLY for unknown / absent values (fail-safe).
 */
function mapPostureToPolicy(posture: unknown): CatalogVisibilityPolicyMode {
  if (typeof posture !== 'string') {
    return 'AUTHENTICATED_ONLY';
  }
  switch (posture.trim()) {
    case 'B2B_PUBLIC':
    case 'B2C_PUBLIC':
    case 'BOTH':
      return 'PUBLIC';
    case 'PRIVATE_OR_AUTH_ONLY':
      return 'AUTHENTICATED_ONLY';
    default:
      return 'AUTHENTICATED_ONLY'; // fail-safe for unknown posture values
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolve the effective `CatalogVisibilityPolicyMode` for a catalog item.
 *
 * Resolution order (from highest to lowest priority):
 *   1. Explicit `catalogVisibilityPolicyMode` — wins if present and valid.
 *   2. Fallback: map from `publicationPosture`.
 *   3. Fail-safe: AUTHENTICATED_ONLY when both are absent / unknown.
 *
 * @pure No IO, no mutation, no side effects.
 * @param input - Raw Prisma field values; unknown types accepted.
 * @returns Resolved policy and provenance source.
 */
export function resolveCatalogVisibilityPolicy(
  input: CatalogVisibilityPolicyResolverInput,
): CatalogVisibilityPolicyResolverResult {
  // Priority 1: explicit mode present and valid
  const explicitMode = normalizeMode(input.catalogVisibilityPolicyMode);
  if (explicitMode !== null) {
    return {
      policy: explicitMode,
      source: 'EXPLICIT_POLICY',
    };
  }

  // Priority 2: fallback from publication_posture
  const postureValue = input.publicationPosture;
  if (postureValue !== null && postureValue !== undefined) {
    return {
      policy: mapPostureToPolicy(postureValue),
      source: 'PUBLICATION_POSTURE_FALLBACK',
    };
  }

  // Priority 3: fail-safe default
  return {
    policy: 'AUTHENTICATED_ONLY',
    source: 'FAIL_SAFE_DEFAULT',
  };
}
