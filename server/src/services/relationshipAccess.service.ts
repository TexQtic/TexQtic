/**
 * TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Relationship Access Evaluator Service
 * Slice A: Relationship Access Decision Contract and Server-Side Evaluator Service
 *
 * Pure decision logic for relationship-gated access to catalog, prices, and RFQ.
 * No database access, no persistence, no side effects.
 * Deterministic: same input always produces identical output.
 *
 * Constitutional guarantees (Layer 1 — evaluator layer):
 *   - Access decision is based on deterministic policy evaluation.
 *   - Missing or ambiguous relationship state defaults to deny (fail-safe).
 *   - Unknown policy types default to deny for gated access.
 *   - APPROVED is the only state that grants relationship-gated access.
 *   - HIDDEN catalog and HIDDEN price remain denied even for APPROVED.
 *   - Tenant isolation and org_id scoping is caller's responsibility (input validation).
 *   - Output contains no allowlist, audit, graph, or internal risk metadata.
 *   - Client cannot negotiate relationship state; it is server-resolved.
 */

import type {
  RelationshipState,
  CatalogVisibilityPolicy,
  RelationshipPricePolicy,
  RfqAcceptanceMode,
  DenialReason,
  ClientSafeReason,
  RelationshipAccessDecision,
  RelationshipAccessInput,
  RelationshipAccessConfig,
} from './relationshipAccess.types.js';

// ─── Default Configuration ────────────────────────────────────────────────────

/**
 * Launch-safe defaults that preserve existing platform behavior when policies are not specified.
 */
const DEFAULT_CONFIG: Required<RelationshipAccessConfig> = {
  defaultCatalogVisibilityPolicy: 'AUTHENTICATED_ONLY',
  defaultPricePolicy: 'VISIBLE',
  defaultRfqAcceptanceMode: 'OPEN_TO_ALL',
};

// ─── Type Guards & Validators ────────────────────────────────────────────────

/**
 * Returns true if the state is a recognized RelationshipState.
 * Unknown states are treated as invalid and trigger fail-safe deny.
 */
function isValidRelationshipState(state: unknown): state is RelationshipState {
  return (
    state === 'NONE' ||
    state === 'REQUESTED' ||
    state === 'APPROVED' ||
    state === 'REJECTED' ||
    state === 'BLOCKED' ||
    state === 'SUSPENDED' ||
    state === 'EXPIRED' ||
    state === 'REVOKED'
  );
}

/**
 * Returns true if state is a recognized CatalogVisibilityPolicy.
 */
function isValidCatalogVisibilityPolicy(
  policy: unknown,
): policy is CatalogVisibilityPolicy {
  return (
    policy === 'PUBLIC' ||
    policy === 'AUTHENTICATED_ONLY' ||
    policy === 'APPROVED_BUYER_ONLY' ||
    policy === 'HIDDEN' ||
    policy === 'REGION_CHANNEL_SENSITIVE'
  );
}

/**
 * Returns true if policy is a recognized RelationshipPricePolicy.
 */
function isValidPricePolicy(policy: unknown): policy is RelationshipPricePolicy {
  return policy === 'VISIBLE' || policy === 'RELATIONSHIP_ONLY' || policy === 'HIDDEN';
}

/**
 * Returns true if mode is a recognized RfqAcceptanceMode.
 */
function isValidRfqAcceptanceMode(mode: unknown): mode is RfqAcceptanceMode {
  return mode === 'OPEN_TO_ALL' || mode === 'APPROVED_BUYERS_ONLY';
}

// ─── Normalization & Preparation ──────────────────────────────────────────────

/**
 * Normalize relationship state from input, or null/undefined → NONE.
 * Unknown states are flagged for fail-safe deny later.
 */
function normalizeRelationshipState(
  state: unknown,
): RelationshipState | 'INVALID' {
  if (state === null || state === undefined) {
    return 'NONE';
  }
  if (isValidRelationshipState(state)) {
    return state;
  }
  return 'INVALID';
}

/**
 * Normalize catalog visibility policy from input, or null/undefined → default.
 */
