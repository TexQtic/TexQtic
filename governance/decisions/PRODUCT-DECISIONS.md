# PRODUCT-DECISIONS.md — Product Decision Ledger

**Layer:** 2 — Decision Ledger
**Authority:** GOV-OS-001-DESIGN.md (Section 3.4)
**Last Updated:** 2026-03-19 (GOV-RECORD-PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE)

> This file owns all product scope decisions that gate governed units.
> A DEFERRED unit MUST NOT be treated as implementation-ready due to the existence of
> a placeholder entry here. Only `Status: DECIDED` with explicit operator approval
> constitutes authorization. The unit's own record and Layer 0 must then be updated.

---

## Decision Status Vocabulary

| Status | Meaning |
|---|---|
| `OPEN` | Decision is required but not yet made. Unit cannot advance. |
| `DECIDED` | Decision has been formally made with explicit authorization. |
| `SUPERSEDED` | Decision replaced by a later decision. See replacement entry. |

---

### PRODUCT-DEC-ESCROW-MUTATIONS

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: TECS-FBW-003-B is authorized for implementation with full mutation scope.
  The unit covers frontend wiring of all existing G-018 backend endpoints:
  detail view, create escrow account, record transaction, and lifecycle transition.
  The backend (G-018) is already implemented and tested; this unit is frontend-only.
  Authorized surfaces:
    - GET  /api/tenant/escrows/:escrowId          — detail view with derived balance
    - POST /api/tenant/escrows                    — create escrow account (DRAFT initial state)
    - POST /api/tenant/escrows/:escrowId/transactions — record ledger entry
        Entry types: HOLD, RELEASE, REFUND available to normal tenant operations users.
        ADJUSTMENT restricted to elevated tenant role (tenant-admin or designated ops authority).
        aiTriggered must remain false in this unit (no AI integration).
    - POST /api/tenant/escrows/:escrowId/transition — lifecycle transition
        Frontend must handle all four result states:
        APPLIED / PENDING_APPROVAL / ESCALATION_REQUIRED / DENIED.
  Constitutional constraints (remain mandatory — not altered by this decision):
    - D-017-A: tenant authority must derive from the verified JWT/session context only; request bodies must not carry `tenantId`, and canonical request/DB context remains `org_id` / `app.org_id`.
    - D-020-B: balance displayed only as server-derived value; no stored balance.
    - D-020-C: aiTriggered=false enforced in this unit; escrow-strict AI gate not exercised.
    - D-022-B/C: ENTITY_FROZEN error must be handled gracefully in frontend.
    - G-021: PENDING_APPROVAL result must surface "awaiting approval" feedback in UI.
    - Audit: server writes audit atomically; no frontend audit work required.
  Excluded:
    - EscrowAdminPanel.tsx and control-plane escrow surfaces (read-only; separate future unit).
    - Control-plane escrow transitions.
    - aiTriggered=true mutation paths.
Impact: TECS-FBW-003-B transitions DEFERRED → OPEN. Implementation may now proceed.

**Required For:** TECS-FBW-003-B — Escrow Mutations and Detail View (tenant plane)
**Authorizes:** Full frontend wiring of G-018 tenant escrow mutation surfaces.
  Frontend-only unit; no new backend endpoints required.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-ESCROW-MUTATIONS.
  Status: DECIDED.

---

