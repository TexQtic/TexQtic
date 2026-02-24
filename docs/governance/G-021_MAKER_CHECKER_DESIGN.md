# G-021 Maker–Checker Design

**Task ID:** G-021-DAY1-DESIGN  
**Wave:** 3 — Stabilization + Governance  
**Status:** Day 1 PASS / APPROVED — Day 2 AUTHORIZED with hardening directives D-021-A / D-021-B / D-021-C (2026-02-24)  
**Date:** 2026-02-24  
**Doctrine:** v1.4 + Addendum Draft v1  
**Prerequisite:** G-020 Day 3 PASS — `StateMachineService.transition()` returns `PENDING_APPROVAL` when
`allowed_transitions.requires_maker_checker = true`. Commit `9c3ca28`.  
**Hardening Directives (locked before Day 2 schema):**
- **D-021-A** — Frozen payload integrity hash: prevent "approve A, execute B" replay substitution (§10.1)
- **D-021-B** — Active request uniqueness covering `REQUESTED` + `ESCALATED` states (§10.2)
- **D-021-C** — Maker ≠ Checker enforced at DB level via trigger, not service-only (§10.3)

---

## 1. Terminology + Roles

### 1.1 Definitions

| Term | Definition |
|------|-----------|
| **Maker** | The principal who initiates a lifecycle transition request. The Maker is asserting that the business event occurred and that the transition is appropriate. The Maker does NOT have authority to finalize it alone when `requires_maker_checker = true`. |
| **Checker** | The second principal who independently reviews the Maker's transition request and either approves or rejects it. The Checker is the final authorization authority for the pending state. |
| **Approval Request** | A record in `pending_approvals` representing one pending Maker–Checker cycle for a specific entity + from/to transition. Created when `StateMachineService.transition()` returns `PENDING_APPROVAL`. |
| **Approval Signature** | An append-only record in `approval_signatures` representing one decision (APPROVE or REJECT) by a Checker. The signature is an immutable audit attribution event. |
| **Replay** | The act of re-submitting the original `TransitionRequest` to `StateMachineService.transition()` after approval is confirmed, with `actorType = 'CHECKER'` and `makerUserId` populated, so the log record is written. |
| **Frozen Payload** | The original `TransitionRequest` fields stored inside `pending_approvals` at creation time. Used to validate that the replay matches the original intent exactly. |
| **Approver (future alias)** | Multi-checker chain with quorum threshold (N-of-M). Deferred to G-021 Day 3. Not in scope for Day 1 or Day 2. |
| **Platform Admin Override** | A PLATFORM_ADMIN forcing a transition that would normally require Maker–Checker. This bypass is **only permitted** through an escalation record (G-022) — it is not a direct affordance of this service. |

---

### 1.2 Who Can Be Maker

| Realm | Eligible Actor Types | Notes |
|-------|---------------------|-------|
| Tenant realm | `TENANT_USER`, `TENANT_ADMIN`, `MAKER` | Must have non-null `actorUserId`. Must be a member of the org in context. |
| Platform realm | `PLATFORM_ADMIN` | Must have non-null `actorAdminId`. Only for cross-tenant or platform-level entities. |
| System | `SYSTEM_AUTOMATION` | **ALWAYS DISALLOWED as Maker** for any `requires_maker_checker = true` transition. SYSTEM_AUTOMATION may only perform non-decisional housekeeping; it does not submit requests requiring human sign-off. |
| AI | N/A | AI is not an actor type. AI may recommend; a human Maker submits with `aiTriggered = true` + `reason` containing `HUMAN_CONFIRMED:`. |

---

### 1.3 Who Can Be Checker

| Realm | Eligible Actor Types | Notes |
|-------|---------------------|-------|
| Tenant realm | `CHECKER`, `TENANT_ADMIN` | Must have non-null `actorUserId`. Must be a different principal than the Maker (same-person rule §6.1). |
| Platform realm | `PLATFORM_ADMIN` | Permitted checker for escalated or compliance transitions. Must have non-null `actorAdminId`. |
| System | `SYSTEM_AUTOMATION` | **PERMANENTLY DISALLOWED as Checker**. No automated approval of any kind. This is a constitutional rule (D-020-A + G-021 anti-abuse doctrine). |
| AI | N/A | **PERMANENTLY DISALLOWED**. AI cannot approve. AI cannot reject. See §6.3. |

---

### 1.4 Platform Admin Override Policy

A `PLATFORM_ADMIN` may override a stalled or rejected Maker–Checker approval **only if**:

1. A G-022 escalation record exists for the entity in question.
2. The escalation record has `status = 'OPEN'` and `escalation_level >= 2`.
3. The override is attributed to the admin's `actorAdminId` (not impersonation).
4. A reason is provided referencing the G-022 escalation ID.

This override path is implemented in G-022 scope, not G-021.

---

## 2. Approval Request Lifecycle

### 2.1 States

```
REQUESTED → APPROVED  → (replay → APPLIED in lifecycle logs)
          → REJECTED  → (Maker notified; may re-submit)
          → EXPIRED   → (TTL elapsed; equivalent to REJECTED for replay purposes)
          → CANCELLED → (Maker withdrew the request before Checker acted)
          → ESCALATED → (G-022 escalation triggered; Checker cannot act until resolved)
```

### 2.2 State Transition Table

