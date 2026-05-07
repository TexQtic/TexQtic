# TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001
## Network Commerce Pool RFQ Sequencing and Policy Decision Record

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001
Status: DECISION RECORD CLOSED - IMPLEMENTATION STILL BLOCKED
Type: TECS bounded decision-record packet
Date: 2026-05-07

Implementation gate:
- This packet records approved decisions only.
- This packet does not authorize schema, migration, route, service, test, UI, supplier portal, allocation, order, invoice, settlement, escrow, MakerChecker implementation, or demand-line implementation.

---

## 1) Authority and Inputs

Decision authority:
- Paresh-approved decision set for NC Phase 1 Pool RFQ sequencing and policy.

Upstream artifacts:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DESIGN-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001.md
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md

Lineage commits:
- RFQ design: 087b18afb3a6dfde92830e7d6cef18ee0227d790
- RFQ decision audit: c88d69e
- NC discovery/governance chain references: 10812e5a40919d4a6fd96de224a6d7966bc5df70, 0d40a7a, ac3bc28, e3a806492d7981cb695f1663da7780c15cec0c20

---

## 2) Recorded Decisions (Selected Set)

### Decision 1 - RFQ ownership authority
Selected:
- Owner/admin only for first implementation.

Recorded decision:
- Only the pool owner/admin org may initiate Pool RFQ workflow in the first implementation.
- Pool members may not issue RFQs.
- Platform/control admin assistance is deferred to a separate future packet.
- Hybrid owner/platform approval is deferred.

### Decision 2 - Demand source policy
Selected:
- Demand-line-first before RFQ schema implementation.

Recorded decision:
- RFQ schema implementation must not begin until a dedicated demand-source and demand-line design is completed.
- NetworkPool.targetQty and NetworkPoolMembership.declaredQty alone are insufficient as the canonical long-term RFQ demand contract.
- A demand-line design must define line-level specs, snapshot rules, immutability, allocation handoff, audit semantics, and privacy boundaries before RFQ schema opens.
- Aggregate membership snapshot may be considered only as an explicit later exception, not the default.

### Decision 3 - Supplier universe
Selected:
- Invite-only suppliers for first implementation.

Recorded decision:
- Pool RFQs are sent only to explicitly invited supplier orgs.
- No open supplier marketplace exposure in the first RFQ implementation.
- Verified or relationship-gated supplier logic may be considered in later hardening packets.

### Decision 4 - Supplier/member identity visibility
Selected:
- Strict anonymization baseline.

Recorded decision:
- Suppliers must not see member identities.
- Suppliers must not see per-member quantities.
- Members must not see supplier quote spread.
- Members must not see supplier identities or quote documents in the RFQ slice.
- Later selected-supplier visibility, if any, requires a separate decision packet.

### Decision 5 - Feature flag strategy
Selected:
- Parent pool flag plus RFQ sub-flag.

Recorded decision:
- RFQ routes and surfaces must require both:
  - nc.procurement_pools.enabled
  - nc.procurement_pools.rfq.enabled
- Parent flag remains the master kill switch.
- RFQ sub-flag controls RFQ-specific rollout.
- Missing, disabled, or DB-error behavior must fail closed.

### Decision 6 - Acceptance semantics and MakerChecker
Selected:
- Quote acceptance is deferred unless a MakerChecker-specific path is explicitly opened.
- Acceptance without MakerChecker is forbidden.

Recorded decision:
- First RFQ implementation may include RFQ creation and invitation and may include quote submission design boundaries.
- Quote acceptance must not be implemented in the first RFQ schema and owner-route packet unless the MakerChecker path is explicitly opened.
- QUOTED to ACCEPTED remains MakerChecker-gated.
- No implementation may bypass the seeded MakerChecker requirement.

### Decision 7 - Document handling scope
Selected:
- Structured declarations plus validated external URL references first.

Recorded decision:
- First RFQ and quote scope may use structured declaration fields and validated external reference URLs.
- No dedicated NetworkPoolQuoteDocument model in the first RFQ implementation unless separately authorized.
- Existing domain-specific evidence or document models must not be reused blindly.

### Decision 8 - Supplier route sequencing
Selected:
- Owner routes first; supplier routes later.

Recorded decision:
- First RFQ implementation should start with owner/admin RFQ schema and owner-side routes only.
- Supplier quote routes require a separate supplier-route design and implementation sequence.
- Supplier self-service quote submission is deferred.

### Decision 9 - Pool state transition trigger policy
Selected:
- RFQ issue moves pool to CLOSED_FOR_BIDS.
- Owner-review action moves pool to QUOTED.
- Quote acceptance moves pool to ACCEPTED only through MakerChecker.

Recorded decision:
- RFQ issue should drive the relevant state transition through StateMachineService.
- First supplier quote must not automatically move pool to QUOTED without deterministic owner/admin review.
- Acceptance must follow the MakerChecker-gated path.

---

## 3) Implementation Boundary (Still Blocked)

Implementation status after this decision record:
- RFQ schema, routes, services, supplier quote flows, and acceptance remain blocked until all gate conditions below are satisfied.

Gate conditions:
1. This decision record is committed.
2. Demand-source and demand-line design packet is completed and reviewed.

Not authorized by this packet:
- Schema changes
- Migrations
- Route implementation
- Service implementation
- Test implementation
- UI implementation
- Supplier portal implementation
- Allocation logic
- Order/invoice/settlement/escrow implementation
- MakerChecker implementation changes

---

## 4) Next Packet Order

Next required packet:
- TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001

Explicit sequencing rule:
- The next packet after this decision record is the demand-source and demand-line design packet, not RFQ schema implementation.

---

## 5) Consequence and Readiness Verdict

Can RFQ implementation open now?
- No.

Readiness verdict:
- Decision-record closure is complete with this artifact.
- Implementation remains blocked pending demand-source and demand-line design closure.

---

## 6) Completion Checklist

- [x] RFQ design baseline referenced
- [x] RFQ decision audit baseline referenced
- [x] Nine selected decisions recorded
- [x] Demand-line-first sequencing recorded
- [x] Implementation boundary recorded as blocked
- [x] Forbidden implementation scope recorded
- [x] Next packet recorded as TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001
- [x] Exactly one decision-record artifact created
- [x] No code/schema/migration/test/UI files changed
