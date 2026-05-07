# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001
## Network Commerce Pool RFQ Demand Source and Demand-Line Design

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001
Status: DESIGN ONLY - NOT AUTHORIZED FOR IMPLEMENTATION
Type: TECS bounded design-only packet
Date: 2026-05-07

Implementation gate:
- This packet defines demand-source and demand-line design only.
- This packet does not authorize schema changes, migrations, services, routes, tests, UI, RFQ implementation, supplier routes, quote implementation, allocation, order placement, invoice generation, settlement, escrow, MakerChecker changes, or governance control updates.

---

## 1) Executive Summary

This packet defines the canonical demand-source contract required before Pool RFQ schema work can open.

Design conclusion:
- Demand-line-first remains the correct and required posture.
- `NetworkPool.targetQty` and `NetworkPoolMembership.declaredQty` are foundational but insufficient as canonical RFQ demand truth.
- A dedicated demand-line entity is required before RFQ schema foundation.
- Demand lines should be owner-normalized, member-derived in quantity basis, and locked by immutable snapshot at RFQ issue.

Readiness consequence:
- RFQ schema implementation remains blocked.
- The next packet after this design should be a demand-source decision record packet, then demand-line schema foundation.

---

## 2) Files Inspected

Governance sequencing and authority:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md
- governance/control/GOVERNANCE-CHANGELOG.md

RFQ decision chain:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DESIGN-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001.md

Discovery/privacy chain:
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DESIGN-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-DECISION-RECORD-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-DISCOVERY-PROD-VERIFY-GOV-CLOSE-001.md

Pool implementation anchors:
- server/prisma/schema.prisma
- server/src/services/networkPool.service.ts
- server/src/routes/tenant/pools.ts
- server/src/routes/tenant/pools.integration.test.ts
- server/src/middleware/ncPoolFeatureGate.middleware.ts

Related domain patterns used for demand contract design:
- server/src/routes/tenant.ts
- server/src/routes/tenant.rfqVisibilityPolicyGate.test.ts
- server/src/routes/tenant.rfqDraftSubmitPersistence.test.ts
- server/src/routes/tenant.rfqMultiItemGrouping.test.ts
- server/src/routes/tenant.rfqPrefillHandoff.test.ts
- server/src/services/rfq/supplierNotificationBoundary.service.ts
- server/src/services/networkPool.service.ts
- server/src/services/stateMachine.service.ts
- server/src/services/stateMachine.types.ts
- server/src/services/makerChecker.service.ts
- server/src/services/makerChecker.types.ts
- server/src/routes/tenant/invoices.ts
- server/src/routes/tenant/escrow.g018.ts
- server/src/lib/auditLog.ts
- server/src/lib/events.ts

---

## 3) Repo-Truth Findings

1. Pool data currently captures aggregate intent, not canonical RFQ line semantics.
- `NetworkPool` provides `targetQty`, `qtyUnit`, lifecycle anchor, and optional metadata.
- `NetworkPoolMembership` provides per-member `declaredQty`, `qtyUnit`, and allocation placeholders.
- No dedicated pool demand-line model exists.

2. Existing RFQ model is single-item buyer-supplier oriented.
- `Rfq` is tied to one `catalogItemId`, one `supplierOrgId`, and one quantity.
- `RfqSupplierResponse` is one-response-per-RFQ and message-centric.
- Current shape cannot represent multi-line pooled technical demand as canonical source.

3. Privacy and non-leak standards are strict and explicit.
- Existing RFQ tests enforce non-leak of policy, price, and internal fields.
- Supplier boundary service blocks forbidden keys (price/policy/risk/ranking and related internals).
- Discovery chain already enforces conservative quantity and metadata exposure.

4. Lifecycle and MakerChecker infrastructure is already suitable for gated transitions.
- POOL lifecycle transitions and NC lifecycle logging exist.
- State machine can return PENDING_APPROVAL for MC-gated transitions.
- Demand locking can be designed to align with lifecycle transition points without implementing state changes in this packet.

5. Metadata patterns in repo favor explicit allowlists and bounded JSON usage.
- JSON fields are common (`metadata`, `*_json`, stage attributes), but safe projection is consistently enforced in routes.
- Audit/event patterns support immutable traceability for critical actions.

