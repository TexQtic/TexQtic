# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001
## Pool RFQ Award — Maker-Checker Architecture Design

---

```yaml
id: TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001
status: DESIGN_COMPLETE
type: GOVERNANCE_DESIGN
date: 2026-07-01
author: GitHub Copilot (governance agent)
authorized_by: Paresh Patel
domain: network-commerce
sub-domain: phase1 / pool-rfq / award
layer: governance / design
preceding_packet: TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001
delivery_impact: >
  No source, schema, migration, test, env, or flag changes in this packet.
  Design-only. All changes are deferred to implementation child packets
  defined in §14.
commit_message: "docs(network-commerce): design award maker checker flow"
governance_contracts_reviewed:
  - governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md (Phase 1D authority)
  - governance/TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001.md (blocker evidence)
  - server/src/services/stateMachine.service.ts (SM behavior authority)
  - server/src/services/networkPoolRfq.service.ts (acceptQuote runtime authority)
  - server/prisma/migrations/20260523000000_nc_pool_lifecycle_seed/migration.sql (transition seed)
  - server/prisma/schema.prisma (PendingApproval / ApprovalSignature / NetworkLifecycleLog models)
  - server/src/services/stateMachine.types.ts (TransitionRequest / TransitionResult types)
stop_conditions:
  - Do NOT change the allowed_transitions MC rule (requires_maker_checker=true is correct)
  - Do NOT enable any feature flag
  - Do NOT open Packet 17 or FE-10
  - Do NOT change DPP posture
  - Do NOT modify source, schema, test, or env files in this packet
  - Do NOT mutate production DB state
```

---

## §1 — Authority Chain

| Document | Role |
|---|---|
| `TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001` | Blocker evidence — controlled QA activation confirmed the MC gate is active and correct |
| `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001` | Phase 1D design authority (pre-dates MC discovery) |
| `server/prisma/migrations/20260523000000_nc_pool_lifecycle_seed/migration.sql` | Canonical lifecycle seed — defines POOL QUOTED→ACCEPTED transition with `requires_maker_checker=true` and `allowed_actor_type = ARRAY['TENANT_ADMIN', 'PLATFORM_ADMIN', 'CHECKER']` |
| `server/src/services/stateMachine.service.ts` | SM implementation authority — Step 13 MC logic; G-021 comment defining caller responsibility |
| `server/prisma/schema.prisma` (`PendingApproval`, `ApprovalSignature`, `NetworkLifecycleLog`) | Schema authority — G-021 framework already in schema |
| `governance/control/OPEN-SET.md` | Governance posture — QD-6 hold, DPP hold, MC design unit as next required action |
| `governance/control/NEXT-ACTION.md` | Layer 0 pointer — `active_delivery_unit` = this design packet |
| `governance/control/BLOCKED.md` | `NC-PROD-AWARD-E2E-BLOCKED-BY-MAKER-CHECKER-DESIGN` — resolved by this packet |

---

## §2 — Current Repo-Truth Baseline

### 2.1 Controlled QA Activation Evidence

From `TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001` (2026-05-13):

| Item | Value |
|---|---|
| Pool | `74436ecd` — state `CLOSED_FOR_BIDS` |
| RFQ | `55eb2858` — status `QUOTED` |
| Quote | `2ac70ff6` (ref `SQ-639D77622A92476C`) — status `SUBMITTED`, `accepted_at=NULL`, `rejected_at=NULL` |
| Owner org | `faf2e4a7` (qa-b2b) |
| Supplier org | `83af5463` (qa-knt-b) |
| Both feature flags | Restored `false` (QD-6 hold on supplier_quotes; rfq.award.enabled=false) |

**Award path verdict:** `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept`
reached `NetworkPoolRfqService.acceptQuote()`. SM called with `actorType: 'TENANT_ADMIN'`, returned
`PENDING_APPROVAL`. Service threw `NetworkPoolRfqTransitionDeniedError`. Route returned **422
INVALID_TRANSITION**. This is **correct governance behavior**, not a bug.

### 2.2 Lifecycle Seed — POOL QUOTED→ACCEPTED Transition

From `20260523000000_nc_pool_lifecycle_seed/migration.sql §3`:

```sql
-- QUOTED → ACCEPTED: pool admin accepts supplier quote (MC for high-value)
(
  'POOL',
  'QUOTED',
  'ACCEPTED',
  ARRAY ['TENANT_ADMIN', 'PLATFORM_ADMIN', 'CHECKER'],
  true,   -- requires_maker_checker
  false   -- requires_escalation
),
```

**Key finding:** `CHECKER` is already in `allowed_actor_type`. The SM actor-type check at Step 11 will
PASS for a CHECKER call. No transition seed change is required.

### 2.3 StateMachineService — Maker-Checker Step 13 Logic

From `server/src/services/stateMachine.service.ts` (lines ~285-300):

```typescript
// ── Step 13: Maker-Checker requirement ─────────────────────────────────────
if (allowedTransition.requiresMakerChecker) {
  // G-021: If this is a CHECKER completing a prior MAKER request, allow
  // the transition to proceed. Otherwise, return PENDING_APPROVAL.
  // Deferred to G-021: Maker-Checker approval record creation
  // (pending_approvals table). Service returns PENDING_APPROVAL status;
  // caller creates the G-021 record.
  const isMakerCheckerCompletion =
    req.actorType === 'CHECKER' && req.makerUserId != null;
  if (!isMakerCheckerCompletion) {
    return {
      status: 'PENDING_APPROVAL',
      requiredActors: ['MAKER', 'CHECKER'],
      entityType: req.entityType,
      entityId: req.entityId,
      fromStateKey: normalizedFromState,
      toStateKey: normalizedToState,
    };
  }
  // else: CHECKER + makerUserId set → fall through to APPLIED write
}
```