### PRODUCT-DEC-ESCALATION-MUTATIONS

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: TECS-FBW-006-B is product-authorized for limited, role-differentiated escalation
  mutation scope.

  Authorized target scope:

  Tenant plane:
    - create root escalation via POST /api/tenant/escalations
        - severity levels 0-1 only
        - entity types limited to TRADE | ESCROW | APPROVAL | LIFECYCLE_LOG
        - tenant-scoped only (org_id derived from JWT; D-011 mandatory)
        - two-phase confirmation required
    - tenant resolution of own escalation is authorized as a product target,
      but may not be implemented unless the required tenant-plane backend route
      is first established through governance-approved sequencing

  Control plane:
    - upgrade severity
    - resolve
    - override
    - restricted to platform roles per control-plane posture
    - override remains explicitly audited and reason-required (D-002)

  Excluded:
    - freezeRecommendation as an actionable control (D-022-C: forever informational-only)
    - kill-switch / freeze toggle
    - tenant upgrade
    - tenant override
    - tenant LEVEL 2-4 escalation creation
    - tenant ORG / GLOBAL entity types
    - bulk / batch / cross-org actions

  Constitutional constraints remain mandatory and unchanged:
    - D-017-A: tenant authority must derive from the verified JWT/session context only; request bodies must not carry `tenantId`, and canonical request/DB context remains `org_id` / `app.org_id`
    - D-011: org_id is the canonical tenancy boundary; cannot be weakened
    - D-022-A, D-022-B, D-022-C, D-022-D: escalation doctrine invariants
    - D-002: control-plane override actions must be explicit and audited

  Sequencing note:
    This decision authorizes the product scope only.
    Governance must next determine whether TECS-FBW-006-B can open with an
    existing-route-first slice, or whether a backend prerequisite sub-unit must
    be installed before implementation opens. TECS-FBW-006-B status is NOT changed
    by this decision record alone — a subsequent governance sequencing unit must
    make that determination explicitly.

Impact: Product scope authorized. TECS-FBW-006-B remains DEFERRED until a governance
  sequencing unit determines the correct next step (narrowed first slice vs. backend
  prerequisite sub-unit installation).

**Required For:** TECS-FBW-006-B — Escalation Mutations (upgrade / resolve / override) (BOTH planes)
**Authorizes:** Limited, role-differentiated escalation mutation scope as defined above.
  Tenant create (severity 0-1, restricted entity types) and control-plane upgrade / resolve /
  override are the authorized surfaces. Tenant resolve is authorized as a product target
  only — sequencing-dependent on backend route availability.
**Does Not Authorize:** This decision does not directly open TECS-FBW-006-B. A governance
  sequencing unit must follow to determine whether the unit opens with a narrowed
  existing-route-first slice, or whether a backend prerequisite sub-unit is required first.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-ESCALATION-MUTATIONS.
  Status: DECIDED.

---

### PRODUCT-DEC-B2B-QUOTE

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: TECS-FBW-013 is authorized for limited tenant-plane B2B quote scope only.

  Authorized scope:
    - buyer-initiated RFQ submission from the existing B2B Request Quote CTA
    - org_id-scoped, auditable backend route for RFQ submission
    - corresponding frontend activation only after that route exists
    - quote semantics are non-binding RFQ initiation only

  Excluded:
    - seller negotiation workflows
    - counter-offers
    - multi-round negotiation loops
    - compliance progression
    - order conversion
    - checkout
    - settlement
    - AI-autonomous quote decisions
    - control-plane quote actions
    - public or cross-tenant quote actions

  Constraints:
    - authenticated tenant users only
    - org_id scoping mandatory
    - auditable human-triggered submission only
    - no auto-promotion from DEFERRED to OPEN in this decision record

Impact: Product scope authorized only. This decision does not itself open TECS-FBW-013.
  Future sequencing must determine whether a backend prerequisite unit is needed before the
  parent can move beyond DEFERRED.

**Required For:** TECS-FBW-013 — B2B Request Quote, product decision + backend (tenant plane)
**Authorizes:** Limited tenant-plane B2B quote scope only: buyer-initiated RFQ submission,
  an org_id-scoped auditable backend submission route, and frontend activation only after the
  route exists. Quote semantics are non-binding RFQ initiation only.
**Does Not Authorize:** This decision does not directly open TECS-FBW-013, does not change
  any Layer 0 sequencing state, and does not authorize seller negotiation workflows,
  counter-offers, multi-round negotiation loops, compliance progression, order conversion,
  checkout, settlement, AI-autonomous quote decisions, or any control-plane, public, or
  cross-tenant quote actions.
**Next Required Step:** A future governance sequencing unit must determine whether a backend
  prerequisite unit is required before TECS-FBW-013 can move beyond DEFERRED.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-B2B-QUOTE.
  Status: DECIDED.

---