| From State | To State | Triggered By | Conditions |
|------------|----------|--------------|-----------|
| `REQUESTED` | `APPROVED` | Checker | Checker signs with `decision = APPROVE`; Checker ≠ Maker; not expired |
| `REQUESTED` | `REJECTED` | Checker | Checker signs with `decision = REJECT`; Checker ≠ Maker; not expired |
| `REQUESTED` | `EXPIRED` | System job | `NOW() > expires_at`; no Checker action taken |
| `REQUESTED` | `CANCELLED` | Maker | Maker explicitly cancels; no Checker has signed yet |
| `REQUESTED` | `ESCALATED` | PLATFORM_ADMIN or G-022 engine | G-022 escalation record created for this entity; approval escalated to platform tier |
| `APPROVED` | — | — | Terminal — no outbound transitions |
| `REJECTED` | — | — | Terminal — Maker may create a NEW approval request (new record, incrementing `attempt_count`) |
| `EXPIRED` | — | — | Terminal — same re-submit policy as REJECTED |
| `CANCELLED` | — | — | Terminal |
| `ESCALATED` | `APPROVED` | PLATFORM_ADMIN via G-022 override | Escalation record resolved; override recorded |
| `ESCALATED` | `REJECTED` | PLATFORM_ADMIN via G-022 override | Escalation record closed with rejection |

---

### 2.3 TTL + Expiry Policy

| Transition Severity | Default TTL | Notes |
|--------------------|-------------|-------|
| Standard (severity 1–2) | 24 hours | Majority of TRADE release/confirmation transitions |
| High-risk (severity 3) | 4 hours | Covers SETTLEMENT_ACKNOWLEDGED, RELEASED for high-value |
| Compliance (severity 4) | 1 hour | Sanctions, compliance override transitions |
| Platform override | No TTL | Applies only when request is in ESCALATED state under G-022 |

TTL is computed from `created_at` + offset, stored in `expires_at` at creation time.  
Expiry is enforced by:
1. A scheduled system job that marks `REQUESTED` records with `NOW() > expires_at` as `EXPIRED`.
2. Defensive check in the `MakerCheckerService.approve()` method at read time (belt-and-suspenders).

---

### 2.4 Maximum Attempts

```
max_attempt_count = 3 (configurable per entity_type via G-021 Day 3 config table)
```

After 3 rejections/expirations for the same `(entity_id, from_state_key, to_state_key)` combination, the entity transitions to `ESCALATED` state automatically. G-022 takes over.

---

### 2.5 Idempotency Strategy

**Duplicate prevention rule:**  
At most **one** `pending_approvals` record may exist in `REQUESTED` state for a given
`(org_id, entity_type, entity_id, from_state_key, to_state_key)` combination at any time.

Implemented via:
- A **partial unique index** on `pending_approvals` (D-021-B — covers both active states to prevent contradictory approvals racing after escalation):
  ```sql
  CREATE UNIQUE INDEX pending_approvals_open_unique
    ON pending_approvals (org_id, entity_type, entity_id, from_state_key, to_state_key)
    WHERE status IN ('REQUESTED', 'ESCALATED');
  ```
- The `MakerCheckerService.createApprovalRequest()` method checks for an existing open request  
  **before** inserting and returns the existing request ID if found (with a flag `already_exists: true`).

---

## 3. Proposed Schema (Design Only)

> **⚠️ DESIGN ONLY — No SQL in this file. No migration created. Schema is for Day 2 review.**

---

### 3.A — `pending_approvals` Table

**Purpose:** One record per in-flight Maker–Checker request. Created when `StateMachineService.transition()` returns `PENDING_APPROVAL`.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK, `gen_random_uuid()` default |
| `org_id` | `UUID` | NOT NULL | RLS anchor. Must match `current_setting('app.org_id')` on tenant writes. |
| `entity_type` | `TEXT` | NOT NULL | `CHECK (entity_type IN ('TRADE','ESCROW','CERTIFICATION'))` |
| `entity_id` | `UUID` | NOT NULL | Soft reference to the entity. No FK until G-017/G-018. |
| `from_state_key` | `TEXT` | NOT NULL | Snapshot of the `fromStateKey` at request time (immutable after insert). |
| `to_state_key` | `TEXT` | NOT NULL | Snapshot of the `toStateKey` at request time (immutable after insert). |
| `requested_by_user_id` | `UUID` | NULLABLE | FK → `auth.users`. Null if Maker is a PLATFORM_ADMIN. |
| `requested_by_admin_id` | `UUID` | NULLABLE | FK → `admins.id`. Null if Maker is a tenant user. |
| `requested_by_actor_type` | `TEXT` | NOT NULL | `CHECK (requested_by_actor_type IN ('TENANT_USER','TENANT_ADMIN','PLATFORM_ADMIN','MAKER'))` |
| `requested_by_role` | `TEXT` | NOT NULL | Role snapshot at Maker request time. |
| `request_reason` | `TEXT` | NOT NULL | Maker's justification. Immutable after insert. |
| `frozen_payload` | `JSONB` | NOT NULL | Full `TransitionRequest` (minus secrets) frozen at creation time. Used to validate replay. |
| `frozen_payload_hash` | `TEXT` | NOT NULL | **D-021-A.** Deterministic SHA-256 hex of the canonical hash input (see §10.1). Computed at insert by `MakerCheckerService.createApprovalRequest()`. Never updated. Replay validator recomputes and compares — mismatch is a hard deny. |
| `maker_principal_fingerprint` | `TEXT` | NOT NULL | **D-021-C.** Opaque string `"{requested_by_actor_type}:{requested_by_user_id ?? requested_by_admin_id}"` computed at insert. Stored for DB-trigger comparison against the Checker signer — prevents Maker = Checker at DB level even if service is bypassed. |
| `status` | `TEXT` | NOT NULL | `CHECK (status IN ('REQUESTED','APPROVED','REJECTED','EXPIRED','CANCELLED','ESCALATED'))`. Default `'REQUESTED'`. |
| `attempt_count` | `INT` | NOT NULL | Monotonic counter of how many times this `(entity_id, from→to)` has been rejected/expired. Default `1`. |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Computed at insert = `created_at + TTL` based on severity level. |
| `escalation_id` | `UUID` | NULLABLE | FK → G-022 `escalation_records.id`. Set when status becomes `ESCALATED`. |
| `impersonation_id` | `UUID` | NULLABLE | FK → `impersonation_sessions.id` if request was made during impersonation. |
| `ai_triggered` | `BOOLEAN` | NOT NULL | `DEFAULT FALSE`. Copied from `TransitionRequest.aiTriggered`. |
| `request_id` | `TEXT` | NULLABLE | Fastify request ID correlation. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `DEFAULT NOW()`. Immutable. |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `DEFAULT NOW()`. Updated on status change. |