---

## 4) Demand-Source Authority Decision

Canonical authority decision:
- Pool RFQ demand is canonicalized by pool owner/admin through owner-normalized demand lines.
- Member declarations are authoritative inputs for quantity contribution, not direct canonical RFQ line records.

Authority rules:
1. Pool owner/admin is the only actor that can finalize demand lines for RFQ usage.
2. Joined members contribute demand basis through membership quantities in this phase.
3. Member declarations do not directly create supplier-visible RFQ demand lines in v1.
4. Demand becomes immutable when RFQ issue snapshot is captured.

Answer to core authority questions:
- Canonical source: owner-normalized demand lines.
- Owner-only creation authority: yes (first implementation).
- Derived from member declarations: yes for quantity basis.
- Member direct line mutation: no in first implementation.
- Lock on RFQ issue: yes.

---

## 5) Demand-Line Entity Recommendation

Recommendation:
- Introduce dedicated `NetworkPoolDemandLine` before RFQ schema foundation.

Why not aggregate-only default:
- Aggregate-only (`targetQty` + member sum) cannot encode line-level product/spec/quality/certification/delivery/tolerance requirements.
- Aggregate-only cannot provide stable quote-line comparability and future allocation traceability without substantial rework.
- Decision record already sets demand-line-first as default; repo truth supports that decision.

Aggregate-only exception posture:
- Only as explicit later exception with migration plan and immutable snapshot constraints.
- Not the default sequence.

---

## 6) Demand-Line Data Model Proposal

Proposed minimum v1 entity (design only): `NetworkPoolDemandLine`

Required fields:
- id (UUID)
- pool_id (UUID, FK to `network_pools`)
- owner_org_id (UUID; must match pool owner org)
- line_ref (stable line reference unique per pool, revision-aware)
- commodity_category (string)
- product_category (nullable string)
- product_spec_summary (nullable text)
- qty (decimal)
- qty_unit (string)
- quality_requirements_json (nullable JSON)
- certification_requirements_json (nullable JSON)
- packaging_requirements_json (nullable JSON)
- delivery_location (nullable string)
- delivery_window_start (nullable timestamptz)
- delivery_window_end (nullable timestamptz)
- tolerance_pct (nullable decimal)
- priority (nullable int)
- status (`DRAFT|ACTIVE|LOCKED_FOR_RFQ|SUPERSEDED|CANCELLED`)
- source_type (`OWNER_DIRECT|MEMBERSHIP_DERIVED|OWNER_NORMALIZED`)
- source_membership_id (nullable UUID; used only for internal lineage rows)
- normalized_from_member_input (boolean default false)
- revision_no (int)
- supersedes_line_id (nullable UUID)
- metadata_internal_json (nullable JSON; internal-only)
- created_at
- updated_at
- locked_at (nullable timestamptz)

Design constraints:
1. `qty > 0`.
2. `delivery_window_end >= delivery_window_start` when both present.
3. `status = LOCKED_FOR_RFQ` implies `locked_at` non-null.
4. Unique per pool revision identity: `(pool_id, line_ref, revision_no)`.
5. Supplier-visible fields are a projection, not raw table exposure.

Granularity decision:
- Demand lines should support multiple product/spec lines per pool.
- First implementation should be owner-normalized consolidated lines, not member-authored supplier lines.
- Future SKU/catalog references can be additive optional fields later.

---

## 7) Member Declaration Mapping

Current mapping:
- `NetworkPoolMembership.declaredQty` remains the member contribution basis in this phase.

Mapping policy:
1. Member declarations remain quantity-first in current phase.
2. Member-specific rich spec requests are deferred.
3. Owner/admin consolidates membership inputs into normalized demand lines.
4. Internal mapping can retain lineage (`source_membership_id`) where needed for audit, but this lineage is not supplier-visible.
5. Aggregate per-line quantity is computed from approved mapping logic and persisted in demand lines and snapshots.

Non-leak rule in mapping:
- Per-member quantities and identities are not exposed to suppliers.
- Joined members do not see other member contribution mapping.

---

## 8) Snapshot and Immutability Policy

Snapshot capture point:
- Snapshot is captured at RFQ issue action, before supplier visibility is opened.