### PRODUCT-DEC-RFQ-DOMAIN-MODEL

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: RFQ becomes a first-class tenant-plane domain entity in TexQtic.

  Canonical domain shape:
    - table: `rfqs`
    - RFQ remains separate from Trade
    - domain row is the operational source of truth
    - audit log remains the mandatory immutable evidence trail
    - current `rfq.RFQ_INITIATED` audit behavior remains preserved

  Canonical fields:
    - id: uuid primary key
    - org_id: uuid required
    - supplier_org_id: uuid required
    - catalog_item_id: uuid required
    - quantity: integer required, min 1
    - buyer_message: text nullable
    - status: rfq_status required
    - created_by_user_id: uuid nullable but recommended
    - created_at: timestamptz required
    - updated_at: timestamptz required

  Canonical status enum:
    - INITIATED
    - OPEN
    - RESPONDED
    - CLOSED

  Canonical relationships:
    - rfqs.org_id -> tenants.id
    - rfqs.supplier_org_id -> tenants.id
    - rfqs.catalog_item_id -> catalog_items.id
    - rfqs.created_by_user_id -> users.id

  Tenant isolation posture:
    - org_id is the canonical owner tenancy key
    - buyer tenant reads its own RFQs
    - supplier tenant reads only RFQs addressed to it via supplier_org_id
    - no cross-tenant discovery
    - create allowed only from authenticated buyer-side tenant context
    - supplier mutation is not broadly authorized in this decision

  Seller visibility posture:
    - direct supplier visibility only
    - no broadcast routing
    - no multi-supplier fan-out or matching
    - no control-plane RFQ workflow authority in this decision

  Lifecycle posture:
    - INITIATED exists for event compatibility
    - OPEN is the first stable operational state
    - RESPONDED and CLOSED are future-facing minimal lifecycle states
    - no negotiation state
    - no priced quote state
    - no order conversion state

  Audit and event posture:
    - RFQ creation must preserve `rfq.RFQ_INITIATED`
    - future state changes should emit corresponding audit events
    - future G-028 alignment should emit domain events from RFQ state changes
    - domain reads must not be reconstructed from audit scans

  Excluded:
    - negotiation logic
    - counter-offers
    - quote pricing
    - seller quote composition rules
    - order conversion
    - checkout
    - settlement
    - AI automation
    - control-plane RFQ workflows
    - broadcast routing
    - multi-supplier matching
    - collapsing RFQ into Trade

Impact: Product domain posture is now decided for future RFQ work. This decision does not
  create or reopen any implementation unit, does not alter Layer 0 sequencing by itself,
  and does not authorize schema, migration, or product-code changes in this recording step.

**Required For:** Future governed RFQ domain work beyond TECS-FBW-013 initiation-only scope.
**Authorizes:** Canonical RFQ domain modeling as a first-class entity with buyer-owned tenancy,
  direct-supplier visibility, audit coexistence, and lifecycle states INITIATED / OPEN /
  RESPONDED / CLOSED.
**Does Not Authorize:** This decision does not directly open a new RFQ implementation unit,
  does not authorize negotiation, pricing, order conversion, checkout, settlement, AI
  automation, control-plane RFQ workflow authority, broadcast routing, or collapsing RFQ
  into Trade.
**Next Required Step:** A separate governance sequencing unit must decide whether and when
  a future RFQ domain implementation unit should be opened.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-RFQ-DOMAIN-MODEL.
  Status: DECIDED.

---

### PRODUCT-DEC-BUYER-RFQ-READS

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: Buyer-side RFQ reads are authorized as a single narrow read-only tenant-plane scope.

  Authorized scope:
    - buyer RFQ list
    - buyer RFQ detail
    - buyer may read only RFQs owned by the current tenant via `org_id`
    - basic filter by status
    - sort by recency
    - search by RFQ id, item name, and item sku

  Authorized minimum list fields:
    - id
    - status
    - catalog_item_id
    - item name
    - item sku
    - quantity
    - supplier_org_id
    - created_at
    - updated_at

  Authorized minimum detail fields:
    - id
    - status
    - catalog_item_id
    - item name
    - item sku
    - quantity
    - buyer_message
    - supplier_org_id
    - created_by_user_id
    - created_at
    - updated_at

  Lifecycle visibility:
    - INITIATED
    - OPEN
    - RESPONDED
    - CLOSED

  UI boundaries:
    - read-only buyer RFQ list screen
    - read-only buyer RFQ detail screen
    - empty state
    - status badges
    - basic filters only

  Excluded:
    - frontend implementation authorization in this decision record itself
    - supplier inbox reads
    - supplier response actions
    - negotiation threads
    - counter-offers
    - quote pricing
    - order conversion
    - checkout
    - settlement
    - AI automation
    - control-plane RFQ views
    - Trade coupling

  Constraints:
    - authenticated tenant users only
    - buyer reads are limited to rows where org_id = current tenant
    - no cross-tenant discovery
    - no supplier inbox behavior is authorized by this decision
    - no control-plane read surface is authorized by this decision