**Constraints:**
```
-- Principal exclusivity (exactly one of user/admin, or neither for machine actors)
CONSTRAINT pending_approvals_principal_exclusivity
  CHECK (
    (requested_by_user_id IS NOT NULL AND requested_by_admin_id IS NULL)
    OR (requested_by_user_id IS NULL AND requested_by_admin_id IS NOT NULL)
  )

-- Prevent SYSTEM_AUTOMATION from being a Maker on requires_maker_checker transitions
CONSTRAINT pending_approvals_no_system_maker
  CHECK (requested_by_actor_type NOT IN ('SYSTEM_AUTOMATION'))

-- D-021-A: frozen_payload_hash must be non-empty (length guard; content validated at service layer)
CONSTRAINT pending_approvals_hash_nonempty
  CHECK (char_length(frozen_payload_hash) = 64)  -- SHA-256 hex = 64 chars

-- D-021-B: One active request per entity+transition — covers REQUESTED and ESCALATED
CREATE UNIQUE INDEX pending_approvals_open_unique
  ON pending_approvals (org_id, entity_type, entity_id, from_state_key, to_state_key)
  WHERE status IN ('REQUESTED', 'ESCALATED');

-- D-021-C: maker_principal_fingerprint must be non-empty (content validated by trigger on approval_signatures)
CONSTRAINT pending_approvals_fingerprint_nonempty
  CHECK (char_length(maker_principal_fingerprint) > 0)
```

**RLS Policy (design intent):**
```
-- Tenant context: read own org's records only
USING (org_id = current_setting('app.org_id')::uuid)

-- Tenant context: insert into own org only
WITH CHECK (org_id = current_setting('app.org_id')::uuid)

-- Platform admins: bypass RLS through service role (SECURITY DEFINER function)
-- to read across orgs for the Control Plane queue (§7.1)
```

**Immutability triggers (design intent):**
- `from_state_key`, `to_state_key`, `frozen_payload`, `frozen_payload_hash`, `maker_principal_fingerprint`, `request_reason`, `requested_by_*`, `created_at` are immutable after insert (trigger raises `P0001` on UPDATE of these columns).
- `status`, `updated_at`, `escalation_id` are the only mutable columns.

---

### 3.B — `approval_signatures` Table

**Purpose:** Append-only audit log of Checker decisions. One record per APPROVE/REJECT action. Never updated or deleted.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK, `gen_random_uuid()` |
| `approval_id` | `UUID` | NOT NULL | FK → `pending_approvals.id`. Indexed. |
| `org_id` | `UUID` | NOT NULL | Copied from `pending_approvals.org_id`. Indexed for RLS. |
| `signer_user_id` | `UUID` | NULLABLE | FK → `auth.users`. Null if Checker is PLATFORM_ADMIN. |
| `signer_admin_id` | `UUID` | NULLABLE | FK → `admins.id`. Null if Checker is a tenant user. |
| `signer_actor_type` | `TEXT` | NOT NULL | `CHECK (signer_actor_type IN ('CHECKER','TENANT_ADMIN','PLATFORM_ADMIN'))` — SYSTEM_AUTOMATION and AI are explicitly excluded |
| `signer_role` | `TEXT` | NOT NULL | Role snapshot at time of signature. |
| `decision` | `TEXT` | NOT NULL | `CHECK (decision IN ('APPROVE','REJECT'))` |
| `reason` | `TEXT` | NOT NULL | Checker's stated reason. Non-empty. |
| `impersonation_id` | `UUID` | NULLABLE | If signature was made during impersonation session. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `DEFAULT NOW()`. Immutable. |

**Constraints:**
```
-- Checker principal exclusivity
CONSTRAINT approval_signatures_principal_exclusivity
  CHECK (
    (signer_user_id IS NOT NULL AND signer_admin_id IS NULL)
    OR (signer_user_id IS NULL AND signer_admin_id IS NOT NULL)
  )

-- No SYSTEM_AUTOMATION or AI as signer (belt-and-suspenders at DB layer)
CONSTRAINT approval_signatures_no_system_signer
  CHECK (signer_actor_type NOT IN ('SYSTEM_AUTOMATION', 'TENANT_USER'))

-- D-021-C: Maker ≠ Checker at DB level — AFTER INSERT trigger (design intent, SQL in Day 2)
-- Trigger name: check_maker_checker_separation
-- Logic:
--   1. SELECT maker_principal_fingerprint INTO v_maker_fp
--      FROM pending_approvals WHERE id = NEW.approval_id;
--   2. v_signer_fp := NEW.signer_actor_type || ':' ||
--        COALESCE(NEW.signer_user_id::text, NEW.signer_admin_id::text);
--   3. IF v_signer_fp = v_maker_fp THEN
--        RAISE EXCEPTION 'MAKER_CHECKER_SAME_PRINCIPAL'
--          USING ERRCODE = 'P0002';
--      END IF;
-- This trigger fires on every INSERT into approval_signatures,
-- independently of the service layer.
```

**Immutability triggers (design intent):**
- ALL columns are immutable after insert. An `AFTER UPDATE OR DELETE` trigger raises `P0001` for any modification — same pattern as `trade_lifecycle_logs` immutability trigger from G-020 Day 2.
- No `updated_at` column — immutability means there is nothing to update.

**RLS Policy (design intent):**
```
ENABLE ROW LEVEL SECURITY;
FORCE ROW LEVEL SECURITY;

-- Read: own org only
USING (org_id = current_setting('app.org_id')::uuid)

-- Insert: own org only
WITH CHECK (org_id = current_setting('app.org_id')::uuid)

-- DELETE: never (blocked by trigger before RLS even applies)
```