function normalizeCatalogVisibilityPolicy(
  policy: unknown,
  defaultPolicy: CatalogVisibilityPolicy,
): CatalogVisibilityPolicy | 'INVALID' {
  if (policy === null || policy === undefined) {
    return defaultPolicy;
  }
  if (isValidCatalogVisibilityPolicy(policy)) {
    return policy;
  }
  return 'INVALID';
}

/**
 * Normalize price policy from input, or null/undefined → default.
 */
function normalizePricePolicy(
  policy: unknown,
  defaultPolicy: RelationshipPricePolicy,
): RelationshipPricePolicy | 'INVALID' {
  if (policy === null || policy === undefined) {
    return defaultPolicy;
  }
  if (isValidPricePolicy(policy)) {
    return policy;
  }
  return 'INVALID';
}

/**
 * Normalize RFQ acceptance mode from input, or null/undefined → default.
 */
function normalizeRfqAcceptanceMode(
  mode: unknown,
  defaultMode: RfqAcceptanceMode,
): RfqAcceptanceMode | 'INVALID' {
  if (mode === null || mode === undefined) {
    return defaultMode;
  }
  if (isValidRfqAcceptanceMode(mode)) {
    return mode;
  }
  return 'INVALID';
}

/**
 * Parse expiry timestamp; return true if provided and before now.
 */
function isRelationshipExpired(
  expiresAt: string | Date | null | undefined,
  now: Date,
): boolean {
  if (!expiresAt) {
    return false;
  }
  try {
    const expiryDate =
      typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return expiryDate < now;
  } catch {
    // Invalid date format; treat as not expired (conservative).
    return false;
  }
}

// ─── Decision Logic ───────────────────────────────────────────────────────────

/**
 * Evaluate catalog access based on visibility policy and relationship state.
 */
function evaluateCatalogAccess(
  state: RelationshipState,
  policy: CatalogVisibilityPolicy | 'INVALID',
  buyerOrgId: string | null,
): { canAccess: boolean; denialReason: DenialReason } {
  // Missing buyer org denies catalog access (except PUBLIC might be visible without auth,
  // but in B2B context we treat lack of buyer_org as deny).
  if (!buyerOrgId) {
    return { canAccess: false, denialReason: 'BUYER_ORG_REQUIRED' };
  }

  // Invalid policy defaults to deny.
  if (policy === 'INVALID') {
    return { canAccess: false, denialReason: 'UNSUPPORTED_POLICY' };
  }

  // HIDDEN catalog is never accessible to any state.
  if (policy === 'HIDDEN') {
    return { canAccess: false, denialReason: 'CATALOG_HIDDEN' };
  }

  // REGION_CHANNEL_SENSITIVE is future boundary; default to deny.
  if (policy === 'REGION_CHANNEL_SENSITIVE') {
    return { canAccess: false, denialReason: 'UNSUPPORTED_POLICY' };
  }

  // PUBLIC is accessible to all authenticated buyers regardless of relationship.
  if (policy === 'PUBLIC') {
    return { canAccess: true, denialReason: 'NONE' };
  }

  // AUTHENTICATED_ONLY is accessible to all authenticated buyers (buyer_org_id provided).
  if (policy === 'AUTHENTICATED_ONLY') {
    return { canAccess: true, denialReason: 'NONE' };
  }

  // APPROVED_BUYER_ONLY requires APPROVED state.
  if (policy === 'APPROVED_BUYER_ONLY') {
    if (state === 'APPROVED') {
      return { canAccess: true, denialReason: 'NONE' };
    }
    return { canAccess: false, denialReason: 'RELATIONSHIP_REQUIRED' };
  }

  // Fallback: deny unknown policy.
  return { canAccess: false, denialReason: 'UNSUPPORTED_POLICY' };
}

/**
 * Evaluate price access based on price policy and relationship state.
 */