Impact: Product scope for buyer-side RFQ reads is now authorized, but no implementation unit is
  opened by this decision record alone. A separate governance sequencing unit must decide whether
  and when the first buyer RFQ read implementation unit should open.

**Required For:** Future governed buyer-side RFQ read work after TECS-RFQ-DOMAIN-001 closure.
**Authorizes:** One narrow buyer-side tenant-plane RFQ read scope covering list + detail together,
  with read-only lifecycle visibility, minimal field projection, basic status filtering, recency
  sorting, and basic RFQ id / item name / item sku search.
**Does Not Authorize:** This decision does not directly open a new implementation unit, does not
  authorize frontend implementation, does not authorize supplier inbox reads or actions, and does
  not authorize negotiation, pricing, order conversion, checkout, settlement, AI automation,
  control-plane RFQ views, or Trade coupling.
**Next Required Step:** A separate governance sequencing unit must determine whether and when the
  first buyer RFQ read implementation unit should be opened.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-BUYER-RFQ-READS.
  Status: DECIDED.

---

### PRODUCT-DEC-SUPPLIER-RFQ-READS

Date: 2026-03-18
Authorized by: Paresh
Status: DECIDED
Summary: Supplier-side RFQ reads are authorized as one narrow read-only tenant-plane scope
  covering inbox list + detail together.

  Authorized scope:
    - supplier RFQ inbox list
    - supplier RFQ detail
    - supplier may read only RFQs addressed to the current tenant via `supplier_org_id`
    - basic filter by status
    - sort by recency
    - search by RFQ id, item name, and item sku

  Authorized minimum list fields:
    - id
    - status
    - catalog_item_id
    - item name
    - item sku
    - quantity
    - created_at
    - updated_at

  Authorized minimum detail fields:
    - id
    - status
    - catalog_item_id
    - item name
    - item sku
    - quantity
    - buyer_message
    - created_at
    - updated_at

  Buyer identity exposure posture:
    - buyer org_id withheld in this first slice
    - buyer display label or surrogate withheld in this first slice
    - created_by_user_id withheld in this first slice

  Lifecycle visibility:
    - INITIATED
    - OPEN
    - RESPONDED
    - CLOSED

  UI boundaries:
    - read-only supplier inbox list screen
    - read-only supplier RFQ detail screen
    - empty state
    - status badges
    - basic filters only

  Constraints:
    - authenticated tenant users only
    - supplier reads are limited to rows where `supplier_org_id = current tenant`
    - no cross-tenant discovery
    - no buyer-owner-only hidden fields beyond the explicitly authorized detail surface
    - no control-plane RFQ read surface is authorized by this decision

  Excluded:
    - supplier response composition
    - negotiation threads
    - counter-offers
    - quote pricing
    - order conversion
    - checkout
    - settlement
    - AI automation
    - control-plane RFQ views
    - buyer-side mutation authority
    - Trade coupling

Impact: Product scope for supplier-side RFQ reads is now authorized, but no implementation unit is
  opened by this decision record alone. A separate governance sequencing unit must decide whether
  and when the first supplier RFQ read implementation unit should open.

**Required For:** Future governed supplier-side RFQ inbox read work after TECS-RFQ-DOMAIN-001 and
  TECS-RFQ-READ-001 closure.