---

## 4. Enforcement Strategy

### 4.1 Options Evaluated

| Strategy | Pros | Cons |
|----------|------|------|
| **DB-enforced only** | Bypass-proof even if service layer is miscalled | Requires complex trigger logic reading across tables; harder to surface clean error messages; trigger fires after RLS which complicates testing |
| **Service-enforced only** | Clean error messages; fully testable; no DB trigger complexity | A direct DB write bypassing the service could skip checks |
| **Hybrid (recommended)** | Service provides clean UX errors; DB is a final hard backstop | Slightly more surface area to maintain |

### 4.2 Recommended: Hybrid Enforcement

**Layer 1 — Service enforcement (`MakerCheckerService`, G-021 Day 2 scope):**
- Checks `pending_approvals` state before writing `approval_signatures`.
- Enforces Maker ≠ Checker at service layer.
- Enforces TTL at service layer (checks `expires_at`).
- Validates `frozen_payload` against incoming replay request before allowing CHECKER replay into `StateMachineService.transition()`.
- Returns structured errors (not DB exceptions) for all violation scenarios.

**Layer 2 — DB hard stops:**
- `CHECK` constraint: `signer_actor_type NOT IN ('SYSTEM_AUTOMATION', 'TENANT_USER')` on `approval_signatures`.
- `CHECK` constraint: `requested_by_actor_type NOT IN ('SYSTEM_AUTOMATION')` on `pending_approvals`.
- Immutability trigger: blocks UPDATE/DELETE on `approval_signatures` (same P0001 pattern as lifecycle logs).
- Partial unique index: prevents duplicate open requests.

**Layer 3 — RLS:**
- `org_id` scoping at Postgres level — cross-tenant reads are blocked even if service logic fails.

### 4.3 Bypass Guarantees

| Bypass Attempt | Mitigated By |
|---------------|-------------|
| SYSTEM_AUTOMATION as Checker | DB CHECK + service actorType guard |
| AI as Checker | DB CHECK (no AI actor type exists in schema) + service guard |
| Maker = Checker (same UUID) | Service: `MakerCheckerService.approve()` same-principal check; **D-021-C:** `AFTER INSERT` trigger on `approval_signatures` compares `maker_principal_fingerprint` vs computed signer fingerprint — fires independently of service layer, raises `P0002` |
| Expired approval signed | Service-layer `expires_at` check; DB doesn't block on expiry alone |
| Replay without approval | `StateMachineService.transition()` CHECKER completion path requires `makerUserId != null`; `MakerCheckerService` provides `makerUserId` only after confirming approval record is `APPROVED` |
| Cross-tenant approval | RLS on both tables (`org_id` anchor) |
| Direct DB write to lifecycle log | Would skip `pending_approvals` check; mitigated by requiring CHECKER replay path to go through `MakerCheckerService` which calls `StateMachineService.transition()` with validated `makerUserId` |

---

## 5. Integration Contract with G-020

### 5.1 Runtime Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Step 1: Maker submits transition                                           │
│  Route / Service calls: StateMachineService.transition(req)                │
│  req.actorType = 'MAKER' | 'TENANT_USER' | 'TENANT_ADMIN'                  │
│  req.makerUserId = null (not yet a CHECKER flow)                           │
│                                                                             │
│  StateMachineService finds allowed_transition.requires_maker_checker = true│
│  → Returns: { status: 'PENDING_APPROVAL', requiredActors: ['MAKER','CHECKER'], ... } │
└────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Step 2: Caller creates pending approval record                               │
│  MakerCheckerService.createApprovalRequest({                                  │
│    originalRequest: req,          ← full TransitionRequest                    │
│    orgId: req.orgId,                                                          │
│    entityType: req.entityType,                                                │
│    entityId: req.entityId,                                                    │
│    fromStateKey: req.fromStateKey,                                            │
│    toStateKey: req.toStateKey,                                                │
│    requestedByUserId: req.actorUserId,                                        │
│    requestedByAdminId: req.actorAdminId,                                      │
│    requestedByActorType: req.actorType,                                       │
│    requestedByRole: req.actorRole,                                            │
│    requestReason: req.reason,                                                 │
│    frozenPayload: req,            ← full snapshot                             │
│    aiTriggered: req.aiTriggered ?? false,                                     │
│    impersonationId: req.impersonationId ?? null,                              │
│    requestId: req.requestId ?? null,                                          │
│  }) → returns: { approvalId: UUID, status: 'REQUESTED' }                     │
└──────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Step 3: Checker reviews and decides                                       │
│  MakerCheckerService.approve({                                             │
│    approvalId: UUID,                                                       │
│    orgId: UUID,                                                            │
│    decision: 'APPROVE' | 'REJECT',                                        │
│    reason: string,                                                         │
│    signerActorType: 'CHECKER' | 'TENANT_ADMIN' | 'PLATFORM_ADMIN',        │
│    signerUserId: UUID | null,                                              │
│    signerAdminId: UUID | null,                                             │
│    signerRole: string,                                                     │
│    impersonationId: UUID | null,                                           │
│  })                                                                        │
│                                                                            │
│  Service enforces:                                                         │
│  - approval record is REQUESTED (not expired/cancelled)                   │
│  - signer ≠ maker (same-principal rule §6.1)                              │
│  - signer actor type is permitted for Checker role                        │
│  - approval is not expired (checks expires_at)                            │
│                                                                            │
│  Writes: approval_signatures record (APPROVE or REJECT)                   │
│  Updates: pending_approvals.status → 'APPROVED' | 'REJECTED'             │
└───────────────────────────────────────────────────────────────────────────┘
          │
          ▼ (if APPROVED only)
