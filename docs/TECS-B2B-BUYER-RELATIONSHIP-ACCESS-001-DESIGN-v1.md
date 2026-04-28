# TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — Buyer-Supplier Relationship Layer & Access Control Design Plan v1

## 1. Title / Unit Metadata

**Unit ID:** TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001  
**Mode:** DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED  
**Status:** DESIGN_DRAFT  
**Design date:** 2026-04-28  
**Owner / context:** TexQtic governance and repo-truth planning  
**Predecessor units:**  
- TECS-B2B-BUYER-CATALOG-PDP-001 (VERIFIED_COMPLETE)  
- TECS-DPP-PASSPORT-FOUNDATION-001 (VERIFIED_COMPLETE)  
- TECS-B2B-BUYER-PRICE-DISCLOSURE-001 (VERIFIED_COMPLETE)  
- TECS-B2B-BUYER-RFQ-INTEGRATION-001 (VERIFIED_COMPLETE)

> Stop rule: This artifact is planning-only. No backend logic, frontend UI behavior,
> route implementation, schema changes, Prisma migrations, access-control enforcement,
> relationship mutations, supplier dashboard UI, buyer dashboard UI, RFQ changes,
> price-disclosure changes, notification changes, or runtime behavior changes are authorized in this unit.

---

## 2. Problem Statement

Buyer discovery, product detail browsing, price transparency, and RFQ integration are now stable and functional. However, the platform lacks a strategic relationship and access-control layer that protects supplier commercial interests, enforces buyer legitimacy, manages competitive exposure, and provides supplier-controlled approval workflows.

Without explicit relationship access control, textile B2B workflows risk:
- indiscriminate catalog and pricing exposure to unvetted buyers,
- competitive buyer access to sensitive supplier product portfolios,
- inability for suppliers to trust buyer qualification,
- weak controls over buyer-initiated RFQ volumes and quality,
- lack of audit visibility for supplier access decisions,
- no mechanism for suppliers to block or revoke buyer access.

This unit defines a design contract for a supplier-controlled relationship and access layer that gates catalog visibility, price disclosure, and RFQ workflows based on approved buyer relationships while preserving tenant isolation and anti-leakage security boundaries.

---

## 3. Business Rationale

Textile B2B is fundamentally a trust-based supply chain. Suppliers must be able to:
- qualify and approve buyers before exposing sensitive product catalogs and pricing,
- control which buyers can access which products or price points,
- revoke access to buyers who no longer meet relationship criteria,
- maintain audit trails of access decisions,
- protect competitive product portfolios from unauthorized visibility.

A strong relationship access layer enables:
- supplier confidence in buyer legitimacy and intent,
- controlled commercial exposure and competitive protection,
- reduced exposure to information arbitrage or data scraping,
- future integration with AI-assisted supplier matching and buyer scoring,
- governance visibility for trust and compliance attestation,
- repeatable buyer-supplier relationship activation workflows.

---

## 4. Current System Assumptions

Design assumptions anchored to repo-truth posture:
- Catalog/PDP foundation is complete and stable for buyer discovery.
- Price disclosure is complete with safe, buyer-visible states.
- RFQ integration is complete with safe, explicit buyer-action boundaries.
- DPP/passport foundation remains a separate bounded surface.
- Tenant isolation (`org_id`) remains constitutional.
- No relationship access control currently exists.
- Suppliers have no allowlist or approval workflow at present.
- All authenticated buyers currently have equal default access to published catalogs and disclosed prices.
- RFQ submit is permitted for all authenticated buyers to all suppliers without access-gating.

Roadmap order preserved:
1. Catalog/PDP foundation (complete)
2. Price disclosure (complete)
3. RFQ integration (complete)
4. Buyer-supplier relationship/access layer (this unit)
5. AI supplier matching (future)

---

## 5. Non-Goals

Explicitly out of scope for this unit:
- Backend route/service implementation for relationship access control
- Frontend supplier dashboard UI for managing approvals/blocks
- Frontend buyer dashboard UI for submitting access requests
- Prisma schema changes and migrations
- Relationship record creation or mutation behavior
- Access request workflow implementation
- Allowlist enforcement logic
- PDP catalog visibility filtering
- Price disclosure policy changes or enforcement
- RFQ access-gating implementation
- Supplier notification on access decisions
- Buyer notification on access decisions
- AI supplier matching, ranking, or relationship scoring
- Relationship verification or buyer credential validation
- Payment, escrow, credit, settlement, or commission logic
- DPP publication or passport-status promotion based on relationships
- Public relationship graph or supplier-to-buyer mapping exposure
- Competitor detection or anti-competition enforcement logic

---

## 6. Relationship State Model

Conceptual relationship states between supplier and buyer organization:

```
NONE
  └─ No explicit relationship recorded
  └─ Buyer may request access
  └─ Default state

REQUESTED
  └─ Buyer has submitted access request
  └─ Awaiting supplier approval/rejection
  └─ Request is pending with supplier

APPROVED
  └─ Supplier has approved buyer access
  └─ Buyer may access allowed catalog items and prices
  └─ Buyer may submit RFQs where policy permits
  └─ Active relationship

REJECTED
  └─ Supplier has rejected access request
  └─ Access remains denied unless request resubmitted
  └─ Terminal state unless buyer reapplies

BLOCKED
  └─ Supplier has explicitly blocked buyer organization
  └─ No access permitted; buyer cannot reapply without supplier unblock
  └─ Differs from REJECTED by blocking future requests
  └─ Terminal state until supplier unblocks

SUSPENDED
  └─ Access temporarily revoked by supplier or platform
  └─ Buyer previously had APPROVED; now suspended
  └─ Future resumption possible

EXPIRED
  └─ Supplier relationship has reached expiry date (if enforced)
  └─ Access automatically revoked after policy-defined window
  └─ Buyer must reapply for renewal

REVOKED
  └─ Supplier has actively revoked previously approved relationship
  └─ Buyer must reapply for access
  └─ Differs from SUSPENDED by explicit supplier action
```

