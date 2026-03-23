# PRODUCT-DEC-TENANT-TRADE-CREATION-PLACEMENT

Decision ID: PRODUCT-DEC-TENANT-TRADE-CREATION-PLACEMENT
Title: Tenant trade creation belongs to the tenant Trades domain, but current placement remains blocked pending prior ownership ratification
Status: DECIDED
Date: 2026-03-23
Authorized by: Paresh

## Context

`TRADE-CREATION-REPO-TRUTH-CORRECTION-001` established the corrected current repo truth:

- tenant trade read-only UI already exists
- the remaining frontend gap is tenant trade create/write
- trade lifecycle transitions remain separate
- backend create/transition route existence does not answer product placement

This decision resolves only the placement question for tenant trade creation in the current
product/repo architecture.

Relevant current repo and governance posture:

1. `components/Tenant/TradesPanel.tsx` exists and explicitly scopes itself to:
   - read-only trade list
   - create trade out of scope
   - lifecycle transitions out of scope
2. `App.tsx` already carries a standalone tenant `TRADES` experience view alongside
   `ORDERS` and `RFQS`.
3. `layouts/Shells.tsx` already exposes `Trades` as a standalone tenant navigation entry in the
   tenant shells.
4. `governance/units/TECS-FBW-002-B.md` is already CLOSED and VERIFIED for the bounded tenant
   trade read-only surface.
5. `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md` is the authoritative tenant surface map and does
   not currently declare a tenant `Trades` module.
6. `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP` explicitly defers RFQ expansion into negotiation,
   trade conversion, checkout coupling, settlement, and order conversion.

This creates a real governance tension:

- repo runtime/navigation truth already exposes tenant `Trades` as a standalone tenant surface
- canonical product surface mapping has not yet ratified tenant `Trades` as an owned module

## Placement Options Considered

### Option A — Place tenant trade creation inside the existing tenant Trades surface

Evidence for:

- `TradesPanel.tsx` already exists as the repo's tenant trade surface
- `App.tsx` already has a standalone tenant `TRADES` experience state
- `layouts/Shells.tsx` already exposes `Trades` as a standalone tenant navigation target
- trade creation is semantically trade-domain work, not order mutation or RFQ read behavior

Evidence against:

- `TradesPanel.tsx` is intentionally read-only in the currently closed unit scope
- `TECS-FBW-002-B` closed exactly on that read-only posture
- the authoritative dashboard matrix does not currently declare a tenant `Trades` module

Assessment:

This is the only repo-native domain placement that aligns with existing trade ownership, but it is
not implementation-ready without first ratifying tenant `Trades` as a canonical tenant-owned
module rather than a residual installed surface.

### Option B — Place tenant trade creation in Orders or an orders-adjacent tenant surface

Evidence for:

- `ORDERS` is a declared tenant surface in the dashboard matrix and already exists in the tenant
  shell/runtime

Evidence against:

- `EXPOrdersPanel.tsx` is post-order lifecycle management, not trade initiation
- current trade create inputs (`buyerOrgId`, `sellerOrgId`, `tradeReference`, `currency`,
  `grossAmount`, `reason`) are not order-derived
- current governance exclusions explicitly separate this question from broader order conversion or
  workflow redesign
- forcing trade creation into Orders would create hidden order/trade ownership coupling not
  established in current repo truth

Assessment:

Rejected. Orders is the wrong owner for tenant trade creation on current repo/governance evidence.

### Option C — Place tenant trade creation in RFQ or a negotiation-adjacent tenant surface

Evidence for:

- RFQ is the closest currently installed upstream commercial-intent surface in tenant flows
- RFQ already captures buyer-side supplier-directed initiation behavior

