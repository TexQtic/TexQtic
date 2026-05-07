# TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001
## Network Commerce Pool RFQ Decision Audit

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001
Status: AUDIT AND DECISION OPTIONS ONLY - NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded repo-truth audit packet
Date: 2026-05-07

Implementation gate:
- This packet is audit and decision support only.
- This packet does not authorize schema, route, service, migration, test, UI, supplier portal, allocation, order, invoice, settlement, escrow, or MakerChecker implementation.

---

## 1) Executive Summary

This audit evaluates the nine open RFQ policy and sequencing decisions from the prior design packet and provides a recommended decision set for first implementation.

Core outcome:
- Pool RFQ can be implemented in a conservative first slice only after decision record closure.
- The current repo can support aggregate quantity snapshot design, but cannot natively represent line-level demand specifications without a dedicated demand-line model.
- Quote acceptance must remain coupled to the existing POOL state-machine MakerChecker requirement.

Primary recommendation:
- Keep first RFQ implementation narrow, owner-controlled, invite-only, privacy-first, and dual-flagged.
- Require a demand-source design decision packet before any RFQ schema packet opens.

Readiness verdict:
- RFQ implementation cannot proceed directly from this audit.
- A decision record and demand-source design must be closed first.

---

## 2) Files Inspected

Governance sequencing:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/GOVERNANCE-CHANGELOG.md

RFQ governance/design chain:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DESIGN-001.md
- governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-RECORD-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-PROD-VERIFY-GOV-CLOSE-001.md

Pool implementation anchors:
- server/prisma/schema.prisma
- server/src/services/networkPool.service.ts
- server/src/routes/tenant/pools.ts
- server/src/middleware/ncPoolFeatureGate.middleware.ts
- server/src/routes/tenant/pools.integration.test.ts
- tests/stateMachine.g020.test.ts

RFQ, supplier, relationship, MakerChecker, and state machine patterns:
- server/src/routes/tenant.ts
- server/src/routes/tenant.rfqVisibilityPolicyGate.test.ts
- server/src/routes/tenant.rfqMultiItemGrouping.test.ts
- server/src/routes/tenant.rfqDraftSubmitPersistence.test.ts
- server/src/services/rfq/supplierNotificationBoundary.service.ts
- server/src/services/relationshipAccess.service.ts
- server/src/services/relationshipAccessStorage.service.ts
- server/src/services/makerChecker.service.ts
- server/src/services/makerChecker.types.ts
- server/src/services/stateMachine.service.ts
- server/src/services/stateMachine.types.ts

Git-chain evidence surfaces:
- .git/logs/HEAD
- .git/logs/refs/heads/main

---

## 3) Repo-Truth Findings

1. Pool and membership foundation exists.
- `NetworkPool` and `NetworkPoolMembership` are implemented with owner-scoped and joined-scoped APIs.
- Discovery privacy constraints are already strict in tests and route payloads.

2. POOL lifecycle path for RFQ stage is seeded in practice and exercised by tests.
- POOL transitions include RFQ-stage states such as CLOSED_FOR_BIDS and QUOTED.
- POOL QUOTED to ACCEPTED is MakerChecker-gated in state-machine tests.

3. State machine already supports NC entities.
- `EntityType` includes POOL, SYNDICATE, and VCO_CHAIN.
- `stateMachine.service.ts` has polymorphic `networkLifecycleLog` write branch for NC entities.

4. Current RFQ model is buyer-supplier and single-response oriented.
- `Rfq` is tied to catalog item and supplier org.
- `RfqSupplierResponse` is one-per-RFQ and message-centric; not quote-comparison rich.

5. Existing RFQ visibility and supplier notification boundaries are privacy-first.
- Visibility gate tests enforce relationship/policy checks and non-leak responses.
- Supplier notification boundary explicitly blocks forbidden commercial/policy keys.

6. Existing feature gate for pools is fail-closed.
- `nc.procurement_pools.enabled` gate denies on missing, disabled, or DB error with 503 FEATURE_DISABLED.

7. Demand inputs exist only in aggregate-oriented fields today.
- Pool target quantity and membership declared quantity exist.
- No dedicated pool demand-line entity exists.

---

## 4) Decision Matrix (Nine Decisions)

