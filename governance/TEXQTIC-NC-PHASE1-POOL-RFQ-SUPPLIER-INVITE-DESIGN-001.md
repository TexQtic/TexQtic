# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001

**Design Packet — Network Commerce Phase 1B: Pool RFQ Supplier Invite Workflow**

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| Packet ID | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001 |
| Type | DESIGN |
| Status | DESIGN_AUTHORED |
| Domain | Network Commerce — Phase 1B |
| Date | 2026-05-30 |
| Author | GitHub Copilot (governed agent) |
| Authorized by | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001 prompt (Paresh authorization — design packet only) |
| Basis commit | 5231cf4 — tracker reconciliation correction |
| Prior basis | 898bdcb — Pool RFQ issue route; f8128b5 — Pool RFQ issue service |
| Tracker reference | governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md §11 slice B-1 |
| Mode | DESIGN ONLY — no implementation, no schema, no migration, no service, no route |

### Governance Posture Keys (UNCHANGED by this packet)

| Key | Value |
|---|---|
| `active_delivery_unit` | `HOLD_FOR_AUTHORIZATION` |
| `dpp_launch_authorization` | `HOLD_FOR_PARESH_DECISION` |
| `nc_phase1_next_action_candidate` | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001` |
| `nc_phase1_next_action_status` | `DESIGN_AUTHORED` (was HOLD_FOR_PARESH_DECISION) |

> Note: `nc_phase1_next_action_status` advances to `DESIGN_AUTHORED` as this document now exists.
> Implementation authorization remains `HOLD_FOR_PARESH_DECISION` — see §21.

---

## §2 — Executive Summary

This packet designs the Supplier Invite workflow for Network Commerce Phase 1B. It extends the
existing Pool RFQ Issue capability (Phase 1A) by defining how the pool owner (buyer org) sends
invitations to supplier orgs, how suppliers discover and respond to those invitations, and how
the system enforces cross-org privacy, tenant isolation, and feature gating.

**What this design covers:**

- A new `NetworkSupplierInvite` entity (Option A — dedicated table, recommended)
- Owner-side operations: send invite, list invites, get invite, cancel invite
- Supplier-side operations: list own invites, get invite (with safe RFQ projection), accept, decline
- Cross-org RLS posture (owner sees all invites for their RFQ; supplier sees only their own row)
- Non-leaking 404 contract (supplier cannot probe invite existence across orgs)
- Feature gate extension (new sub-flag `nc.procurement_pools.supplier_invites.enabled`)
- Route topology: two separate namespaces (owner under pools prefix; supplier under new namespace)
- Status model: PENDING → ACCEPTED | DECLINED | CANCELLED | EXPIRED
- Governance chain recommendation (9 implementation packets)

**What this design does NOT cover (explicitly deferred):**

- Supplier quote submission (Phase 1C)
- RFQ status transitions beyond ISSUED (QUOTED, ACCEPTED, EXPIRED — Phase 1C/1D)
- Pool state transitions beyond CLOSED_FOR_BIDS (Phase 1C: QUOTED → ACCEPTED → ALLOCATED)
- Email / notification delivery (deferred — transport layer not defined)
- Supplier onboarding / directory (pre-existing capability or future OES scope)
- MakerChecker for invite actions (deferred)
- Bulk invite operations (deferred)

---

## §3 — Repo-Truth Baseline

All facts below are verified against HEAD `5231cf4` (governance) / `898bdcb` (latest implementation).

### Schema baseline (NC models)

| Model | Table | Status |
|---|---|---|
| `NetworkLifecycleLog` | `network_lifecycle_logs` | IMPLEMENTED |
| `NetworkInvoice` | `network_invoices` | PARTIAL (stub service, no route) |
| `NetworkPool` | `network_pools` | IMPLEMENTED |
| `NetworkPoolMembership` | `network_pool_memberships` | IMPLEMENTED |
| `NetworkPoolDemandLine` | `network_pool_demand_lines` | IMPLEMENTED |
| `NetworkPoolDemandSnapshot` | `network_pool_demand_snapshots` | IMPLEMENTED |
| `NetworkPoolDemandSnapshotLine` | `network_pool_demand_snapshot_lines` | IMPLEMENTED |
| `NetworkPoolRfq` | `network_pool_rfqs` | IMPLEMENTED |
| `NetworkPoolRfqLine` | `network_pool_rfq_lines` | IMPLEMENTED |
| `NetworkSupplierInvite` | `network_pool_rfq_supplier_invites` | **NOT_STARTED — this design packet** |

### Migration baseline (7 NC migrations)

| ID | Scope |
|---|---|
| `20260520000000_nc_network_lifecycle_logs` | NetworkLifecycleLog schema |
| `20260521000000_nc_network_invoices` | NetworkInvoice schema |
| `20260522000000_nc_network_pools` | NetworkPool + Membership schema |
| `20260523000000_nc_pool_lifecycle_seed` | POOL lifecycle states + transitions seed |
| `20260524000000_nc_pool_demand_line_schema` | NetworkPoolDemandLine schema |
| `20260525000000_nc_pool_demand_snapshot_schema` | NetworkPoolDemandSnapshot + SnapshotLine schema |
| `20260528000000_nc_pool_rfq_schema` | NetworkPoolRfq + NetworkPoolRfqLine schema |

The Supplier Invite schema migration is **not yet applied**. It will require a new migration ID
in the `202606NNNNNNNN` range, authorized in a separate schema implementation packet.

### Route baseline (13 NC routes)

| Method | Path | Status |
|---|---|---|
| POST | `/api/tenant/network-commerce/pools` | IMPLEMENTED |
| POST | `/api/tenant/network-commerce/pools/:poolId/open` | IMPLEMENTED |
| POST | `/api/tenant/network-commerce/pools/:poolId/join` | IMPLEMENTED |
| GET | `/api/tenant/network-commerce/pools` | IMPLEMENTED |
| GET | `/api/tenant/network-commerce/pools/joined` | IMPLEMENTED |
| GET | `/api/tenant/network-commerce/pools/:poolId` | IMPLEMENTED |
| GET | `/api/tenant/network-commerce/pools/:poolId/membership` | IMPLEMENTED |
| GET | `/api/tenant/network-commerce/pools/:poolId/demand-lines` | IMPLEMENTED |
| POST | `/api/tenant/network-commerce/pools/:poolId/demand-lines` | IMPLEMENTED |
| POST | `/api/tenant/network-commerce/pools/:poolId/demand-lines/lock-for-rfq` | IMPLEMENTED |
| PATCH | `/api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId` | IMPLEMENTED |
| POST | `/api/tenant/network-commerce/pools/:poolId/demand-lines/:lineId/cancel` | IMPLEMENTED |
| POST | `/api/tenant/network-commerce/pools/:poolId/rfq/issue` | IMPLEMENTED |

### Feature gate baseline

| Key | Scope | Status |
|---|---|---|
| `nc.procurement_pools.enabled` | Parent — pool operations | ACTIVE (2-layer: global + per-tenant) |
| `nc.procurement_pools.rfq.enabled` | Sub-flag — RFQ operations | ACTIVE (2-layer: global + per-tenant) |
| `nc.procurement_pools.supplier_invites.enabled` | Sub-flag — Supplier Invite | **NOT_STARTED — this design packet** |

### NetworkPoolRfq field summary (confirmed from schema.prisma)

Key fields relevant to supplier invite design:
- `id` — PK
- `ownerOrgId` — RLS anchor (buyer/owner org)
- `poolId` — FK to network_pools
- `snapshotId` — FK to network_pool_demand_snapshots
- `rfqRef` — stable external reference (UUID-derived)
- `rfqVersion` — 1 in Phase 1B (no re-issue yet)
- `status` — currently always `ISSUED` at issue time; allowed: `ISSUED|QUOTED|ACCEPTED|REJECTED|EXPIRED|CANCELLED`
- `issueBasis` — `SNAPSHOT_LOCK` (v1 only)
- `issuedAt` — timestamp
- `issuedByUserId` — nullable
- `issueReason` — nullable, max 1000 chars
- `responseDeadlineAt` — nullable, not enforced in Phase 1A
- `supplierInviteMode` — `INVITE_ONLY` (stored as placeholder in Phase 1A; becomes operational in Phase 1B)
- `lineCount` — count of RFQ lines
- `totalQty` — aggregate qty
- `qtyUnit` — unit
- `metadataInternalJson` — **never exposed to suppliers**

---

## §4 — Current Implemented Upstream Flow (Phase 1A)

```
Pool creation (DRAFT)
  ↓