Evidence against:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP` explicitly stops RFQ at pre-negotiation
- current RFQ decisions explicitly defer trade conversion, order conversion, pricing,
  counter-offers, and broader negotiation expansion
- there is no separately installed negotiation tenant module in the current authoritative surface map
- placing trade creation here would reopen RFQ boundary questions that this decision is explicitly
  out of scope to redesign

Assessment:

Rejected. RFQ/negotiation adjacency is governance-invalid under the current capped RFQ posture.

### Option D — Defer tenant placement and treat trade creation as non-tenant or control-plane-owned

Evidence for:

- the authoritative dashboard matrix does not currently ratify a tenant `Trades` module
- current create-path inputs and counterparty selection remain non-trivial

Evidence against:

- the backend create route is tenant-plane and derives tenant context from authenticated tenant state
- trade creation is not a control-plane oversight action
- control-plane trade oversight already exists separately and is not the owner of tenant-originated
  create behavior

Assessment:

Rejected as a placement owner. Control-plane or non-tenant ownership would conflict with the
existing tenant-plane backend and the already-installed tenant trade domain surface.

## Decision

The correct eventual product/repo owner for tenant trade creation is the tenant `Trades` domain.

Within the current product shape, that means tenant trade creation belongs, if later authorized,
as a child action within a canonically ratified standalone tenant `Trades` module, not inside
Orders, not inside RFQ, and not in control-plane oversight.

However, the current placement result is:

## Result Classification

`BLOCKED_PENDING_PRIOR_DECISION`

Reason:

The repo already exposes `Trades` as a standalone tenant surface, but the authoritative tenant
dashboard/surface map has not yet ratified that module as canonical tenant-owned product surface.
The currently closed trade UI unit also intentionally bound that installed surface to read-only.

Therefore this decision does name the correct owner, but it does not make tenant trade creation
placement implementation-ready. A prior product ownership decision is still required to ratify the
tenant `Trades` module in the canonical surface map before any create-path implementation unit is
considered.

## Exact Decision Result

- Recommended placement: tenant `Trades`
- Placement shape: child action within a standalone tenant `Trades` module
- Result classification: `BLOCKED_PENDING_PRIOR_DECISION`

## Consequences

- trade creation is not to be attached to `Orders`
- trade creation is not to be attached to RFQ discovery or implied negotiation flow
- trade creation is not to be shifted into control-plane oversight
- the current read-only tenant trades slice remains valid historical truth
- no implementation unit may be opened from this decision alone
- no transition/lifecycle UI scope is implied by this decision

## Explicit In-Scope

This decision is in scope only for:

- deciding where tenant trade creation belongs in current product/repo architecture
- evaluating tenant `Trades`, Orders, RFQ/negotiation adjacency, and non-tenant/control-plane placement
- separating placement from implementation, transitions, and broader workflow redesign
- classifying whether placement is currently ready or blocked

## Explicit Out-of-Scope

This decision does not authorize:

- create-form implementation
- frontend trade-create wiring
- backend route changes
- schema or contract changes
- transition or lifecycle UI decisions
- control-plane trade redesign
- order / RFQ / negotiation redesign
- opening any implementation unit

## Sequencing Impact

- No implementation-ready unit is opened by this decision
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- before any future trade-create implementation unit is considered, governance must first record a
  prior product ownership decision that ratifies tenant `Trades` as a canonical tenant module in
  the current surface map

## Relationship To Prior Decisions And Installed Repo Truth

This decision preserves and depends on:

- `TRADE-CREATION-REPO-TRUTH-CORRECTION-001`
- `TECS-FBW-002-B` as the already-closed tenant trade read-only surface
- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`

This decision explicitly does not supersede:

- the RFQ cap posture
- the existing closed read-only trade surface
- the separation between tenant trade creation and trade lifecycle transitions

Resulting chronology:

1. tenant trade read-only UI was installed and closed as a bounded surface
2. repo-truth correction established that the missing gap is create/write, not tenant trade UI in general
3. this decision now identifies the correct owner as tenant `Trades`
4. this same decision also records that placement remains blocked until tenant `Trades` ownership is
   canonically ratified in the tenant surface map