┌────────────────────────────────────────────────────────────────────────────┐
│  Step 4: System replays the original transition (CHECKER completion)       │
│  MakerCheckerService internally calls:                                     │
│  StateMachineService.transition({                                          │
│    ...frozenPayload,              ← fields from frozen snapshot            │
│    actorType: 'CHECKER',         ← overrides original actor type          │
│    actorUserId: signerUserId,    ← Checker's user ID                      │
│    actorAdminId: signerAdminId,  ← Checker's admin ID (if platform)       │
│    actorRole: signerRole,        ← Checker's role snapshot                │
│    makerUserId: frozenPayload.actorUserId ?? frozenPayload.actorAdminId,  │
│    checkerUserId: signerUserId,                                            │
│    reason: `CHECKER_APPROVAL:${approvalId} | ${reason}`,                  │
│    requestId: newRequestId,      ← new correlation ID for the replay      │
│  })                                                                        │
│                                                                            │
│  StateMachineService detects:                                              │
│  - allowedTransition.requiresMakerChecker = true                          │
│  - req.actorType === 'CHECKER' && req.makerUserId != null                 │
│  → CHECKER completion path: proceeds to Step 15 (log write)               │
│  → Returns: { status: 'APPLIED', transitionId: UUID, ... }               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Frozen Payload Contract

The `frozen_payload` JSONB column stores the original `TransitionRequest` fields. Its purpose is to allow the replay validator to confirm the Checker is approving the exact original request — not a modified or substituted one.

**Fields stored in `frozen_payload`:**

```typescript
// Stored at pending_approvals creation time
type FrozenTransitionPayload = {
  entityType: EntityType;       // 'TRADE' | 'ESCROW' | 'CERTIFICATION'
  entityId: string;             // entity UUID
  orgId: string;                // org UUID
  fromStateKey: string;         // normalized (uppercase)
  toStateKey: string;           // normalized (uppercase)
  requestedByActorType: ActorType;
  requestedByRole: string;
  aiTriggered: boolean;
  impersonationId: string | null;
  // NOT stored: reason (Checker provides their own reason), actorUserId, actorAdminId
  // (Checker's identity replaces Maker's in the replay)
};
```

**Replay validation rules:**
1. `entityType`, `entityId`, `orgId`, `fromStateKey`, `toStateKey` in replay request must exactly match `frozen_payload`.
2. The `pending_approvals.status` must be `'APPROVED'` before replay is allowed.
3. The replay is issued internally by `MakerCheckerService` — it is **never exposed as a direct caller API** (no route calls `StateMachineService.transition()` directly with CHECKER actor type without going through `MakerCheckerService`).
4. The replay `reason` is constructed as `CHECKER_APPROVAL:{approvalId} | {checker_reason}` — preserving the `approvalId` correlation in the lifecycle log record.

---

### 5.3 Idempotency Key for Replay

The `request_id` field on the replay `TransitionRequest` is set to:

```
replay:{approvalId}:{signerUserId ?? signerAdminId}
```

This makes the replay traceable back to the approval record in all log correlation queries.

---

## 6. Anti-Abuse + Constitutional Rules

### 6.1 Maker ≠ Checker (Same Principal Rule)

**Rule:** The principal who submitted the transition request (Maker) **must not** be the same principal who approves it (Checker).

**Enforcement points:**
- `MakerCheckerService.approve()`: Compares `signer_user_id` vs `requested_by_user_id` AND `signer_admin_id` vs `requested_by_admin_id` before writing the signature.
- If either pair matches → reject with code `MAKER_CHECKER_SAME_PRINCIPAL` (error code defined in G-021 Day 2 service layer).
- **D-021-C — DB-level trigger:** An `AFTER INSERT` trigger on `approval_signatures` (`check_maker_checker_separation`) computes the signer fingerprint as `signer_actor_type:COALESCE(signer_user_id, signer_admin_id)` and compares it against `pending_approvals.maker_principal_fingerprint` fetched by `approval_id`. A match raises `P0002 'MAKER_CHECKER_SAME_PRINCIPAL'`. This fires independently of the service layer — a direct DB write bypassing `MakerCheckerService` cannot circumvent this check. See §10.3 for full trigger design.

**Edge case — impersonation:**  
If a PLATFORM_ADMIN is impersonating a tenant user and submits as Maker, they **cannot** exit impersonation and approve as Checker with their own admin identity. The `impersonation_id` on the `pending_approvals` record is used to detect this. When `impersonation_id IS NOT NULL`, the checker's `actorAdminId` is compared against the impersonating admin ID in the impersonation session record — if they match, the approval is rejected.

---

### 6.2 Impersonation Cannot Self-Approve

**Rule:** If an admin created the approval request while impersonating a tenant user, that same admin cannot approve the request (whether via impersonation or directly).

**Enforcement:** `MakerCheckerService.approve()` fetches the `impersonation_sessions` record referenced by `pending_approvals.impersonation_id`. The impersonating admin's ID is extracted and compared against the signer's `actorAdminId`. Match → rejection.

**Exception — documented:** If a different PLATFORM_ADMIN (with no relation to the Maker session) acts as Checker, this is permitted. The check is identity-based, not role-based.

---

### 6.3 AI Cannot Approve

**Rule:** AI systems may not submit or sign approval requests of any kind.

**Enforcement:**
- `approval_signatures.signer_actor_type` has a DB-level `CHECK` constraint that excludes all actor types that AI could operate under. Since AI always operates with a human principal carrying `aiTriggered = true`, the human is the signer — AI is never the `signer_actor_type`.
- No service path exists for AI to call `MakerCheckerService.approve()` directly.
- Even if `aiTriggered = true` is set on the replay `TransitionRequest`, the `actorType` is `'CHECKER'` (a human role) and the `signer_user_id` is a human UUID. AI recommendation is noted in the log; AI does not hold the decision authority.

---

### 6.4 Platform Admin Override Requires G-022

**Rule:** A PLATFORM_ADMIN cannot directly bypass a stalled approval request without going through G-022 escalation. There is no "admin shortcut" in this service.

