# TEXQTIC-NC-PHASE1-POOL-RFQ-DESIGN-001
## Network Commerce Pool RFQ -> Supplier Quote -> Quote Acceptance Design

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DESIGN-001
Status: DESIGN ONLY - NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded design-only packet
Date: 2026-05-07

Implementation gate:
- This packet is design and repo-truth audit only.
- This packet does NOT authorize schema changes, migrations, services, routes, tests, UI, supplier portal, allocation, orders, invoice generation, settlement, escrow, control-plane implementation, or governance closure updates.

---

## 1) Executive Summary

This packet designs the next Pool slice: owner/admin initiated RFQ, supplier quote submission, and quote acceptance design boundaries.

Conservative design outcome:
- RFQ ownership: pool owner/admin only in Phase 1 RFQ.
- Supplier side: invited suppliers only; no broad supplier marketplace exposure.
- Privacy: suppliers never see member identities or per-member quantities; members do not see supplier quote spread.
- Lifecycle: Pool RFQ flow aligns to existing seeded POOL transitions (`CLOSED_FOR_BIDS -> QUOTED -> ACCEPTED/REJECTED`).
- Demand source: current repo supports aggregate declared demand from `NetworkPoolMembership`; however, a dedicated demand-line design is recommended before implementation to avoid spec loss and audit ambiguity.
- MakerChecker: quote acceptance should follow existing POOL transition governance (currently requires MakerChecker at `QUOTED -> ACCEPTED`).

Readiness verdict:
- RFQ implementation should NOT proceed directly from this design.
- Next required step is a decision audit/record packet (and demand-source decision packet) before any schema or route opening.

---

## 2) Repo-Truth Files Inspected

Governance sequencing:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/GOVERNANCE-CHANGELOG.md

NC design chain:
- governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DESIGN-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-AUDIT-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-RECORD-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-PROD-VERIFY-GOV-CLOSE-001.md

Current Pool implementation:
- server/prisma/schema.prisma
- server/src/services/networkPool.service.ts
- server/src/routes/tenant/pools.ts
- server/src/routes/tenant/pools.integration.test.ts
- server/src/middleware/ncPoolFeatureGate.middleware.ts

RFQ/supplier/quote/visibility patterns:
- server/src/routes/tenant.ts
- server/src/routes/tenant.rfqVisibilityPolicyGate.test.ts
- server/src/routes/tenant.rfqDraftSubmitPersistence.test.ts
- server/src/routes/tenant.rfqMultiItemGrouping.test.ts
- server/src/services/rfq/supplierNotificationBoundary.service.ts
- server/src/services/relationshipAccess.service.ts
- server/src/services/relationshipAccessStorage.service.ts
- server/src/services/makerChecker.service.ts
- server/src/services/stateMachine.service.ts

Lifecycle/state-machine verification:
- tests/stateMachine.g020.test.ts
- server/src/__tests__/network-pool.service.unit.test.ts
- server/src/__tests__/network-pool.service.integration.test.ts
- DB read-only POOL lifecycle state/transition inventory via Prisma client

---

## 3) Existing Assets and Gaps

Existing reusable assets:
- `NetworkPool` and `NetworkPoolMembership` models exist.
- POOL lifecycle states/transitions already seeded, including:
  - `CLOSED_FOR_BIDS -> QUOTED`
  - `QUOTED -> ACCEPTED` (`requiresMakerChecker=true`)
  - `QUOTED -> REJECTED`
- POOL lifecycle log path exists via `StateMachineService` writing `NetworkLifecycleLog`.
- Tenant RFQ domain exists (`Rfq`, `RfqSupplierResponse`) with buyer list/detail, supplier inbox/detail/respond, audit hooks, and supplier-notification boundary.
- Relationship access evaluator exists for RFQ submit gating (`OPEN_TO_ALL` vs `APPROVED_BUYERS_ONLY`).

Key gaps for Pool RFQ:
- No Pool RFQ entities exist in schema today.
- Existing `Rfq` model is single catalog-item buyer->supplier shape, not pool aggregate procurement.
- Existing `RfqSupplierResponse` is one-response-per-RFQ with message-only payload, no pricing slabs/docs/revisions.
- No dedicated pool demand-line entity currently exists.
- No supplier quote acceptance route exists for pool context.
- No pool RFQ feature sub-flag exists.

---

## 4) RFQ Scope Boundaries

In-scope for this design:
- Pool RFQ ownership model.
- Pool lifecycle interaction model for RFQ issue/quote/acceptance.
- Candidate data model for RFQ + supplier quote.
- Privacy/commercial leakage boundaries.
- Candidate API surface (design only).
- Implementation packet sequencing and explicit decision points.