function evaluatePriceAccess(
  state: RelationshipState,
  policy: RelationshipPricePolicy | 'INVALID',
  buyerOrgId: string | null,
): { canView: boolean; denialReason: DenialReason } {
  // Missing buyer org denies price visibility in B2B context.
  if (!buyerOrgId) {
    return { canView: false, denialReason: 'BUYER_ORG_REQUIRED' };
  }

  // Invalid policy defaults to deny.
  if (policy === 'INVALID') {
    return { canView: false, denialReason: 'UNSUPPORTED_POLICY' };
  }

  // HIDDEN price is never visible to any state.
  if (policy === 'HIDDEN') {
    return { canView: false, denialReason: 'ACCESS_DENIED' };
  }

  // VISIBLE price is shown to all authenticated buyers (no relationship gate).
  if (policy === 'VISIBLE') {
    return { canView: true, denialReason: 'NONE' };
  }

  // RELATIONSHIP_ONLY price requires APPROVED state.
  if (policy === 'RELATIONSHIP_ONLY') {
    if (state === 'APPROVED') {
      return { canView: true, denialReason: 'NONE' };
    }
    return { canView: false, denialReason: 'RELATIONSHIP_REQUIRED' };
  }

  // Fallback: deny unknown policy.
  return { canView: false, denialReason: 'UNSUPPORTED_POLICY' };
}

/**
 * Evaluate RFQ submit access based on acceptance mode and relationship state.
 */
function evaluateRfqAccess(
  state: RelationshipState,
  mode: RfqAcceptanceMode | 'INVALID',
  buyerOrgId: string | null,
): { canSubmit: boolean; denialReason: DenialReason } {
  // Missing buyer org denies RFQ.
  if (!buyerOrgId) {
    return { canSubmit: false, denialReason: 'BUYER_ORG_REQUIRED' };
  }

  // Invalid mode defaults to deny.
  if (mode === 'INVALID') {
    return { canSubmit: false, denialReason: 'UNSUPPORTED_POLICY' };
  }

  // OPEN_TO_ALL: allow submit for valid states (deny only BLOCKED, SUSPENDED).
  // NONE, REQUESTED, APPROVED, REJECTED, EXPIRED, REVOKED can all submit in open mode.
  if (mode === 'OPEN_TO_ALL') {
    // BLOCKED and SUSPENDED deny even in open mode (hard-stop states).
    if (state === 'BLOCKED') {
      return { canSubmit: false, denialReason: 'RELATIONSHIP_BLOCKED' };
    }
    if (state === 'SUSPENDED') {
      return { canSubmit: false, denialReason: 'RELATIONSHIP_SUSPENDED' };
    }
    // All other states can submit in OPEN_TO_ALL mode.
    return { canSubmit: true, denialReason: 'NONE' };
  }

  // APPROVED_BUYERS_ONLY: only APPROVED state can submit.
  if (mode === 'APPROVED_BUYERS_ONLY') {
    if (state === 'APPROVED') {
      return { canSubmit: true, denialReason: 'NONE' };
    }
    return { canSubmit: false, denialReason: 'RELATIONSHIP_REQUIRED' };
  }

  // Fallback: deny unknown mode.
  return { canSubmit: false, denialReason: 'UNSUPPORTED_POLICY' };
}

// ─── State-to-ClientSafeReason Mapping ────────────────────────────────────────

/**
 * Map internal denial reason to client-safe reason.
 * Non-disclosing; does not expose internal state, competitor status, or supplier details.
 */
function mapDenialReasonToClientSafe(denialReason: DenialReason): ClientSafeReason {
  switch (denialReason) {
    case 'NONE':
      return 'ACCESS_ALLOWED';

    case 'AUTH_REQUIRED':
    case 'BUYER_ORG_REQUIRED':
      return 'AUTH_REQUIRED';

    case 'SUPPLIER_ORG_REQUIRED':
    case 'UNSUPPORTED_POLICY':
      return 'NOT_FOUND';

    case 'CATALOG_HIDDEN':
      return 'NOT_FOUND';

    // Relationship gating cases map to request access or access denied.
    case 'RELATIONSHIP_REQUIRED':
      return 'REQUEST_ACCESS';

    case 'RELATIONSHIP_PENDING':
      return 'ACCESS_PENDING';

    case 'RELATIONSHIP_REJECTED':
    case 'RELATIONSHIP_BLOCKED':
    case 'RELATIONSHIP_SUSPENDED':
      return 'ACCESS_DENIED';

    case 'RELATIONSHIP_REVOKED':
      return 'REQUEST_ACCESS';

    case 'RELATIONSHIP_EXPIRED':
      return 'REQUEST_ACCESS'; // Can reapply after expiry

    case 'ACCESS_DENIED':
    default:
      return 'ACCESS_DENIED';
  }
}