**Enforcement:** `MakerCheckerService` does not expose any method that allows skipping `pending_approvals` status checks based on `actorAdminId` alone. Override is implemented in G-022 scope by creating an escalation record and using the ESCALATED → APPROVED path (§2.2).

---

### 6.5 Approvals Are Org-Scoped — No Cross-Tenant

**Rule:** An approval request created in `org_id = X` can only be signed by a Checker operating in the same `org_id = X` context (or a PLATFORM_ADMIN operating with elevated scope via G-022).

**Enforcement:**
- RLS `USING (org_id = current_setting('app.org_id')::uuid)` on both tables.
- `MakerCheckerService.approve()` validates `approval.org_id === req.orgId` before proceeding.

---

### 6.6 Approval Requests Cannot Be Fabricated Post-Hoc

**Rule:** Approval records must be created synchronously when `StateMachineService.transition()` returns `PENDING_APPROVAL`. Backdated or fabricated approval records are blocked.

**Enforcement:**
- `pending_approvals.created_at DEFAULT NOW()` — not user-supplied.
- `frozen_payload` includes the original request timestamp context.
- The `expires_at` is computed server-side at insert time — a backdated creation would result in an already-expired record, blocking approval immediately.

---

## 7. UI/UX Contract (High Level)

### 7.1 Control Plane — Pending Approvals Queue

**Route/Surface:** `/control-plane/approvals`  
**Component (existing placeholder):** `components/ControlPlane/ComplianceQueue.tsx` (candidate for extension)

**Required capabilities:**

| Capability | Detail |
|-----------|--------|
| Filter by `entity_type` | TRADE / ESCROW / CERTIFICATION tabs |
| Filter by `status` | REQUESTED / ESCALATED (default view excludes terminal states) |
| Filter by `org_id` | Typeahead org search for platform admins |
| Filter by severity level | Derived from `allowed_transitions.severity_level` (needs join) |
| Approve action | Platform admin signs with reason; hits `MakerCheckerService.approve()` |
| Reject action | Same surface; decision = REJECT |
| View audit trail | Expands to show `approval_signatures` records for this `approval_id` |
| View frozen payload | Shows original transition request details (from/to state, entity type, Maker identity) |
| Expiry countdown | `expires_at - NOW()` shown as countdown badge |

**Data fetch strategy:** Platform admin hits a SECURITY DEFINER RPC that bypasses RLS to read all orgs' pending approvals. Tenant-scoped reads use normal RLS.

---

### 7.2 Tenant Admin Dashboard

**Route/Surface:** `/dashboard/approvals` (new tenant-scoped surface)

**Required capabilities:**

| Capability | Detail |
|-----------|--------|
| "Awaiting Approval" list | Shows REQUESTED records for this org ordered by `expires_at ASC` (most urgent first) |
| "My Requests" tab | Shows approvals submitted by the current user (`requested_by_user_id = current_user_id`) |
| Request cancellation | Maker cancels their own REQUESTED record (→ CANCELLED status). Only available when approval is still REQUESTED. |
| Expired badge | Grayed-out EXPIRED records visible in history but no actions available |
| Escalation notice | ESCALATED records show a notice that this has been sent to platform review |
| No approve/reject action for own requests | Maker cannot see the approve button on their own records (Maker ≠ Checker enforcement at UI layer too) |

---

### 7.3 Checker View (Tenant)

A Checker role user sees:

| Capability | Detail |
|-----------|--------|
| "Needs Your Approval" queue | REQUESTED records for this org where `requested_by_user_id ≠ current_user_id` |
| Approve with reason | Required reason input; calls `MakerCheckerService.approve()` |
| Reject with reason | Same form |
| Frozen payload view | Read-only view of what the Maker originally requested |
| No cancel action | Checkers cannot cancel — only Makers can |

---

## 8. Evidence + Acceptance Criteria

### 8.1 Core Invariants Checklist

| # | Invariant | Enforced By |
|---|-----------|------------|
| I-01 | Maker ≠ Checker (same UUID match blocked) | Service: `MakerCheckerService.approve()` |
| I-02 | SYSTEM_AUTOMATION cannot be Maker | DB CHECK on `pending_approvals.requested_by_actor_type` |
| I-03 | SYSTEM_AUTOMATION cannot be Checker | DB CHECK on `approval_signatures.signer_actor_type` + service guard |
| I-04 | AI cannot be Maker or Checker | DB CHECK (no AI actor type in schema) + service — `aiTriggered` is metadata only |
| I-05 | Expired approval cannot be signed | Service: `expires_at < NOW()` check before signature write |
| I-06 | No cross-tenant approval | RLS `org_id` anchor on both tables |
| I-07 | `frozen_payload` is immutable | DB trigger: P0001 on UPDATE of `frozen_payload` column |
| I-08 | `approval_signatures` are append-only | DB trigger: P0001 on any UPDATE or DELETE |
| I-09 | Replay must match frozen payload | Service: field-by-field validation before replay call |
| I-10 | Platform Admin override requires G-022 escalation record | Service: no override path exists in `MakerCheckerService` without escalation FK |
| I-11 | Replay payload cannot be substituted ("approve A, execute B" blocked) | D-021-A: `frozen_payload_hash` recomputed at replay; mismatch → hard deny before `StateMachineService.transition()` is called |
| I-12 | No two active approval requests for same entity+transition (including post-escalation) | D-021-B: partial unique index `WHERE status IN ('REQUESTED','ESCALATED')` raises 23505 on duplicate insert |
| I-13 | Maker ≠ Checker enforced at DB layer independently of service | D-021-C: `check_maker_checker_separation` trigger on `approval_signatures` raises `P0002` if fingerprints match |

---

### 8.2 Failure Mode Table