Pool opened (OPEN) — POST /pools/:poolId/open
  ↓
Members join (AGGREGATING) — POST /pools/:poolId/join
  ↓
Demand lines created by pool admin
  POST /pools/:poolId/demand-lines
  PATCH /pools/:poolId/demand-lines/:lineId
  ↓
Demand lines locked for RFQ (LOCKED_FOR_RFQ status on lines)
  POST /pools/:poolId/demand-lines/lock-for-rfq
  [Creates NetworkPoolDemandSnapshot (DRAFT → CAPTURED)]
  ↓
Pool RFQ issued (AGGREGATING → CLOSED_FOR_BIDS)
  POST /pools/:poolId/rfq/issue
  [Creates NetworkPoolRfq (ISSUED) + NetworkPoolRfqLines]
  [Writes NetworkLifecycleLog via StateMachineService]
  [Pool state → CLOSED_FOR_BIDS]
  ↓
[PHASE 1B STARTS HERE — THIS DESIGN PACKET]
Supplier invited (pool stays CLOSED_FOR_BIDS)
  POST /pools/:poolId/rfq/:rfqId/invites
  [Creates NetworkSupplierInvite (PENDING)]
  ↓
Supplier responds (accept or decline)
  POST /supplier-rfq-invites/:inviteId/accept | /decline
  [Updates NetworkSupplierInvite status]
  ↓