**Confirmed behavior:**
- **MAKER/TENANT_ADMIN call:** SM returns `{status: 'PENDING_APPROVAL', ...}` — not a denial, a
  governance response. The caller (service) is responsible for creating the G-021 record.
- **CHECKER call** (`actorType: 'CHECKER'` + `makerUserId != null`): SM bypasses the
  PENDING_APPROVAL gate and proceeds to the APPLIED write.

### 2.4 NetworkLifecycleLog — Maker-Checker Fields

From `server/prisma/schema.prisma` (POOL/SYNDICATE/VCO_CHAIN write branch):

```typescript
const logData = {
  orgId: req.orgId,
  entityType: normalizedEntityType,
  entityId: req.entityId,
  fromStateKey: normalizedFromState,
  toStateKey: normalizedToState,
  actorUserId: req.actorUserId ?? null,
  actorAdminId: req.actorAdminId ?? null,
  actorType: req.actorType,        // 'CHECKER' when checker completes
  actorRole: req.actorRole,
  makerUserId: req.makerUserId ?? null,    // Maker's userId, set by CHECKER call
  checkerUserId: req.checkerUserId ?? null, // Checker's own userId
  ...
};
```

When the CHECKER calls the SM, the log is written with `actorType='CHECKER'`,
`makerUserId=<makerUserId>`, and `checkerUserId=<checkerUserId>`, providing a complete audit trail.

### 2.5 G-021 Schema — Already Present

From `server/prisma/schema.prisma`:

- **`PendingApproval` model** (`@@map("pending_approvals")`) — G-021 §3.A. Already in schema.
  Fields include: `id`, `orgId`, `entityType`, `entityId`, `fromStateKey`, `toStateKey`,
  `requestedByUserId`, `requestedByAdminId`, `requestedByActorType`, `requestedByRole`,
  `requestReason`, `frozenPayload`, `frozenPayloadHash`, `makerPrincipalFingerprint`,
  `status` (default `'REQUESTED'`), `attemptCount`, `expiresAt`, `requestId`, etc.

- **`ApprovalSignature` model** (`@@map("approval_signatures")`) — G-021 §3.B. Already in schema.
  Append-only checker decision record. Fields include: `approvalId`, `orgId`, `signerUserId`,
  `signerActorType`, `decision`, `reason`, etc.

- **`organizations.pending_approvals`** relation exists, confirming the FK constraint is live.

**Key implication:** No new schema models are required. The G-021 foundation tables exist. No
schema migration is required for the approval framework itself. The SCHEMA implementation
packet only needs to verify these tables are in the remote DB and confirm Prisma model
availability — then proceed directly to the service packet.

### 2.6 Current `acceptQuote` State

`NetworkPoolRfqService.acceptQuote()` (lines 1507–1783 of `networkPoolRfq.service.ts`):

- Calls SM twice within a `$transaction`:
  1. `POOL CLOSED_FOR_BIDS → QUOTED` — actorType: `'TENANT_ADMIN'`, makerUserId: `null`
  2. `POOL QUOTED → ACCEPTED` — actorType: `'TENANT_ADMIN'`, makerUserId: `null` → **returns
     `PENDING_APPROVAL`** → service throws `NetworkPoolRfqTransitionDeniedError`
- This method was designed before the MC architecture was clarified. It is the MAKER path
  prototype, not yet MC-aware.

### 2.7 FE-9 Current State

`components/Tenant/NetworkCommerce/QuoteReviewPanel.tsx` — Implemented and production-verified
(`TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001`, VERIFIED_COMPLETE 2026-06-08).

Current `acceptQuoteForRfq()` in `services/networkCommerceService.ts` calls:
```
POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept
```

When MC is live, this endpoint will be replaced by the `requestAward` endpoint (MAKER step).
The QuoteReviewPanel needs a new `pending-approval` UI state for the award request path.

---

## §3 — Problem Statement

The POOL QUOTED→ACCEPTED lifecycle transition has `requires_maker_checker=true` in the
`allowed_transitions` seed (correct governance). The current `acceptQuote` service method
calls the SM with `actorType: 'TENANT_ADMIN'`, which the SM correctly recognizes as a
non-CHECKER actor, returning `{status: 'PENDING_APPROVAL'}`. The service incorrectly
interprets this as a denied transition, throwing `NetworkPoolRfqTransitionDeniedError`,
which the route maps to a 422 response.

**The SM is working correctly.** The service needs to be updated to:
1. Recognize `PENDING_APPROVAL` as the expected first step of a two-actor MC flow
2. Create a `pending_approvals` row (G-021) on MAKER call
3. Accept a CHECKER call that completes the flow via SM with `actorType: 'CHECKER'`

---

## §4 — Design Options Considered

### Option A: Remove the MC requirement (REJECTED)

Modify the `allowed_transitions` seed or add a flag to bypass MC for POOL QUOTED→ACCEPTED.

**Rejected because:**
- The MC requirement is a deliberate governance control (high-value acceptance requires two actors)
- Removing it would weaken the control without explicit product decision
- The `lifecycle_states.ACCEPTED.requires_maker_checker=true` and `allowed_transitions` seed
  both encode this as intentional — it was designed with MC in mind
- This option deviates from G-021 doctrine

### Option B: Pass `actorType: 'CHECKER'` from the single-actor flow (REJECTED)

Set `actorType: 'CHECKER'` in the SM call inside `acceptQuote` to bypass the MC gate.

**Rejected because:**
- This is fraudulent: a single TENANT_ADMIN cannot be both MAKER and CHECKER
- The `makerPrincipalFingerprint` enforcement and DB trigger `check_maker_checker_separation`
  exist precisely to prevent this
- The `NetworkLifecycleLog` would record false audit data
- Violates G-021 §3.A's maker≠checker invariant

### Option C: Two-call G-021 split flow using existing `pending_approvals` table (RECOMMENDED)

