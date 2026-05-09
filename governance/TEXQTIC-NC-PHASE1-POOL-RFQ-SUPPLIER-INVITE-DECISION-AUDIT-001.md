# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001` |
| **Type** | `DECISION_AUDIT` |
| **Status** | `DECISIONS_LOCKED` |
| **Domain** | Network Commerce — Phase 1B |
| **Date** | 2026-05-30 |
| **Basis commit** | `8a36a2f` — `docs(network-commerce): design pool RFQ supplier invite` |
| **Parent design packet** | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001` |
| **Mode** | GOVERNANCE / DECISION ONLY |
| **Governed posture** | `active_delivery_unit: HOLD_FOR_AUTHORIZATION` (unchanged) |
| **DPP launch** | `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` (unchanged) |

### Files changed by this packet

| File | Action |
|---|---|
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | NEW — this document |
| `governance/control/GOVERNANCE-CHANGELOG.md` | UPDATED — DECISION_AUDIT entry prepended |
| `governance/control/OPEN-SET.md` | UPDATED — next-action status advanced + new operating note |

### Files NOT changed by this packet

| File category | Status |
|---|---|
| `server/prisma/schema.prisma` | UNCHANGED |
| `server/prisma/migrations/` | UNCHANGED |
| `server/src/services/` | UNCHANGED |
| `server/src/routes/` | UNCHANGED |
| `server/src/middleware/` | UNCHANGED |
| `server/src/__tests__/` | UNCHANGED |
| Any test file | UNCHANGED |
| Any implementation file | UNCHANGED |

---

## §2 — Executive Summary

This packet resolves Open Decisions OD-1 through OD-7 from §19 of the parent design packet
(`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001`). All seven decisions are formally
locked in this document and may not be reversed or modified without a separate amendment packet
authorized by Paresh.

**This packet does NOT authorize any schema or implementation work.** No schema changes,
migrations, service files, route files, middleware files, or test files are authorized by this
packet.

The schema packet (`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001`) is the next
implementation candidate, subject to separate and explicit Paresh authorization before work
begins.

### Key findings from repo-truth validation

1. **`organizations.status` field confirmed** — legal values include `ACTIVE | SUSPENDED | CLOSED
   | PENDING_VERIFICATION | VERIFICATION_APPROVED | VERIFICATION_REJECTED |
   VERIFICATION_NEEDS_MORE_INFO`. "Active" supplier org = `status = 'ACTIVE'` exactly. This
   informs OD-4.

2. **StateMachineService validates against `allowedTransitions` table (Steps 7–8)** — a
   CLOSED_FOR_BIDS → CLOSED_FOR_BIDS self-transition is not a declared allowed transition.
   Additionally, if CLOSED_FOR_BIDS is marked `isTerminal = true`, the SM would block the
   call at Step 7 before reaching Step 8. This is a critical repo-truth conflict for OD-7:
   `stateMachine.transition()` CANNOT be used for invite-event log writes. Direct
   `prisma.networkLifecycleLog.create()` within the same `$transaction` is the correct
   implementation pattern. See OD-7 below.

3. **NetworkLifecycleLog direct-write pattern confirmed** — the SM itself writes directly
   via `opts.db.networkLifecycleLog.create()` when inside a caller-managed transaction.
   This direct write pattern (bypassing SM validation) is the established implementation
   precedent for informational/audit log entries that do not represent state machine
   transitions.

4. **`rfq.responseDeadlineAt` is nullable and not enforced in v1** (Q-3 in
   `networkPoolRfq.service.ts`). Using it as a default for `expiresAt` (OD-3) is valid
   but inherits the same not-enforced-in-v1 semantics.

5. **NetworkPoolRfqLine rows do NOT store `sourceMembershipId`** — confirmed in design §5
   (OD-5 note). The rfq line rows are structurally safe to expose. Exposure is nonetheless
   deferred to Phase 1C (§10 of design).

---

## §3 — Repo-Truth Validation

| Check | Result |
|---|---|
| Current HEAD | `8a36a2f` — `docs(network-commerce): design pool RFQ supplier invite` |
| Working tree clean before edits | CONFIRMED — `git status --short` showed no modified files |
| Design artifact exists | CONFIRMED — `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001.md` (1101 lines, 21 sections) |
| Pool RFQ issue flow implemented | CONFIRMED — `networkPoolRfq.service.ts` (issueRfq, 7-step $transaction); `poolRfq.ts` route; PRQ integration tests |
| `NetworkSupplierInvite` entity | NOT IMPLEMENTED — no table, no schema model, no service, no routes |
| `network_pool_rfq_supplier_invites` table | DOES NOT EXIST — confirmed via schema.prisma inspection |
| `organizations.status` legal values | CONFIRMED — `ACTIVE | SUSPENDED | CLOSED | PENDING_VERIFICATION | VERIFICATION_APPROVED | VERIFICATION_REJECTED | VERIFICATION_NEEDS_MORE_INFO` |
| `StateMachineService.transition()` validates `allowedTransitions` | CONFIRMED — Steps 7 (terminal check) + 8 (allowedTransition lookup) block undeclared or self-transitions |
| `NetworkLifecycleLog` direct-write pattern | CONFIRMED — SM uses `opts.db.networkLifecycleLog.create()` when inside caller tx (stateMachine.service.ts lines 540–541) |
| Schema/service/route/test changes made by this packet | NONE — zero implementation files modified |

---

## §4 — Formal Decision Matrix

### OD-1: Re-invite posture after CANCELLED or DECLINED

| Field | Value |
|---|---|
| **Decision ID** | OD-1 |
| **Status** | LOCKED |
| **Selected option** | **Option A — No re-invite in Phase 1B** |

**Question:** Should the system allow a new invite to be sent to the same supplier after their
prior invite is CANCELLED or DECLINED?

**Selected option:**
Option A — No re-invite allowed. `UNIQUE (rfq_id, supplier_org_id)` is a hard constraint across
all rows for a given RFQ, including rows in terminal states (CANCELLED, DECLINED, EXPIRED).
Once a supplier has been invited on a given RFQ version, no second invite is possible on that
same RFQ version. Re-invite requires a future RFQ versioning mechanism (Phase 1C+ concept).

**Rationale:**

1. Option A is the simplest schema expression: a standard unique constraint with no partial
   index complexity.
2. Options B and C both require partial index logic or row-delete patterns that violate
   immutability of invite rows.
3. Phase 1B is the baseline implementation. Re-invite introduces business ambiguity (e.g.,
   what happens to DECLINED supplier's original response context?) that is better resolved
   in a targeted decision audit when the re-invite scenario is formally specified.
4. If Paresh later requires re-invite within Phase 1B, this decision will be amended before
   schema packet execution.

**Implementation consequence:**

- Schema packet: `UNIQUE (rfq_id, supplier_org_id)` declared as a standard (non-partial)
  unique constraint on `network_pool_rfq_supplier_invites`.
- Service packet: `sendInvite` checks for existing row by `(rfqId, supplierOrgId)` before
  INSERT. Any existing row (regardless of status) triggers `AlreadySentError` (409
  INVITE_ALREADY_SENT).
- No partial-index migration is needed.

**Deferred follow-up:**

Re-invite (allow a second invite after CANCELLED or DECLINED) is formally deferred to a
separate design decision, scoped to Phase 1C or later. Ticket: open at that time.

---

### OD-2: EXPIRED status enforcement mechanism

| Field | Value |
|---|---|
| **Decision ID** | OD-2 |
| **Status** | LOCKED |
| **Selected option** | **Option A (clarified) — Lazy expiration; DB status stays PENDING; API returns EXPIRED as computed** |

**Question:** How is EXPIRED status enforced in Phase 1B?

**Selected option:**
Option A (clarified semantics) — Lazy enforcement. The DB `status` column is never mutated
to `EXPIRED` in Phase 1B. The service computes effective status on every read by checking
`expiresAt IS NOT NULL AND expiresAt < now()`. When this condition is true, the service
returns `status: 'EXPIRED'` in the API response DTO, even though the DB row's `status`
column still reads `'PENDING'`. No background job, no cron, no on-read UPDATE.

**Clarified semantics (implementation contract):**

| Layer | Behavior |
|---|---|
| DB `status` column | Remains `'PENDING'` — never written as `'EXPIRED'` |
| API response `status` field | Returns `'EXPIRED'` when `expiresAt != null AND expiresAt < now()` |
| Terminal-state check for transitions | Service must treat lazy-EXPIRED invites as terminal: `cancelInvite`, `acceptInvite`, `declineInvite` must check the computed effective status (not only the DB column). If effectiveStatus is EXPIRED → return 422 INVALID_TRANSITION |
| Status field name in API response | `status` (not `effectiveStatus`) — the computed value IS the authoritative response value |
| Re-computation on every read | Required — no caching of lazy EXPIRED state |

**Rationale:**

1. Consistent with the existing pattern: `rfq.responseDeadlineAt` is also nullable and
   "not enforced in v1" (Q-3 in `networkPoolRfq.service.ts`). Lazy semantics are the
   established TexQtic Phase 1 pattern.
2. No background job is introduced in Phase 1B. Background job infrastructure is not
   in scope.
3. DB immutability is preserved: the `status` column has only explicitly written values
   (PENDING, ACCEPTED, DECLINED, CANCELLED). EXPIRED is a derived read-only state.
4. The terminal-state check MUST use effective status (checking `expiresAt` as well as
   `status` column) to prevent expired invites from accepting/declining after expiry.

**Implementation consequence:**

- Service packet: `toInviteDto()` (or equivalent) helper must compute effective status.
- Service packet: `acceptInvite`, `declineInvite`, `cancelInvite` must include the expiry
  check alongside the DB `status` check when validating terminal-state guard.
- No migration change needed for this decision (no new DB column).
- Unit test packet: must test the lazy-EXPIRED boundary (e.g., invite with `expiresAt =
  past` returns `status: EXPIRED` in GET response; accept/decline/cancel of such an
  invite returns 422).

**Deferred follow-up:**

Eager EXPIRED enforcement (on-read DB UPDATE or background cron) is deferred to Phase 1C
or when analytics require accurate DB counts of EXPIRED rows.

---

### OD-3: `expiresAt` default value

| Field | Value |
|---|---|
| **Decision ID** | OD-3 |
| **Status** | LOCKED |
| **Selected option** | **Option B — Inherit from `rfq.responseDeadlineAt` when present; otherwise NULL** |

**Question:** Should `expiresAt` default to `rfq.responseDeadlineAt` if the caller does not
provide an `expires_at` in the invite body?

**Selected option:**
Option B — When `rfq.responseDeadlineAt` is non-null and the caller does not provide
`expires_at`, the service inherits `rfq.responseDeadlineAt` as the default `expiresAt`.
If `rfq.responseDeadlineAt` is null, `expiresAt` defaults to NULL.
A caller-provided `expires_at` overrides the inherited value if provided and valid.

**Rationale:**

1. Provides sensible UX: invites naturally expire when the RFQ closes for responses,
   without requiring the owner to repeat the deadline on every invite.
2. `rfq.responseDeadlineAt` is already stored on `NetworkPoolRfq` (confirmed in schema).
3. Consistent with "inherit from parent entity" patterns in TexQtic (e.g., snapshot
   inheriting pool context).
4. Inherits the same "not enforced in v1" semantics as `responseDeadlineAt` itself —
   consistent with OD-2 lazy expiration.
5. Option A (no default) would leave `expiresAt = NULL` always, making the lazy
   EXPIRED logic inert in most cases.
6. Option C (platform TTL) introduces a platform-level configuration concern beyond
   Phase 1B scope.

**Implementation consequence:**

- Service packet: `sendInvite` implementation must:
  1. If caller provides `expires_at` → use caller value (validate it is a valid ISO
     timestamp; if in the past, return 400 INVALID_INPUT).
  2. Else if `rfq.responseDeadlineAt` is non-null → inherit it as `expiresAt`.
  3. Else → `expiresAt = null`.
- Schema packet: `expiresAt` column is `TIMESTAMPTZ NULL` (no DB default).
- No platform-level TTL configuration needed.

**Deferred follow-up:**

Platform-level invite TTL (Option C) is deferred to Phase 1C if product requires a
fallback expiry for RFQs without `responseDeadlineAt`.

---

### OD-4: Supplier org identity / validation

| Field | Value |
|---|---|
| **Decision ID** | OD-4 |
| **Status** | LOCKED |
| **Selected option** | **Option A — Validate `supplier_org_id` exists and is `status = 'ACTIVE'` before invite creation** |

**Question:** Should the service validate that the `supplier_org_id` passed in the invite body
corresponds to an existing, active organization before creating the invite?

**Selected option:**
Option A — The service validates that `supplier_org_id` exists in the `organizations` table
and that `organizations.status = 'ACTIVE'` before executing the INSERT. A clean 422
`INVALID_INPUT` error is returned with a human-readable message if the org does not exist
or is not active.

**Repo-truth: `organizations.status` legal values**

```
ACTIVE | SUSPENDED | CLOSED | PENDING_VERIFICATION |
VERIFICATION_APPROVED | VERIFICATION_REJECTED | VERIFICATION_NEEDS_MORE_INFO
```

"Active supplier org" = `status = 'ACTIVE'` exactly. All other statuses are rejected.
`PENDING_VERIFICATION`, `VERIFICATION_APPROVED`, `SUSPENDED`, `CLOSED` are all non-active
for the purpose of this validation.

**Rationale:**

1. Explicit validation provides a human-readable 422 INVALID_INPUT instead of a raw
   Prisma P2003 FK violation (which leaks internal error shape to the caller).
2. Prevents inviting suspended or closed orgs (business correctness).
3. PENDING_VERIFICATION orgs are not provisioned for commerce — they must not receive
   invites until their verification is complete.
4. Defense in depth: even if the FK insert would succeed, the intent check at service
   layer is the authoritative business rule.

**Implementation consequence:**

- Service packet: `sendInvite` must execute a pre-INSERT lookup:
  ```
  const supplierOrg = await tx.organizations.findUnique({
    where: { id: supplierOrgId },
    select: { id: true, status: true },
  });
  if (!supplierOrg || supplierOrg.status !== 'ACTIVE') {
    throw new NetworkPoolRfqSupplierInviteInvalidInputError(
      'Supplier organisation not found or not active.'
    );
  }
  ```
- Schema packet: FK on `supplier_org_id → organizations.id` remains as declared in design §7.
  The service-layer check is a belt-and-suspenders guard, not a replacement for the FK.
- Unit test packet: must test (a) non-existent `supplier_org_id` → 422; (b) SUSPENDED org
  → 422; (c) ACTIVE org → proceeds to next validation step.

**Deferred follow-up:**

If future phases allow inviting `PENDING_VERIFICATION` orgs (e.g., provisional invite flows),
this decision must be amended via a separate decision record before implementation.

---

### OD-5: Supplier-visible RFQ line detail

| Field | Value |
|---|---|
| **Decision ID** | OD-5 |
| **Status** | LOCKED |
| **Selected option** | **Option A — Aggregate header only in Phase 1B; no RFQ line detail** |

**Question:** Should the supplier invite GET response include RFQ line details from
`NetworkPoolRfqLine`, or only the aggregate header?

**Selected option:**
Option A — The supplier invite GET response includes only the aggregate RFQ header fields
defined in §10 of the design (rfq_ref, rfq_version, status, issued_at, response_deadline_at,
commodity_category, total_qty, qty_unit, line_count, issue_basis). No `NetworkPoolRfqLine`
rows are included in Phase 1B supplier responses.

**Privacy note confirmed:**
`NetworkPoolRfqLine` rows do NOT store `sourceMembershipId` (that field is in
`NetworkPoolDemandSnapshotLine` only). The rfq line rows are structurally safe to expose.
However, exposure of line detail is deferred to Phase 1C where a separate privacy review
and product decision on line-level quote preparation will be conducted.

**Rationale:**

1. The aggregate header provides enough context for a supplier to assess scope and decide
   whether to respond. Full line detail is only needed for quote preparation (Phase 1C).
2. Deferring line detail reduces the surface area of the supplier projection contract, making
   it easier to evolve in Phase 1C without breaking existing supplier integrations.
3. Conservative posture is appropriate for Phase 1B baseline.

**Implementation consequence:**

- Service packet (`SUPPLIER-SERVICE-001`): `getSupplierInvite` and `listSupplierInvites`
  must NOT include `networkPoolRfqLine` data. Prisma `include` must NOT fetch rfq lines.
- Supplier-facing DTO type must not include a `lines` field (absent, not `null`).
- Unit test packet: must assert that supplier GET invite response does NOT include a `lines`
  field.

**Deferred follow-up:**

`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001` (Phase 1C or later) must conduct
a formal privacy review of RFQ line detail exposure before implementation.

---

### OD-6: Feature gate chain for supplier routes

| Field | Value |
|---|---|
| **Decision ID** | OD-6 |
| **Status** | LOCKED |
| **Selected option** | **Option B — Supplier routes require only `nc.procurement_pools.supplier_invites.enabled`** |

**Question:** Should supplier routes (`/supplier-rfq-invites`) apply the full 3-gate chain
or only the `supplier_invites` sub-flag?

**Selected option:**
Option B — Supplier routes require only `nc.procurement_pools.supplier_invites.enabled` as
their feature gate. They do NOT require `nc.procurement_pools.enabled` or
`nc.procurement_pools.rfq.enabled`. Owner routes require the full 3-gate chain as specified
in the design §13.

**Gate chains — LOCKED:**

| Route namespace | Feature gate chain |
|---|---|
| Owner routes (`/:poolId/rfq/:rfqId/invites/*`) | `ncPoolFeatureGate` → `ncPoolRfqFeatureGate` → `ncPoolSupplierInviteFeatureGate` |
| Supplier routes (`/supplier-rfq-invites/*`) | `ncPoolSupplierInviteFeatureGate` only |

**Provisioning consequence — EXPLICIT:**

Invited supplier orgs **must** receive a `TenantFeatureOverride` row for the flag
`nc.procurement_pools.supplier_invites.enabled = true` in order to access their invite
list or respond to invites. Without this provisioning, the feature gate middleware will
deny their requests at Layer 2.

This is a **platform provisioning step** that must be established before any supplier org
is invited. The schema packet (SCHEMA-001) may include a seed SQL example. The feature gate
packet (FEATURE-GATE-001) must document the provisioning requirement and test it explicitly.

**Rationale:**

1. Supplier orgs are not pool operators. They may never have `nc.procurement_pools.enabled`
   provisioned (they are not creating pools — they are receiving invites to respond to RFQs).
2. Requiring the full pool chain for supplier routes would exclude all legitimate supplier
   orgs from the invite workflow.
3. Option A (full chain) would make the supplier route permanently unusable for any org
   that doesn't also have pool creation capabilities — a product design contradiction.
4. Option C (no gate) prematurely exposes supplier routes globally before they are
   production-ready.

**Implementation consequence:**

- Feature gate packet: `ncPoolSupplierInviteFeatureGate.middleware.ts` applies the 2-layer
  pattern (global `FeatureFlag` + per-tenant `TenantFeatureOverride`).
- Feature gate packet: must document provisioning SQL example for supplier orgs.
- Unit test packet: must test that supplier org with only `supplier_invites.enabled = true`
  can access supplier routes; must test that supplier org WITHOUT the flag gets 503.
- Integration test packet: must include a cross-org test where owner org has full 3-gate
  chain but supplier org has only `supplier_invites.enabled`.

**Deferred follow-up:**

If future phases require supplier-org pool participation (e.g., a supplier co-pool model),
the gate chain may need revisiting.

---

### OD-7: Lifecycle log writes — mandatory or optional in Phase 1B

| Field | Value |
|---|---|
| **Decision ID** | OD-7 |
| **Status** | LOCKED |
| **Selected option** | **Option A (modified) — Mandatory lifecycle log writes via direct Prisma write (NOT via `stateMachine.transition()`)** |

**Question:** Should `NetworkLifecycleLog` writes be mandatory for invite events in Phase 1B,
or optional?

**Selected option:**
Option A (modified by repo-truth constraint) — Mandatory lifecycle log writes for each
invite event (send, accept, decline, cancel). Written within the **same `$transaction`** as
the invite row mutation. Failure to write the log rolls back the invite mutation.

**Critical repo-truth conflict — RESOLVED:**

The design recommended using `stateMachine.transition()` with `fromStateKey = toStateKey =
CLOSED_FOR_BIDS`. This is **NOT compatible with repo truth:**

1. `StateMachineService.transition()` validates transitions against the `allowedTransitions`
   table (Step 8). A CLOSED_FOR_BIDS → CLOSED_FOR_BIDS self-transition is not a declared
   allowed transition. The SM would return `TRANSITION_NOT_PERMITTED`.
2. If CLOSED_FOR_BIDS is marked `isTerminal = true` in `lifecycle_states`, the SM would
   also block at Step 7 (`TRANSITION_FROM_TERMINAL`), before Step 8.
3. Invite events (send, accept, decline, cancel) do NOT represent pool state machine
   transitions — the pool remains in CLOSED_FOR_BIDS throughout. The SM is designed for
   real state transitions, not for informational/audit log entries.

**Resolved implementation pattern:**

Direct write to `networkLifecycleLog` via Prisma, within the caller's `$transaction`, bypassing
the SM's `allowedTransitions` validation. This is the correct pattern for informational pool
audit entries that do not change pool state.

```
// Inside $transaction (tx):
await tx.networkLifecycleLog.create({
  data: {
    orgId:        ownerOrgId,                   // pool owner org
    entityType:   'POOL',
    entityId:     poolId,
    fromStateKey: 'CLOSED_FOR_BIDS',           // pool current state (unchanged)
    toStateKey:   'CLOSED_FOR_BIDS',           // pool stays in same state
    actorUserId:  userId ?? null,
    actorAdminId: null,
    actorType:    'TENANT_ADMIN',              // for owner actions (send, cancel)
    actorRole:    'NC_POOL_ADMIN',
    reason:       `Supplier invite [event]: rfq=${rfqRef}, supplier=${supplierOrgId}`,
    requestId:    requestId ?? null,
    aiTriggered:  false,
    // other nullable fields: null
  }
})
```

**Actor type for supplier events (accept, decline):**

When a supplier org accepts or declines, the actor is the supplier user, not the pool admin.
The log for accept/decline events should use:
- `actorType: 'TENANT_USER'` (or `'TENANT_ADMIN'` if the role system allows — to be confirmed in service packet)
- `actorRole: 'NC_SUPPLIER'` (new role string, not registered in SM allowed_transitions — safe for direct write)
- `orgId: ownerOrgId` (pool owner org remains the RLS anchor for the NetworkLifecycleLog entry)

> **Note:** The `orgId` in NetworkLifecycleLog is the pool owner org's ID (RLS anchor),
> not the supplier org's ID. This is consistent with the design that lifecycle log entries
> for POOL entities are anchored to the pool owner org.

**Rationale:**

1. Direct write bypasses the SM's transition validation (which is correct for
   non-transitions) while preserving the same audit trail benefits.
2. In-transaction guarantees atomicity: if the log write fails, the invite mutation is
   rolled back. No orphaned invite rows without audit trail.
3. Consistent with the SM's own pattern: the SM uses `opts.db.networkLifecycleLog.create()`
   directly when inside a caller-managed transaction (stateMachine.service.ts lines 540–541).
   This confirms direct write is an established repo pattern.
4. The `NetworkLifecycleLog` table has 3-layer immutability (SM no-update/delete method +
   DB trigger + RLS UPDATE/DELETE = USING false). A direct `create()` is still fully
   protected by these immutability guarantees.

**Implementation consequence:**

- Service packet (OWNER-SERVICE-001 and SUPPLIER-SERVICE-001): each invite mutation method
  (`sendInvite`, `cancelInvite`, `acceptInvite`, `declineInvite`) must include a direct
  `tx.networkLifecycleLog.create()` call within the method's `$transaction`.
- No `stateMachine.transition()` call for invite events. The SM is only called for real
  pool state transitions (e.g., AGGREGATING → CLOSED_FOR_BIDS).
- Schema packet: no additional `allowedTransitions` row needed for CLOSED_FOR_BIDS → CLOSED_FOR_BIDS.
  The direct-write pattern requires no new state machine path.
- Unit test packet: mock the `tx.networkLifecycleLog.create` call in service unit tests;
  assert it is called with the correct `entityType`, `entityId`, `fromStateKey`, and `reason`.
- Integration test packet: verify `networkLifecycleLog` rows exist after each invite event.

**Deferred follow-up:**

If a future phase introduces a pool sub-state for "awaiting supplier responses" (e.g.,
AWAITING_QUOTES between CLOSED_FOR_BIDS and a final settlement state), proper SM transitions
would be appropriate at that time.

---

## §5 — Required Corrections / Clarifications to Carry Forward

The following corrections apply to the parent design document
(`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001.md`) and must be reflected in all
subsequent implementation packets. The design document itself is NOT amended (it is a closed
commit artifact); these corrections are carried forward in implementation packet specs.

### Correction C-1: Re-invite OD pointer reference

**Finding:** In the parent design §18 governance chain table, the DECISION_AUDIT packet
description references "re-invite" in the context of OD-1. The design §3 (repo-truth
baseline) incorrectly lists supplier invite mode as OD-3 in one location. Re-invite is
exclusively OD-1. OD-3 is `expiresAt` default value.

**Carry-forward rule:** All implementation packets must reference re-invite constraints
under OD-1. OD-3 refers exclusively to `expiresAt` default inheritance.

### Correction C-2: Lazy EXPIRED semantics — terminal state guard implementation

**Finding:** The design §8 states EXPIRED is a terminal status. OD-2 (locked above) clarifies
that EXPIRED is a *computed* state — the DB column never contains 'EXPIRED'. Implementation
packets must not assume the DB `status` column will ever be 'EXPIRED'.

**Carry-forward rule:** The terminal-state guard in service methods (`cancelInvite`,
`acceptInvite`, `declineInvite`) must evaluate effective status as:

```typescript
const isExpired = invite.expiresAt !== null && new Date(invite.expiresAt) < new Date();
const effectiveStatus = isExpired ? 'EXPIRED' : invite.status;
if (['ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(effectiveStatus)) {
  throw new NetworkPoolRfqSupplierInviteInvalidTransitionError(...);
}
```

This applies identically to owner-side (`cancelInvite`) and supplier-side (`acceptInvite`,
`declineInvite`) operations.

### Correction C-3: Phase 1B supplier projection is aggregate-header-only

**Carry-forward rule:** `NetworkPoolRfqLine` rows are NEVER included in Phase 1B supplier
responses. All implementation packets (service, route, test) for supplier-facing invite
DTOs must omit the `lines` field entirely. A `lines` field must not appear in the
supplier invite response type.

### Correction C-4: Supplier orgs do not need pool membership

**Carry-forward rule:** Supplier routes (`/supplier-rfq-invites/*`) do NOT check
`NetworkPoolMembership`. A supplier org can receive, read, accept, and decline an invite
without being a pool member. The invite is the sole authorization mechanism for
supplier participation.

No `NetworkPoolMembership` query is performed in any supplier-route service method.
No `pool_id` scoping is applied to supplier-route listing queries (scope is
`supplier_org_id = callerOrgId` only).

### Correction C-5: Supplier route feature gate provisioning requirement

**Carry-forward rule:** Any invited supplier org must have a `TenantFeatureOverride` row
for `nc.procurement_pools.supplier_invites.enabled = true` provisioned before they can
access the supplier invite routes. The feature gate packet (FEATURE-GATE-001) must:

1. Document the provisioning consequence explicitly.
2. Include seed SQL demonstrating how to provision a supplier org.
3. Include an integration test verifying that an un-provisioned supplier org receives 503
   from the supplier invite routes.

### Correction C-6: OD-7 — Direct write, NOT `stateMachine.transition()`

**Carry-forward rule:** All invite-event lifecycle log entries use direct
`tx.networkLifecycleLog.create()` within the service `$transaction`. No call to
`this.stateMachine.transition()` is made for invite events. Service packets must NOT
inject or reference `StateMachineService` for lifecycle log purposes.

---

## §6 — Locked Implementation Contract for Next Packets

The following table summarizes how the locked decisions affect each downstream implementation
packet in the governance chain.

### Schema packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001`

| Decision | Schema impact |
|---|---|
| OD-1 (no re-invite) | `UNIQUE (rfq_id, supplier_org_id)` — standard unique constraint, no partial index |
| OD-2 (lazy EXPIRED) | `status` column CHECK IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED') — 'EXPIRED' is NOT a valid DB status value |
| OD-3 (expiresAt default) | `expires_at TIMESTAMPTZ NULL` — no DB-level default; inheritance logic lives in service |
| OD-4 (org validation) | FK `supplier_org_id → organizations.id` retained; no DB-level status check needed |
| OD-6 (gate chain) | No schema impact; feature gate implementation is middleware only |
| OD-7 (direct write) | No additional `allowed_transitions` row for CLOSED_FOR_BIDS → CLOSED_FOR_BIDS |

### Feature gate packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001`

| Decision | Feature gate impact |
|---|---|
| OD-6 (supplier chain) | New middleware `ncPoolSupplierInviteFeatureGate.middleware.ts`; supplier routes use this gate only; owner routes use 3-gate chain |
| OD-6 (provisioning) | Seed SQL example for provisioning supplier org override; provisioning test required |

### Owner service packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001`

| Decision | Owner service impact |
|---|---|
| OD-1 (no re-invite) | `sendInvite`: pre-INSERT check for existing row by (rfqId, supplierOrgId); any existing row → AlreadySentError (409) |
| OD-2 (lazy EXPIRED) | `cancelInvite`: effective-status check (compute EXPIRED from `expiresAt`) before state guard |
| OD-3 (expiresAt) | `sendInvite`: inherit `rfq.responseDeadlineAt` if caller doesn't provide `expires_at` |
| OD-4 (org validation) | `sendInvite`: pre-INSERT `organizations.findUnique({ id: supplierOrgId })` → status must be 'ACTIVE' |
| OD-7 (direct write) | `sendInvite`, `cancelInvite`: `tx.networkLifecycleLog.create()` inside `$transaction`; NO `stateMachine.transition()` call |

### Supplier service packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001`

| Decision | Supplier service impact |
|---|---|
| OD-2 (lazy EXPIRED) | `acceptInvite`, `declineInvite`: effective-status check before state guard |
| OD-4 (no membership check) | `listSupplierInvites`, `getSupplierInvite`: scope by `supplier_org_id = callerOrgId` only; no pool membership check |
| OD-5 (header only) | `getSupplierInvite`: Prisma query must NOT `include: { rfqLines: true }`; DTO type excludes `lines` |
| OD-7 (direct write) | `acceptInvite`, `declineInvite`: `tx.networkLifecycleLog.create()` with `actorType = 'TENANT_USER'` (or TENANT_ADMIN), `orgId = ownerOrgId`; NO `stateMachine.transition()` call |

### Owner route packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001`

| Decision | Owner route impact |
|---|---|
| OD-6 (3-gate chain) | Route registration in `tenant.ts` must apply `ncPoolFeatureGate`, `ncPoolRfqFeatureGate`, `ncPoolSupplierInviteFeatureGate` in sequence |
| OD-4 (membership check) | Routes: role gate enforces OWNER or ADMIN (not MEMBER); `orgId` from `request.dbContext.orgId` (D-017-A) |

### Supplier route packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001`

| Decision | Supplier route impact |
|---|---|
| OD-6 (single gate) | Route registration in `tenant.ts` applies `ncPoolSupplierInviteFeatureGate` only |
| OD-5 (header only) | Route schema/response type excludes `lines` field |

### Unit test packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-UNIT-TEST-001`

| Decision | Unit test impact |
|---|---|
| OD-1 | Test: existing row any status → AlreadySentError |
| OD-2 | Test: lazy EXPIRED boundary in GET response + in transition guard |
| OD-3 | Test: expiresAt inheritance when RFQ has responseDeadlineAt; null when not |
| OD-4 | Test: SUSPENDED org → 422; non-existent org → 422; ACTIVE org → proceeds |
| OD-5 | Test: supplier GET response does NOT contain `lines` field |
| OD-6 | Test: supplier feature gate middleware with only `supplier_invites.enabled` |
| OD-7 | Test: `tx.networkLifecycleLog.create` called for each invite event; SM NOT called |

### Integration test packet — `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-INTEGRATION-TEST-001`

| Decision | Integration test impact |
|---|---|
| OD-1 | Duplicate invite → 409 |
| OD-2 | Expired invite (past expiresAt) in GET returns `status: 'EXPIRED'`; accept expired invite → 422 |
| OD-3 | Invite without `expires_at` inherits `rfq.responseDeadlineAt` in DB row |
| OD-4 | Invalid `supplier_org_id` → 422 INVALID_INPUT |
| OD-6 | Un-provisioned supplier org → 503 on supplier routes |
| OD-7 | Verify `network_lifecycle_logs` row exists after sendInvite, cancelInvite, acceptInvite, declineInvite |

---

## §7 — Non-Authorization Statement

**This packet is a decision audit and governance record only.**

The following actions are explicitly NOT authorized by this packet:

| Action | Status |
|---|---|
| Creating `network_pool_rfq_supplier_invites` table or any migration | NOT AUTHORIZED |
| Adding any model to `server/prisma/schema.prisma` | NOT AUTHORIZED |
| Running `prisma db pull` | NOT AUTHORIZED |
| Running `prisma generate` | NOT AUTHORIZED |
| Running `prisma migrate deploy` | NOT AUTHORIZED |
| Creating any service file (`networkPoolRfqSupplierInvite.service.ts` or similar) | NOT AUTHORIZED |
| Creating any route file (`poolRfqInvites.ts`, `supplierRfqInvites.ts`, or similar) | NOT AUTHORIZED |
| Creating any middleware file (`ncPoolSupplierInviteFeatureGate.middleware.ts` or similar) | NOT AUTHORIZED |
| Modifying `server/src/routes/tenant.ts` to register new routes | NOT AUTHORIZED |
| Creating any test file | NOT AUTHORIZED |
| Seeding the `nc.procurement_pools.supplier_invites.enabled` feature flag | NOT AUTHORIZED |
| Applying any RLS policy SQL | NOT AUTHORIZED |
| Modifying any existing implementation file | NOT AUTHORIZED |
| Modifying `server/prisma/schema.prisma` for any reason | NOT AUTHORIZED |

No change to the following governance posture keys is made by this packet:

- `active_delivery_unit: HOLD_FOR_AUTHORIZATION` — **unchanged**
- `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` — **unchanged**

---

## §8 — Next Authorized Candidate

The next implementation candidate in the governance chain is:

```
TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001
```

**Status:** CANDIDATE ONLY — requires separate, explicit Paresh authorization before work
begins. No schema, migration, or implementation work proceeds until that authorization is
received via a prompt containing the explicit allowlist.

**Scope of schema packet when authorized:**

1. SQL migration for `network_pool_rfq_supplier_invites` table (columns as per design §7,
   with OD-1 standard unique constraint and OD-2 CHECK excluding 'EXPIRED' from status).
2. RLS policy SQL for dual-anchor pattern (`owner_org_id` + `supplier_org_id`).
3. `prisma db pull` — after SQL is applied and verified.
4. `prisma generate` — after schema is confirmed correct.
5. Server restart and `GET /health` verification.
6. No service, route, middleware, or test changes in the schema packet.

---

*End of TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001*