[PHASE 1C: quote submission, QUOTED transition — NOT in scope here]
```

The `supplierInviteMode = 'INVITE_ONLY'` field on `NetworkPoolRfq` is already stored but
not yet operational. Phase 1B makes it operational: only explicitly invited suppliers receive
access to RFQ details.

---

## §5 — Scope and Non-Scope of This Design Packet

### In scope

| # | Item |
|---|---|
| 1 | Entity model for `NetworkSupplierInvite` — full field listing |
| 2 | Status model: PENDING, ACCEPTED, DECLINED, CANCELLED, EXPIRED |
| 3 | Owner-side operations: send invite, list invites, get invite, cancel invite |
| 4 | Supplier-side operations: list own invites, get invite, accept, decline |
| 5 | Supplier-visible RFQ projection (safe fields only; no member data, no internal JSON) |
| 6 | Cross-org access control posture (owner vs supplier scoping; non-leak 404) |
| 7 | RLS column design (owner_org_id + supplier_org_id as co-primary RLS anchors) |
| 8 | Feature gate extension (new sub-flag, middleware chain) |
| 9 | Route topology — two namespaces (owner + supplier) |
| 10 | Error class taxonomy |
| 11 | Body validation rules |
| 12 | Lifecycle log recommendation for invite events |
| 13 | D-017-A compliance statement for both owner and supplier routes |
| 14 | Test strategy |
| 15 | Governance chain (9 implementation packets) |
| 16 | Open decisions for the Decision Audit packet |

### Explicitly NOT in scope

| # | Item | Deferred to |
|---|---|---|
| 1 | Supplier quote submission | Phase 1C |
| 2 | `NetworkPoolRfq.status` transition to QUOTED | Phase 1C |
| 3 | Pool state transition beyond CLOSED_FOR_BIDS | Phase 1C |
| 4 | Bulk invite operations | Future |
| 5 | Email / notification transport | Future / separate capability |
| 6 | Supplier directory / discovery (finding supplier orgs) | OES domain |
| 7 | Re-invite after cancel/decline | Phase 1C or later |
| 8 | MakerChecker for any invite action | Future |
| 9 | VIEWED status tracking | Future |
| 10 | RFQ line-level detail visible to supplier (individual member line data) | Deferred by privacy contract |
| 11 | Any schema change to existing NC models | Schema boundary preserved |
| 12 | Any change to existing routes or services | Implementation boundary preserved |

---

## §6 — Entity Strategy Options

### Option A — New `NetworkSupplierInvite` Table (RECOMMENDED)

Create a dedicated `network_pool_rfq_supplier_invites` table.

**Pros:**
- One row per invited supplier per RFQ — clean audit trail for each invite
- Per-invite status transitions (PENDING → ACCEPTED/DECLINED/CANCELLED) are first-class rows
- Phase 1C quote submission can cleanly FK → `network_pool_rfq_supplier_invites(id)`
- RLS policies can be scoped to this table directly with both `owner_org_id` and `supplier_org_id`
- Immutability of invite identity (inviteId stable forever) supports audit lineage
- No modification to existing `NetworkPoolRfq` or `NetworkPoolRfqLine` schema

**Cons:**
- New migration required (authorized separately)

**Verdict:** RECOMMENDED. Clean separation, extensibility for Phase 1C, full per-invite audit.

### Option B — Embed invite state on `NetworkPoolRfq`

Store an array of invited supplier org IDs as JSONB on `NetworkPoolRfq`, or add multiple
`invited_supplier_org_id_*` columns.

**Cons:**
- Cannot track per-supplier status independently as the number of suppliers grows
- JSONB arrays are opaque to RLS column policies
- Phase 1C quote submission cannot cleanly FK to a sub-entity within JSONB
- Anti-pattern for variable-cardinality relationships
- Would require modifying already-implemented NetworkPoolRfq schema

**Verdict:** REJECTED.

### Option C — Generic Invite/Event Model

Use the existing `NetworkLifecycleLog` or a new generic `NetworkEvent` table to record invite
events rather than a dedicated entity.

**Cons:**
- Cannot track current invite status — lifecycle logs are append-only (no current-state query)
- Cannot scope a supplier's readable row set via RLS without a dedicated supplier_org_id column
- Cannot enforce `unique(rfq_id, supplier_org_id)` constraint on a generic table
- Phase 1C quote FK → invite ID is not possible without a dedicated invite row

**Verdict:** REJECTED for entity identity. NetworkLifecycleLog writes are still recommended as
a supplementary audit mechanism (see §9) but do not replace a dedicated invite table.

---

## §7 — Recommended Entity Model

### Proposed table: `network_pool_rfq_supplier_invites`

#### Proposed Prisma model name: `NetworkSupplierInvite`

> This is a DESIGN PROPOSAL only. No schema changes are made by this packet.
> Schema application is authorized in TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001.

```
model NetworkSupplierInvite {
  id                   UUID    PK  gen_random_uuid()

  // ── RLS anchors ───────────────────────────────────────────────
  ownerOrgId           UUID    NOT NULL    -- pool owner (buyer org); primary RLS anchor
                                           -- FK → organizations(id) ON DELETE CASCADE
  supplierOrgId        UUID    NOT NULL    -- invited supplier org
                                           -- FK → organizations(id) ON DELETE CASCADE

  // ── Context FKs ───────────────────────────────────────────────
  rfqId                UUID    NOT NULL    -- FK → network_pool_rfqs(id) ON DELETE CASCADE
  poolId               UUID    NOT NULL    -- denormalized FK → network_pools(id) ON DELETE CASCADE
                                           -- (query convenience; also used in RLS prefix check)

  // ── Identity ──────────────────────────────────────────────────
  inviteRef            VARCHAR(100) NOT NULL  -- service-generated UUID-derived ref; non-empty
                                               -- CHECK: invite_ref <> ''

  // ── Status ────────────────────────────────────────────────────
  status               VARCHAR(50)  NOT NULL  DEFAULT 'PENDING'
                                               -- CHECK IN ('PENDING','ACCEPTED','DECLINED',
                                               --           'CANCELLED','EXPIRED')

  // ── Timing ────────────────────────────────────────────────────
  invitedAt            TIMESTAMPTZ  NOT NULL  -- set at INSERT (service-generated; not caller-supplied)
  invitedByUserId      UUID?                  -- user who triggered invite (nullable for system)
  acceptedAt           TIMESTAMPTZ?           -- NULL until accepted
  declinedAt           TIMESTAMPTZ?           -- NULL until declined
  cancelledAt          TIMESTAMPTZ?           -- NULL until cancelled
  expiresAt            TIMESTAMPTZ?           -- optional; nullable in v1
                                               -- if set, service enforces EXPIRED on read

  // ── Reason / context fields ────────────────────────────────────
  messageToSupplier    TEXT?                  -- optional owner note included with invite
  declineReason        TEXT?                  -- optional supplier-provided reason (decline only)
  cancelReason         TEXT?                  -- optional owner-provided reason (cancel only)

  // ── Internal ──────────────────────────────────────────────────
  metadataInternalJson JSONB?                 -- internal ops metadata; NEVER exposed to suppliers

  // ── Timestamps ────────────────────────────────────────────────
  createdAt            TIMESTAMPTZ  NOT NULL  DEFAULT now()
  updatedAt            TIMESTAMPTZ  NOT NULL  DEFAULT now()

  // ── Constraints ───────────────────────────────────────────────
  UNIQUE (rfq_id, supplier_org_id)           -- one active invite per supplier per RFQ
  INDEX (rfq_id)
  INDEX (owner_org_id, created_at DESC)
  INDEX (supplier_org_id, created_at DESC)
  INDEX (pool_id)
  INDEX (status)
  INDEX (invitedAt DESC)
}
```

#### Field notes

| Field | Rationale |
|---|---|
| `ownerOrgId` | Primary RLS anchor. Owner sees all invites for their RFQ. Must equal pool.orgId. |
| `supplierOrgId` | Secondary RLS anchor. Supplier sees only rows where this equals their orgId. |
| `rfqId` | FK → network_pool_rfqs(id). Cascade delete on RFQ deletion (unlikely but safe). |
| `poolId` | Denormalized from rfq.poolId. Enables pool-scoped queries without joining through rfq. |
| `inviteRef` | UUID-derived stable external ref. Analogous to rfqRef. Service-generated. |
| `status` | Current invite status. Mutable (only status + timing + reason fields update). |
| `expiresAt` | Nullable. In Phase 1B: optionally copied from rfq.responseDeadlineAt if present. |
| `messageToSupplier` | Caller-supplied optional context. Max length enforcement at validation layer. |
| `declineReason` | Supplier-supplied only on decline action. Nullable. |
| `cancelReason` | Owner-supplied only on cancel action. Nullable. |
| `metadataInternalJson` | Internal only — never serialized in any supplier-facing response. |

#### DB constraint notes

- `UNIQUE (rfq_id, supplier_org_id)`: prevents double-inviting the same supplier to the same RFQ.
  A cancelled invite constitutes the "one" invite — re-invite requires explicit cancel-and-resend
  (deferred decision: see §19, open decision OD-3).
- `CHECK (status IN (...))`: enforces allowed status values at DB level.
- `CHECK (invite_ref <> '')`: service-generated; non-empty enforced.
- `ON DELETE CASCADE` from rfq: if the RFQ row is deleted (unlikely — no delete route defined),
  invites cascade away cleanly.
- No `ON DELETE CASCADE` from organizations rows — organizations use `ON DELETE CASCADE` to
  their owned entities (ownerOrg) and should also for supplier (supplierOrg).

---

## §8 — Status Model

### Status transitions

```
         ┌────────────────────────────────────────────────┐
         │                   PENDING                       │
         │  (initial state after invite is created/sent)   │
         └───────────┬─────────────┬──────────────┬────────┘
                     │             │              │
            supplier │    supplier │      owner   │
              accept │      decline│      cancel  │  (service: TTL check on read/schedule)
                     ↓             ↓              ↓
                ACCEPTED       DECLINED       CANCELLED
                (terminal)     (terminal)    (terminal)
                
         ┌────────────────────────────────────────────────┐
         │                   EXPIRED                       │
         │  (terminal — TTL enforcement, if expiresAt set) │
         └────────────────────────────────────────────────┘
