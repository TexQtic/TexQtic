/**
 * TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Relationship Access Decision Contract
 * Slice A: Relationship Access Decision Contract and Server-Side Evaluator Service
 *
 * Pure type definitions for the relationship access decision evaluator.
 * No DB schema references, no persistence — types only.
 *
 * Constitutional guarantees (Layer 1 — service layer):
 *   - Access decision is deterministic.
 *   - Same input (buyer_org_id, supplier_org_id, relationship_state, policies)
 *     produces identical output.
 *   - Relationship state CANNOT be client-negotiated; it is server-resolved.
 *   - Unknown or ambiguous state defaults to deny (fail-safe posture).
 *   - No allowlist, audit, graph, or internal risk metadata is exposed in output.
 *   - Tenant isolation (`org_id`) is constitutional.
 */

// ─── Relationship State Domain ────────────────────────────────────────────────

/**
 * Canonical relationship states between supplier and buyer organization.
 * Single source of truth; mirrors design document Section 6.
 */
export type RelationshipState =
  | 'NONE'       // No explicit relationship recorded
  | 'REQUESTED'  // Buyer has submitted access request
  | 'APPROVED'   // Supplier has approved buyer access
  | 'REJECTED'   // Supplier has rejected access request
  | 'BLOCKED'    // Supplier has explicitly blocked buyer organization
  | 'SUSPENDED'  // Access temporarily revoked by supplier or platform
  | 'EXPIRED'    // Relationship has reached expiry date
  | 'REVOKED';   // Supplier has revoked previously approved relationship

// ─── Catalog Visibility Policies ───────────────────────────────────────────────

/**
 * Catalog visibility policy tier; determines access gating.
 * Mirrors design document Section 8.
 */
export type CatalogVisibilityPolicy =
  | 'PUBLIC'                    // All authenticated buyers see product
  | 'AUTHENTICATED_ONLY'        // Only logged-in buyers see product
  | 'APPROVED_BUYER_ONLY'       // Only relationship-APPROVED buyers see product
  | 'HIDDEN'                    // Supplier-private; no buyer exposure
  | 'REGION_CHANNEL_SENSITIVE'; // Future boundary; not implemented in Slice A

// ─── Price Disclosure Policies ────────────────────────────────────────────────

/**
 * Price visibility policy; scoped by relationship integration.
 * Mirrors design document Section 9.
 */
export type RelationshipPricePolicy =
  | 'VISIBLE'           // Price shown to authenticated buyers; no relationship gate
  | 'RELATIONSHIP_ONLY' // Price visible only to APPROVED buyers
  | 'HIDDEN';           // Price suppressed for all states

// ─── RFQ Acceptance Modes ────────────────────────────────────────────────────

/**
 * Supplier RFQ acceptance policy.
 * Mirrors design document Section 10.
 */
export type RfqAcceptanceMode =
  | 'OPEN_TO_ALL'           // All authenticated buyers can submit RFQ
  | 'APPROVED_BUYERS_ONLY'; // Only relationship-APPROVED buyers can submit RFQ

// ─── Denial Reasons (Internal Use) ────────────────────────────────────────────

/**
 * Structured denial reasons for internal server use.
 * NOT exposed to buyers/public; used for logging, debugging, and server-side routing.
 * Client-facing reason is separate (clientSafeReason).
 */
export type DenialReason =
  | 'NONE'                     // No denial; access granted
  | 'AUTH_REQUIRED'            // No buyer org ID; authentication required
  | 'BUYER_ORG_REQUIRED'       // Buyer org context missing
  | 'SUPPLIER_ORG_REQUIRED'    // Supplier org context missing
  | 'RELATIONSHIP_REQUIRED'    // Relationship-gated access required but not APPROVED
  | 'RELATIONSHIP_PENDING'     // Relationship is REQUESTED; decision pending
  | 'RELATIONSHIP_REJECTED'    // Relationship was REJECTED by supplier
  | 'RELATIONSHIP_BLOCKED'     // Relationship is BLOCKED by supplier
  | 'RELATIONSHIP_SUSPENDED'   // Relationship is SUSPENDED
  | 'RELATIONSHIP_EXPIRED'     // Relationship has EXPIRED
  | 'RELATIONSHIP_REVOKED'     // Relationship was REVOKED by supplier
  | 'CATALOG_HIDDEN'           // Catalog item is HIDDEN; no buyer access
  | 'UNSUPPORTED_POLICY'       // Policy type is not yet supported (e.g., REGION_CHANNEL_SENSITIVE)
  | 'ACCESS_DENIED';           // Generic access denied

// ─── Client-Safe Reasons ──────────────────────────────────────────────────────

/**
 * Client-facing reason codes that can be exposed to buyers without information leakage.
 * Maps internal denial reasons to safe, non-disclosing messages.
 *
 * Constraints:
 *   - Do NOT expose: competitor status, internal reason, audit metadata, allowlist details
 *   - Do expose: clear, non-disclosing guidance for buyer actions
 */
export type ClientSafeReason =
  | 'ACCESS_ALLOWED'    // Access granted; proceed
  | 'REQUEST_ACCESS'    // Relationship not yet approved; buyer should request access
  | 'ACCESS_PENDING'    // Request is pending supplier decision; wait
  | 'ACCESS_DENIED'     // Access is denied; no clear next step (rejected/blocked/suspended)
  | 'NOT_FOUND'         // Product/resource not found (could be hidden or does not exist)
  | 'AUTH_REQUIRED';    // Not authenticated; login required