Explicitly out of scope for implementation in this packet:
- Schema/migration execution.
- Route/service code.
- Supplier portal/UI.
- Allocation logic.
- Order placement.
- Invoice/settlement/escrow.
- Control-plane implementation.

---

## 5) RFQ Personas and Visibility Model

Personas:
- Pool owner/admin org (issuer).
- Pool member orgs (participants).
- Invited supplier orgs (quote submitters).
- Platform admin/control (audit/exception, future packet).

Visibility baseline:
- Owner/admin: full RFQ + quote comparison in pool context.
- Members: no supplier identity or quote spread in RFQ slice.
- Suppliers: receive only anonymized aggregate demand package and requirements; no member identity/per-member quantity.
- Control-plane: full visibility deferred to control-plane packet.

---

## 6) Pool Lifecycle Interaction Design

Recommended pool-state placement:
- RFQ issue allowed only when pool is `AGGREGATING`.
- Issuing RFQ moves pool to `CLOSED_FOR_BIDS`.
- Supplier quote submission path moves pool to `QUOTED` (first valid quote event).
- Quote acceptance path moves pool to `ACCEPTED`.
- Quote rejection-all path moves pool to `REJECTED`.

Lifecycle ownership:
- Transition enforcement should remain service-owned via `StateMachineService`.
- Route layer should validate actor/ownership and call service.
- Transition logs should remain in `NetworkLifecycleLog`.

Important repo-truth alignment:
- Seeded POOL transitions already model RFQ-stage path.
- `QUOTED -> ACCEPTED` currently requires MakerChecker by transition policy.

---

## 7) Demand Source Design and Blockers

Repo truth today:
- Available quantities:
  - `NetworkPool.targetQty`
  - `NetworkPoolMembership.declaredQty`
- No separate demand-line table exists.

Design decision:
- Do not treat `targetQty` alone as RFQ truth for supplier quote competition.
- For first RFQ implementation, demand input can use an immutable aggregate snapshot from memberships at issue time.

Required snapshot fields (design):
- `demand_snapshot_qty`
- `qty_unit`
- `member_count_snapshot` (internal only)
- `demand_snapshot_basis` (`MEMBERSHIP_DECLARED_SUM`)
- `demand_snapshot_captured_at`

Blocker posture:
- Hard blocker for rich RFQ specs: yes, if per-line commodity/spec granularity is required.
- Soft blocker for aggregate-first RFQ: no, if aggregate snapshot model is explicitly approved.

Conservative recommendation:
- Open a demand-source design decision packet before implementation:
  - Option A: aggregate membership snapshot first (faster).
  - Option B: demand-line entity first (cleaner long-term).

---

## 8) Proposed RFQ Data Model

Recommended Phase-1 RFQ core entities:

1. `NetworkPoolRfq`
- `id`
- `pool_id`
- `owner_org_id`
- `rfq_ref`
- `commodity_category`
- `qty_unit`
- `demand_snapshot_qty`
- `demand_snapshot_basis`
- `spec_summary`
- `delivery_location`
- `delivery_window_start`
- `delivery_window_end`
- `payment_terms_requested`
- `quality_requirements_json`
- `certification_requirements_json`
- `status` (`DRAFT|ISSUED|QUOTED|ACCEPTED|REJECTED|EXPIRED|CANCELLED`)
- `selected_quote_id` (nullable)
- `issued_at`
- `accepted_at`
- `rejected_at`
- `metadata` (strict allowlist only)

2. `NetworkPoolRfqSupplierInvite`
- `id`
- `pool_rfq_id`
- `supplier_org_id`
- `invite_status` (`PENDING|DELIVERED|VIEWED|DECLINED|EXPIRED`)
- `invited_at`
- `viewed_at`
- `declined_at`
- `expires_at`

3. `NetworkPoolSupplierQuote`
- `id`
- `pool_rfq_id`
- `supplier_org_id`
- `quote_ref`
- `revision_no`
- `currency`
- `unit_price`
- `min_qty`
- `max_qty`
- `slab_pricing_json`
- `delivery_promise_json`
- `freight_terms`
- `payment_terms`
- `quality_declaration_json`
- `batch_lot_details_json`
- `valid_from`
- `valid_until`
- `status` (`SUBMITTED|WITHDRAWN|EXPIRED|ACCEPTED|REJECTED`)
- `submitted_by`
- `submitted_at`
- `accepted_at`
- `rejected_at`

Deferred optional entities:
- `NetworkPoolQuoteLine` (if line-level normalization is required later).
- `NetworkPoolQuoteDocument` (if dedicated attachment model is approved).