```

### Status rules

| Status | Who sets it | Transition from | Terminal? |
|---|---|---|---|
| `PENDING` | Service (on create) | — (initial) | No |
| `ACCEPTED` | Supplier | PENDING only | Yes |
| `DECLINED` | Supplier | PENDING only | Yes |
| `CANCELLED` | Owner (OWNER + ADMIN) | PENDING only | Yes |
| `EXPIRED` | Service (TTL check) | PENDING only | Yes |

### Deferred statuses

| Status | Deferred reason |
|---|---|
| `VIEWED` | Requires a separate read-tracking event (server-side timestamp set on first supplier GET). Deferred to Phase 1C or later — adds complexity without unblocking quote submission. |
| `RE_INVITED` | Re-invite after CANCELLED/DECLINED deferred to Phase 1C. |

### Invariants

- A supplier may have at most one invite per RFQ (`UNIQUE (rfq_id, supplier_org_id)`).
- Once in a terminal state (ACCEPTED, DECLINED, CANCELLED, EXPIRED), status is immutable.
- Service MUST validate terminal state before any transition attempt and return 422 INVALID_TRANSITION.
- Owner cannot set ACCEPTED or DECLINED (those belong to supplier only).
- Supplier cannot set CANCELLED (that belongs to owner only).

---

## §9 — Lifecycle Interaction

### Pool state during supplier invite

**The pool remains in state `CLOSED_FOR_BIDS` throughout the supplier invite workflow.**

No StateMachineService transition is required for invite operations. The `CLOSED_FOR_BIDS` state
correctly signals that the aggregate demand is finalized and the pool is no longer accepting new
member declarations. Supplier invite activity (PENDING, ACCEPTED, DECLINED) occurs within this
state without advancing the pool's lifecycle.

The pool's lifecycle will not advance until Phase 1C, when a sufficient number of suppliers have
submitted quotes and the pool admin triggers a transition (likely to `QUOTED` or `AWARDED`).

### NetworkPoolRfq.status during supplier invite

In Phase 1B, `NetworkPoolRfq.status` remains `ISSUED` throughout supplier invite activity.
`status = 'QUOTED'` is reserved for Phase 1C (first quote received). No status update occurs
on NetworkPoolRfq rows as a result of invite operations.

### Lifecycle logging recommendation

While no StateMachineService transition occurs, audit logging is strongly recommended.
The recommended approach is to write to `NetworkLifecycleLog` directly (not via StateMachineService)
for invite events:

| Event | entity_type | entityId | fromStateKey | toStateKey | reason |
|---|---|---|---|---|---|
| Invite sent | `POOL` | `pool_id` | `CLOSED_FOR_BIDS` | `CLOSED_FOR_BIDS` | `"Supplier invite [inviteRef] sent to [supplierOrgId]"` |
| Invite accepted | `POOL` | `pool_id` | `CLOSED_FOR_BIDS` | `CLOSED_FOR_BIDS` | `"Supplier invite [inviteRef] accepted by [supplierOrgId]"` |
| Invite declined | `POOL` | `pool_id` | `CLOSED_FOR_BIDS` | `CLOSED_FOR_BIDS` | `"Supplier invite [inviteRef] declined by [supplierOrgId]"` |
| Invite cancelled | `POOL` | `pool_id` | `CLOSED_FOR_BIDS` | `CLOSED_FOR_BIDS` | `"Supplier invite [inviteRef] cancelled by [actorUserId]"` |

> Rationale: `entity_type = 'POOL'` is the existing discriminant for pool-level events and is
> already used by StateMachineService pool transitions. The `fromStateKey = toStateKey =
> 'CLOSED_FOR_BIDS'` conveys that no state change occurred while still recording the event.
> This avoids extending the DB CHECK constraint on `entity_type`.
>
> **Open decision OD-7:** Whether NetworkLifecycleLog writes are mandatory or optional in Phase 1B.
> See §19.

---

## §10 — Supplier-Visible RFQ Projection

When a supplier reads their invite (via supplier route `GET /supplier-rfq-invites/:inviteId`),
they receive a limited, safe projection of the RFQ header. This projection must not expose:
- Pool member identities or per-member quantities
- Snapshot internals (`metadataInternalJson`, per-member snapshot line data)
- Internal operational fields

### Safe RFQ projection fields (supplier-visible)

| Field | Source | Notes |
|---|---|---|
| `rfq_ref` | `NetworkPoolRfq.rfqRef` | Stable external reference |
| `rfq_version` | `NetworkPoolRfq.rfqVersion` | Always 1 in Phase 1B |
| `status` | `NetworkPoolRfq.status` | Will be `ISSUED` in Phase 1B |
| `issued_at` | `NetworkPoolRfq.issuedAt` | Timestamp of RFQ issuance |
| `response_deadline_at` | `NetworkPoolRfq.responseDeadlineAt` | Nullable; supplier deadline |
| `commodity_category` | `NetworkPool.commodityCategory` (via pool join) | Aggregate commodity |
| `total_qty` | `NetworkPoolRfq.totalQty` | Aggregate quantity (not per-member breakdown) |
| `qty_unit` | `NetworkPoolRfq.qtyUnit` | Unit of measure |
| `line_count` | `NetworkPoolRfq.lineCount` | Number of RFQ lines |
| `issue_basis` | `NetworkPoolRfq.issueBasis` | Always `SNAPSHOT_LOCK` in Phase 1B |

### Explicitly excluded from supplier projection

| Field | Reason |
|---|---|
| `ownerOrgId` / `owner_org_id` | Pool owner identity — confidential |
| `snapshotId` | Internal snapshot reference — not for supplier |
| `issuedByUserId` | Owner user identity — confidential |
| `issueReason` | Owner internal context — confidential |
| `supplierInviteMode` | Internal flag — not relevant to supplier |
| `metadataInternalJson` | Always excluded (internal only) |
| Per-member quantities | Not available in aggregate RFQ header; individual member data is private |
| `NetworkPoolRfqLine.*` | Per-line details with member attribution: deferred or excluded |

> **Open decision OD-5:** Whether to expose `NetworkPoolRfqLine` aggregate data (commodity_category,
> product_spec_summary, qty, qty_unit per line) to supplier as a line list, or only the
> aggregate header fields above. Exposing line-level data improves supplier quoting ability
> but requires careful review of member privacy (snapshot lines retain `sourceMembershipId`
> attribution). Recommendation: expose aggregate header only in Phase 1B; line-detail exposure
> deferred to Phase 1C with explicit privacy review. See §19.

---

## §11 — Cross-Org Access and RLS Posture

### Column design

The `NetworkSupplierInvite` table has two RLS anchor columns:

| Column | Semantics |
|---|---|
| `owner_org_id` | Pool owner (buyer org). Controls CREATE permission and owner-side READ. |
| `supplier_org_id` | Invited supplier org. Controls supplier-side READ and supplier actions (accept/decline). |

Both columns carry live FKs to `organizations(id)`.

### Service-layer access rules

| Actor | Allowed operations | Org source |
|---|---|---|
| Owner (OWNER + ADMIN) | Create invite, list invites, get invite, cancel PENDING invite | `request.dbContext.orgId` |
| Supplier | List own invites, get own invite, accept PENDING invite, decline PENDING invite | `request.dbContext.orgId` |
| Pool MEMBER (non-owner) | No access to invite operations | — |
| Platform admin | Deferred — no admin route in Phase 1B | — |

### D-017-A compliance

All routes MUST source `orgId` from `request.dbContext.orgId` only.

- Owner routes: `ownerOrgId = request.dbContext.orgId`. Service must verify that the pool's
  `orgId` matches (pool must be owned by the caller's org).
- Supplier routes: `supplierOrgId = request.dbContext.orgId`. Service uses this to scope queries
  (`WHERE supplier_org_id = supplierOrgId`).

### Non-leak 404 contract

If a supplier requests an invite that exists but belongs to a different supplier org, the
service MUST return 404 (not 403). Returning 403 would confirm the invite exists, which reveals
cross-org information.

Implementation pattern:
```
const invite = await db.networkSupplierInvite.findFirst({
  where: { id: inviteId, supplierOrgId: supplierOrgId }
});
if (!invite) throw new NetworkPoolRfqSupplierInviteNotFoundError();
```

The `WHERE` clause includes `supplierOrgId` so an invite belonging to another supplier returns
`null` identically to a non-existent invite.

### RLS policy posture (service-layer only in Phase 1B)

Phase 1B enforces isolation exclusively at the service layer (Prisma query where clauses).
RLS SQL policies on `network_pool_rfq_supplier_invites` are deferred to the schema
implementation packet, which will apply them via `psql` before `prisma db pull`.

**Recommended RLS policies (for schema packet reference):**

| Policy | Type | USING clause |
|---|---|---|
| Owner select | PERMISSIVE SELECT | `owner_org_id = current_setting('app.org_id', true)::uuid` |
| Supplier select | PERMISSIVE SELECT | `supplier_org_id = current_setting('app.org_id', true)::uuid` |
| Owner insert | PERMISSIVE INSERT | `owner_org_id = current_setting('app.org_id', true)::uuid` |
| Owner update (cancel) | PERMISSIVE UPDATE | `owner_org_id = current_setting('app.org_id', true)::uuid` |
| Supplier update (accept/decline) | PERMISSIVE UPDATE | `supplier_org_id = current_setting('app.org_id', true)::uuid` |
| Delete | USING false | No delete permitted |
| Admin pass-through | RESTRICTIVE bypass | Service-role or admin context |

> These RLS policies are NOT applied by this design packet. They are listed here to inform
> the schema implementation packet.

---

## §12 — Role Model

### Owner-side role gate

Consistent with existing pool and RFQ routes:

| Role | Permission | HTTP response if denied |
|---|---|---|
| OWNER | Full access to all owner invite operations | — |
| ADMIN | Full access to all owner invite operations | — |
| MEMBER | No access to any invite operation | 403 FORBIDDEN |
| Guest / unauthenticated | No access | 401 UNAUTHORIZED |

Pattern: `if (!userRole.includes('ADMIN') && userRole !== 'OWNER') → 403`

### Supplier-side role gate

The supplier namespace operates under a different model. The supplier is any authenticated
tenant org whose `orgId` matches an invite's `supplier_org_id`. No pool membership is required.

| Actor | Permission | Notes |
|---|---|---|
| Any authenticated org | List invites where `supplier_org_id = orgId` | Returns empty array if no invites |
| Any authenticated org | Get single invite where `supplier_org_id = orgId` | 404 if not found or not addressed to this org |
| Any authenticated org | Accept PENDING invite addressed to this org | Only if status = PENDING |
| Any authenticated org | Decline PENDING invite addressed to this org | Only if status = PENDING |
| Unauthenticated | No access | 401 |

> Note: The supplier does NOT need to be a pool member. The invite mechanism deliberately allows
> the pool owner to invite external orgs that are not pool members. This is the whole purpose
> of the Supplier Invite workflow.

---

## §13 — Feature Gate Strategy

### Options

**Option A — Reuse `nc.procurement_pools.rfq.enabled`**

Gate all supplier invite routes under the same flag as pool RFQ operations.

Pros: Simple; no new flag infrastructure.
Cons: Cannot disable supplier invites independently of RFQ issuance; coarser control.

**Option B — New top-level flag `nc.supplier_invites.enabled`**

Create a fully independent flag outside the pools hierarchy.

Pros: Maximum independence.
Cons: Loses the layered inheritance model; a pool org could have supplier invites enabled
without the parent pool flag, which is logically incoherent.

**Option C — Sub-flag under the existing RFQ namespace (RECOMMENDED)**

New flag: `nc.procurement_pools.supplier_invites.enabled`

Chain of feature gates for supplier invite routes:
1. `ncPoolFeatureGateMiddleware` — checks `nc.procurement_pools.enabled`
2. `ncPoolRfqFeatureGateMiddleware` — checks `nc.procurement_pools.rfq.enabled`
3. `ncPoolSupplierInviteFeatureGateMiddleware` — checks `nc.procurement_pools.supplier_invites.enabled`

This is the RECOMMENDED option. It mirrors the exact two-layer pattern used by
`ncPoolRfqFeatureGateMiddleware` (verified against that file) and extends it logically.

### Proposed feature flag key

`nc.procurement_pools.supplier_invites.enabled`

### Proposed middleware file

`server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts`

### Middleware behavior (same 2-layer pattern as existing middlewares)

- Layer 1: Check `FeatureFlag` table for global flag `nc.procurement_pools.supplier_invites.enabled`
  → must exist and be `enabled = true`
- Layer 2: Check `TenantFeatureOverride` for `(tenantId = resolvedOrgId, key = <flag>)`
  → must exist and be `enabled = true`
- Both layers fail closed (return 503 `FEATURE_DISABLED`)
- On DB error: fail closed (return 503)
- `resolvedOrgId` from `request.dbContext?.orgId ?? request.params.orgId ?? null`

### Chain for owner routes

`onRequest: [tenantAuthMiddleware, databaseContextMiddleware]`
`preHandler: [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware, ncPoolSupplierInviteFeatureGateMiddleware]`

### Chain for supplier routes

`onRequest: [tenantAuthMiddleware, databaseContextMiddleware]`
`preHandler: [ncPoolSupplierInviteFeatureGateMiddleware]`

> Supplier routes do NOT check the pool or RFQ flag because the supplier is not operating on
> a pool or RFQ entity — they are operating on their own invite. The invite-specific gate is
> sufficient. The owner's gate check was already performed when the invite was created.
>
> **Open decision OD-6:** Whether supplier routes need the full 3-gate chain or only the
> supplier_invites sub-flag. See §19.

---

## §14 — API Surface Proposal

### Route topology overview

Two separate route files and two route namespaces:

| Namespace | Route file | Registered prefix |
|---|---|---|
| Owner (pool context) | `server/src/routes/tenant/poolRfqInvites.ts` | `/api/tenant/network-commerce/pools` |
| Supplier (invite context) | `server/src/routes/tenant/supplierRfqInvites.ts` | `/api/tenant/network-commerce` |

### Owner routes (pool context)

All owner routes require OWNER or ADMIN role. `orgId` always from `request.dbContext.orgId`.

| Method | Path | Operation | Role | Response |
|---|---|---|---|---|
| POST | `/:poolId/rfq/:rfqId/invites` | Create (send) invite | OWNER, ADMIN | 201 |
| GET | `/:poolId/rfq/:rfqId/invites` | List all invites for this RFQ | OWNER, ADMIN | 200 |
| GET | `/:poolId/rfq/:rfqId/invites/:inviteId` | Get single invite | OWNER, ADMIN | 200 |
| POST | `/:poolId/rfq/:rfqId/invites/:inviteId/cancel` | Cancel PENDING invite | OWNER, ADMIN | 200 |

**Full paths (with base prefix):**
- `POST   /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites`
- `GET    /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites`
- `GET    /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites/:inviteId`
- `POST   /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/invites/:inviteId/cancel`

### Supplier routes (invite context)

All supplier routes scope by `supplier_org_id = request.dbContext.orgId`. No pool membership required.

| Method | Path | Operation | Actor | Response |
|---|---|---|---|---|
| GET | `/supplier-rfq-invites` | List own invites | Any authenticated tenant | 200 |
| GET | `/supplier-rfq-invites/:inviteId` | Get own invite + safe RFQ projection | Any authenticated tenant | 200 |
| POST | `/supplier-rfq-invites/:inviteId/accept` | Accept PENDING invite | Any authenticated tenant | 200 |
| POST | `/supplier-rfq-invites/:inviteId/decline` | Decline PENDING invite | Any authenticated tenant | 200 |

**Full paths (with base prefix):**
- `GET    /api/tenant/network-commerce/supplier-rfq-invites`
- `GET    /api/tenant/network-commerce/supplier-rfq-invites/:inviteId`
- `POST   /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/accept`
- `POST   /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/decline`

### Route registration in `tenant.ts`

The NC route file `server/src/routes/tenant.ts` will need two new registrations:
1. `poolRfqInvites.ts` — registered under the existing pools prefix
2. `supplierRfqInvites.ts` — registered under a new prefix `/tenant/network-commerce`

> This is a planned change for the route implementation packet. `tenant.ts` is in the
> allowlist for that packet only.

---

## §15 — Body Validation and Error Mapping

### Owner route: POST `/:poolId/rfq/:rfqId/invites` (send invite)

```
Body schema (z.object(...).strict()):
  supplier_org_id:       z.string().uuid()          REQUIRED — supplier org to invite
  message_to_supplier:   z.string().max(2000).nullable().optional()
  expires_at:            z.string().datetime({offset:true}).nullable().optional()