Implement the MC flow as two separate service calls using the already-designed G-021 framework:

1. **MAKER call** (`requestAward`): A TENANT_ADMIN/pool-owner calls the award request. The SM
   returns `PENDING_APPROVAL`. The service creates a `pending_approvals` row and returns a
   202-style pending response.

2. **CHECKER call** (`approveAward`): A second TENANT_ADMIN or PLATFORM_ADMIN (who is not
   the Maker) acts as Checker. The service loads the pending approval, calls the SM with
   `actorType: 'CHECKER'` and `makerUserId` set, the SM proceeds to APPLIED, the full
   award transaction (quote ACCEPTED, mass-reject, RFQ update, pool transition) executes,
   and the `pending_approvals` row is marked APPROVED.

**Selected because:**
- This is the exact flow the SM was designed for (G-021 comment: "caller creates the G-021 record")
- `CHECKER` is already in `allowed_actor_type` for POOL QUOTED→ACCEPTED — no seed change needed
- `pending_approvals` and `ApprovalSignature` tables already exist — no new schema required
- `NetworkLifecycleLog.makerUserId` and `.checkerUserId` fields already exist
- Preserves the full governance value of MC: two independent parties required
- No risk of audit trail fraud
- Consistent with the MC pattern used for `SETTLEMENT_PENDING→SETTLED`

---

## §5 — Recommended Architecture: Two-Call G-021 Split Flow

### 5.1 Actor Definitions

| Actor | Role | DB Actor Type | Constraints |
|---|---|---|---|
| **Maker** | Pool owner / TENANT_ADMIN who initiates the award request | `TENANT_ADMIN` (or `MAKER`) | Must not be the Checker on the same request |
| **Checker** | Second TENANT_ADMIN or PLATFORM_ADMIN who approves the award | `CHECKER` | Must be different from Maker (enforced by DB trigger `check_maker_checker_separation` via `makerPrincipalFingerprint`) |

### 5.2 Flow Diagram

```
Pool Owner (MAKER)                         Pool Admin / PlatformAdmin (CHECKER)
        │                                               │
  POST /pools/:p/rfq/:r/quotes/:q/award-request         │
        │                                               │
        ▼                                               │
  NetworkPoolRfqService.requestAward()                  │
    → SM: POOL CLOSED_FOR_BIDS → QUOTED (TENANT_ADMIN)  │
    → SM: POOL QUOTED → ACCEPTED (TENANT_ADMIN)          │
         returns { status: 'PENDING_APPROVAL' }         │
    → INSERT pending_approvals row (G-021)              │
    → returns 202 AwardPendingApproval response         │
        │                                               │
        └───────── Notification (out of scope) ────────►│
                                                        │
                           POST /pools/:p/rfq/:r/award-approvals/:a/approve
                                                        │
                                                        ▼
                              NetworkPoolRfqService.approveAward()
                                → Load pending_approvals row
                                → Verify REQUESTED status + org_id + expiry
                                → Check maker≠checker
                                → SM: POOL QUOTED → ACCEPTED (CHECKER, makerUserId=maker)
                                     returns { status: 'APPLIED' }
                                → UPDATE quote: status=ACCEPTED, accepted_at
                                → UPDATE other quotes: status=REJECTED (mass-reject)
                                → UPDATE rfq: status=ACCEPTED
                                → UPDATE pending_approvals: status=APPROVED
                                → INSERT ApprovalSignature (APPROVED, reason)
                                → returns 200 AwardApproved response
```

### 5.3 Key Invariants

1. **Maker≠Checker:** `makerPrincipalFingerprint` is stored at insert time. The DB trigger
   `check_maker_checker_separation` fires on `approval_signatures` INSERT and verifies the
   signer is not the same principal. The service layer also enforces this check before the SM call.

2. **One active request per entity+transition:** D-021-B partial unique index on `pending_approvals`
   (`WHERE status = 'REQUESTED'`) prevents duplicate active award requests for the same pool.

3. **Frozen payload integrity:** D-021-A: `frozenPayloadHash` is a SHA-256 hex over the
   canonical transition fields at the time of the MAKER request. The CHECKER call must present
   the same `approvalId`; the service re-hashes to verify before proceeding.

4. **Expiry:** `pending_approvals.expiresAt` must be checked before the CHECKER proceeds.
   Expired approvals must return a specific error code (`APPROVAL_EXPIRED`).

5. **org_id scoping:** Both the MAKER and CHECKER calls must be scoped to the same `org_id`.
   The CHECKER must be a member of the same organization (or PLATFORM_ADMIN). RLS + service-layer
   `where: { id: approvalId, orgId }` enforce this.

6. **Quote-state pre-condition:** At CHECKER time, the service must re-verify that the target
   quote is still `SUBMITTED` (another CHECKER may have already approved a different quote).
   Idempotency key prevents double-commit on CHECKER retries.

---

## §6 — Service Contract

### 6.1 `requestAward()` — MAKER call

```typescript
/**
 * MAKER step: Pool owner initiates an award approval request for a supplier quote.
 * SM: POOL QUOTED→ACCEPTED (actorType: TENANT_ADMIN) → returns PENDING_APPROVAL.
 * Creates a pending_approvals row (G-021) and returns the approval record.
 *
 * Feature gate: nc.procurement_pools.rfq.award.enabled must be true.
 * Ownership gate: orgId must be the pool owner org.
 *
 * @returns AwardApprovalRequest DTO with id (approvalId), status='PENDING_APPROVAL', expiresAt.
 */
async requestAward(
  orgId: string,
  makerUserId: string,
  poolId: string,
  rfqId: string,
  quoteId: string,
  input: RequestAwardInput,  // { request_reason: string; request_id?: string | null }
): Promise<AwardApprovalRequest>
```

