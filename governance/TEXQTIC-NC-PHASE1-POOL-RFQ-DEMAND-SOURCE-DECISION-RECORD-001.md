# TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001
## Network Commerce Pool RFQ Demand-Source Decision Record

Document ID: TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DECISION-RECORD-001
Status: DECISION RECORD CLOSED — DEMAND-LINE SCHEMA FOUNDATION AUTHORIZED NEXT
Type: TECS bounded decision-record packet
Date: 2026-05-07
Decision authority: Paresh Patel

Implementation gate:
- This packet records approved demand-source and demand-line decisions only.
- This packet does not authorize schema changes, migrations, services, routes, tests, UI,
  RFQ implementation, supplier routes, quote implementation, allocation, order placement,
  invoice generation, settlement, escrow, MakerChecker changes, demand-line implementation,
  or governance control active-state changes.

---

## 1) Authority and Inputs

Decision authority: Paresh Patel (pool owner / platform operator)

Upstream design artifact:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-SOURCE-DESIGN-001.md
  Commit: 961a2c1

Prior decision chain:
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-RECORD-001.md
- governance/TEXQTIC-NC-PHASE1-POOL-RFQ-DECISION-AUDIT-001.md

Governance sequencing references:
- governance/control/OPEN-SET.md
- governance/control/NEXT-ACTION.md

Lineage commits confirmed:
- 961a2c1 (demand-source design)
- 579e975
- c88d69e
- 087b18afb3a6dfde92830e7d6cef18ee0227d790
- 10812e5a40919d4a6fd96de224a6d7966bc5df70
- 0d40a7a
- a4d35aa
- ac3bc28
- e3a806492d7981cb695f1663da7780c15cec0c20

---

## 2) Recorded Decisions

### Decision 1 — Canonical demand-source authority

Selected:
Owner-normalized demand lines as canonical source.

Recorded decision:
- Owner-normalized demand lines are the canonical demand source for Pool RFQ.
- Pool RFQ demand is canonicalized exclusively by the pool owner/admin.
- Member declarations are quantity-basis inputs, not direct supplier-facing RFQ demand lines.
- Pool owner/admin holds sole authority to finalize demand lines for RFQ use.
- Joined members do not directly create supplier-visible demand lines in the first implementation.

Implementation consequence:
- No member-authored RFQ demand-line creation path exists in first implementation.
- All supplier-facing demand content is owner-curated.

---

### Decision 2 — Dedicated demand-line entity required

Selected:
Dedicated NetworkPoolDemandLine entity before RFQ schema.

Recorded decision:
- A dedicated `NetworkPoolDemandLine` entity is required before RFQ schema implementation begins.
- RFQ schema implementation must not open until `NetworkPoolDemandLine` schema foundation is completed and reviewed.
- Aggregate-only demand sourcing from `NetworkPool.targetQty` plus member `declaredQty` sum is not the default.
- Aggregate-only demand may be considered only through a separately authorized exception packet.

Implementation gate enforced by this record:
- RFQ schema, RFQ routes, supplier quote routes, allocation logic:
  ALL BLOCKED until NetworkPoolDemandLine schema foundation is completed and closed.

---

### Decision 3 — Demand-line granularity

Selected:
Multiple product/spec lines per pool; owner-normalized consolidated lines for first implementation.

Recorded decision:
- Demand lines must support multiple product/spec lines per pool.
- First implementation supports owner-normalized consolidated lines only.
- Member-authored rich spec input is deferred to a later authorized packet.
- Future SKU/catalog references may be additive optional fields in a later packet.

---

### Decision 4 — Minimum v1 demand-line field families

Selected:
Field families as specified in design packet Section 6.

Recorded decision:
The minimum v1 `NetworkPoolDemandLine` field families are:

| Family | Fields |
|---|---|
| Pool identity | pool_id, owner_org_id, line_ref |
| Product/spec | commodity_category, product_category, product_spec_summary |
| Quantity | qty, qty_unit |
| Requirements | quality_requirements_json, certification_requirements_json, packaging_requirements_json |
| Delivery | delivery_location, delivery_window_start, delivery_window_end |
| Controls | tolerance_pct, priority, status, source_type |
| Lineage | source_membership_id (nullable), normalized_from_member_input |
| Revision | revision_no, supersedes_line_id |
| Metadata | metadata_internal_json (internal only) |
| Timestamps | created_at, updated_at, locked_at |

Field additions beyond this set require a new authorized decision packet.
No safe_public_metadata or member/supplier-exposed metadata field in first implementation.

---

### Decision 5 — Member declaration mapping

Selected:
Quantity-first; member-specific rich spec deferred.