Directional ownership model:
- **Buyer initiates:** buyer organization requests access from supplier organization.
- **Supplier controls:** supplier approves, rejects, blocks, suspends, or revokes.
- **Platform may audit:** internal users may review relationship decisions for governance/policy enforcement.
- **No automatic state transitions:** relationship state changes only via explicit supplier action or platform policy intervention.

---

## 7. Allowlist / Approved Buyer Model

Supplier-controlled allowlist behavior:

**Allowlist Entry:**
- Supplier organization maintains an allowlist of approved buyer organizations.
- Allowlist entry represents supplier's explicit approval of buyer access to defined scope.

**Supplier Allowlist Controls:**
- **Approve buyer:** move relationship from REQUESTED to APPROVED.
- **Reject buyer request:** move from REQUESTED to REJECTED.
- **Block buyer:** move to BLOCKED state, prevent future auto-approval.
- **Revoke access:** move from APPROVED to REVOKED.
- **Suspend access:** move from APPROVED to SUSPENDED.
- **Set approval requirement:** supplier can flag catalog/price/RFQ as requiring explicit approval.

**Allowlist Scope Decision:**
- Supplier can configure per-product whether approval is required.
- Supplier can configure per-price-level whether approval is required.
- Supplier can configure RFQ acceptance requirements (open vs. approved-only).

**Default Behavior:**
- If no relationship exists and supplier requires approval, default to NONE → buyer must request.
- If relationship is APPROVED, default to access granted.
- If relationship is REJECTED, BLOCKED, SUSPENDED, or EXPIRED, default to deny.
- Ambiguity defaults to deny (fail-safe posture).

---

## 8. Relationship-Scoped Catalog Visibility

Conceptual catalog visibility scoping by relationship:

**Visibility Tiers:**

1. **PUBLIC:** All authenticated buyers see product; no relationship required.
   - Available to all buyers regardless of relationship state.
   - Standard discovery path.

2. **AUTHENTICATED_ONLY:** Only authenticated buyers (no relationship required).
   - Visible to any logged-in buyer.
   - Still subject to price-disclosure rules.

3. **APPROVED_BUYER_ONLY:** Only relationship-APPROVED buyers see product.
   - Requires APPROVED relationship state with supplier.
   - Invisible to NONE, REQUESTED, REJECTED, BLOCKED, SUSPENDED, EXPIRED states.
   - No product metadata leaked to unapproved buyers.

4. **HIDDEN:** Supplier-private product; no buyer exposure.
   - Not discoverable in any buyer catalog view.
   - Not returned in search results.
   - Supplier-internal reference only.

5. **REGION_CHANNEL_SENSITIVE:** Relationship-scoped by region or sales channel (future boundary).
   - Deferred to future authorized unit.
   - Placeholder for multi-region/channel supplier strategies.

**Visibility Enforcement:**
- Visibility filtering is server-side only.
- Client cannot forge or bypass visibility rules.
- Unapproved buyers receive non-disclosing "not found" for hidden/approved-only products.
- No leakage of existence through API error messages.
- Catalog count/metadata must not reveal hidden product count.

**Integration with Catalog/PDP:**
- PDP route returns 404 or non-disclosing deny if buyer lacks required relationship.
- Catalog search/browse respects visibility tier filtering.
- No product metadata in error responses.

---

## 9. Price Disclosure Integration Boundary

Relationship integration with completed price-disclosure model:

**Price Visibility Policies:**

1. **VISIBLE:** Price shown to any authenticated buyer (no relationship gate).
   - Subject to existing price-disclosure rules only.
   - RFQ relationship access does not restrict this.

2. **RELATIONSHIP_ONLY:** Price visible only to APPROVED buyers.
   - Price hidden from NONE, REQUESTED, REJECTED, BLOCKED, SUSPENDED, EXPIRED.
   - Price state shows "request access" or "request quote" CTA.
   - No actual price value leaked in API/frontend.

3. **HIDDEN:** Price suppressed even from approved buyers (existing behavior preserved).
   - `HIDDEN` policy remains unchanged by this unit.
   - Supplier internal price; no buyer exposure.

**Integration Rules:**
- RELATIONSHIP_ONLY becomes meaningful only after this unit is authorized for implementation.
- Price-disclosure resolver must consult relationship state before exposing RELATIONSHIP_ONLY prices.
- Missing or NONE relationship state defaults to price suppression for RELATIONSHIP_ONLY items.
- No automatic price visibility on relationship approval; approval must occur first.
- No price leakage through RFQ prefill, notifications, logs, or indexing.

**Fail-Safe Posture:**
- Ambiguous relationship state → suppress price.
- No partial price exposure (e.g., "price available on request" is not a price reveal).
- Price-disclosure evaluation must happen server-side; client cannot negotiate.

---

## 10. RFQ Integration Boundary

Relationship effects on RFQ workflows:

**RFQ Access Gating:**
- Supplier can configure whether RFQ is open to all buyers or approved-buyers-only.
- If supplier requires relationship, RFQ submit from NONE/REQUESTED/REJECTED/BLOCKED buyers fails with safe error.
- APPROVED buyers may submit RFQs where policy permits.
- SUSPENDED/EXPIRED buyers cannot submit RFQs.

**RFQ Submit Failure Semantics:**
- Non-approved buyer submitting to relationship-gated supplier receives non-disclosing "request access first" or similar.
- No RFQ record is created if buyer lacks required relationship.
- Supplier is not notified of rejected RFQ submissions.
- Buyer receives guidance to request relationship access if available.

**RFQ Prefill Boundary:**
- RFQ prefill (from PDP) must not expose relationship state to client.
- PDP route itself must gate if catalog/product requires relationship.
- RFQ submit route must validate relationship independently.