**Authorizes:** One narrow supplier-side tenant-plane RFQ read scope covering inbox list + detail
  together, limited to recipient reads via `supplier_org_id`, with read-only lifecycle visibility,
  minimal field projection, basic status filtering, recency sorting, and basic RFQ id / item name /
  item sku search.
**Does Not Authorize:** This decision does not directly open a new implementation unit, does not
  authorize supplier response composition, negotiation, pricing, order conversion, checkout,
  settlement, AI automation, control-plane RFQ views, buyer identity exposure beyond the minimal
  authorized surface, or Trade coupling.
**Next Required Step:** A separate governance sequencing unit must determine whether and when the
  first supplier RFQ read implementation unit should open.
**Last Governance Confirmation:** 2026-03-18 — GOV-RECORD-PRODUCT-DEC-SUPPLIER-RFQ-READS.
  Status: DECIDED.

---

### PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE

Date: 2026-03-19
Authorized by: Paresh
Status: DECIDED
Summary: The first supplier-side RFQ response composition model is authorized as one narrow,
  non-binding child artifact separate from `rfqs`.

  Canonical response model:
    - separate child entity: `rfq_supplier_responses`
    - relationship: `rfq_supplier_responses.rfq_id -> rfqs.id`
    - first slice permits exactly one supplier response artifact per RFQ
    - RFQ remains the buyer-owned parent request; supplier response is a distinct reply artifact
    - future multi-response threads or negotiation flows require a separate decision

  Authorized first-slice fields:
    - id
    - rfq_id
    - supplier_org_id
    - message
    - submitted_at
    - created_at
    - updated_at
    - created_by_user_id

  Field posture:
    - `message` is the required human-authored supplier reply body
    - `created_by_user_id` is retained for authenticated human accountability in the first slice
    - `submitted_at` is the first-slice submission marker; no separate response status model is required now
    - lead-time / delivery-note fields are deferred

  Pricing posture:
    - pricing is deferred in this first slice
    - no unit price, total price, currency, validity window, MOQ pricing, or quote terms are authorized

  Lifecycle effect:
    - first valid supplier response sets the parent RFQ status to `RESPONDED`
    - no separate negotiation loop, priced quote state, or response revision lifecycle is introduced

  Tenant isolation posture:
    - supplier may create a response only for RFQs addressed to the current tenant via `supplier_org_id`
    - buyer does not create supplier response artifacts
    - no cross-tenant response composition is authorized
    - no control-plane response workflow authority is authorized in this decision

  Buyer identity exposure posture:
    - no broader buyer identity exposure is authorized in this slice
    - supplier response composition relies only on the already-authorized supplier RFQ read surface
    - buyer org_id, buyer display label/surrogate, and buyer user identity remain withheld

  Excluded:
    - embedding supplier response fields directly on `rfqs`
    - negotiation threads
    - counter-offers
    - response editing or revision history
    - quote pricing
    - quote acceptance
    - order conversion
    - checkout
    - settlement
    - AI automation
    - control-plane RFQ actions
    - Trade coupling
    - multi-round negotiation

Impact: Product scope is now decided for the first supplier-side RFQ response composition model.
  This decision does not itself open or reopen any implementation unit, does not alter Layer 0
  sequencing, and does not authorize schema, migration, or product-code changes in this
  recording step.

**Required For:** Future governed supplier-side RFQ response work after TECS-RFQ-DOMAIN-001,
  TECS-RFQ-READ-001, and TECS-RFQ-SUPPLIER-READ-001 closure.
**Authorizes:** One narrow non-binding supplier response artifact per RFQ, modeled as a separate
  child entity with submit-once posture, pricing deferred, RFQ lifecycle transition to
  `RESPONDED`, and supplier-only tenant-scoped write authority.
**Does Not Authorize:** This decision does not directly open a new implementation unit, does not
  authorize negotiation, pricing, revisions, buyer identity exposure beyond the current supplier
  read slice, order conversion, checkout, settlement, AI automation, control-plane RFQ actions,
  or Trade coupling.
**Next Required Step:** A separate governance sequencing unit must determine whether and when the
  first supplier RFQ response implementation unit should be opened.
**Last Governance Confirmation:** 2026-03-19 — GOV-RECORD-PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE.
  Status: DECIDED.