**Behaviour:**
1. Verify pool ownership (`where: { id: poolId, orgId }`).
2. Verify RFQ is in `QUOTED` status.
3. Verify target quote is `SUBMITTED`.
4. Call SM: `POOL CLOSED_FOR_BIDS→QUOTED` if pool is still `CLOSED_FOR_BIDS` (idempotent pre-step).
5. Call SM: `POOL QUOTED→ACCEPTED` with `actorType: 'TENANT_ADMIN'`, `makerUserId: null` →
   expect `{status: 'PENDING_APPROVAL'}`. If SM returns `DENIED` (not PENDING_APPROVAL or APPLIED),
   throw `NetworkPoolRfqTransitionDeniedError`.
6. INSERT `pending_approvals` row: `entityType: 'POOL'`, `entityId: poolId`,
   `fromStateKey: 'QUOTED'`, `toStateKey: 'ACCEPTED'`, `requestedByUserId: makerUserId`,
   `requestedByActorType: 'TENANT_ADMIN'`, `frozenPayload: {poolId, rfqId, quoteId}`,
   `frozenPayloadHash: sha256(canonical)`, `makerPrincipalFingerprint: 'TENANT_ADMIN:<makerUserId>'`,
   `status: 'REQUESTED'`, `expiresAt: now() + 72h`.
7. Return `AwardApprovalRequest` DTO.

**HTTP response:** `202 Accepted` with `AwardApprovalRequest` body.

**Error codes:** `POOL_NOT_FOUND`, `RFQ_NOT_IN_QUOTED_STATE`, `QUOTE_NOT_SUBMITTED`,
`AWARD_REQUEST_ALREADY_PENDING` (D-021-B unique violation), `TRANSITION_DENIED`.

---

### 6.2 `approveAward()` — CHECKER call

```typescript
/**
 * CHECKER step: A second authorized actor approves the pending award request.
 * Loads the pending_approvals row, verifies checker≠maker, calls SM with
 * actorType: 'CHECKER' and makerUserId set, and completes the full award transaction.
 *
 * Feature gate: nc.procurement_pools.rfq.award.enabled must be true.
 * Ownership gate: orgId must be the pool owner org (or PLATFORM_ADMIN).
 * Checker gate: signerUserId must not match makerPrincipalFingerprint.
 *
 * @returns AwardApproved DTO with quote, rfq, and approval record.
 */
async approveAward(
  orgId: string,
  checkerUserId: string,
  approvalId: string,
  input: ApproveAwardInput,  // { approve_reason: string; request_id?: string | null }
): Promise<AwardApproved>
```

**Behaviour (all steps within a `$transaction`):**
1. Load `pending_approvals` row: `where: { id: approvalId, orgId }`.
2. Verify `status === 'REQUESTED'` (not already APPROVED / REJECTED / CANCELLED / EXPIRED).
3. Verify `expiresAt > now()`.
4. Verify `frozenPayload.orgId === orgId`.
5. Verify checker≠maker: `signerFingerprint !== makerPrincipalFingerprint`.
6. Load quote from `frozenPayload.quoteId`; verify still `SUBMITTED`.
7. Call SM: `POOL QUOTED→ACCEPTED` with `actorType: 'CHECKER'`, `makerUserId: <pendingApproval.requestedByUserId>`,
   `checkerUserId: checkerUserId` → expect `{status: 'APPLIED'}`.
8. UPDATE quote row: `status='ACCEPTED'`, `accepted_at=now()`.
9. UPDATE other SUBMITTED quotes for same RFQ: `status='REJECTED'`, `rejected_at=now()` (mass-reject, AD-1).
10. UPDATE RFQ row: `status='ACCEPTED'` (QD-8 pattern — direct update, not via SM).
11. UPDATE `pending_approvals` row: `status='APPROVED'`, `updatedAt=now()`.
12. INSERT `ApprovalSignature`: `approvalId, orgId, signerUserId: checkerUserId, signerActorType: 'CHECKER',
    signerRole: 'TENANT_ADMIN', decision: 'APPROVED', reason: input.approve_reason`.
13. Return `AwardApproved` DTO.

**HTTP response:** `200 OK` with `AwardApproved` body.

**Error codes:** `APPROVAL_NOT_FOUND`, `APPROVAL_ALREADY_DECIDED`, `APPROVAL_EXPIRED`,
`MAKER_CHECKER_SAME_ACTOR`, `QUOTE_NO_LONGER_SUBMITTED`, `TRANSITION_DENIED`.

---

### 6.3 `rejectAwardApproval()` — CHECKER rejection

```typescript
/**
 * CHECKER step: Reject the pending award request. Pool remains in QUOTED state.
 * No SM transition. Updates pending_approvals row and inserts ApprovalSignature.
 *
 * @returns AwardRejected DTO.
 */
async rejectAwardApproval(
  orgId: string,
  checkerUserId: string,
  approvalId: string,
  input: RejectAwardApprovalInput,  // { reject_reason: string; request_id?: string | null }
): Promise<AwardRejected>
```

**Behaviour:**
1. Load pending_approvals row: `where: { id: approvalId, orgId, status: 'REQUESTED' }`.
2. Verify not expired.
3. Verify checker≠maker.
4. UPDATE `pending_approvals`: `status='REJECTED'`, `updatedAt=now()`.
5. INSERT `ApprovalSignature`: `decision: 'REJECTED'`, `reason: input.reject_reason`.
6. Return `AwardRejected` DTO (pool remains QUOTED; new award request can be made).

**HTTP response:** `200 OK`.

**Note:** Pool state is NOT changed. RFQ status remains QUOTED. A new `requestAward` call is
valid after rejection (the D-021-B partial unique index only blocks on `status='REQUESTED'`,
so a REJECTED record does not block a new request).

---

### 6.4 `cancelAwardRequest()` — MAKER cancellation (optional, Phase 2)