**Existing RFQ Boundaries Preserved:**
- Explicit buyer action remains required (no automatic RFQ creation).
- Tenant isolation (`org_id`) is unaffected.
- RFQ data isolation and supplier notification remain unchanged.

---

## 11. Anti-Competition Safeguards

Design boundaries to prevent misuse of relationship layer:

**Unauthorized Access Prevention:**
- Competitor buyers cannot access restricted supplier products through relationship approval bypass.
- Supplier must have explicit control to block suspicious buyers.
- No automatic inference of buyer legitimacy (future AI boundary only).

**Relationship Graph Privacy:**
- Supplier-to-buyer relationship graph is not publicly exposed.
- Buyer cannot discover unrelated supplier-buyer relationships.
- No API endpoint exposes "list of suppliers who approve this buyer" or vice versa.
- Relationship existence is supplier-private unless buyer is a party to the relationship.

**Allowlist Privacy:**
- Supplier allowlist is not publicly discoverable.
- Buyer cannot learn which other buyers are approved by a supplier.
- Supplier cannot see unapproved buyers' access requests from other suppliers.

**Audit Trail Security:**
- Relationship change audit logs are internal-only.
- No audit detail exposed to buyers or public.
- Suppressed reasons (e.g., "competitor detected") remain internal.

**Error Message Safety:**
- Rejected/blocked access errors must not reveal reason beyond "access denied."
- No disclosure of competitor status, risk scores, or approval criteria.
- No hints about availability through alternative channels.

**Buyer/Supplier Ranking Protection:**
- No public "trust score" or "approval rate" for buyers or suppliers.
- No ranking or rating exposed from relationship approvals.
- No inference from approval patterns.

---

## 12. Buyer Eligibility / Verification Boundary

Relationship access inputs and eligibility criteria:

**Required Buyer Context:**
- Authenticated buyer identity (user).
- Buyer organization identity (`org_id`).
- Buyer role/permission within organization (future boundary; basic auth sufficient now).

**Buyer Verification Status:**
- Email verified (existing Supabase auth state).
- Organization verified (future boundary).
- Business license / legal entity verified (future boundary; not blocking v1).
- KYC/Know-Your-Customer status (future boundary).

**Supplier Approval Status:**
- Current relationship state with supplier.
- Approval decision timestamp.
- Approval context / reason (internal metadata).

**Future Trust Tier / Relationship Score:**
- No buyer scoring, ranking, or trust tier in this unit.
- No automatic relationship scoring based on behavior.
- Relationship approval is explicit supplier decision only.
- Explicit future boundary for AI-assisted relationship scoring.

**Eligibility Evaluation:**
- Server-side only; no client-negotiable eligibility.
- Deterministic: same buyer org + same supplier = same decision.
- No race conditions in eligibility check during concurrent RFQ submits.

---

## 13. Supplier Controls Boundary

Conceptual supplier-facing controls for relationship management:

**Access Controls:**
- **Approve buyer:** supplier explicitly grants APPROVED status to buyer org.
- **Reject buyer:** supplier denies REQUESTED access; buyer can reapply.
- **Block buyer:** supplier permanently blocks buyer org; no automatic unblock.
- **Revoke relationship:** supplier moves APPROVED back to REVOKED; buyer must reapply.
- **Suspend relationship:** supplier temporarily suspends APPROVED; later resume.

**Allowlist Configuration:**
- **Enable/disable approval requirement:** supplier can toggle whether catalog item/price/RFQ requires pre-approval.
- **Set approval deadline:** supplier can set optional expiry for approved relationships.
- **Set per-product approval:** supplier can require approval for specific sensitive products only.
- **Set per-price-level approval:** supplier can require approval only for certain price tiers.

**Notification Configuration:**
- **On access request:** supplier optionally notified when buyer requests access (implementation deferred).
- **On RFQ submit:** supplier notified only on approved-buyer RFQ (existing behavior).

**Audit Controls:**
- Supplier can view relationship history with buyer (implementation deferred).
- View access approval/rejection decisions with timestamps (implementation deferred).
- View RFQ submission attempts by relationship status (future capability).

---

## 14. Access Request Lifecycle

Conceptual lifecycle of buyer-initiated access request:

**Phase 1: Request Initiation**
- Buyer (authenticated, org-scoped) submits explicit access request to supplier.
- Request includes: buyer org identity, optional message, request timestamp.
- Request moves to REQUESTED state.
- Buyer receives confirmation that request is pending.

**Phase 2: Supplier Review**
- Supplier is notified of pending request (implementation detail; deferred).
- Supplier can review buyer org metadata (if available).
- Supplier reviews on supplier dashboard (UI deferred).

**Phase 3: Supplier Decision**
- Supplier approves → relationship moves to APPROVED.
- Supplier rejects → relationship moves to REJECTED.
- Supplier blocks → relationship moves to BLOCKED.
- Decision is recorded with timestamp and optional reason (internal).

**Phase 4: Buyer Notification** (Deferred)
- Buyer notified of decision (implementation deferred).
- Non-disclosing messaging for rejections/blocks.

**Phase 5: Access Activation** (Approved Only)
- On APPROVED, buyer may now access approved-buyer-only catalog items.
- Buyer may see RELATIONSHIP_ONLY prices.
- Buyer may submit RFQs (if supplier permits).

**Phase 6: Lifecycle Maintenance**
- Supplier can revoke, suspend, or update approval at any time.
- Expiry (if configured) automatically moves relationship to EXPIRED.
- Buyer can request renewal if expired or rejected.

**Audit Trail:**
- All state transitions recorded: who, when, previous state, new state.
- Reason (if provided) recorded as internal metadata.
- Audit visible to authorized internal users only (implementation deferred).

---

## 15. Data / Contract Planning — Conceptual Only

**Design-only conceptual data models; NOT implemented in this unit.**