Snapshot content (minimum):
- pool_id
- demand_snapshot_ref
- snapshot_version
- captured_at
- captured_by_actor
- snapshot_basis (`DEMAND_LINES_V1`)
- line snapshots (array or child table design in future schema packet):
  - demand_line_id
  - line_ref
  - commodity_category
  - product_category
  - product_spec_summary
  - qty
  - qty_unit
  - quality_requirements_json
  - certification_requirements_json
  - packaging_requirements_json
  - delivery location/window
  - tolerance_pct
  - priority
- internal-only summary:
  - member_count_snapshot
  - mapping_method

Immutability rules:
1. Demand lines are editable only in `DRAFT` or `ACTIVE` before issue.
2. At snapshot capture, included lines transition to `LOCKED_FOR_RFQ`.
3. Locked lines cannot be edited in place.
4. Post-issue changes require new revision lines (`SUPERSEDED` pattern) and a new RFQ revision snapshot.
5. Any new RFQ revision must bind to a new snapshot version.

State guidance for demand lines:
- `DRAFT` -> `ACTIVE` -> `LOCKED_FOR_RFQ`
- `ACTIVE` -> `CANCELLED`
- `LOCKED_FOR_RFQ` -> `SUPERSEDED` only via revision flow (not mutation)

---

## 9) Allocation Handoff Design

Design objective:
- Demand lines must become stable anchors for future allocation, quote-line, order-line, invoice, and settlement mapping.

Required handoff semantics (design, no implementation):
1. Allocation basis should be line-level (`demand_line_id`) not only pool aggregate.
2. Future member allocation records should map member quantities to `demand_line_id`.
3. Future supplier quote lines should reference snapshot line identity (`snapshot_line_ref`/`demand_line_id`).
4. Future order lines should preserve upstream demand-line reference.
5. Future invoice and settlement splits should be traceable to line-level basis where applicable.

What is deferred:
- Allocation algorithm details.
- Settlement waterfall math per line.
- Quote-line and order-line schema details.
- Financial execution and escrow integration.

---

## 10) Privacy and Non-Leak Matrix

| Actor | Demand-line visibility | Member identity visibility | Per-member qty visibility | Raw metadata visibility |
|---|---|---|---|---|
| Pool owner/admin | Full editable demand-line view (pre-lock) and full snapshot view | Owner internal only | Owner internal only | Internal only |
| Joined member | Own contribution summary only (if surfaced) | No | No other member qty | No raw metadata |
| Invited supplier | Anonymized consolidated demand lines (snapshot projection only) | No | No | No raw metadata |
| Non-member tenant | None | None | None | None |
| Control-plane admin | Deferred to separate packet | Deferred | Deferred | Deferred |

Confirmed non-leak rules:
1. Suppliers do not see member identities.
2. Suppliers do not see per-member quantities.
3. Members do not see other member demand details.
4. Supplier/member tenant responses must use explicit allowlisted projections.
5. Internal metadata and policy internals must remain hidden from supplier/member surfaces.

---

## 11) Metadata and Document Policy

Metadata policy:
- Demand lines may include metadata only as internal metadata (`metadata_internal_json`).
- No raw metadata should be supplier-visible or member-visible in first slice.
- Supplier-visible requirement payload should be explicit structured fields, not generic metadata passthrough.

Document/evidence policy:
- Demand-line document models are not required before RFQ schema in first slice.
- Structured requirements JSON is sufficient for initial demand-source foundation.
- Dedicated demand-line documents/evidence should remain deferred to a separate hardening packet.

---

## 12) Feature Flag Decision

Decision:
1. Demand-line management routes/surfaces (owner/member internal demand context) require:
- `nc.procurement_pools.enabled`

2. RFQ-bound demand snapshot capture/use requires both:
- `nc.procurement_pools.enabled`
- `nc.procurement_pools.rfq.enabled`

Failure behavior:
- Missing/disabled/DB-error must fail closed, consistent with existing pool gate posture.

---

## 13) Route and API Candidates (Design Only)

Candidate owner/internal routes:
- GET /api/tenant/network-commerce/pools/:poolId/demand-lines
- POST /api/tenant/network-commerce/pools/:poolId/demand-lines
- PATCH /api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId
- POST /api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId/cancel