```typescript
/**
 * MAKER step: Cancel a pending award request before a Checker acts.
 * Deferred to Phase 2 if not needed for Phase 1 activation.
 */
async cancelAwardRequest(
  orgId: string,
  makerUserId: string,
  approvalId: string,
  input: CancelAwardRequestInput,
): Promise<AwardCancelled>
```

**Deferred:** Not required for Phase 1 activation. May be included in the SERVICE implementation
packet if the product decision supports it.

---

### 6.5 `getOwnerPendingAwardApprovals()` — Poll for pending approvals (CHECKER surface)

```typescript
/**
 * Returns the pending award approval request for a given pool+rfq, if any.
 * Used by CHECKER surface to discover what needs approval.
 */
async getOwnerPendingAwardApprovals(
  orgId: string,
  poolId: string,
  rfqId: string,
): Promise<AwardApprovalRequest[]>
```

---

## §7 — Route Contract

### New Routes

| Method | Path | Actor | Service Method | Feature Gate |
|---|---|---|---|---|
| `POST` | `/api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/award-request` | MAKER (TENANT_ADMIN) | `requestAward` | `nc.procurement_pools.rfq.award.enabled` |
| `POST` | `/api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/award-approvals/:approvalId/approve` | CHECKER (TENANT_ADMIN or PLATFORM_ADMIN) | `approveAward` | `nc.procurement_pools.rfq.award.enabled` |
| `POST` | `/api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/award-approvals/:approvalId/reject` | CHECKER (TENANT_ADMIN or PLATFORM_ADMIN) | `rejectAwardApproval` | `nc.procurement_pools.rfq.award.enabled` |
| `GET` | `/api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/award-approvals` | TENANT_ADMIN | `getOwnerPendingAwardApprovals` | `nc.procurement_pools.rfq.award.enabled` |

### Deprecated Routes (Phase 1D legacy)

| Method | Path | Disposition |
|---|---|---|
| `POST` | `/api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/accept` | **REPLACE** — Refactor to call `requestAward` (MAKER step only), OR leave as a compatibility shim that creates the approval request and immediately invokes the CHECKER step if single-org MC is authorized (see non-decision §15.2). |

> **Implementation note:** The simplest Phase 1 approach is to **rename** the existing
> `POST .../accept` route to `POST .../award-request` and wire it to `requestAward`. The
> original `/accept` route can return a deprecation note or be removed in the ROUTE packet.

### Request / Response DTOs

**`POST .../award-request` request body:**
```json
{
  "request_reason": "Supplier price meets budget threshold for Q3 procurement.",
  "request_id": "idempotency-uuid-or-null"
}
```

**`POST .../award-request` response (202):**
```json
{
  "success": true,
  "data": {
    "approval_id": "<uuid>",
    "status": "PENDING_APPROVAL",
    "pool_id": "<uuid>",
    "rfq_id": "<uuid>",
    "quote_id": "<uuid>",
    "requested_by_user_id": "<uuid>",
    "request_reason": "...",
    "expires_at": "2026-07-04T00:00:00Z",
    "created_at": "2026-07-01T00:00:00Z"
  }
}
```

**`POST .../approve` request body:**
```json
{
  "approve_reason": "Price verified against market benchmark. Approved.",
  "request_id": "idempotency-uuid-or-null"
}
```

**`POST .../approve` response (200):**
```json
{
  "success": true,
  "data": {
    "approval_id": "<uuid>",
    "status": "APPROVED",
    "quote": { /* OwnerQuote DTO */ },
    "approved_at": "2026-07-01T10:00:00Z"
  }
}
```

**`POST .../reject` request body:**
```json
{
  "reject_reason": "Price exceeds approved vendor budget. Re-negotiation required.",
  "request_id": "idempotency-uuid-or-null"
}
```

**Error response envelope (unchanged — existing pattern):**
```json
{
  "success": false,
  "error": {
    "code": "APPROVAL_EXPIRED",
    "message": "The award approval request has expired. A new request is required."
  }
}
```

---

## §8 — Schema Implications

### 8.1 No New Models Required

The G-021 framework is **already in the schema**:

| Model | Table | Status |
|---|---|---|
| `PendingApproval` | `pending_approvals` | EXISTS — TTP Foundation migration `20260515120000_ttp_foundation_001` |
| `ApprovalSignature` | `approval_signatures` | EXISTS — same migration |
| `NetworkLifecycleLog` | `network_lifecycle_logs` | EXISTS — NC migration |
| `allowed_transitions` (POOL QUOTED→ACCEPTED, CHECKER in allowed_actor_type) | DB seed | EXISTS — `20260523000000_nc_pool_lifecycle_seed` |

### 8.2 Verification Required (Schema Packet)

The SCHEMA implementation packet must verify:

1. `pending_approvals` table exists in remote Supabase DB (check via `prisma db pull` diff or psql query).
2. `approval_signatures` table exists.
3. `Prisma.PendingApproval` and `Prisma.ApprovalSignature` are available from `@prisma/client`
   (run `prisma generate` if not, after confirming schema is pulled correctly).
4. The partial unique index `idx_pending_approvals_active_per_entity` (D-021-B) exists in remote DB.
5. The DB trigger `check_maker_checker_separation` exists in remote DB.

### 8.3 Optional Schema Additions (Deferred, Not Required for Phase 1)

- A `nc_pool_rfq_award_approvals` view (read-optimized, joins pending_approvals + quotes) — DEFER.
- An `award_request_id` column on `network_pool_rfq_supplier_quotes` to link a quote to its
  pending approval — evaluate in SERVICE packet for lookup convenience.

---

## §9 — StateMachineService Behavior Mapping