```ts
// Relationship state domain entity (conceptual)
interface BuyerSupplierRelationship {
  id: string;
  supplier_org_id: string;
  buyer_org_id: string;
  state: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
  created_at: ISO8601;
  updated_at: ISO8601;
  approved_at?: ISO8601 | null;
  requested_at?: ISO8601 | null;
  expires_at?: ISO8601 | null;
  reason?: string | null; // internal only
  metadata?: Record<string, unknown>; // internal audit context
}

// Buyer's access request to supplier (conceptual)
interface RelationshipAccessRequest {
  id: string;
  supplier_org_id: string;
  buyer_org_id: string;
  request_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  requested_at: ISO8601;
  decided_at?: ISO8601 | null;
  decided_by?: string | null; // supplier user or system
  decision_reason?: string | null; // internal only
  buyer_message?: string | null; // buyer's optional context
  supplier_response_message?: string | null; // internal only
}

// Supplier allowlist entry (conceptual)
interface SupplierBuyerAllowlistEntry {
  id: string;
  supplier_org_id: string;
  buyer_org_id: string;
  status: 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED';
  approved_at?: ISO8601 | null;
  expires_at?: ISO8601 | null;
  approval_scope: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_PRICES'; // scope decision
  specific_product_ids?: string[] | null; // if scoped to products
  specific_price_tiers?: string[] | null; // if scoped to price levels
}

// Catalog item visibility policy (conceptual)
interface CatalogItemVisibilityPolicy {
  item_id: string;
  supplier_org_id: string;
  visibility_tier: 'PUBLIC' | 'AUTHENTICATED_ONLY' | 'APPROVED_BUYER_ONLY' | 'HIDDEN' | 'REGION_CHANNEL_SENSITIVE';
  requires_relationship_approval: boolean;
  required_state?: 'APPROVED' | null; // if requires_relationship_approval
}

// Price disclosure policy scoped by relationship (conceptual)
interface RelationshipScopedPricePolicy {
  item_id: string;
  supplier_org_id: string;
  price_visibility_policy: 'VISIBLE' | 'RELATIONSHIP_ONLY' | 'HIDDEN';
  requires_relationship_approval?: boolean; // for RELATIONSHIP_ONLY
  required_relationship_state?: 'APPROVED' | null;
}

// RFQ relationship gate policy (conceptual)
interface RfqRelationshipGatePolicy {
  supplier_org_id: string;
  rfq_acceptance_mode: 'OPEN_TO_ALL' | 'APPROVED_BUYERS_ONLY';
  allows_unapproved_inquiry?: boolean; // future: pre-approved inquiry without RFQ
}

// Relationship access decision result (conceptual)
interface RelationshipAccessDecision {
  buyer_org_id: string;
  supplier_org_id: string;
  has_approved_relationship: boolean;
  current_state: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
  can_access_catalog: boolean;
  can_view_relationship_only_prices: boolean;
  can_submit_rfq: boolean;
  denial_reason?: string | null; // non-disclosing for client
}

// Relationship audit event (conceptual; internal only)
interface RelationshipAuditEvent {
  id: string;
  supplier_org_id: string;
  buyer_org_id: string;
  event_type: 'REQUEST_SUBMITTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'REVOKED' | 'SUSPENDED' | 'RESUMED' | 'EXPIRED';
  previous_state: string;
  new_state: string;
  triggered_by: 'BUYER' | 'SUPPLIER' | 'SYSTEM' | 'ADMIN';
  triggered_by_user_id?: string | null;
  reason?: string | null;
  timestamp: ISO8601;
  metadata?: Record<string, unknown>;
}

// Client-facing relationship status (safe to expose to buyer)
interface BuyerRelationshipStatus {
  supplier_org_id: string;
  current_state: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'SUSPENDED' | 'EXPIRED';
  requested_at?: ISO8601 | null;
  approved_at?: ISO8601 | null;
  can_request_access: boolean;
  can_submit_rfq: boolean;
  message: string; // localized, non-disclosing if rejected/blocked
}
```

---

## 16. Backend Design Considerations

Future implementation service boundaries and architecture:

**Service Layer:**
- **RelationshipService:** manage relationship state transitions, approvals, blocks, suspensions.
- **AllowlistService:** evaluate buyer access based on allowlist policy.
- **AccessDecisionService:** deterministic access decision for buyer + supplier given relationship state + policy.
- **VisibilityFilterService:** filter catalog/price results by relationship state.
- **RfqAccessGateService:** validate RFQ submit permission by relationship state.
- **AuditService:** record relationship changes for internal audit trail.

**Route-Level Validation:**
- All tenant-scoped endpoints validate buyer `org_id` from auth context.
- Relationship check happens server-side before any resource access.
- No relationship state stored on client.
- No client-negotiable access decision.

**Policy Evaluation Order (Conceptual):**
1. Authenticate buyer and load `org_id`.
2. Resolve supplier for requested resource.
3. Query current relationship state with supplier.
4. Evaluate relationship-scoped visibility policy.
5. Evaluate relationship-scoped price policy (if applicable).
6. Evaluate RFQ access gate (if RFQ route).
7. Return access decision or deny with safe error.

**Tenant-Safe Lookups:**
- Product lookup is org-scoped by supplier `org_id`.
- Supplier lookup is unambiguous (no cross-org supplier references).
- Relationship lookup is always (supplier, buyer) tuple.
- No implicit tenant switching.

**Audit Requirements:**
- All relationship state changes are recorded atomically.
- Audit includes: old state, new state, triggering user/system, timestamp, reason (if applicable).
- Audit is immutable and internal-only.

**Failure Semantics:**
- Missing relationship → treat as NONE state → deny access.
- Ambiguous relationship → default to deny.
- Database error → fail-safe deny.
- No partial access on validation error.

**Integration Points:**
- PDP route must check relationship before returning catalog/product metadata.
- Price-disclosure resolver must check relationship state before exposing RELATIONSHIP_ONLY prices.
- RFQ submit route must validate relationship gate before accepting submit.
- Catalog search/browse must filter results by visibility tier + relationship state.
- Product list API must apply relationship scoping.