| # | Decision | Repo-truth evidence | Options analyzed | Privacy/commercial risk | Implementation complexity | Rollout risk | Recommended decision | Blocks implementation | Follow-on packet if selected |
|---|---|---|---|---|---|---|---|---|---|
| 1 | RFQ ownership authority | Pool routes are owner-scoped for create/open/read-owned patterns. No pool RFQ route exists. | A owner/admin only, B platform-assisted, C member-triggered, D hybrid | C and D increase leakage and governance ambiguity in first slice. | A is lowest complexity and matches current ownership model. | A has lowest blast radius. | A for first implementation. | No, if A selected and decision recorded. | TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001 |
| 2 | Demand source policy | Schema has `targetQty` and membership `declaredQty`; no demand-line entity. | A membership snapshot, B demand-line first, C target only, D hybrid | C risks under-spec and commercial disputes. A/D can hide line-level intent gaps. | B higher upfront, A medium, C low but unsafe, D medium-high. | A is faster but rework risk; B slower but cleaner. | B before RFQ schema, with optional A fallback only by explicit exception. | Yes, until demand-source decision is closed. | TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001 |
| 3 | Supplier universe | RFQ routes are currently supplier-targeted; relationship services exist; no open supplier marketplace route for pool RFQ. | A invite-only, B verified-only, C relationship-gated, D open marketplace | D highest leakage and strategic exposure. B and C can over-constrain v1 if incomplete data. | A lowest complexity. C moderate due relationship checks. | D high rollout risk. A lowest rollback risk. | A now; C as Phase 2 hardening option. | No if A selected. | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-UNIVERSE-DESIGN-001 (if C/B later) |
| 4 | Supplier/member identity visibility | Discovery and RFQ tests enforce non-leak payload discipline; supplier notifications block forbidden keys. | A strict anonymization, B supplier sees owner only, C member sees selected supplier post-accept, D richer opt-in transparency | B/C/D increase leakage paths early. | A simplest and most aligned with current boundaries. | A lowest risk and easiest to verify. | A in first RFQ implementation. | No if A selected. | TEXQTIC-NC-PHASE1-POOL-RFQ-VISIBILITY-DECISION-RECORD-001 |
| 5 | Feature flag strategy | Existing gate uses parent flag with fail-closed behavior. | A parent only, B parent+rfq sub-flag, C rfq-only separate, D no separate gate | D unsafe for progressive rollout. C can bypass parent governance intent. | B moderate, A lowest. | B offers safest rollback for RFQ-only surfaces. | B parent plus RFQ sub-flag. | No, but sub-flag decision should be recorded before implementation. | TEXQTIC-NC-PHASE1-POOL-RFQ-FEATURE-GATE-DESIGN-001 |
| 6 | Acceptance semantics and MakerChecker | State machine returns PENDING_APPROVAL when transition requires MakerChecker; POOL QUOTED to ACCEPTED is MC-gated by tests. | A create/invite only, B include quote submit but defer acceptance, C include acceptance with MC, D acceptance without MC forbidden | D mandatory constitutional safety stance for pool acceptance. | C highest complexity due MC route/workflow integration. | A/B reduce initial risk and avoid half-wired MC paths. | B for first implementation, and D as hard constraint. | Yes for acceptance scope until MC path is opened. | TEXQTIC-NC-PHASE1-POOL-RFQ-QUOTE-ACCEPTANCE-MAKER-CHECKER-001 |
| 7 | Document handling scope | RFQ response has no attachment model; DPP evidence models are domain-specific; boundary service already blocks sensitive payload keys. | A declarations plus URL refs, B new quote-document model now, C reuse existing model, D defer docs entirely | C risks domain leakage and incorrect reuse. D may weaken audit trace if no references at all. | A medium-low, B high, C high-risk, D low. | A best balance for v1 if strict validation and allowlist enforced. | A in first RFQ quote scope. | No, if A constrained and audited. | TEXQTIC-NC-PHASE1-POOL-RFQ-DOCUMENT-HARDENING-001 |
| 8 | Supplier route sequencing | Existing tenant RFQ patterns show clear split between buyer and supplier flows; pool routes currently owner/member only. | A owner routes first, B owner+supplier same slice, C supplier inbox design first, D admin-assisted quote entry first | B/D increase leakage and auth-surface risk in first cut. | A lowest complexity and strongest incremental control. | A lowest rollout risk. | A for first implementation sequence. | No, if phased sequence accepted. | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTES-DESIGN-001 |
| 9 | Pool state transition trigger points | POOL lifecycle tests include MC gate on acceptance and NC lifecycle logs through state machine. | A issue moves AGGREGATING to CLOSED_FOR_BIDS, B first quote auto-moves to QUOTED, C owner action moves to QUOTED, D acceptance via MC to ACCEPTED | B can create race/idempotency issues on concurrent quote submit. C stronger audit control. | C slightly higher than B but safer. | C lower risk than B for deterministic state transitions. | A plus C plus D for first implementation. | No for A/C; Yes for D acceptance until MC scope opened. | TEXQTIC-NC-PHASE1-POOL-RFQ-LIFECYCLE-TRIGGER-DESIGN-001 |

---

## 5) Recommended Decision Set