Explicitly forbidden (z.never()):
  invite_ref, status, invited_at, invited_by_user_id, accepted_at, declined_at,
  cancelled_at, owner_org_id, rfq_id, pool_id, metadata_internal_json
```

### Owner route: POST `/:poolId/rfq/:rfqId/invites/:inviteId/cancel`

```
Body schema (z.object({}).strict() or empty body):
  cancel_reason:   z.string().max(2000).nullable().optional()
```

### Supplier route: POST `/supplier-rfq-invites/:inviteId/accept`

```
Body: empty — no caller-supplied fields.
z.object({}).strict()
```

### Supplier route: POST `/supplier-rfq-invites/:inviteId/decline`

```
Body schema (z.object(...).strict()):
  decline_reason:   z.string().max(2000).nullable().optional()
```

### Proposed error class taxonomy

| Class | HTTP | Code | Description |
|---|---|---|---|
| `NetworkPoolRfqSupplierInviteInvalidInputError` | 400 | `INVALID_INPUT` | Validation failure |
| `NetworkPoolRfqSupplierInviteNotFoundError` | 404 | `INVITE_NOT_FOUND` | Invite not found (or not owned by caller — non-leak) |
| `NetworkPoolRfqSupplierInviteRfqNotFoundError` | 404 | `RFQ_NOT_FOUND` | RFQ not found or not owned by caller org |
| `NetworkPoolRfqSupplierInvitePoolNotFoundError` | 404 | `POOL_NOT_FOUND` | Pool not found or not owned by caller org |
| `NetworkPoolRfqSupplierInviteInvalidRfqStateError` | 422 | `INVALID_RFQ_STATE` | RFQ must be in ISSUED state to invite suppliers |
| `NetworkPoolRfqSupplierInviteAlreadySentError` | 409 | `INVITE_ALREADY_SENT` | Supplier already invited for this RFQ |
| `NetworkPoolRfqSupplierInviteInvalidTransitionError` | 422 | `INVALID_TRANSITION` | Cannot transition from terminal status (ACCEPTED/DECLINED/CANCELLED/EXPIRED) |
| `NetworkPoolRfqSupplierInviteConflictError` | 409 | `INVITE_CONFLICT` | DB unique constraint violation (belt-and-suspenders) |
| `NetworkPoolRfqSupplierInviteSelfInviteError` | 422 | `SELF_INVITE_FORBIDDEN` | owner_org_id = supplier_org_id (a pool cannot invite itself) |

### Param validation

All route params (`poolId`, `rfqId`, `inviteId`, when present): `z.string().uuid()`.

---

## §16 — Privacy and Non-Leak Contract

### Core privacy rules

1. **Supplier never sees pool member identities.** No `orgId` from `NetworkPoolMembership`,
   `NetworkPoolDemandLine.ownerOrgId`, or `NetworkPoolDemandSnapshotLine` is ever returned
   in a supplier-facing response.

2. **Supplier never sees owner internal context.** `owner_org_id`, `issued_by_user_id`,
   `issue_reason`, `metadata_internal_json`, `metadataInternalJson` are excluded from all
   supplier-facing responses.

3. **Non-leaking 404.** If a supplier requests an invite that exists but `supplier_org_id ≠
   caller orgId`, return 404 `INVITE_NOT_FOUND`. Never return 403 (which would confirm existence).

4. **Non-leaking 404 for pool/RFQ.** Supplier routes that receive pool or RFQ context (e.g.,
   if included in a response) must not reveal pool details to non-owner, non-member orgs.
   The invite response itself provides only the safe RFQ projection defined in §10.

5. **Supplier cannot enumerate invites by pool or RFQ.** The supplier namespace exposes invites
   scoped by `supplier_org_id` only. Supplier cannot pass `rfqId` or `poolId` as a query
   filter to enumerate a pool's supplier list.

6. **Owner cannot read another org's invites.** Owner list/get routes enforce `ownerOrgId =
   request.dbContext.orgId` in all queries.

7. **`metadataInternalJson` is always excluded.** This field is never present in any DTO
   returned to any caller (owner or supplier) — consistent with the pattern established for
   `NetworkPoolRfq.metadataInternalJson`.

8. **Self-invite is forbidden.** `owner_org_id = supplier_org_id` must be rejected with 422
   `SELF_INVITE_FORBIDDEN`. A pool cannot invite its own org as a supplier.

---

## §17 — Test Strategy

### Unit test file: `networkPoolRfqSupplierInvite.service.unit.test.ts`

| Test group | Test cases |
|---|---|
| `sendInvite` — happy path | Creates invite (PENDING); returns DTO; DB write called with correct fields |
| `sendInvite` — validation | Rejects self-invite; rejects empty supplier_org_id; rejects invalid UUID |
| `sendInvite` — RFQ state | Rejects if RFQ status ≠ ISSUED; rejects if pool not found; rejects if RFQ not found |
| `sendInvite` — duplicate | Rejects with INVITE_ALREADY_SENT if unique(rfq_id, supplier_org_id) violated |
| `listInvites` — owner | Returns only invites where owner_org_id matches; empty array if none |
| `getInvite` — owner | Returns full invite DTO; 404 if not owned by caller org |
| `getInvite` — supplier | Returns invite + safe RFQ projection; 404 if supplier_org_id ≠ caller |
| `cancelInvite` | PENDING → CANCELLED; 422 if terminal; 404 if not owned |
| `acceptInvite` | PENDING → ACCEPTED; 422 if terminal; 404 if not addressed to caller |
| `declineInvite` | PENDING → DECLINED; 422 if terminal; 404 if not addressed to caller |
| `listSupplierInvites` | Returns only invites where supplier_org_id = caller; scoped correctly |
| Feature gate middleware | `ncPoolSupplierInviteFeatureGateMiddleware` — 8–12 tests per pattern of existing gate tests |

### Integration test file: `poolRfqInvites.integration.test.ts`

| Test group | Key cases |
|---|---|
| POST `/invites` (owner) | 201 happy path; 401 unauth; 403 MEMBER role; 409 duplicate; 422 self-invite; 422 wrong RFQ state; 503 feature disabled |
| GET `/invites` (owner list) | 200 with correct data; empty array if none; 401; 403; isolates by ownerOrgId |
| GET `/invites/:inviteId` (owner) | 200 correct data; 404 wrong org; 401; 403 |
| POST `/invites/:inviteId/cancel` | 200 happy path; 422 terminal state; 404 wrong org; 401; 403 |
| GET `/supplier-rfq-invites` (supplier) | 200 own invites; empty array; 401; 503 |
| GET `/supplier-rfq-invites/:inviteId` (supplier) | 200 with safe RFQ projection; 404 cross-org non-leak; 401 |
| POST `/supplier-rfq-invites/:inviteId/accept` | 200; 422 terminal; 404 cross-org; 401 |
| POST `/supplier-rfq-invites/:inviteId/decline` | 200 with decline_reason; 422 terminal; 404 cross-org; 401 |
| Regression | All prior NC integration tests PASS (pools, demand lines, RFQ) |

### Validation bands (consistent with tracker §15)

| Band | Tool | Target |
|---|---|---|
| Schema integrity | `pnpm -C server exec prisma validate` | PASS after schema packet |
| TypeScript | `pnpm --filter server typecheck` | CLEAN |
| Unit tests | `vitest run` (server filter) | PASS |
| Integration tests | `poolRfqInvites.integration.test.ts` + regression suite | PASS |
| Runtime smoke | `GET /health` → 200; unauth supplier route → 401 | PASS |
| Privacy proof | GET supplier invite returns no owner_org_id / member data | VERIFIED |

---

## §18 — Governance Chain Recommendation

The following 9 implementation packets are recommended in strict sequence after this design
packet. Each requires separate authorization from Paresh.

| # | Packet ID | Type | Scope |
|---|---|---|---|
| 1 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001` | DECISION_AUDIT | Resolve open decisions OD-1 through OD-7 from §19; formal decisions locked |
| 2 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001` | SCHEMA | SQL migration for `network_pool_rfq_supplier_invites`; RLS policies; `prisma db pull`; `prisma generate` |
| 3 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001` | IMPLEMENTATION | New middleware `ncPoolSupplierInviteFeatureGate.middleware.ts`; feature flag seed SQL; unit tests |
| 4 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001` | IMPLEMENTATION | `NetworkPoolRfqSupplierInviteService` (owner methods: sendInvite, listInvites, getInvite, cancelInvite) |
| 5 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001` | IMPLEMENTATION | Supplier service methods: listSupplierInvites, getSupplierInvite, acceptInvite, declineInvite; safe RFQ projection |
| 6 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001` | IMPLEMENTATION | Owner route file `poolRfqInvites.ts`; 4 routes; register in `tenant.ts` |
| 7 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001` | IMPLEMENTATION | Supplier route file `supplierRfqInvites.ts`; 4 routes; register in `tenant.ts` |
| 8 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-UNIT-TEST-001` | TEST | Unit tests for service + middleware (target: ~60–80 unit test assertions) |
| 9 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-INTEGRATION-TEST-001` | TEST + GOVERNANCE_CLOSURE | Integration test suite; regression; runtime smoke; governance close |