---

## 17. Frontend Design Considerations

Future UI/UX considerations for relationship access layer:

**Buyer-Facing Surfaces:**

**Catalog / Search Results:**
- Unapproved buyers see "request access" CTA instead of approved-only products.
- No product metadata or existence hints for hidden/approved-only items.
- Clear messaging: "This supplier requires access approval."

**Product Detail Page (PDP):**
- If product requires relationship: show access-request CTA instead of price/RFQ.
- Non-disclosing messaging: "Request access to see this product."
- Buyer can initiate access request inline or navigate to relationship management.
- If already approved: normal PDP flow (RFQ, price visibility, etc.).

**Price Display:**
- If price is RELATIONSHIP_ONLY and buyer not approved: show "request access" instead of price.
- No price value hints or partial disclosure.
- Clear CTA to request supplier relationship.

**RFQ Flow:**
- Before RFQ submit: validate relationship state.
- If supplier requires approval and buyer not approved: show "request access first" message.
- Prevent RFQ submit for unapproved buyers; redirect to access request.

**Relationship Management Hub** (Deferred UI):
- Buyer can view pending access requests to suppliers.
- Buyer can view approved supplier relationships.
- Buyer can view rejected/blocked suppliers (with non-disclosing messaging).
- Buyer can resubmit access request (if not blocked).
- Buyer can withdraw pending request.

**Error States:**
- "Access Denied" — supplier requires approval; offer access request.
- "Relationship Blocked" — supplier has blocked access; non-disclosing denial.
- "Request Pending" — awaiting supplier decision.
- "Request Expired" — previous rejection; buyer can reapply.

**Accessibility & Localization:**
- All relationship states have localized, accessible labels.
- Error messages are keyboard/screen-reader accessible.
- No reliance on color alone to indicate relationship state.
- Localized messaging for all supported languages.

---

## 18. Audit / Governance Requirements

Future audit trail requirements for relationship access layer:

**Audit Events to Record:**
- Relationship state change: NONE → REQUESTED.
- Relationship decision: REQUESTED → APPROVED/REJECTED/BLOCKED.
- Relationship state change: APPROVED → REVOKED/SUSPENDED.
- Relationship resumption: SUSPENDED → APPROVED.
- Relationship expiry: APPROVED → EXPIRED.
- Access request withdrawal: REQUESTED → (canceled, internal state).

**Audit Metadata:**
- Event timestamp (UTC).
- Triggering actor: buyer org, supplier org, platform admin, or system.
- Old state and new state.
- Decision reason (if applicable; internal only).
- Approver/rejector user ID (if human decision).
- Request ID or relationship ID.

**Audit Visibility:**
- Internal-only: no audit exposure to buyers or suppliers.
- Platform admin/governance user can query audit events.
- Audit logs are immutable and cannot be deleted.
- No retention policy; audit events remain indefinitely (or per regulatory requirement).

**Audit Query Capability (Future):**
- List all relationship decisions by supplier.
- List all relationship decisions by buyer.
- List all changes to a specific relationship.
- Export audit trail for governance/compliance review.

---

## 19. Tenant Isolation Requirements

The design must preserve and enforce:

**Cross-Tenant Access Prevention:**
- Buyer org cannot view another buyer org's relationships with suppliers.
- Buyer org cannot discover which suppliers are open to other buyers.
- Supplier org cannot view buyer-supplier relationships with other suppliers.
- No cross-org relationship visibility.

**Server-Side Enforcement:**
- All relationship checks are server-side; client cannot negotiate.
- Relationship state never exposed to wrong org.
- No API endpoint returns relationships for unrelated orgs.
- Relationship lookup always scoped to authenticated org.

**Access Denied Posture:**
- If buyer org differs from authenticated org → deny.
- If supplier org differs from route context → deny.
- If relationship state missing → treat as NONE → deny access.
- No partial access on org mismatch.

**Catalog/Price/RFQ Isolation:**
- Catalog visibility filtering respects buyer `org_id`.
- Price visibility filtering respects buyer `org_id`.
- RFQ access gate respects buyer `org_id`.
- Supplier org reference is always verified server-side.

**No Implicit Tenant Switching:**
- Buyer cannot switch orgs via query parameter or header manipulation.
- Org is derived from authenticated user context only.
- No "become org" or "act as org" functionality.

---

## 20. Security / Anti-Leakage Requirements

The design must prevent information leakage and misuse:

**Relationship State Leakage:**
- Relationship existence not exposed to unauthorized buyers/suppliers.
- Relationship state not guessable via timing attack or error code.
- No API that lists "all suppliers approved by this buyer" or vice versa.

**Supplier Allowlist Leakage:**
- Allowlist members are not publicly discoverable.
- No endpoint that lists "all buyers approved by this supplier."
- Approved buyer count not exposed to other buyers.

**Relationship Graph Leakage:**
- Supplier-to-buyer graph not reconstructable from public endpoints.
- No inference of relationships through search result rankings or product availability.
- No relationship hints through error messages.

**Buyer/Supplier Metadata Leakage:**
- Buyer org name/details not exposed in relationship responses to unrelated suppliers.
- Supplier org internals not exposed in relationship responses to buyers.
- No business metadata in API responses beyond safe relationship state.

**Hidden Catalog Leakage:**
- Hidden/approved-only products not listed in search results for unapproved buyers.
- Product count/total results count does not hint at hidden products.
- No "similar products" recommendations that reveal hidden items.

**Hidden Price Leakage:**
- RELATIONSHIP_ONLY prices never exposed to unapproved buyers.
- No partial price hints ("from $X" where X is hidden).
- No price-related error codes that leak price tier existence.
- Price field missing from API response (not null, not "hidden"; simply absent).