// ─── Main Evaluator Function ──────────────────────────────────────────────────

/**
 * Deterministic, pure evaluator for buyer-supplier relationship access.
 *
 * **Key Guarantees:**
 *   1. Deterministic: Same input always produces identical output.
 *   2. Fail-safe: Missing/ambiguous state → deny (never grants access).
 *   3. Pure: No side effects, no DB calls, no state mutations.
 *   4. Side-effect-free: Safe for concurrent calls, caching, testing.
 *
 * **Input Trust Model:**
 *   - All inputs are assumed to be from trusted backend services.
 *   - buyerOrgId must be validated by caller against authenticated user context.
 *   - relationshipState must be server-resolved; client cannot provide.
 *
 * **Output Safety:**
 *   - Internal reason is for server logging only (not exposed to clients).
 *   - Client-safe reason is non-disclosing and safe for buyer exposure.
 *   - Relationship state is echoed back for debugging/logging only.
 *
 * @param input - Trusted server-side input.
 * @param config - Optional configuration; defaults to launch-safe values.
 * @returns Deterministic access decision; never throws exception.
 */
export function evaluateBuyerSupplierRelationshipAccess(
  input: RelationshipAccessInput,
  config?: RelationshipAccessConfig,
): RelationshipAccessDecision {
  // ─── Merge configuration with defaults
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // ─── Normalize and validate inputs
  const buyerOrgId = input.buyerOrgId || null;
  const supplierOrgId = input.supplierOrgId || null;

  // Normalize relationship state (null → NONE).
  let relationshipState = normalizeRelationshipState(input.relationshipState);
  let relationshipDenialReason: DenialReason = 'NONE';
  const hadInvalidRelationshipState = relationshipState === 'INVALID';

  // Check for invalid/unknown relationship state.
  if (relationshipState === 'INVALID') {
    relationshipState = 'NONE'; // Treat as NONE for consistency
    relationshipDenialReason = 'UNSUPPORTED_POLICY';
  }

  // Check expiry: if expired, upgrade state to EXPIRED.
  if (
    relationshipState !== 'NONE' &&
    input.relationshipExpiresAt
  ) {
    const now = input.now
      ? typeof input.now === 'string'
        ? new Date(input.now)
        : input.now
      : new Date();

    if (isRelationshipExpired(input.relationshipExpiresAt, now)) {
      relationshipState = 'EXPIRED';
    }
  }

  // ─── Early denials: missing required context
  if (!supplierOrgId) {
    return {
      buyerOrgId,
      supplierOrgId,
      currentState: relationshipState,
      hasApprovedRelationship: false,
      canAccessCatalog: false,
      canViewRelationshipOnlyPrices: false,
      canSubmitRfq: false,
      denialReason: 'SUPPLIER_ORG_REQUIRED',
      clientSafeReason: 'NOT_FOUND',
    };
  }

  // ─── Normalize policies
  const catalogPolicy = normalizeCatalogVisibilityPolicy(
    input.catalogVisibilityPolicy,
    finalConfig.defaultCatalogVisibilityPolicy,
  );

  const pricePolicy = normalizePricePolicy(
    input.pricePolicy,
    finalConfig.defaultPricePolicy,
  );

  const rfqMode = normalizeRfqAcceptanceMode(
    input.rfqAcceptanceMode,
    finalConfig.defaultRfqAcceptanceMode,
  );

  // ─── Evaluate each access dimension
  const catalogAccess = evaluateCatalogAccess(
    relationshipState,
    catalogPolicy,
    buyerOrgId,
  );

  const priceAccess = evaluatePriceAccess(relationshipState, pricePolicy, buyerOrgId);

  const rfqAccess = evaluateRfqAccess(relationshipState, rfqMode, buyerOrgId);

  // ─── Determine primary denial reason (prefer most critical)
  // Priority: missing context > relationship > policy > generic denial
  let primaryDenialReason: DenialReason = relationshipDenialReason;

  let canAccessCatalog = catalogAccess.canAccess;
  let canViewPrice = priceAccess.canView;
  let canSubmitRfq = rfqAccess.canSubmit;

  // Invalid relationship state is fail-safe deny for all dimensions.
  if (hadInvalidRelationshipState) {
    canAccessCatalog = false;
    canViewPrice = false;
    canSubmitRfq = false;
  }

  if (primaryDenialReason === 'NONE') {
    // Check if any dimension had a relationship-specific denial.
    if (
      catalogAccess.denialReason.startsWith('RELATIONSHIP') ||
      priceAccess.denialReason.startsWith('RELATIONSHIP') ||
      rfqAccess.denialReason.startsWith('RELATIONSHIP')
    ) {
      // Use the relationship-specific denial if available.
      primaryDenialReason =
        catalogAccess.denialReason.startsWith('RELATIONSHIP')
          ? catalogAccess.denialReason
          : priceAccess.denialReason.startsWith('RELATIONSHIP')
            ? priceAccess.denialReason
            : rfqAccess.denialReason;
    } else if (catalogAccess.denialReason !== 'NONE') {
      primaryDenialReason = catalogAccess.denialReason;
    } else if (priceAccess.denialReason !== 'NONE') {
      primaryDenialReason = priceAccess.denialReason;
    } else if (rfqAccess.denialReason !== 'NONE') {
      primaryDenialReason = rfqAccess.denialReason;
    }
  }

  // Map internal reason to relationship state reason for clarity
  if (
    primaryDenialReason === 'RELATIONSHIP_REQUIRED' &&
    relationshipState !== 'APPROVED'
  ) {
    // Map RELATIONSHIP_REQUIRED to specific state reason.
    switch (relationshipState) {
      case 'NONE':
        primaryDenialReason = 'RELATIONSHIP_REQUIRED';
        break;
      case 'REQUESTED':
        primaryDenialReason = 'RELATIONSHIP_PENDING';
        break;
      case 'REJECTED':
        primaryDenialReason = 'RELATIONSHIP_REJECTED';
        break;
      case 'BLOCKED':
        primaryDenialReason = 'RELATIONSHIP_BLOCKED';
        break;
      case 'SUSPENDED':
        primaryDenialReason = 'RELATIONSHIP_SUSPENDED';
        break;
      case 'EXPIRED':
        primaryDenialReason = 'RELATIONSHIP_EXPIRED';
        break;
      case 'REVOKED':
        primaryDenialReason = 'RELATIONSHIP_REVOKED';
        break;
      default:
        // Keep RELATIONSHIP_REQUIRED
        break;
    }
  }

  // ─── Build response
  const decision: RelationshipAccessDecision = {
    buyerOrgId,
    supplierOrgId,
    currentState: relationshipState,
    hasApprovedRelationship: relationshipState === 'APPROVED',
    canAccessCatalog,
    canViewRelationshipOnlyPrices:
      pricePolicy === 'RELATIONSHIP_ONLY' && canViewPrice,
    canSubmitRfq,
    denialReason: primaryDenialReason,
    clientSafeReason: mapDenialReasonToClientSafe(primaryDenialReason),
  };

  return decision;
}