Candidate lock/snapshot routes:
- POST /api/tenant/network-commerce/pools/:poolId/demand-lines/lock-for-rfq
- GET /api/tenant/network-commerce/pools/:poolId/demand-snapshots/:snapshotId
- GET /api/tenant/network-commerce/pools/:poolId/demand-snapshot/latest

Route sequencing recommendation:
- Demand-line schema/service foundation should open before any public RFQ route implementation.
- Initial demand-line routes should be owner/internal only.
- Supplier-facing demand projection should be tied to RFQ packet, not exposed as standalone supplier demand route.

---

## 14) Proposed Implementation Sequence

Recommended sequence:
1. Demand-source decision record closure
- Packet: `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001`

2. Demand-line schema foundation
- Add demand-line and snapshot entities plus constraints (no RFQ entity yet)

3. Demand-line service and owner/internal routes
- Owner create/edit/list/cancel
- Lock-for-RFQ snapshot creation path (internal)

4. RFQ schema foundation
- Link RFQ to immutable demand snapshot

5. RFQ owner routes
- Issue flow using locked snapshot

6. Supplier quote routes and acceptance packet(s)
- Open only in later authorized packets with existing decision constraints

Gate statement:
- RFQ schema/routes remain blocked until steps 1 and 2 are complete.

---

## 15) Future Test Plan (For Implementation Packets)

Required tests:
1. Owner creates demand line successfully.
2. Non-owner cannot create demand line.
3. Joined member cannot read other member demand contribution details.
4. Supplier cannot directly access owner demand-line management routes.
5. Demand lines lock when RFQ issue snapshot is captured.
6. Locked demand lines cannot be edited in place.
7. Snapshot captures expected line fields and version metadata.
8. Snapshot payload excludes member identities and per-member quantities.
9. Feature gate disabled/missing/DB error blocks demand routes (fail-closed).
10. Route responses exclude raw metadata internals.
11. Revision flow creates superseded line instead of mutating locked line.
12. Cleanup leaves no residual test rows.

---

## 16) Paresh Decisions Required Before Implementation

1. Confirm owner-normalized demand lines as canonical source.
2. Confirm member declarations remain quantity-first and member rich spec input is deferred.
3. Confirm minimum v1 demand-line field set and status model.
4. Confirm immutable snapshot versioning model at RFQ issue.
5. Confirm internal-only metadata policy.
6. Confirm no demand-line document model in first slice.
7. Confirm feature-flag split (`pool` for demand management, dual-flag for RFQ snapshot usage).
8. Confirm implementation sequence: demand-source decision record -> demand-line schema foundation -> RFQ schema.

---

## 17) Recommended Next Packet

Immediate next packet:
- `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001`

After decision record closure:
- `TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001`

Readiness verdict:
- This design packet closes demand-source design intent only.
- RFQ schema implementation cannot open yet.

---

## Appendix A) Mandatory Pre-Work Evidence

Preflight:
- `git status --short` -> clean (no output)

Commit confirmations observed in git log references:
- 579e975
- c88d69e
- 087b18afb3a6dfde92830e7d6cef18ee0227d790
- 10812e5a40919d4a6fd96de224a6d7966bc5df70
- 0d40a7a
- a4d35aa
- ac3bc28
- e3a806492d7981cb695f1663da7780c15cec0c20

Evidence source:
- .git/logs/HEAD
- .git/logs/refs/heads/main

---

## Completion Checklist

- [x] git status checked
- [x] RFQ decision record confirmed
- [x] RFQ decision record reviewed
- [x] RFQ design/audit reviewed
- [x] current pool implementation inspected
- [x] related domain line/spec patterns inspected
- [x] demand-source authority defined
- [x] demand-line entity recommendation made
- [x] demand-line data model proposed
- [x] member declaration mapping defined
- [x] snapshot/immutability policy defined
- [x] allocation handoff considered
- [x] privacy/non-leak matrix defined
- [x] feature flag decision made
- [x] implementation sequence proposed
- [x] Paresh decisions listed
- [x] one design artifact created
- [x] no code/schema/migration/test/UI changes made
- [ ] one atomic commit made