---

## 9) Proposed Supplier Quote Data Model

Supplier quote must support the following payload shape (table columns and json fields combined):
- `unit_price`, `currency`
- `min_qty`, `max_qty`
- slab pricing tiers
- delivery promise (lead-time/date window/incoterm)
- freight terms
- payment terms
- quality and certification declarations
- batch/lot details
- validity window
- revision number
- status + timestamps
- submitter identity

Revision policy recommendation:
- One active revision per supplier per RFQ.
- New revision closes prior active revision (`SUPERSEDED`) or increments `revision_no` with status history.

---

## 10) Privacy / Commercial Non-Leak Matrix

| Surface | Owner/Admin | Member | Supplier (invited) | Non-invited Supplier |
|---|---|---|---|---|
| RFQ aggregate qty | visible | hidden (RFQ phase) | visible | hidden |
| Member identities | visible (owner only) | hidden | hidden | hidden |
| Per-member qty | visible (owner only) | hidden (except self in membership route) | hidden | hidden |
| Supplier identity list | visible | hidden | self-only | hidden |
| Supplier quote pricing spread | visible | hidden | self quote only | hidden |
| Supplier quote docs | visible | hidden | self docs only | hidden |
| Selected quote status | visible | hidden in RFQ slice | visible if own quote | hidden |

Policy notes:
- Reuse existing discovery privacy decisions as floor, never loosen in RFQ slice.
- Members can be considered for their own landed/allocation visibility only in later allocation/order packets.

---

## 11) Route / API Candidate Design (No Implementation)

Tenant owner/admin candidates:
- `POST /api/tenant/network-commerce/pools/:poolId/rfqs`
- `GET /api/tenant/network-commerce/pools/:poolId/rfqs`
- `GET /api/tenant/network-commerce/pools/:poolId/rfqs/:rfqId`
- `POST /api/tenant/network-commerce/pools/:poolId/rfqs/:rfqId/invite-suppliers`
- `POST /api/tenant/network-commerce/pools/:poolId/rfqs/:rfqId/quotes/:quoteId/accept`
- `POST /api/tenant/network-commerce/pools/:poolId/rfqs/:rfqId/quotes/:quoteId/reject`

Supplier candidates (design now, implement later):
- `GET /api/tenant/network-commerce/supplier/rfqs`
- `GET /api/tenant/network-commerce/supplier/rfqs/:rfqId`
- `POST /api/tenant/network-commerce/supplier/rfqs/:rfqId/quotes`

Sequencing recommendation:
- Implement owner/admin RFQ issuance and list/detail before supplier route implementation.
- Defer supplier quote submission routes to a later packet unless decision record explicitly opens both.

---

## 12) Feature Flag Recommendation

Options:
- Option A: reuse `nc.procurement_pools.enabled` only.
- Option B: add sub-flag `nc.procurement_pools.rfq.enabled` and require both global+subflag true.

Recommendation:
- Prefer Option B (dual gate) for finer kill-switch and rollback safety.
- Keep parent flag as master gate; sub-flag controls RFQ surfaces only.

---

## 13) MakerChecker Recommendation

Repo-truth constraint:
- POOL transition `QUOTED -> ACCEPTED` is seeded with `requiresMakerChecker=true`.

Design recommendation:
- RFQ issuance/invite: no MakerChecker in first RFQ packet.
- Quote acceptance transition to `ACCEPTED`: enforce existing MakerChecker policy via state-machine path.
- If MakerChecker integration for POOL acceptance is not opened, defer acceptance implementation to a separate packet.

---

## 14) Document / Evidence Recommendation

Current repo truth:
- Existing RFQ response model has no attachment structure.
- No generic quote-document model exists.
- DPP evidence/invoice document fields are domain-specific and should not be reused directly for pool quote docs.

Recommendation:
- Do not couple first RFQ implementation to full file-upload subsystem.
- Phase-1 quote can carry structured declaration fields + external reference URLs under strict validation.
- Dedicated `NetworkPoolQuoteDocument` model should be a follow-up packet if true managed document lifecycle is required.

---

## 15) Audit / Lifecycle Logging Recommendation

Pool lifecycle logs:
- Continue using `StateMachineService` + `NetworkLifecycleLog` for pool state transitions.

RFQ-specific audit events (audit_logs/event_logs):
- `pool_rfq.created`
- `pool_rfq.issued`
- `pool_rfq.supplier_invited`
- `pool_rfq.supplier_viewed`
- `pool_rfq.quote_submitted`
- `pool_rfq.quote_revised`
- `pool_rfq.quote_accepted`
- `pool_rfq.quote_rejected`