| Call | actorType | makerUserId | SM Step 11 (actor check) | SM Step 13 (MC check) | SM Result |
|---|---|---|---|---|---|
| `requestAward` (MAKER) | `TENANT_ADMIN` | `null` | PASS (`TENANT_ADMIN` ∈ allowed_actor_type) | `isMakerCheckerCompletion = false` → return PENDING_APPROVAL | `{status: 'PENDING_APPROVAL'}` |
| `approveAward` (CHECKER) | `CHECKER` | `<makerUserId>` | PASS (`CHECKER` ∈ allowed_actor_type) | `isMakerCheckerCompletion = true` → fall through | `{status: 'APPLIED'}` |
| CHECKER with no makerUserId (invalid) | `CHECKER` | `null` | PASS | `isMakerCheckerCompletion = false` (makerUserId null) → PENDING_APPROVAL | `{status: 'PENDING_APPROVAL'}` |
| MAKER + same user as CHECKER (invalid) | `CHECKER` | `<sameUserId>` | PASS | `isMakerCheckerCompletion = true` (SM doesn't check identity equality) | PASS at SM level — **must be caught by service layer** before SM call |

**Critical:** The SM does not enforce maker≠checker identity. The service must check
`makerPrincipalFingerprint !== signerFingerprint` before calling the SM with `actorType: 'CHECKER'`.
The DB trigger `check_maker_checker_separation` on `approval_signatures` INSERT provides a
defense-in-depth backstop.

---

## §10 — FE-9 UI Impact (QuoteReviewPanel)

### 10.1 Current State

`QuoteReviewPanel.tsx` (FE-9, VERIFIED_COMPLETE 2026-06-08) renders:
- `loading` | `feature-disabled` | `empty` | `ready` | `error`
- The "Accept" button calls `acceptQuoteForRfq()` which POSTs to `.../accept`

### 10.2 Required Changes (FE-9 Extension — to be defined in `TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001`)

1. **New `pending-approval` UI state** for the QuoteReviewPanel, rendered when:
   - The owner has already submitted an award request for this quote (`approvalId` exists)
   - Displays: "Award Approval Pending — awaiting second-factor authorization"
   - Shows: `approval_id`, `expires_at`, `request_reason`, `requested_by_user_id`
   - Action: "Cancel Request" button (if cancel is in scope for Phase 1)

2. **MAKER surface (existing QuoteReviewPanel "ready" state):**
   - Rename "Accept" button to "Request Award Approval"
   - POST to `.../award-request` instead of `.../accept`
   - On 202 response: transition to `pending-approval` state

3. **CHECKER surface (new `QuoteCheckerPanel` or inline in QuoteReviewPanel):**
   - Different view for a user who is acting as CHECKER (not the original MAKER)
   - Lists pending award approvals for the RFQ
   - "Approve Award" and "Reject Award" actions

4. **`networkCommerceService.ts` additions:**
   - `requestAwardApproval()` → POST `.../award-request`
   - `approveAwardRequest()` → POST `.../award-approvals/:approvalId/approve`
   - `rejectAwardRequest()` → POST `.../award-approvals/:approvalId/reject`
   - `getPendingAwardApprovals()` → GET `.../award-approvals`
   - New interfaces: `AwardApprovalRequest`, `AwardApproved`, `AwardRejected`

### 10.3 Scope Gate

FE-9 extension is blocked until the ROUTE implementation packet is VERIFIED_COMPLETE.
The FE-9 extension may be opened as `TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001` only
after `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001` reaches VERIFIED_COMPLETE.

---

## §11 — Privacy / RLS Posture

### 11.1 `pending_approvals` table RLS

RLS policies on `pending_approvals` must enforce:

- **INSERT:** Only the MAKER's org can insert. Service calls via service-role client with
  explicit `org_id` check at service layer.
- **SELECT:** Only rows where `org_id = current_setting('app.org_id', true)::uuid`. Neither
  the MAKER nor the CHECKER should see another tenant's approval records.
- **UPDATE:** Limited to `status` field only (D-021-A frozen payload). DB trigger
  `prevent_pending_approval_payload_modification` should enforce this.
- **DELETE:** Not permitted.

### 11.2 `approval_signatures` table RLS

Per G-021 §3.B — append-only, all columns immutable after insert:
- **UPDATE/DELETE policies:** `USING false` (already in schema design).
- **SELECT:** `org_id = current_setting('app.org_id', true)::uuid`.

### 11.3 Response Privacy

- `AwardApprovalRequest` DTO must NOT expose `frozenPayload`, `frozenPayloadHash`, or
  `makerPrincipalFingerprint` to the HTTP response.
- `approvalId` is safe to expose (UUID, non-guessable, org-scoped by RLS).
- CHECKER response must NOT expose other suppliers' quote details (same privacy as existing
  `OwnerQuote` DTO — only the awarded quote is returned in the approval response).

---

## §12 — Feature Flag Posture