**RFQ Bypass Prevention:**
- RFQ submit validation independent of frontend checks.
- Server revalidates relationship gate on RFQ submit; no client-side skip.
- Prefilled RFQ context does not include relationship state.
- Supplier never notified of rejected RFQ submissions.

**Notification Leakage (Deferred):**
- Supplier not notified of unapproved buyer activity.
- Buyer not notified of supplier approval attempts or reason codes.
- Notification timing does not hint at relationship status.

**Audit Leakage:**
- Audit logs completely internal.
- No audit event IDs or details exposed to buyers/suppliers.
- Suppressed reasons (e.g., "competitor detected") remain internal.
- No audit trail hints through error responses.

**Error Message Safety:**
- "Access Denied" — no hint of reason (approval, block, expiry, etc.).
- "Not Found" — for hidden products (same response as non-existent product).
- "Unauthorized" — for RFQ submit by unapproved buyer (not "relationship required").
- No product existence hints in error messages.
- No supplier details in error messages.

---

## 21. DPP / Compliance Boundary

DPP/compliance integration with relationship access layer:

**DPP Remains Separate:**
- DPP publication is not triggered by relationship approval.
- DPP passport status is independent of relationship approval.
- Relationship does not auto-publish or promote DPP.

**Compliance References in RFQ Context:**
- If RFQ or catalog item includes compliance/certification references, these remain subject to existing safety rules.
- Compliance references exposed only where already safe and buyer-visible.
- No unpublished compliance evidence exposed via relationship.

**No AI Draft Leakage:**
- AI draft extraction data does not leak to buyers through relationship layer.
- Compliance evidence remains human-reviewed and published before exposure.
- No draft-in-progress metadata exposed.

**Future Compliance Scoping (Explicit Future Boundary):**
- Supplier may later restrict certain compliance/DPP access to approved-only buyers.
- This would be a future policy extension, not part of this unit.
- Human review remains required before any compliance claims are published.

---

## 22. Future AI Matching Boundary

Explicit statements on what is NOT in this unit:

**No AI Matching in This Unit:**
- No AI supplier recommendation based on buyer profile.
- No AI buyer recommendation based on supplier profile.
- No machine learning relationship scoring or trust tier.
- No automated approval suggestions.
- No buyer/supplier ranking or similarity scoring.

**Future AI Boundary (Explicit Future Unit):**
- After relationship access layer is stable, future unit may introduce AI-assisted supplier matching.
- AI matching must consume only approved, safe, tenant-scoped signals.
- AI output (recommendations, scores) must be internal-only; no public exposure.
- AI recommendations must not bypass relationship controls.
- No AI confidence scores shown to buyers or suppliers.
- All AI-assisted decisions subject to human review before implementation.

**Current Unit Scope:**
- Deterministic, policy-driven relationship access only.
- No statistical inference.
- No behavioral scoring.
- No buyer/supplier ranking.

---

## 23. Migration Considerations

Conceptual database schema planning (design-only; NOT implemented):

**Future Table Structures (If Authorized):**

```sql
-- Buyer-supplier relationships (conceptual)
CREATE TABLE buyer_supplier_relationships (
  id UUID PRIMARY KEY,
  supplier_org_id UUID NOT NULL,
  buyer_org_id UUID NOT NULL,
  state VARCHAR(50) NOT NULL CHECK (state IN ('NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'BLOCKED', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  requested_at TIMESTAMP,
  expires_at TIMESTAMP,
  reason TEXT, -- internal only
  metadata JSONB, -- internal audit context
  UNIQUE(supplier_org_id, buyer_org_id)
);
CREATE INDEX idx_buyer_supplier_relationships_supplier ON buyer_supplier_relationships(supplier_org_id);
CREATE INDEX idx_buyer_supplier_relationships_buyer ON buyer_supplier_relationships(buyer_org_id);
CREATE INDEX idx_buyer_supplier_relationships_state ON buyer_supplier_relationships(state);

-- Supplier allowlist policies (conceptual)
CREATE TABLE supplier_allowlist_policies (
  id UUID PRIMARY KEY,
  supplier_org_id UUID NOT NULL,
  buyer_org_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'BLOCKED', 'SUSPENDED')),
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  approval_scope VARCHAR(50) NOT NULL DEFAULT 'ALL_PRODUCTS',
  specific_product_ids UUID[], -- array of product IDs if scoped
  specific_price_tiers VARCHAR(50)[], -- array of price tier labels if scoped
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_org_id, buyer_org_id)
);

-- Catalog item visibility policies (conceptual)
CREATE TABLE catalog_item_visibility_policies (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL,
  supplier_org_id UUID NOT NULL,
  visibility_tier VARCHAR(50) NOT NULL CHECK (visibility_tier IN ('PUBLIC', 'AUTHENTICATED_ONLY', 'APPROVED_BUYER_ONLY', 'HIDDEN', 'REGION_CHANNEL_SENSITIVE')),
  requires_relationship_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(item_id)
);

-- Price disclosure policies scoped by relationship (conceptual)
CREATE TABLE price_relationship_policies (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL,
  supplier_org_id UUID NOT NULL,
  price_visibility_policy VARCHAR(50) NOT NULL CHECK (price_visibility_policy IN ('VISIBLE', 'RELATIONSHIP_ONLY', 'HIDDEN')),
  requires_relationship_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(item_id)
);

-- RFQ relationship gate policies (conceptual)
CREATE TABLE rfq_relationship_gate_policies (
  id UUID PRIMARY KEY,
  supplier_org_id UUID NOT NULL UNIQUE,
  rfq_acceptance_mode VARCHAR(50) NOT NULL CHECK (rfq_acceptance_mode IN ('OPEN_TO_ALL', 'APPROVED_BUYERS_ONLY')) DEFAULT 'OPEN_TO_ALL',
  allows_unapproved_inquiry BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Relationship audit trail (conceptual; internal only)
CREATE TABLE relationship_audit_events (
  id UUID PRIMARY KEY,
  supplier_org_id UUID NOT NULL,
  buyer_org_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  previous_state VARCHAR(50),
  new_state VARCHAR(50),
  triggered_by VARCHAR(50) NOT NULL CHECK (triggered_by IN ('BUYER', 'SUPPLIER', 'SYSTEM', 'ADMIN')),
  triggered_by_user_id UUID,
  reason TEXT, -- internal only
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,
  relationship_id UUID
);
CREATE INDEX idx_relationship_audit_supplier ON relationship_audit_events(supplier_org_id);
CREATE INDEX idx_relationship_audit_buyer ON relationship_audit_events(buyer_org_id);
CREATE INDEX idx_relationship_audit_timestamp ON relationship_audit_events(timestamp);
```