> Each packet above is a distinct atomic commit. No packet proceeds without the prior packet's
> verification evidence. Packets 4 and 5 may be combined into one service implementation packet
> if the service class naturally holds both owner and supplier methods.

---

## §19 — Open Decisions for Decision Audit

The following open decisions (OD-1 through OD-7) are deferred to the Decision Audit packet
(`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001`). No implementation proceeds
until each is resolved.

### OD-1: Re-invite posture after CANCELLED or DECLINED

**Question:** Should the system allow a new invite to be sent to the same supplier after their
prior invite is CANCELLED or DECLINED?

**Options:**
- A: No re-invite allowed — `UNIQUE (rfq_id, supplier_org_id)` is a hard block forever
  (including terminal rows). Owner would need to create a new RFQ version (Phase 1C concept).
- B: Soft allow — if prior invite is in a terminal state, delete it and create a new one.
  (Breaks immutability of invite rows.)
- C: Soft allow — allow a second invite row if the prior is CANCELLED or DECLINED.
  Requires relaxing the unique constraint to `WHERE status NOT IN ('CANCELLED', 'DECLINED')`.

**Recommended:** Option A for Phase 1B (simplest; avoids unique constraint complexity).
Deferred re-invite to Phase 1C with explicit decision record.

### OD-2: EXPIRED status enforcement mechanism