| Event | immediate effect | Side effect |
|-------|-----------------|-------------|
| Checker rejects | `pending_approvals.status → REJECTED`; `approval_signatures` record written | Maker notified (notification system TBD); `attempt_count` incremented on next re-submission |
| Approval expires (TTL elapsed) | System job sets `status → EXPIRED` | Same as rejected for business flow; Maker may re-submit; `attempt_count` incremented |
| Maker cancels | `pending_approvals.status → CANCELLED` | No signature written; entity remains in `fromStateKey`; Maker may re-submit fresh |
| 3rd rejection/expiry | Auto-escalate to G-022 | `status → ESCALATED`; `escalation_id` populated; G-022 engine takes over |
| Replay fails (StateMachine DENIED) | `MakerCheckerService.approve()` returns error to Checker's request; `pending_approvals` stays `APPROVED` | Replay can be retried up to N times (G-021 Day 3 config); if N exhausted → escalate |
| DB constraint violation (duplicate open request) | Partial unique index raises 23505 | `MakerCheckerService.createApprovalRequest()` catches and returns existing approval ID with `already_exists: true` |
| RLS violation (cross-tenant) | Postgres 42501 | Service catches and returns `CROSS_TENANT_DENIED` equivalent error |
| Impersonation same-principal try | Service rejection | Logged with impersonation audit record; no approval written |

---

### 8.3 Security Model Summary

| Layer | Mechanism | Tables Covered |
|-------|-----------|---------------|
| RLS | `org_id = current_setting('app.org_id')::uuid` USING + WITH CHECK | `pending_approvals`, `approval_signatures` |
| Immutability | Trigger: P0001 on UPDATE/DELETE | `approval_signatures` (all columns); `pending_approvals` (frozen columns) |
| Principal exclusivity | DB CHECK + service guard | Both tables |
| Actor type restriction | DB CHECK on `signer_actor_type`, `requested_by_actor_type` | Both tables |
| Idempotency | Partial unique index on open requests | `pending_approvals` |
| TTL enforcement | `expires_at` at insert + service check + system job | `pending_approvals` |
| Replay integrity | Frozen payload match validation | Service layer (no DB constraint) |
| Cross-tenant protection | RLS + service `orgId` param check | Both tables |
| Impersonation audit | `impersonation_id` FK + same-principal detection | `pending_approvals` |

---

## 9. Open Items + Deferrals

| Item | Deferred To | Notes |
|------|------------|-------|
| D-021-A: `frozen_payload_hash` column + SHA-256 computation in service | G-021 Day 2 | **LOCKED** — hash input defined in §10.1; column `TEXT NOT NULL CHECK(char_length=64)` |
| D-021-B: active request uniqueness `WHERE status IN ('REQUESTED','ESCALATED')` | G-021 Day 2 | **LOCKED** — partial unique index design final (§10.2); replaces Day 1 REQUESTED-only index |
| D-021-C: `maker_principal_fingerprint` column + `check_maker_checker_separation` trigger | G-021 Day 2 | **LOCKED** — trigger design in §10.3; SQL in Day 2 migration |
| `pending_approvals` SQL migration file | G-021 Day 2 | Design approved here; schema is provisional until SQL review |
| `approval_signatures` SQL migration file | G-021 Day 2 | Same |
| RLS policy SQL for both tables | G-021 Day 2 | Pattern: same as `trade_lifecycle_logs` immutability from G-020 Day 2 |
| Immutability triggers SQL | G-021 Day 2 | Pattern: reuse G-020 Day 2 `prevent_lifecycle_log_modification()` function |
| `MakerCheckerService` TypeScript implementation | G-021 Day 2 | Service skeleton only in Day 2; full integration in Day 3 |
| Prisma schema additions (`PendingApproval`, `ApprovalSignature` models) | G-021 Day 2 | After SQL is applied and `prisma db pull` run |
| System expiry job (marks REQUESTED → EXPIRED) | G-021 Day 3 | Scheduled via Fastify `@fastify/schedule` or external cron |
| Maximum attempts config table | G-021 Day 3 | Per entity_type configurable limit (default 3) |
| Multi-Checker quorum (N-of-M Approver chain) | G-021 Day 3 or G-021.1 | Not in scope for Day 1 or Day 2 |
| Notification system (Maker notified on reject/approve) | G-024 (TBD) | Out of scope for G-021 |
| Tenant dashboard UI implementation | Frontend sprint post-G-021 Day 2 | `components/Tenant/` — design contract captured in §7.2 |
| Control Plane queue UI implementation | Frontend sprint post-G-021 Day 2 | Extend `components/ControlPlane/ComplianceQueue.tsx` |
| G-022 escalation FK (`escalation_id`) | G-022 Day 1 | Column exists in design; FK added after `escalation_records` table is created |
| CERTIFICATION entity type in `pending_approvals` | G-023 Day 1 | CHECK constraint includes `'CERTIFICATION'` but CERTIFICATION approval flows are fully deferred |
| `pending_approvals → trades` FK hardening | G-017 Day N | Soft ref until trades table exists |
| `pending_approvals → escrow_accounts` FK hardening | G-018 Day N | Soft ref until escrow_accounts table exists |

---

---

## 10. Hardening Directives (D-021-A / D-021-B / D-021-C)

> These directives were issued after G-021 Day 1 constitutional review (2026-02-24).  
> Status: **LOCKED** — embedded into Day 2 migration + service before any SQL is written.

---

### 10.1 D-021-A — Frozen Payload Integrity Hash

**Threat:** An attacker or misconfigured service could retrieve an `APPROVED` pending_approval, then replay it against a *different* entity or transition than the one the Checker reviewed ("approve A, execute B").

**Mitigation:** A deterministic `frozen_payload_hash` (SHA-256 hex) is computed at `createApprovalRequest()` time and stored in `pending_approvals`. At replay time, `MakerCheckerService` recomputes the hash from the *actual* replay request parameters and compares. Mismatch → hard deny before `StateMachineService.transition()` is ever called.

**Canonical hash input (deterministic field order, no whitespace, all lowercase):**