Logging rule:
- Audit payloads must avoid restricted commercial fields in member-visible contexts.
- Supplier-notification boundary pattern from existing RFQ should be reused conceptually for pool RFQ notifications.

---

## 16) Future Implementation Test Plan

Required test groups for future implementation packets:
- Owner/admin can create RFQ for eligible pool state.
- Non-owner cannot create RFQ.
- Feature gate disabled blocks all pool RFQ routes with `503 FEATURE_DISABLED`.
- RFQ cannot be issued from invalid pool state.
- RFQ payload does not expose member identities/per-member quantities to suppliers.
- Supplier can read only assigned/invited RFQs.
- Supplier cannot read unassigned RFQs.
- Supplier quote validation enforces price/currency/validity/revision constraints.
- Invalid quote payload rejected with `400`.
- Quote acceptance drives state transition to `ACCEPTED` only through authorized path.
- MakerChecker path tested when acceptance transition requires approval.
- Member views do not expose supplier quote spread.
- Cleanup leaves no RFQ/quote test residue in harness namespace.

---

## 17) Proposed Implementation Packet Sequence

1. `TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001`
2. `TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001`
3. `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001`
4. `TEXQTIC-NC-PHASE1-POOL-RFQ-SCHEMA-FOUNDATION-001`
5. `TEXQTIC-NC-PHASE1-POOL-RFQ-OWNER-ROUTES-IMPLEMENTATION-001`
6. `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTES-DESIGN-001`
7. `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-IMPLEMENTATION-001`
8. `TEXQTIC-NC-PHASE1-POOL-RFQ-QUOTE-ACCEPTANCE-MAKER-CHECKER-001`

---

## 18) Explicit Paresh Decisions Required Before Implementation

1. RFQ ownership authority:
- owner/admin only vs control-plane assist vs member issuance.

2. Demand source policy:
- aggregate membership snapshot first vs demand-line-first prerequisite.

3. Supplier universe:
- any supplier org vs verified supplier-only vs relationship-gated suppliers only.

4. Supplier/member identity visibility:
- confirm strict anonymization to suppliers and strict quote privacy from members.

5. Feature gate strategy:
- parent-only flag vs parent + RFQ sub-flag.

6. Acceptance semantics:
- implement quote acceptance in first implementation packet or defer to MakerChecker-focused packet.

7. Document handling scope:
- declarations + URL references only vs dedicated quote-document model in initial implementation.

8. Supplier route sequencing:
- include supplier quote routes in same implementation packet or defer.

9. Pool state transition trigger points:
- first quote auto-transitions to `QUOTED` vs explicit owner action.

---

## 19) Recommended Next Packet After This Design

Recommended immediate next packet:
- `TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001`

Reason:
- Multiple policy-critical decisions remain open (demand source, supplier universe, acceptance/MakerChecker sequencing, and feature-flag strategy).
- Implementation should remain blocked until decision audit and decision record are completed.

---

## Appendix A) Mandatory Pre-Work Evidence for This Packet

Preflight:
- `git status --short` at start: clean

Required commits confirmed present:
- `10812e5a40919d4a6fd96de224a6d7966bc5df70`
- `0d40a7a`
- `a4d35aa`
- `37d574ce2059fa69f372f0e6ea09d9c7b72b7894`
- `ac3bc28`
- `e3a806492d7981cb695f1663da7780c15cec0c20`
- `6680026ef27db0ac7d851b4e462b834571d50648`

Read-only lifecycle verification (POOL):
- state count: 17
- transition count: 24
- includes `CLOSED_FOR_BIDS -> QUOTED`, `QUOTED -> ACCEPTED`, `QUOTED -> REJECTED`
- `QUOTED -> ACCEPTED` currently requires MakerChecker

---

## Completion Checklist

- [x] git status checked
- [x] discovery closure commit confirmed
- [x] Network Commerce foundation reviewed
- [x] discovery decision record reviewed
- [x] current pool routes/service/gate inspected
- [x] RFQ/supplier/quote repo patterns inspected
- [x] pool lifecycle states inspected
- [x] demand source decision analyzed
- [x] RFQ data model proposed
- [x] supplier quote model proposed
- [x] privacy/non-leak model defined
- [x] route candidates designed
- [x] feature flag recommendation made
- [x] MakerChecker recommendation made
- [x] documents/evidence model considered
- [x] implementation sequence proposed
- [x] Paresh decision points listed
- [x] one design artifact created
- [x] no code/schema/migration/test/UI changes made
- [ ] one atomic commit made