**Question:** How is EXPIRED status enforced in Phase 1B?

**Options:**
- A: Lazy enforcement — service checks `expiresAt < now()` on read and returns status as EXPIRED
  without actually updating the DB row (status column stays PENDING in DB).
- B: Eager enforcement — background job or on-read UPDATE of status to EXPIRED.
- C: No EXPIRED status in Phase 1B — deferred entirely.

**Recommended:** Option A (lazy enforcement, no background job in Phase 1B). Simpler and consistent
with `response_deadline_at` being "not enforced in v1" on NetworkPoolRfq. Revisit with Phase 1C.

### OD-3: `expiresAt` default value

**Question:** Should `expiresAt` default to `rfq.responseDeadlineAt` if the caller does not
provide an `expires_at` in the invite body?

**Options:**
- A: No default — `expiresAt` is NULL unless caller provides it.
- B: Inherit from RFQ — if `rfq.responseDeadlineAt` is set, use it as default `expiresAt`.
- C: Platform-level default TTL (e.g., 30 days from invite creation).

**Recommended:** Option B (inherit from RFQ) if `responseDeadlineAt` is non-null; otherwise
leave NULL. Provides sensible UX without requiring explicit TTL on every invite.

### OD-4: Supplier org identity / validation

**Question:** Should the service validate that the `supplier_org_id` passed in the invite body
corresponds to an existing, active organization before creating the invite?