```
INPUT = entity_type
      + "|" + entity_id                          (UUID, lowercase)
      + "|" + from_state_key                     (uppercase normalized)
      + "|" + to_state_key                       (uppercase normalized)
      + "|" + requested_by_actor_type            (uppercase)
      + "|" + (requested_by_user_id ?? requested_by_admin_id)  (UUID, lowercase)
      + "|" + requested_by_role                  (as-is, trimmed)
      + "|" + request_reason                     (trimmed, do NOT normalize — reason is part of intent)

HASH = SHA-256(INPUT).hexdigest()  // 64-character lowercase hex string
```

**Why `created_at` is excluded:** Including `created_at` would require replaying within the same millisecond clock, creating a fragile determinism dependency. The fields above are sufficient to uniquely and stably identify the approved intent.

**Service contract:**
- `createApprovalRequest()` computes and stores `frozen_payload_hash`.
- `approve()` (after marking status APPROVED) passes the hash to the replay path.
- Replay validation in `MakerCheckerService` recomputes hash from `frozenPayload` fields and compares. If `computedHash !== storedHash` → return `{ error: 'PAYLOAD_INTEGRITY_VIOLATION' }` and do NOT call `StateMachineService.transition()`.

**DB column:** `frozen_payload_hash TEXT NOT NULL CHECK(char_length(frozen_payload_hash) = 64)`

---

### 10.2 D-021-B — Active Request Uniqueness (REQUESTED + ESCALATED)

**Threat:** Multiple concurrent approval requests for the same `(org_id, entity_type, entity_id, from_state_key, to_state_key)` create ambiguity about which approval is authoritative, enable approval spam, and could produce contradictory log writes if two requests are approved concurrently.

**Day 1 design gap:** The Day 1 partial unique index only covered `status = 'REQUESTED'`. Once a request is escalated (`status = 'ESCALATED'`), a new REQUESTED request could be inserted for the same transition, creating two concurrent active records.

**Hardened constraint:**
```sql
CREATE UNIQUE INDEX pending_approvals_open_unique
  ON pending_approvals (org_id, entity_type, entity_id, from_state_key, to_state_key)
  WHERE status IN ('REQUESTED', 'ESCALATED');
```

**Behavioral contract:**
- A new approval request for a transition that already has `status = 'ESCALATED'` will fail with Postgres `23505` (unique_violation).
- `MakerCheckerService.createApprovalRequest()` catches `23505` and returns `{ alreadyExists: true, approvalId: existingId, status: existingStatus }` — the caller is informed and must not create a duplicate.
- To re-submit after escalation, the ESCALATED record must first be resolved (APPROVED or REJECTED) via G-022. Only then is the uniqueness slot freed.

---

### 10.3 D-021-C — Checker Separation Rule at DB Level

**Threat:** Service-layer-only enforcement of Maker ≠ Checker can be bypassed by:
- A future route that calls the DB directly without going through `MakerCheckerService`
- A misconfigured service that omits the check
- A migration hotfix that writes `approval_signatures` rows directly

**Mitigation:** A DB-level `AFTER INSERT` trigger on `approval_signatures` enforces the rule unconditionally.

**Column added to `pending_approvals`:**
```sql
maker_principal_fingerprint TEXT NOT NULL
  CHECK (char_length(maker_principal_fingerprint) > 0)
```

**Fingerprint computation (service, at `createApprovalRequest()` time):**
```
maker_principal_fingerprint = requested_by_actor_type + ":" + COALESCE(requested_by_user_id, requested_by_admin_id)::text

Examples:
  "TENANT_USER:a1b2c3d4-..."
  "PLATFORM_ADMIN:f9e8d7c6-..."
  "MAKER:a1b2c3d4-..."
```

**Trigger design (SQL in Day 2 migration):**
```sql
CREATE OR REPLACE FUNCTION check_maker_checker_separation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- must read pending_approvals across RLS
AS $$
DECLARE
  v_maker_fp  TEXT;
  v_signer_fp TEXT;
BEGIN
  SELECT maker_principal_fingerprint
    INTO v_maker_fp
    FROM public.pending_approvals
   WHERE id = NEW.approval_id;

  v_signer_fp := NEW.signer_actor_type || ':' ||
    COALESCE(NEW.signer_user_id::text, NEW.signer_admin_id::text);

  IF v_signer_fp = v_maker_fp THEN
    RAISE EXCEPTION 'MAKER_CHECKER_SAME_PRINCIPAL: signer % matches maker fingerprint on approval %',
      v_signer_fp, NEW.approval_id
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_maker_checker_separation
  AFTER INSERT ON public.approval_signatures
  FOR EACH ROW
  EXECUTE FUNCTION check_maker_checker_separation();
```

**Why `SECURITY DEFINER`:** The trigger must read `pending_approvals.maker_principal_fingerprint` to compare. Since `approval_signatures` inserts run in the Checker's RLS context (their `org_id`), and `pending_approvals` is also RLS-scoped, the same-org read should succeed. However, in platform-admin override scenarios (G-022), the Checker's RLS context may differ from the Maker's row. `SECURITY DEFINER` ensures the trigger can always read the parent row regardless of caller context.

**Error handling in service:** `MakerCheckerService.approve()` catches `P0002` and returns `{ error: 'MAKER_CHECKER_SAME_PRINCIPAL', code: 'DB_TRIGGER_VIOLATION' }` to the caller rather than propagating a raw DB exception.

---

*Document produced under SAFE-WRITE MODE — design only. No migrations. No schema edits. No service modifications.*  
*Day 1 Gate: PASS / CLOSED / APPROVED. Day 2 AUTHORIZED.*  
*Next action: G-021 Day 2 — SQL migration (pending_approvals + approval_signatures + triggers) + Prisma schema + MakerCheckerService skeleton.*  
*All three hardening directives (D-021-A / D-021-B / D-021-C) MUST be included in Day 2 migration. No partial migration permitted.*