/**
 * Export factory function for creating configured evaluators (for future extensibility).
 * Currently returns the default evaluator; can be enhanced for dependency injection.
 */
export function createRelationshipAccessEvaluator(
  config?: RelationshipAccessConfig,
) {
  return (input: RelationshipAccessInput) =>
    evaluateBuyerSupplierRelationshipAccess(input, config);
}

export function resolveCatalogVisibilityPolicyForTrustedSource(
  catalogVisibilityPolicy: unknown,
  config?: RelationshipAccessConfig,
): CatalogVisibilityPolicy | 'INVALID' {
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return normalizeCatalogVisibilityPolicy(
    catalogVisibilityPolicy,
    finalConfig.defaultCatalogVisibilityPolicy,
  );
}

export function evaluateBuyerCatalogVisibility(
  input: {
    buyerOrgId: string | null;
    supplierOrgId: string | null;
    relationshipState?: RelationshipState | null;
    relationshipExpiresAt?: string | Date | null;
    catalogVisibilityPolicy?: unknown;
    now?: string | Date;
  },
  config?: RelationshipAccessConfig,
) {
  const resolvedCatalogVisibilityPolicy =
    resolveCatalogVisibilityPolicyForTrustedSource(
      input.catalogVisibilityPolicy,
      config,
    );

  const decision = evaluateBuyerSupplierRelationshipAccess(
    {
      buyerOrgId: input.buyerOrgId,
      supplierOrgId: input.supplierOrgId,
      relationshipState: input.relationshipState ?? 'NONE',
      relationshipExpiresAt: input.relationshipExpiresAt ?? null,
      catalogVisibilityPolicy:
        resolvedCatalogVisibilityPolicy === 'INVALID'
          ? undefined
          : resolvedCatalogVisibilityPolicy,
      now: input.now,
    },
    config,
  );

  return {
    catalogVisibilityPolicy: resolvedCatalogVisibilityPolicy,
    decision,
  };
}