**Migration Planning Notes:**
- All future schema changes must use Prisma migration ledger only.
- No manual SQL execution; all migrations must be applied via `pnpm -C server exec prisma migrate deploy`.
- Known repo risk: historical Prisma shadow replay blocker for `migrate dev` remains; future implementation must not attempt `migrate dev` without separate approval.
- RLS policies on new tables must be designed to enforce tenant isolation (`org_id` scoping).
- Indexes on frequently queried fields (`supplier_org_id`, `buyer_org_id`, `state`) for performance.
- Audit table retention policy to be determined by governance team.

---

## 24. Test Strategy for Future Implementation

Planned tests for relationship access control enforcement:

**Buyer Access Request Tests:**
- Buyer submits access request to supplier; relationship moves to REQUESTED.
- Buyer cannot submit duplicate request without supplier resolution.
- Buyer can withdraw pending request.

**Supplier Approval Workflow Tests:**
- Supplier approves buyer; relationship moves to APPROVED.
- Supplier rejects buyer; relationship moves to REJECTED.
- Supplier blocks buyer; relationship moves to BLOCKED.
- Supplier revokes approved buyer; relationship moves to REVOKED.
- Supplier suspends approved buyer; relationship moves to SUSPENDED.
- Supplier resumes suspended buyer; relationship moves back to APPROVED.

**Catalog Visibility Tests:**
- Approved buyer sees APPROVED_BUYER_ONLY products.
- Unapproved buyer (NONE, REQUESTED, REJECTED, BLOCKED, SUSPENDED, EXPIRED) does not see APPROVED_BUYER_ONLY products.
- PUBLIC and AUTHENTICATED_ONLY products visible to all authenticated buyers regardless of relationship.
- HIDDEN products not discoverable by any buyer.

**Price Visibility Tests:**
- Approved buyer sees RELATIONSHIP_ONLY prices.
- Unapproved buyer does not see RELATIONSHIP_ONLY prices (price field absent or suppressed).
- Visible prices shown to all authenticated buyers (no relationship gate).
- Hidden prices remain hidden even to approved buyers.

**RFQ Access Gate Tests:**
- RFQ submit blocked for unapproved buyer if supplier requires relationship.
- RFQ submit allowed for approved buyer if supplier allows RFQ.
- RFQ submit blocked for suspended/expired/rejected buyer.
- Non-disclosing error message for blocked RFQ.
- Supplier not notified of rejected RFQ submissions.

**Tenant Isolation Tests:**
- Buyer org A cannot view relationships of buyer org B.
- Buyer org A cannot submit RFQ on behalf of buyer org B.
- Supplier org cannot view relationships with unrelated suppliers.
- Cross-tenant access attempts fail with deny (not information leak).

**Allowlist Privacy Tests:**
- Supplier allowlist members not discoverable via API.
- Buyer cannot learn which other buyers are approved by supplier.
- Supplier cannot learn about other suppliers' approvals of same buyer.
- No leakage of allowlist through catalog search or API error.

**Relationship Graph Privacy Tests:**
- No endpoint returns full supplier-to-buyer relationship graph.
- No endpoint returns buyer-to-supplier relationship list.
- Relationship status only returned to parties to the relationship.

**Audit Event Tests:**
- Audit event created for each state transition.
- Audit event records: old state, new state, actor, timestamp.
- Audit events immutable; cannot be modified or deleted.
- Audit events not exposed to buyers/suppliers (internal only).

**Error Messaging Tests:**
- Rejection error is non-disclosing (not "competitor" or internal reason).
- Block error is non-disclosing.
- Access denied error does not hint at reason or availability.
- Product not found error same for hidden products as non-existent products.

**Expiry and Suspension Tests:**
- Expired relationships automatically suppress access on timestamp check.
- Suspended relationships suppress access until resumed.
- Expired relationships allow buyer to reapply.
- Suspended relationships cannot be accessed but can be resumed by supplier.

**No Client-Forged State Tests:**
- Client cannot set relationship state directly.
- Client cannot bypass relationship gate via header/query parameter.
- Org ID derived from auth context only; not client-negotiable.
- Token expiry/revocation checked server-side independent of cached state.

---

## 25. Runtime Verification Plan for Future Implementation

Planned runtime checks after implementation authorization:

**Buyer Access Request Flow:**
- Buyer can submit access request to supplier.
- Request appears in supplier dashboard (future UI).
- Supplier can approve/reject/block request.
- Buyer notified of decision (if notification implemented).

**Supplier Approval Flow:**
- Supplier can approve buyer; relationship moves to APPROVED.
- Approved buyer can now access APPROVED_BUYER_ONLY products.
- Approved buyer can see RELATIONSHIP_ONLY prices.
- Approved buyer can submit RFQs.

**PDP Relationship-Gated Catalog Behavior:**
- PDP returns product for approved buyer.
- PDP returns 404 or non-disclosing deny for unapproved buyer.
- No product metadata leaked in error response.
- Prefilled RFQ does not expose relationship state.

**Price Disclosure Relationship-Only Behavior:**
- RELATIONSHIP_ONLY prices visible to approved buyers.
- RELATIONSHIP_ONLY prices hidden from unapproved buyers.
- Price field absent from API response (not null).
- Price CTA shows "request access" for unapproved buyers.