Recorded decision:
- `NetworkPoolMembership.declaredQty` remains the member contribution basis in this phase.
- Member declarations remain quantity-first; no rich spec per-member input in first implementation.
- Member-specific rich spec requests are deferred.
- Pool owner/admin consolidates membership inputs into normalized demand lines.
- Internal lineage may be recorded via `source_membership_id` or equivalent, but this field is
  never supplier-visible and never member-visible to other members.
- Per-member quantities and member identities are never exposed to suppliers or other members.

---

### Decision 6 — Snapshot and immutability policy

Selected:
Immutable snapshot at RFQ issue; revision-based mutation only after lock.

Recorded decision:
- RFQ issue captures an immutable demand snapshot before supplier visibility opens.
- All demand lines included in a snapshot transition to `LOCKED_FOR_RFQ` at snapshot capture.
- Locked demand lines cannot be edited in place.
- Post-issue demand changes require revision/supersession flow (`SUPERSEDED` status).
- Each RFQ revision must bind to a new demand snapshot version.
- Snapshot payload must include `pool_id`, `snapshot_version`, `captured_at`, `captured_by_actor`,
  `snapshot_basis`, and all included line field families listed in Decision 4.

---

### Decision 7 — Demand-line lifecycle/status model

Selected:
Five-status model: DRAFT, ACTIVE, LOCKED_FOR_RFQ, SUPERSEDED, CANCELLED.

Recorded decision:

Authorized status transitions:

```
DRAFT       → ACTIVE             (owner activates line)
ACTIVE      → LOCKED_FOR_RFQ    (snapshot capture at RFQ issue)
ACTIVE      → CANCELLED         (owner cancels before lock)
LOCKED_FOR_RFQ → SUPERSEDED     (revision flow only; no in-place mutation)
```

Transition rules:
- Only `DRAFT` and `ACTIVE` lines are editable.
- `LOCKED_FOR_RFQ` lines cannot be mutated in place.
- `SUPERSEDED` status is applied only through revision flow, not direct status mutation.
- `CANCELLED` is terminal.

No additional statuses in first implementation without a new decision packet.

---

### Decision 8 — Allocation handoff

Selected:
Demand lines as line-level allocation anchors; allocation algorithm deferred.

Recorded decision:
- Demand lines are the canonical future anchor for allocation, quote lines, order lines,
  invoices, and settlement traceability.
- Future allocation records must map to `demand_line_id`.
- Future supplier quote lines must reference snapshot line identity.
- Future order lines must preserve upstream demand-line reference.
- Future invoice and settlement splits must be traceable to line-level basis where applicable.
- Allocation algorithm design is deferred.
- Settlement waterfall math per line is deferred.
- Demand-line schema must not block future allocation mapping; schema must preserve foreign-key
  candidacy for future allocation, quote, and order-line tables.

---

### Decision 9 — Privacy and non-leak policy

Selected:
Strict anonymization; tiered access by actor role.

Recorded decision:

| Actor | Demand-line access | Member identity | Per-member qty | Internal metadata |
|---|---|---|---|---|
| Pool owner/admin | Full editable view (pre-lock) + full snapshot view | Owner-internal only | Owner-internal only | Internal only |
| Joined member | Own contribution summary only (if surfaced) | No | No other member qty | No |
| Invited supplier | Anonymized consolidated snapshot projection only | No | No | No |
| Non-member tenant | None | None | None | None |
| Control-plane admin | Deferred to separate authorized packet | Deferred | Deferred | Deferred |

Non-leak rules (mandatory in all implementation packets):
1. Suppliers must never see member identities.
2. Suppliers must never see per-member quantities.
3. Members must never see other members' demand contributions.
4. Supplier/member routes must use explicit allowlisted field projections, not raw model exposure.
5. Internal metadata, policy internals, and lineage fields must be excluded from all
   supplier-facing and member-facing projections.

---

### Decision 10 — Metadata policy

Selected:
Internal-only metadata; no raw metadata to supplier or member surfaces.

Recorded decision:
- Demand lines may include only internal metadata (`metadata_internal_json` or
  repo-consistent equivalent name).
- Supplier-visible requirement payload must be explicit structured fields from the
  requirements field family in Decision 4.
- No raw metadata passthrough to supplier or member routes.
- No `safe_public_metadata` field in first implementation.
- External metadata field additions require a new authorized decision packet.

---

### Decision 11 — Document/evidence policy

Selected:
No demand-line document model in first slice.

Recorded decision:
- No demand-line document model in the first implementation.
- Structured JSON requirements from Decision 4 are sufficient for initial demand-source foundation.
- Demand-line documents and evidence attachment are deferred to a later hardening packet.

