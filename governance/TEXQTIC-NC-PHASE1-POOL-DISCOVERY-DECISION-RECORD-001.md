# TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-RECORD-001
## Network Commerce Pool Discovery Decision Record (Pre-Implementation)

Document ID: TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-RECORD-001
Status: DECISION RECORD ONLY - NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded decision-record packet
Date: 2026-05-07

Authority source:
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-AUDIT-001.md

Implementation gate:
- This packet records selected decisions only.
- This packet does NOT authorize route/service/schema/test/UI implementation work.

---

## 1. Decision Scope

This record formalizes Paresh-selected decisions for Network Commerce Pool Discovery Section 14 before any discovery implementation begins.

---

## 2. Selected Decisions (Final)

### 2.1 Open-pool discovery policy
Selected: Option A

Decision:
- Non-member open-pool discovery is deferred.
- First implementation may include only owner list and joined list.

### 2.2 Owner identity exposure
Selected: Option A

Decision:
- Owner identity is hidden from non-members.
- No owner org name or owner identity field is exposed in first discovery implementation.

### 2.3 target_qty sensitivity
Selected: Option A

Decision:
- target_qty is commercially sensitive outside owner context.
- target_qty is owner-only in first discovery implementation.
- Joined list must not expose target_qty.

### 2.4 Member count exposure
Selected: Option A

Decision:
- Member count is hidden.
- No exact, bucketed, or aggregate participation count is exposed in first discovery implementation.

### 2.5 Metadata JSON policy
Selected: Option A

Decision:
- Raw metadata JSON is hidden in tenant discovery responses.
- Only explicit allowlisted fields may appear.
- No metadata allowlist is introduced in first discovery implementation.

### 2.6 Control-plane sequencing
Selected: Option A

Decision:
- Tenant owner+joined discovery may proceed first.
- Control-plane/admin cross-tenant pool discovery is deferred to a separate future design packet.

---

## 3. Implementation Boundary (Next Packet)

The next implementation packet may only implement:

1. GET /api/tenant/network-commerce/pools
- owner-scoped list
- only pools where network_pools.org_id = caller orgId

2. GET /api/tenant/network-commerce/pools/joined
- joined-scoped list
- only pools where caller org has membership
- include only caller own membership fields

---

## 4. Forbidden Future Scope (For Next Packet)

The next implementation packet must not implement:
- non-member open-pool discovery
- GET /api/tenant/network-commerce/pools/open
- GET /api/tenant/network-commerce/pools/:poolId/discovery
- owner identity exposure to non-members
- target_qty outside owner list
- aggregate declared demand
- member count
- raw metadata JSON
- control-plane/admin discovery
- RFQ
- supplier quote flow
- allocation
- order placement
- invoice generation
- settlement
- escrow
- UI

---

## 5. Mandatory Feature Gate Requirement

All future discovery routes must reuse:
- ncPoolFeatureGateMiddleware

Feature key:
- nc.procurement_pools.enabled

Required behavior (unchanged):
- missing/disabled/DB-error behavior remains fail-closed to 503 FEATURE_DISABLED

---

## 6. Pre-Work Confirmation (This Record)

- git status preflight checked
- audit commit confirmed: 8157b49
- discovery design commit confirmed: 37d574ce2059fa69f372f0e6ea09d9c7b72b7894
- required files reviewed:
  - governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DESIGN-001.md
  - governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-AUDIT-001.md
  - governance/control/OPEN-SET.md
  - governance/control/NEXT-ACTION.md

---

## 7. Execution Consequence

Under this decision record:
- Discovery implementation may proceed only as owner list + joined list in a separate implementation packet.
- All deferred and forbidden scope remains closed.
- This packet itself does not open implementation.

Next packet reference:
- TEXQTIC-NC-PHASE1-POOL-DISCOVERY-IMPLEMENTATION-001

---

## 8. Completion Checklist

- [x] git status checked
- [x] audit commit confirmed
- [x] discovery design commit confirmed
- [x] audit artifact reviewed
- [x] design artifact reviewed
- [x] six selected decisions recorded
- [x] implementation boundary recorded
- [x] forbidden future scope recorded
- [x] feature gate requirement recorded
- [x] only one decision artifact changed
- [x] no code/schema/migration/test/UI changes made
- [x] one atomic commit made