| Flag | Current State | Required for requestAward | Required for approveAward |
|---|---|---|---|
| `nc.procurement_pools.rfq.award.enabled` | `false` (prod) | YES — must be `true` | YES |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` (QD-6 hold) | YES (quote must exist) | YES |

**QD-6 hold:** The supplier_quotes flag must be lifted before a full E2E activation of the MC
award flow is possible. The flags are independent gates, but the award flow requires a SUBMITTED
quote to exist, which in turn requires supplier_quotes to be enabled at time of quote submission.

**Activation sequence for future controlled QA retry:**
1. Enable `nc.procurement_pools.supplier_quotes.enabled` (requires explicit Paresh decision, QD-6 lift)
2. Enable `nc.procurement_pools.rfq.award.enabled`
3. Submit quote (existing VERIFIED path: POST .../quote → 201)
4. POST .../award-request (MAKER) → 202 PENDING_APPROVAL
5. POST .../award-approvals/:id/approve (CHECKER, different user) → 200 APPLIED

No flag changes are made in any implementation child packet without explicit Paresh authorization.

---

## §13 — Test Plan

### 13.1 Unit Tests (SERVICE packet)

| Test ID | Description | Expected |
|---|---|---|
| MC-SVC-01 | `requestAward` with valid MAKER → SM returns PENDING_APPROVAL → pending_approvals row created | 202, approval record returned |
| MC-SVC-02 | `requestAward` when duplicate pending exists → D-021-B unique violation | `AWARD_REQUEST_ALREADY_PENDING` error |
| MC-SVC-03 | `approveAward` with valid CHECKER (different from Maker) → SM returns APPLIED → quote ACCEPTED, others REJECTED | 200, AwardApproved |
| MC-SVC-04 | `approveAward` when maker=checker (same userId) → service rejects before SM call | `MAKER_CHECKER_SAME_ACTOR` error |
| MC-SVC-05 | `approveAward` when approval expired → service rejects | `APPROVAL_EXPIRED` error |
| MC-SVC-06 | `approveAward` when approval already APPROVED → service rejects | `APPROVAL_ALREADY_DECIDED` error |
| MC-SVC-07 | `approveAward` when target quote no longer SUBMITTED (race condition) → service rejects | `QUOTE_NO_LONGER_SUBMITTED` error |
| MC-SVC-08 | `rejectAwardApproval` → pending_approvals status=REJECTED, ApprovalSignature inserted | 200, approval REJECTED |
| MC-SVC-09 | `rejectAwardApproval` with expired approval → error | `APPROVAL_EXPIRED` |
| MC-SVC-10 | `requestAward` after a REJECTED approval → new pending_approvals row allowed | 202 (D-021-B partial index allows new REQUESTED after REJECTED) |

### 13.2 Integration Tests (ROUTE packet, using existing PRQ test pattern)

| Test ID | Description | Expected |
|---|---|---|
| MC-PRQ-01 | `POST .../award-request` while feature-disabled → 503 FEATURE_DISABLED | 503 |
| MC-PRQ-02 | `POST .../award-request` with valid body (feature enabled) → 202 | 202 |
| MC-PRQ-03 | `POST .../award-approvals/:id/approve` with same-user as Maker → 422 MAKER_CHECKER_SAME_ACTOR | 422 |
| MC-PRQ-04 | `POST .../award-approvals/:id/approve` with valid Checker → 200 APPLIED | 200 |
| MC-PRQ-05 | `POST .../award-approvals/:id/reject` with valid Checker → 200 REJECTED | 200 |
| MC-PRQ-06 | `GET .../award-approvals` → returns pending approval list | 200 |

### 13.3 Frontend Tests (FE extension packet)

To be defined in `TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001`. Must cover:
- `pending-approval` state render (no accept/reject buttons visible)
- "Request Award Approval" button triggers `requestAwardApproval()` → pending-approval state
- CHECKER "Approve" button triggers `approveAwardRequest()` → reload
- 202 response maps to `pending-approval` UI state

---

## §14 — Packet Decomposition

Implementation of this design is decomposed into the following child packets, to be opened in sequence:

### Packet 1: `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SCHEMA-001`
**Scope:** Schema verification and Prisma client readiness.

Deliverables:
1. Verify `pending_approvals` and `approval_signatures` tables are present in remote Supabase DB.
2. Verify Prisma client has `PendingApproval` and `ApprovalSignature` models generated.
3. Verify the partial unique index (`idx_pending_approvals_active_per_entity`) and DB trigger
   (`check_maker_checker_separation`) exist in remote DB.
4. If any of the above are absent: produce SQL to create them (as a psql-applied SQL file),
   run `prisma db pull`, `prisma generate`, restart server.
5. If all present: document as VERIFIED_COMPLETE with no changes needed.

**No source code changes if all schema objects are already present.**

**Allowlist (if changes needed):** `server/prisma/schema.prisma` (pull only),
a new `server/prisma/migrations/<timestamp>_verify_g021_objects/migration.sql` (if SQL needed).

---

### Packet 2: `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SERVICE-001`
**Scope:** Service layer — new methods in `networkPoolRfq.service.ts`.

Deliverables:
1. Refactor `acceptQuote()` to be the internal CHECKER completion transaction (or remove/rename).
2. Implement `requestAward()` — MAKER step. SM → PENDING_APPROVAL → INSERT pending_approvals.
3. Implement `approveAward()` — CHECKER step. Load approval → SM CHECKER call → award transaction.
4. Implement `rejectAwardApproval()` — CHECKER rejection.
5. Implement `getOwnerPendingAwardApprovals()` — list pending approvals for an RFQ.
6. Add new error classes: `AwardRequestAlreadyPendingError`, `ApprovalExpiredError`,
   `MakerCheckerSameActorError`, `ApprovalAlreadyDecidedError`, `QuoteNoLongerSubmittedError`.
7. Add new DTOs: `RequestAwardInput`, `ApproveAwardInput`, `RejectAwardApprovalInput`,
   `AwardApprovalRequest`, `AwardApproved`, `AwardRejected`.
8. Unit tests (MC-SVC-01 through MC-SVC-10).

**Allowlist:** `server/src/services/networkPoolRfq.service.ts`, new test file.

---

### Packet 3: `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001`
**Scope:** Route layer — new endpoints in `server/src/routes/tenant/poolRfq.ts`.

Deliverables:
1. `POST .../award-request` → `requestAward` service method.
2. `POST .../award-approvals/:approvalId/approve` → `approveAward`.
3. `POST .../award-approvals/:approvalId/reject` → `rejectAwardApproval`.
4. `GET .../award-approvals` → `getOwnerPendingAwardApprovals`.
5. Maintain existing `POST .../accept` as deprecated shim or remove (decision in ROUTE packet).
6. Integration tests (MC-PRQ-01 through MC-PRQ-06) added to existing PRQ test suite.
7. Production verification: confirm routes return correct feature-disabled 503 before flag activation.

**Allowlist:** `server/src/routes/tenant/poolRfq.ts`, existing PRQ test file.

---

### Packet 4: `TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001`
**Scope:** Frontend — QuoteReviewPanel MC-aware UI.

Deliverables:
1. New `pending-approval` UI state in `QuoteReviewPanel.tsx`.
2. Rename "Accept" button to "Request Award Approval"; wire to `requestAwardApproval()` service function.
3. New `QuoteCheckerPanel` component (or inline in QuoteReviewPanel) for CHECKER flow.
4. New service functions in `networkCommerceService.ts`: `requestAwardApproval`, `approveAwardRequest`,
   `rejectAwardRequest`, `getPendingAwardApprovals`.
5. New TypeScript interfaces: `AwardApprovalRequest`, `AwardApproved`.
6. Frontend tests (see §13.3).
7. Production verification (feature-disabled state confirmed in production before flag activation).

**Allowlist:** `components/Tenant/NetworkCommerce/QuoteReviewPanel.tsx`,
`services/networkCommerceService.ts`, new test file.

**Prerequisite:** `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001` VERIFIED_COMPLETE.

---

### Packet 5: `TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001`
**Scope:** Controlled QA activation — end-to-end verification of the MC award flow.

Deliverables:
1. Lift QD-6 (supplier_quotes.enabled) — requires explicit Paresh authorization.
2. Enable `nc.procurement_pools.rfq.award.enabled`.
3. Submit quote (MAKER): `POST .../quote` → 201.
4. Request award (MAKER): `POST .../award-request` → 202 PENDING_APPROVAL.
5. Approve award (CHECKER, different user): `POST .../award-approvals/:id/approve` → 200 APPLIED.
6. Verify pool → ACCEPTED, quote → ACCEPTED, other quotes → REJECTED, RFQ → ACCEPTED.
7. Restore flags to `false`.
8. Document as VERIFIED_COMPLETE.

**Prerequisite:** Packets 1–4 all VERIFIED_COMPLETE. Explicit Paresh authorization for QD-6 lift.

---

## §15 — Explicit Non-Decisions

The following questions were considered in this design but are deliberately NOT resolved here.
Each requires an explicit product decision before implementation.

### 15.1 Expiry Duration for Pending Approvals

This design specifies `expiresAt = now() + 72h` as a placeholder. The actual expiry window
is a product decision. Considerations: operational latency in multi-admin tenants, weekends,
time zones. The SERVICE packet should expose this as a configurable constant.

### 15.2 Single-Org MC Enforcement

In the current Phase 1 design, MAKER and CHECKER must be different users in the same
`org_id`. Whether a single-user tenant can self-approve (i.e., MC is effectively bypassed
for small organizations) is NOT addressed here. The `check_maker_checker_separation` DB
trigger enforces identity inequality at the principal fingerprint level. Any exception to
this rule requires explicit Paresh authorization and an explicit schema trigger modification.

### 15.3 Notification / Alerting

Whether to send an in-app notification, email, or webhook to the Checker when an award
request is pending is deferred to a future notification design packet. Phase 1 assumes
the Checker polls or is notified out-of-band.

### 15.4 PLATFORM_ADMIN as Checker

The `allowed_actor_type` seed includes `PLATFORM_ADMIN` for POOL QUOTED→ACCEPTED. Whether
`PLATFORM_ADMIN` may act as Checker for a tenant's award request (cross-realm MC) is a
product and security decision deferred to the SERVICE packet. The service should default to
enforcing that the CHECKER is a member of the same `org_id` unless the actor is
PLATFORM_ADMIN with explicit impersonation context.

### 15.5 Cancellation by Maker

`cancelAwardRequest()` is listed as optional in §6.4. Whether a MAKER can cancel their own
pending request is a product decision. If enabled, the pool returns to QUOTED state with no
SM transition (the first SM call that returned PENDING_APPROVAL left the pool in QUOTED).
A new `requestAward` call is valid after cancellation.

### 15.6 FE-10 Supplier-Side Visibility

FE-10 (supplier side — visibility into their quote outcome) remains `HOLD_FOR_PARESH_DECISION`
and is NOT impacted by this design. The supplier quote outcome notification is a separate packet.

---

## §16 — Design Decision Log

| ID | Decision | Rationale |
|---|---|---|
| DD-1 | Two-call G-021 split flow (Option C) is the design | SM already designed for it; pending_approvals exists; CHECKER in allowed_actor_type; no schema changes needed |
| DD-2 | `pending_approvals` table is reused as-is | Already in schema (TTP Foundation migration); all required fields present; no new model needed |
| DD-3 | Service creates `pending_approvals` row on MAKER call | SM comment explicitly states "caller creates the G-021 record" |
| DD-4 | CHECKER call passes `actorType: 'CHECKER'` and `makerUserId` to SM | This is the exact bypass condition in SM Step 13; `CHECKER` already in allowed_actor_type |
| DD-5 | `acceptQuote` is refactored (not patched in-place) | It currently has incorrect PENDING_APPROVAL handling; the MAKER and CHECKER steps need distinct methods |
| DD-6 | No change to `allowed_transitions` seed | The seed is correct; `CHECKER` already included; `requires_maker_checker=true` is governance intent |
| DD-7 | Service must check maker≠checker before SM call | SM does not enforce this; DB trigger is defense-in-depth only; service is primary enforcement |
| DD-8 | `frozenPayloadHash` is required for replay integrity | D-021-A: prevents payload tampering between MAKER and CHECKER steps |
| DD-9 | No new schema migration required for approval tables | G-021 tables already in schema and should be in remote DB (must verify in SCHEMA packet) |
| DD-10 | `rejectAwardApproval` does NOT trigger an SM transition | Pool remains in QUOTED state; the MAKER request returns PENDING_APPROVAL from SM which is a soft gate, not an applied transition |