**RFQ Relationship-Gated Behavior:**
- RFQ submit succeeds for approved buyer.
- RFQ submit fails for unapproved buyer with safe error.
- Supplier notified of approved-buyer RFQ (existing behavior).
- No notification sent for rejected unapproved-buyer RFQ.

**Cross-Tenant Isolation:**
- Buyer org A cannot access relationships of buyer org B.
- Supplier org A cannot access relationships with buyer org B managed by supplier org C.
- Probe with wrong `org_id` returns deny, not leak.

**Supplier Allowlist Privacy:**
- No API endpoint returns list of approved buyers.
- Approved buyer count not exposed to other buyers.
- Allowlist members not discoverable via search or enumeration.

**Logs and Payloads Anti-Leakage:**
- Relationship state not logged in client-visible debug info.
- API payloads do not include internal audit reason.
- Error logs do not include suppressed relationship reasons.

**Production Health:**
- Catalog browse/search remains performant with relationship filtering.
- Price disclosure resolver latency acceptable with relationship lookups.
- RFQ submit performance not degraded by relationship validation.
- No database deadlocks on concurrent relationship state updates.

**Rollback Safety:**
- If relationship layer is disabled, all buyers default to public access.
- No residual relationship state blocks production access.
- Fallback to unauthenticated-level access (safe degradation).

---

## 26. Open Questions

1. **Relationship Expiry Default:** Should approved relationships have an automatic expiry window (e.g., 1 year), or remain indefinite until supplier revokes?

2. **Buyer Reapply Window:** If supplier rejects buyer's access request, how long should buyer wait before reapplying (immediate, 30 days, supplier-configurable)?

3. **Supplier Notification on Access Request:** Should supplier receive real-time notification of buyer access requests, or should requests be visible only in a dashboard?

4. **Buyer Notification on Decision:** Should buyer receive email/in-app notification when supplier approves/rejects/blocks, or silent API state only?

5. **Allowlist Inheritance:** If buyer org is already approved by supplier for certain products, should new products inherit the approval or require separate approval?

6. **Competitor Detection:** Should future relationship scoring include competitor inference, or remain explicitly out of scope for this unit?

7. **Multi-Supplier Buyer Orchestration:** If buyer is approved by supplier A and blocked by supplier B, should there be UI guidance or "find alternatives"?

8. **Relationship Revocation Notice:** If supplier revokes buyer access, should buyer be notified proactively, or silently denied on next access?

9. **Audit Retention:** Should relationship audit events be retained indefinitely or subject to regulatory data-retention policy?

10. **Supplier Role Separation:** Should different supplier roles (admin, sales, data analyst) have separate approval/block permissions?

11. **Relationship API Quotas:** Should there be rate-limiting on access request submissions to prevent spam?

12. **Region/Channel Scoping:** Should relationship layer support region or sales-channel scoping in v1, or defer to future unit?

---

## 27. Recommended Implementation Slices

Recommended slices for future authorized implementation:

- **Slice A:** Relationship access decision contract and server-side evaluator service.
  - Core access decision logic: given (buyer_org_id, supplier_org_id, policy), return access grant/deny.
  - Deterministic, testable, side-effect-free.

- **Slice B:** Persistent relationship storage and state management (if authorized).
  - Database schema (conceptual in this unit).
  - Prisma schema changes and migrations.
  - Relationship CRUD operations.

- **Slice C:** Supplier allowlist and approval service.
  - Supplier-side controls for approving/rejecting/blocking buyers.
  - Allowlist policy storage and query.
  - Audit trail recording.

- **Slice D:** PDP/catalog visibility integration.
  - Catalog filtering by relationship visibility tier.
  - PDP route relationship gating.
  - Search result filtering.

- **Slice E:** Price disclosure RELATIONSHIP_ONLY integration.
  - Price resolver integration with relationship state.
  - RELATIONSHIP_ONLY price suppression for unapproved buyers.
  - API response shaping (price field absent).

- **Slice F:** RFQ relationship gate integration.
  - RFQ submit validation by relationship state.
  - Relationship-gated RFQ policies per supplier.
  - Error handling and messaging.

- **Slice G:** Buyer/supplier tenant isolation tests and validation.
  - Comprehensive tenant isolation test suite.
  - Cross-tenant probe tests.
  - Allowlist privacy tests.

- **Slice H:** Runtime verification and governance closure.
  - Production validation of all relationship flows.
  - Allowlist privacy verification.
  - Performance and scaling verification.
  - Governance sign-off.

---

## 28. Completion Checklist

- [x] Design artifact created for TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001
- [x] Artifact explicitly marked DESIGN ONLY
- [x] No backend/frontend/schema/migration implementation files changed
- [x] No relationship access logic implemented
- [x] No allowlist records or relationship records created
- [x] No PDP, price-disclosure, or RFQ runtime behavior changed
- [x] Relationship Access Problem Statement documented
- [x] Relationship state model defined conceptually
- [x] Allowlist / approved buyer model covered
- [x] Relationship-scoped catalog visibility model covered
- [x] Price disclosure integration boundary documented
- [x] RFQ integration boundary documented
- [x] Anti-competition safeguards covered
- [x] Buyer eligibility / verification boundary covered
- [x] Supplier controls boundary covered
- [x] Access request lifecycle documented
- [x] Tenant isolation requirements documented
- [x] Security / anti-leakage requirements documented
- [x] DPP / compliance boundary documented
- [x] Future AI matching boundary explicitly deferred
- [x] Migration considerations (schema, conceptual only) documented
- [x] Test strategy for future implementation documented
- [x] Runtime verification plan documented
- [x] Open questions list included
- [x] Recommended implementation slices documented
- [x] All 28 sections completed

---

*Design artifact created: 2026-04-28*  
*Unit: TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001*  
*Mode: DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED*