export function filterBuyerVisibleCatalogItems<Item>(
  items: readonly Item[],
  input: {
    buyerOrgId: string | null;
    relationshipState?: RelationshipState | null;
    relationshipExpiresAt?: string | Date | null;
    now?: string | Date;
    getSupplierOrgId: (item: Item) => string | null;
    getCatalogVisibilityPolicy?: (item: Item) => unknown;
  },
  config?: RelationshipAccessConfig,
): Item[] {
  return items.filter(item => {
    const { decision } = evaluateBuyerCatalogVisibility(
      {
        buyerOrgId: input.buyerOrgId,
        supplierOrgId: input.getSupplierOrgId(item),
        relationshipState: input.relationshipState,
        relationshipExpiresAt: input.relationshipExpiresAt,
        catalogVisibilityPolicy: input.getCatalogVisibilityPolicy?.(item),
        now: input.now,
      },
      config,
    );

    return decision.canAccessCatalog;
  });
}

/**
 * Evaluate whether the buyer's relationship state grants eligibility for
 * RELATIONSHIP_ONLY price disclosure.
 *
 * Only APPROVED relationship state (with no active expiry) grants price eligibility.
 * All other states (NONE, REQUESTED, REJECTED, BLOCKED, SUSPENDED, EXPIRED, REVOKED,
 * INVALID/unknown) suppress price access (fail-safe default).
 *
 * Input trust model:
 *   - relationshipState MUST be server-resolved from storage; clients cannot supply it.
 *   - buyerOrgId MUST come from the authenticated session context.
 *   - supplierOrgId MUST come from trusted catalog/item server-side context.
 */
export function evaluateBuyerRelationshipPriceEligibility(input: {
  buyerOrgId: string | null;
  supplierOrgId: string | null;
  relationshipState?: unknown;
  relationshipExpiresAt?: Date | string | null;
  now?: string | Date;
}): { isEligible: boolean } {
  const decision = evaluateBuyerSupplierRelationshipAccess({
    buyerOrgId: input.buyerOrgId,
    supplierOrgId: input.supplierOrgId,
    relationshipState: (input.relationshipState ?? 'NONE') as RelationshipState,
    relationshipExpiresAt: input.relationshipExpiresAt ?? null,
    pricePolicy: 'RELATIONSHIP_ONLY',
    now: input.now,
  });

  return { isEligible: decision.canViewRelationshipOnlyPrices };
}