**Options:**
- A: Validate existence and status (`organizations` table lookup before INSERT).
- B: No validation — FK constraint at DB level is sufficient (FK violation = 422 or 409).
- C: Validate existence only (not status).

**Recommended:** Option A (validate that `supplier_org_id` exists as an active org in the
`organizations` table). Provides a clean 422 INVALID_INPUT error with a human-readable message
rather than a raw P2003 FK violation. Also prevents inviting suspended or closed orgs.

### OD-5: Supplier-visible RFQ line detail

**Question:** Should the supplier invite GET response include RFQ line details (commodity,
spec summary, qty, qty_unit per line) from `NetworkPoolRfqLine`, or only the aggregate header?

**Options:**
- A: Aggregate header only (fields from §10 — total_qty, line_count, commodity_category, etc.).
- B: Include line list (commodity_category, productSpecSummary, qty, qtyUnit per line from
  `NetworkPoolRfqLine` — no per-member attribution in rfq lines themselves).
- C: Include line list but only if all lines share the same commodity_category (uniform pool).

**Recommended:** Option A for Phase 1B. NetworkPoolRfqLine rows are copied from snapshot lines
which carry `sourceMembershipId` internally (though not in rfq line rows directly). The design
goal for Phase 1B is conservative: share enough for supplier to understand scope, not full
specification. Phase 1C will review whether line-level detail is needed for quote preparation.

**Privacy note:** `NetworkPoolRfqLine` rows do NOT store `sourceMembershipId` — that is in
`NetworkPoolDemandSnapshotLine`. The rfq line rows themselves are safe to share. This may
enable a future Phase 1C line exposure. Final decision deferred to Decision Audit.

### OD-6: Feature gate chain for supplier routes

**Question:** Should supplier routes (`/supplier-rfq-invites`) apply the full 3-gate chain
(nc.procurement_pools.enabled + rfq.enabled + supplier_invites.enabled) or only the
supplier_invites sub-flag?

**Options:**
- A: Full 3-gate chain — supplier must be in a tenant org that also has pool + rfq features enabled.
  (Risk: supplier org may not have pool features enabled, even if invited legitimately.)
- B: Supplier-invites flag only — supplier org only needs the supplier_invites flag enabled.
  (Risk: platform must provision this flag for all supplier orgs receiving invites.)
- C: No feature gate on supplier routes — supplier routes are ungated (only auth required).
  (Risk: prematurely exposes supplier route capability before it is ready for production.)

**Recommended:** Option B for Phase 1B. Supplier orgs are not pool owners and may not have
the pool feature enabled. Only gating on `nc.procurement_pools.supplier_invites.enabled` is
sufficient and operationally clean. The flag must be provisioned for invited supplier orgs.

### OD-7: Lifecycle log writes — mandatory or optional in Phase 1B

**Question:** Should `NetworkLifecycleLog` writes be mandatory for invite events in Phase 1B,
or optional (informational)?

**Options:**
- A: Mandatory — service always writes a NetworkLifecycleLog entry for each invite event
  (send, accept, decline, cancel). Written in the same `$transaction` as the invite row mutation.
- B: Optional — lifecycle log writes are best-effort (outside transaction, errors swallowed).
- C: Deferred — no lifecycle log writes in Phase 1B.

**Recommended:** Option A (mandatory, in-transaction). Consistent with the audit trail principle
established by the StateMachineService pattern. Failure to write the log should roll back
the invite operation. This is the safest audit posture.

---

## §20 — Recommended Design Posture

### Entity model

✅ Option A — dedicated `NetworkSupplierInvite` table. New table, new migration packet.

### Status model

✅ PENDING → ACCEPTED | DECLINED | CANCELLED | EXPIRED (lazy). VIEWED deferred.

### Feature gate

✅ Option C — new sub-flag `nc.procurement_pools.supplier_invites.enabled`.
Supplier routes: Option B (supplier-invites flag only).

### Route topology

✅ Two separate namespaces: owner (pool prefix) + supplier (standalone prefix).
Owner file: `poolRfqInvites.ts`. Supplier file: `supplierRfqInvites.ts`.

### Privacy contract

✅ Non-leaking 404 for cross-org supplier routes.
✅ No member identity exposed to suppliers.
✅ `metadataInternalJson` always excluded.
✅ Self-invite rejected (422).

### RLS posture

✅ Phase 1B: service-layer enforcement. RLS SQL applied in schema packet.
✅ Both `owner_org_id` + `supplier_org_id` columns as dual RLS anchors.

### Lifecycle log

✅ Recommended mandatory write per invite event via `NetworkLifecycleLog` (entity_type=POOL).

### Supplier-visible RFQ projection

✅ Phase 1B: aggregate header only (§10 fields). Line detail deferred to Phase 1C.

### D-017-A compliance

✅ All routes source orgId from `request.dbContext.orgId` only.
Owner routes: `ownerOrgId = dbContext.orgId`.
Supplier routes: `supplierOrgId = dbContext.orgId`.

---

## §21 — Explicit Non-Authorization Statement

**This document is a design specification only.**

The following are explicitly NOT authorized by this design packet:

| Action | Status |
|---|---|
| Creating `network_pool_rfq_supplier_invites` table or any migration | NOT AUTHORIZED |
| Adding any model to `server/prisma/schema.prisma` | NOT AUTHORIZED |
| Running `prisma db pull`, `prisma generate`, `prisma migrate deploy` | NOT AUTHORIZED |
| Creating any service file (`networkPoolRfqSupplierInvite.service.ts`) | NOT AUTHORIZED |
| Creating any route file (`poolRfqInvites.ts`, `supplierRfqInvites.ts`) | NOT AUTHORIZED |
| Creating any middleware file (`ncPoolSupplierInviteFeatureGate.middleware.ts`) | NOT AUTHORIZED |
| Modifying `server/src/routes/tenant.ts` to register new routes | NOT AUTHORIZED |
| Creating any test file | NOT AUTHORIZED |
| Seeding the `nc.procurement_pools.supplier_invites.enabled` feature flag | NOT AUTHORIZED |
| Applying any RLS policy SQL | NOT AUTHORIZED |
| Modifying any existing route, service, schema, or migration file | NOT AUTHORIZED |

Implementation of any packet in the governance chain (§18) requires:
1. This design document reviewed and approved by Paresh
2. Each packet authorized individually via a prompt containing the explicit allowlist
3. Decision Audit packet (packet #1 in §18) completed before schema or code changes begin

No change to the following governance posture keys is made by this document:

- `active_delivery_unit: HOLD_FOR_AUTHORIZATION` — **unchanged**
- `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` — **unchanged**

---

*End of TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001*