// ─── Access Decision Output ───────────────────────────────────────────────────

/**
 * Deterministic access decision returned by evaluateBuyerSupplierRelationshipAccess().
 * Pure output contract; no side effects, no DB calls, no state mutations.
 *
 * All fields are included in response; client-safe reason is separate from internal reason.
 * Relationship state is echoed back for debugging; client cannot forge this.
 */
export interface RelationshipAccessDecision {
  /**
   * Buyer organization ID from input (for debugging/logging).
   */
  buyerOrgId: string | null;

  /**
   * Supplier organization ID from input (for debugging/logging).
   */
  supplierOrgId: string | null;

  /**
   * Normalized relationship state; reflects actual evaluated state.
   * NONE if null/undefined was provided.
   */
  currentState: RelationshipState;

  /**
   * True if relationship is APPROVED; false otherwise.
   * Convenience field for callers checking approval status only.
   */
  hasApprovedRelationship: boolean;

  /**
   * True if buyer can access catalog (subject to visibility policy).
   * Does NOT indicate catalog existence; evaluator knows only policy, not catalog contents.
   * Caller must apply catalog filtering separately.
   */
  canAccessCatalog: boolean;

  /**
   * True if buyer can view RELATIONSHIP_ONLY prices.
   * False if price policy is HIDDEN or RELATIONSHIP_ONLY with state != APPROVED.
   */
  canViewRelationshipOnlyPrices: boolean;

  /**
   * True if buyer can submit RFQ to supplier.
   * Depends on RFQ acceptance mode and relationship state.
   */
  canSubmitRfq: boolean;

  /**
   * Internal denial reason for server-side logging and debugging.
   * NOT exposed to buyers. Use for logs, metrics, internal routing.
   * Example: if relationship is BLOCKED, might be RELATIONSHIP_BLOCKED.
   */
  denialReason: DenialReason;

  /**
   * Client-facing reason suitable for safe exposure to buyers.
   * Non-disclosing; no internal metadata, no competitor hints, no supplier details.
   * Examples: 'REQUEST_ACCESS', 'ACCESS_DENIED', 'NOT_FOUND', 'AUTH_REQUIRED'.
   *
   * Caller is responsible for mapping this to localized user-facing messages.
   */
  clientSafeReason: ClientSafeReason;
}

// ─── Access Decision Input Contract ───────────────────────────────────────────

/**
 * Trusted server-side input to evaluateBuyerSupplierRelationshipAccess().
 * All inputs are assumed to be from trusted backend services only;
 * evaluator does not validate that buyerOrgId/supplierOrgId belong to authenticated users.
 *
 * Optional fields default to safe values as documented in evaluator implementation.
 */
export interface RelationshipAccessInput {
  /**
   * Buyer organization ID. Required for catalog/price/RFQ access.
   * Derived from authenticated buyer session; NOT client-negotiable.
   */
  buyerOrgId: string | null;

  /**
   * Supplier organization ID.
   * Required for all access decisions.
   */
  supplierOrgId: string | null;

  /**
   * Current relationship state between buyer and supplier.
   * Null/undefined normalizes to NONE.
   * Unknown states default to deny (fail-safe).
   */
  relationshipState?: RelationshipState | null;

  /**
   * Catalog visibility policy for the product/resource being accessed.
   * Defaults to AUTHENTICATED_ONLY if not provided (launch-safe default).
   * Affects canAccessCatalog decision.
   */
  catalogVisibilityPolicy?: CatalogVisibilityPolicy | null;

  /**
   * Price disclosure policy for the item.
   * Defaults to VISIBLE if not provided (launch-safe default).
   * Affects canViewRelationshipOnlyPrices decision.
   */
  pricePolicy?: RelationshipPricePolicy | null;

  /**
   * RFQ acceptance mode configured by supplier.
   * Defaults to OPEN_TO_ALL if not provided (preserves current behavior).
   * Affects canSubmitRfq decision.
   */
  rfqAcceptanceMode?: RfqAcceptanceMode | null;

  /**
   * Optional: relationship expiry timestamp.
   * If provided and before `now`, relationship is treated as EXPIRED for access decision.
   * No mutation; no state change; decision-only.
   * Defaults to undefined (no expiry check).
   */
  relationshipExpiresAt?: string | Date | null;

  /**
   * Optional: current timestamp for expiry comparison.
   * Defaults to Date.now() if not provided.
   * Used only if relationshipExpiresAt is provided.
   */
  now?: Date | string | null;
}

// ─── Evaluation Configuration ──────────────────────────────────────────────────

/**
 * Optional configuration for evaluator behavior.
 * Can be used to override defaults or control future extension points.
 */
export interface RelationshipAccessConfig {
  /**
   * Default catalog visibility policy if not specified in input.
   * Defaults to AUTHENTICATED_ONLY (launch-safe).
   */
  defaultCatalogVisibilityPolicy?: CatalogVisibilityPolicy;

  /**
   * Default price policy if not specified in input.
   * Defaults to VISIBLE (launch-safe).
   */
  defaultPricePolicy?: RelationshipPricePolicy;

  /**
   * Default RFQ acceptance mode if not specified in input.
   * Defaults to OPEN_TO_ALL (preserves current behavior).
   */
  defaultRfqAcceptanceMode?: RfqAcceptanceMode;
}