---

### Decision 12 — Feature flag policy

Selected:
Pool flag for demand management; dual pool + RFQ flags for RFQ snapshot usage.

Recorded decision:
- Demand-line management routes and surfaces require:
  `nc.procurement_pools.enabled`
- RFQ-bound demand snapshot capture and use requires both:
  `nc.procurement_pools.enabled`
  `nc.procurement_pools.rfq.enabled`
- Feature gate failure behavior:
  Missing flag, disabled flag, or DB error must fail closed, consistent with existing
  ncPoolFeatureGate middleware posture.

---

### Decision 13 — Route/API sequencing

Selected:
Demand-line schema first; demand-line routes next; RFQ schema after demand-line foundation.

Recorded decision:
- Demand-line schema foundation opens before any demand-line or RFQ routes.
- Demand-line service and owner/internal routes open after schema foundation is reviewed.
- RFQ schema foundation opens after demand-line schema foundation and route layer are closed.
- Supplier-facing demand projection belongs to the authorized RFQ packet, not standalone
  demand-line routes.

---

## 3) Implementation Boundary

This decision record authorizes exactly one next packet:

TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001

That next packet may design and implement schema/migration only for:
- `NetworkPoolDemandLine`
- Demand snapshot entity/entities if schema design confirms they belong in the same packet

That next packet must NOT implement:
- RFQ schema or RFQ routes
- Supplier quote routes
- Allocation
- Order placement
- Invoice generation
- Settlement or escrow
- UI
- MakerChecker changes

Any scope beyond the above in the next packet requires a separate authorization.

---

## 4) Forbidden Scope (Carried Forward)

The following remain BLOCKED and FORBIDDEN from implementation until each receives a separate authorized decision and schema packet:

| Scope | Status |
|---|---|
| RFQ schema (Rfq model changes or pool-RFQ bridge) | BLOCKED — awaits demand-line schema foundation |
| RFQ routes (issue, revision, status) | BLOCKED |
| Supplier quote routes | BLOCKED |
| Allocation logic | BLOCKED |
| Order placement from pool RFQ | BLOCKED |
| Invoice generation from pool RFQ | BLOCKED |
| Settlement / escrow from pool RFQ | BLOCKED |
| Member-authored rich spec demand input | DEFERRED |
| Demand-line document model | DEFERRED |
| Control-plane admin demand visibility | DEFERRED |
| Aggregate-only demand as default | REJECTED — requires explicit exception packet |

---

## 5) Next Packet

Immediate next authorized packet:
TEXQTIC-NC-PHASE1-POOL-RFQ-DEMAND-LINE-SCHEMA-FOUNDATION-001

Scope of that packet:
- Design and implement `NetworkPoolDemandLine` schema/migration foundation.
- Apply SQL manually → prisma db pull → prisma generate → server restart.
- No RFQ schema, routes, or downstream supply-side implementation.

RFQ readiness verdict:
- RFQ schema and routes remain BLOCKED.
- Demand-line schema foundation must be completed and closed before RFQ schema can open.

---

## Completion Checklist

- [x] git status checked — clean before write
- [x] demand-source design commit confirmed (961a2c1)
- [x] all lineage commits confirmed (579e975, c88d69e, 087b18af..., 10812e5a..., 0d40a7a, a4d35aa, ac3bc28, e3a80649...)
- [x] RFQ decision record reviewed
- [x] RFQ decision audit reviewed
- [x] demand-source design artifact reviewed
- [x] OPEN-SET.md reviewed
- [x] NEXT-ACTION.md reviewed
- [x] canonical demand-source authority recorded (Decision 1)
- [x] dedicated demand-line entity requirement recorded (Decision 2)
- [x] demand-line granularity recorded (Decision 3)
- [x] minimum v1 field families recorded (Decision 4)
- [x] member declaration mapping recorded (Decision 5)
- [x] snapshot/immutability policy recorded (Decision 6)
- [x] demand-line lifecycle/status model recorded (Decision 7)
- [x] allocation handoff recorded (Decision 8)
- [x] privacy/non-leak policy recorded (Decision 9)
- [x] metadata policy recorded (Decision 10)
- [x] document/evidence policy recorded (Decision 11)
- [x] feature flag policy recorded (Decision 12)
- [x] route/API sequencing recorded (Decision 13)
- [x] implementation boundary recorded
- [x] forbidden scope carried forward
- [x] next packet set to demand-line schema foundation
- [x] RFQ schema remains blocked
- [x] only one decision artifact changed
- [x] no code/schema/migration/test/UI changes made
- [ ] one atomic commit made