Recommended first-slice set:
1. Ownership: owner/admin only.
2. Demand source: demand-line-first decision packet required before schema opening.
3. Supplier universe: invite-only.
4. Visibility: strict anonymization.
5. Feature gate: parent plus RFQ sub-flag.
6. Acceptance semantics: include quote submit but defer acceptance unless MakerChecker path is explicitly opened.
7. Documents: declarations plus validated external URL references only.
8. Sequencing: owner routes first, supplier routes later.
9. Lifecycle triggers: issue moves to CLOSED_FOR_BIDS, owner-review action moves to QUOTED, acceptance to ACCEPTED only through MakerChecker path.

---

## 6) Demand-Line-First vs Aggregate-Snapshot Recommendation

Question:
Should TEXQTIC-NC-PHASE1-POOL-DEMAND-LINE-DESIGN-001 happen before any RFQ schema implementation?

Recommendation:
- Yes.

Rationale:
- Current pool fields capture quantity but not a robust line-level demand contract suitable for quote comparability, downstream allocation traceability, and dispute-safe audit semantics.
- Starting schema work before demand-source decision closure creates a high chance of schema churn and migration debt.
- Existing RFQ model is not pool-native and does not solve demand-line semantics.

Minimum scope for demand-line design packet:
1. Canonical demand-line entity shape and keys.
2. Snapshot policy at RFQ issue time and immutability rules.
3. Line-level attributes required for quote evaluation.
4. Mapping from member declarations to consolidated demand lines.
5. Allocation and audit handoff fields needed by later packets.
6. Privacy fields and actor-specific visibility boundaries.

Conditional fast-path note:
- If Paresh explicitly chooses aggregate-first exception, schema must still enforce immutable snapshot constraints and include a migration plan to demand-line model.

Minimum aggregate snapshot constraints if exception is approved:
1. Immutable snapshot quantity and unit at issue time.
2. Snapshot basis marker and captured timestamp.
3. Snapshot source member count and deterministic selection logic.
4. Explicit no-line-detail limitation marker.
5. Forward-compatible field placeholders for later demand-line migration.

---

## 7) Risks and Mitigations

Top risks:
1. Commercial leakage from premature supplier/member transparency.
2. State inconsistency if quote-triggered transitions are auto-driven without deterministic owner action.
3. Rework risk if RFQ schema starts before demand-source design closure.
4. Acceptance flow dead-ends if MakerChecker path is not opened with acceptance scope.
5. Rollback risk without RFQ-specific feature kill switch.

Mitigations:
1. Enforce strict visibility denylist and supplier payload boundaries.
2. Require deterministic lifecycle transition ownership in service layer.
3. Close decision-record and demand-source packet before schema packet.
4. Keep acceptance deferred unless MakerChecker packet is explicitly opened.
5. Add RFQ sub-flag under pool parent flag.

---

## 8) Paresh Approvals Required

1. Confirm owner/admin-only RFQ issuance for first implementation.
2. Approve demand-line-first requirement before RFQ schema packet.
3. Confirm invite-only supplier universe in first slice.
4. Confirm strict anonymization baseline and no member quote spread visibility.
5. Approve parent plus RFQ sub-flag rollout strategy.
6. Approve acceptance deferral unless MakerChecker path is opened.
7. Approve declarations plus URL references as first document scope.
8. Approve phased route sequencing: owner first, supplier later.
9. Approve lifecycle trigger policy: owner action to QUOTED, MakerChecker-gated acceptance.

---

## 9) Recommended Next Packet

Recommended immediate next packet:
- TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001

Then:
- TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001

Reason:
- The nine decisions need formal closure before schema or route implementation packets can open.
- Demand-source decision must be resolved before RFQ schema foundation to avoid rework.

---

## 10) Implementation Readiness Verdict

Can RFQ implementation proceed directly now?
- No.

Required before implementation:
1. Decision record closure for this audit.
2. Demand-source design closure.
3. Explicit scope-open for RFQ schema foundation packet.

Current status:
- Implementation remains blocked.

---

## Appendix A) Mandatory Pre-Work Evidence

Preflight status:
- git status --short: clean (no output)

Commit existence confirmation from git log references:
- 087b18afb3a6dfde92830e7d6cef18ee0227d790
- 10812e5a40919d4a6fd96de224a6d7966bc5df70
- 0d40a7a
- a4d35aa
- 37d574ce2059fa69f372f0e6ea09d9c7b72b7894
- ac3bc28
- e3a806492d7981cb695f1663da7780c15cec0c20

Evidence source files:
- .git/logs/HEAD
- .git/logs/refs/heads/main

---

## Completion Checklist

- [x] git status checked
- [x] RFQ design commit confirmed
- [x] RFQ design artifact reviewed
- [x] current pool route/service/gate inspected
- [x] RFQ/supplier/quote patterns inspected
- [x] MakerChecker pattern inspected
- [x] lifecycle transition truth inspected
- [x] all nine RFQ decisions analyzed
- [x] demand-line-first recommendation made
- [x] Paresh approvals listed
- [x] one audit artifact created
- [x] no code/schema/migration/test/UI changes made
- [ ] one atomic commit made
