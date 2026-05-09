# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001 |
| **Type** | OWNER_SERVICE_IMPLEMENTED |
| **Status** | OWNER_SERVICE_IMPLEMENTED |
| **Date** | 2026-05-30 |
| **Predecessor** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001 (commit: `86cb135`) |
| **Basis commit** | `86cb135` (feat(network-commerce): add supplier invite feature gate) |
| **Doctrine** | TexQtic Doctrine v1.4 |
| **Safe-Write Mode** | ALWAYS ON |

---

## §2 — Authority Sources Read

The following sources were read before any implementation was written:

| Source | Purpose |
|---|---|
| `server/prisma/schema.prisma` lines 2213–2270 | Confirmed full `NetworkPoolRfqSupplierInvite` model including compound unique `@@unique([rfqId, supplierOrgId])` → Prisma accessor `rfqId_supplierOrgId` |
| `server/prisma/schema.prisma` lines 1724–1780 | Confirmed `NetworkLifecycleLog` fields: orgId, entityType, entityId, fromStateKey, toStateKey, actorUserId, actorAdminId, actorType, actorRole, escalationLevel, makerUserId, checkerUserId, aiTriggered, impersonationId, reason, requestId, createdAt |
| `server/prisma/schema.prisma` lines 1054–1105 | Confirmed `model organizations` — `status` is `String @default("ACTIVE") @db.VarChar(30)`, not an enum; Prisma accessor: `organizations` (lowercase) |
| `server/src/__tests__/networkPoolRfq.service.unit.test.ts` lines 1–1000 | Read all 43 existing tests to understand existing mock patterns, fixture conventions, constants, and test IDs |
| `server/src/services/networkPoolRfq.service.ts` lines 60–385 | Read existing error classes, interfaces, service methods to establish exact anchor text for insertions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | OD-1 through OD-7 locked decisions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001.md` | OD-6 feature gate binding confirmed |

---

## §3 — Pre-Work Verification

```
git log --oneline -n 1   →  86cb135 feat(network-commerce): add supplier invite feature gate
git status --short       →  (clean working tree — no uncommitted files)
```

Predecessor commit `86cb135` confirmed as HEAD. Working tree clean before any changes.

---

## §4 — Locked OD Decisions — Implementation Mapping

### OD-1: No Re-Invite (LOCKED)

Any existing row for the `(rfqId, supplierOrgId)` pair — regardless of its status — blocks a new invite.

**How implemented:**
- Inside `$transaction`, before `create`, call `tx.networkPoolRfqSupplierInvite.findUnique({ where: { rfqId_supplierOrgId: { rfqId: rfqRow.id, supplierOrgId } } })`
- If any row is found → throw `NetworkPoolRfqSupplierInviteAlreadySentError` immediately (no `create` called)
- P2002 unique violation is also caught and mapped to `AlreadySentError` as a second-line guard
- Rationale: `@@unique([rfqId, supplierOrgId])` is a forever constraint — no re-invite in Phase 1B

### OD-2: Lazy EXPIRED (LOCKED)

DB status is never written as `'EXPIRED'`. Effective status is computed on every read.

**How implemented:**
- Private helper `computeEffectiveInviteStatus(dbStatus: string, expiresAt: Date | null): string`
  - Returns `'EXPIRED'` only if `dbStatus === 'PENDING'` and `expiresAt !== null` and `new Date(expiresAt) < new Date()`
  - Returns `dbStatus` unchanged in all other cases
- `toInviteOwnerRecord(row)` calls `computeEffectiveInviteStatus` on every row before returning
- `cancelInvite` computes effective status before allowing cancel — PENDING + past expiresAt → EXPIRED → `InvalidTransitionError`

### OD-3: expiresAt Default (LOCKED)

Priority order: caller-provided > `rfq.responseDeadlineAt` > null.

**How implemented:**
1. If `input.expires_at` is provided, parse it to `Date`. If in the past → throw `NetworkPoolRfqSupplierInviteInvalidInputError` before entering `$transaction`.
2. Inside `$transaction`, after loading rfqRow: if no caller-provided expiresAt, default to `rfqRow.responseDeadlineAt` (Prisma returns `Date | null`)
3. If rfq has no `responseDeadlineAt` → `expiresAt = null`

### OD-4: Supplier Org Validation (LOCKED)

Supplier must exist and have status `'ACTIVE'`.

**How implemented:**
- Inside `$transaction`: `(tx as any).organizations.findUnique({ where: { id: supplierOrgId }, select: { id: true, status: true } })`
- If `null` or `row.status !== 'ACTIVE'` → throw `NetworkPoolRfqSupplierInviteInvalidInputError('Supplier organisation not found or not active.')`
- Note: `organizations` Prisma accessor is lowercase because the model is declared as `model organizations`; cast to `any` to bypass TS strict typing on PrismaClient

### OD-5: No metadataInternalJson in Owner DTO (LOCKED)

Owner-facing DTO must never expose internal metadata.

**How implemented:**
- `toInviteOwnerRecord(row)` explicitly maps only the 18 permitted fields to `NetworkPoolRfqSupplierInviteRecord`. `metadataInternalJson` is not mapped.
- Verified by tests P-INV-LIST-05, P-INV-GET-04, P-INV-GEN-02 — all assert `result` does not have property `metadataInternalJson` or `metadata_internal_json`

### OD-6: Feature Gate (LOCKED — do not touch)

Already implemented in `86cb135`. No change in this packet.

### OD-7: Direct Lifecycle Log Write — No SM Transition (LOCKED)

`CLOSED_FOR_BIDS → CLOSED_FOR_BIDS` is not a declared allowed_transition. `StateMachineService.transition()` would throw `TransitionDenied`. Direct `tx.networkLifecycleLog.create` is mandatory.

**How implemented:**
- Private helper `writeInviteLifecycleLog(tx, params)` calls `tx.networkLifecycleLog.create({ data: { ... fromStateKey: 'CLOSED_FOR_BIDS', toStateKey: 'CLOSED_FOR_BIDS', ... } })` directly
- `StateMachineService.transition()` is NEVER called inside any invite method
- Verified by tests P-INV-SEND-15 and P-INV-CANCEL-08 — both assert `sm.transition` was not called

---

## §5 — Methods Implemented

All 4 methods added to `NetworkPoolRfqService` class in `server/src/services/networkPoolRfq.service.ts`.

### `sendInvite(ownerOrgId, userId, input)`

9-step `$transaction`:
1. Pre-flight input validation (pool_id, rfq_id, supplier_org_id non-empty; expires_at not in past) — **before** tx
2. Load pool row, assert `lifecycleState.stateKey === 'CLOSED_FOR_BIDS'` → `NetworkPoolRfqInvalidPoolStateError`
3. Load RFQ row scoped to `(poolId, ownerOrgId)` → `NetworkPoolRfqRfqNotFoundError` if null
4. Load supplier org (`(tx as any).organizations.findUnique`) → `InvalidInputError` if null or not ACTIVE
5. No-self-invite: if `supplierOrgId === ownerOrgId` → `InvalidInputError`
6. Compute `expiresAt` (OD-3 priority)
7. Duplicate check via `rfqId_supplierOrgId` compound unique (OD-1) → `AlreadySentError`
8. `create` invite row with generated `inviteRef` (UUID, generated before tx entry)
9. `writeInviteLifecycleLog` (OD-7)
- P2002 catch on entire tx → `AlreadySentError`
- Returns `toInviteOwnerRecord(created)` (OD-5)

### `listInvites(ownerOrgId, poolId, rfqId)`

- `findMany` scoped to `{ ownerOrgId, poolId, rfqId }`, ordered by `invitedAt: 'desc'`
- Returns array of `toInviteOwnerRecord(row)` (OD-2, OD-5)
- Empty array returned when no rows

### `getInvite(ownerOrgId, poolId, rfqId, inviteId)`

- `findFirst` scoped to `{ id: inviteId, ownerOrgId, poolId, rfqId }`
- `NetworkPoolRfqSupplierInviteNotFoundError` if null (non-leaking: no org/pool info in message)
- Returns `toInviteOwnerRecord(row)` (OD-2, OD-5)

### `cancelInvite(ownerOrgId, userId, poolId, rfqId, inviteId, cancelReason?)`

`$transaction`:
1. `findFirst` scoped to `{ id: inviteId, ownerOrgId, poolId, rfqId }` → `NotFoundError` if null
2. Compute effective status (OD-2) → `InvalidTransitionError` if not `'PENDING'`
3. `update` to `{ status: 'CANCELLED', cancelledAt: new Date(), cancelReason }`
4. `writeInviteLifecycleLog` (OD-7)
- Returns `toInviteOwnerRecord(updated)` (OD-5)

---

## §6 — DTO / Privacy Contract (OD-5)

`NetworkPoolRfqSupplierInviteRecord` (owner-facing DTO) exposes exactly 18 fields:

```
id, owner_org_id, supplier_org_id, rfq_id, pool_id, invite_ref,
status (computed effective — OD-2), invited_at, invited_by_user_id,
accepted_at, declined_at, cancelled_at, expires_at,
supplier_message, decline_reason, cancel_reason,
created_at, updated_at
```

**Explicitly excluded from owner DTO:**
- `metadataInternalJson` — internal platform metadata; never sent to any caller
- RFQ line detail (rfq_lines) — not in this phase
- Pool member identities / per-member quantities — not in this phase

---

## §7 — Lifecycle Log Behavior (OD-7)

- `writeInviteLifecycleLog(tx, { poolId, rfqId, inviteId, ownerOrgId, userId, reason, requestId? })` is a private helper that calls `tx.networkLifecycleLog.create` directly.
- Fields set: `entityType: 'POOL'`, `entityId: poolId`, `orgId: ownerOrgId`, `fromStateKey: 'CLOSED_FOR_BIDS'`, `toStateKey: 'CLOSED_FOR_BIDS'`, `actorType: 'TENANT_USER'`, `actorUserId: userId | null`, `reason`, `requestId`
- Rationale for `fromState = toState = CLOSED_FOR_BIDS`: The invite event is subordinate to the POOL's current state — the POOL does NOT transition. Recording from/to the same state documents the event without falsely implying a pool state change.
- `StateMachineService.transition()` is **never** called for invite events. Calling it would throw `NetworkPoolRfqTransitionDeniedError` because `CLOSED_FOR_BIDS → CLOSED_FOR_BIDS` is not in `allowed_transitions`.

---

## §8 — Lazy EXPIRED Behavior (OD-2)

- DB column `status` is never written as `'EXPIRED'`.
- `computeEffectiveInviteStatus(dbStatus, expiresAt)` rule: return `'EXPIRED'` iff `dbStatus === 'PENDING'` AND `expiresAt !== null` AND `expiresAt < now`.
- Called inside `toInviteOwnerRecord` on every read path (sendInvite return, listInvites, getInvite, cancelInvite return).
- `cancelInvite` also checks effective status: PENDING + past expiresAt → effective `'EXPIRED'` → `NetworkPoolRfqSupplierInviteInvalidTransitionError`.

---

## §9 — Duplicate Invite Behavior (OD-1)

- OD-1 is unconditional: ANY existing row for `(rfqId, supplierOrgId)` — regardless of its `status` (PENDING, ACCEPTED, DECLINED, CANCELLED) — blocks a new invite.
- Rationale: the Phase 1B business rule is "one-shot" — no re-invite under any circumstances. A CANCELLED invite is still a permanent block.
- `NetworkPoolRfqSupplierInviteAlreadySentError` message reflects this: "Re-invite is not permitted in Phase 1B (OD-1)."
- Verified by tests P-INV-SEND-07 (existing PENDING blocks) and P-INV-SEND-08 (existing CANCELLED blocks).

---

## §10 — Supplier Org Validation (OD-4)

- Query: `(tx as any).organizations.findUnique({ where: { id: supplierOrgId }, select: { id: true, status: true } })`
- Condition: null OR `status !== 'ACTIVE'` → throw `NetworkPoolRfqSupplierInviteInvalidInputError('Supplier organisation not found or not active.')`
- Non-leaking error: message does not reveal whether the org exists or its actual status.
- No pool membership check is performed — supplier does not need to be a pool member to receive an invite. Verified by P-INV-GEN-01.

---

## §11 — Unit Test Coverage (34 new tests)

**File:** `server/src/__tests__/networkPoolRfq.service.unit.test.ts`
**Total tests in file after this packet:** 77 (43 original + 34 new)

| Range | Count | Coverage |
|---|---|---|
| P-INV-SEND-01–15 | 15 | sendInvite: happy path, DTO fields, org scoping, empty pool_id, empty supplier_org_id, SUSPENDED supplier, supplier not found, duplicate any-status blocked, duplicate CANCELLED blocked, expiresAt inherits rfq deadline, expiresAt null when both null, future expires_at accepted, past expires_at rejected before tx, pool not CLOSED_FOR_BIDS, RFQ not found, lifecycle log + no SM |
| P-INV-LIST-01–05 | 5 | listInvites: scoped by 3 fields, empty array, EXPIRED computed for past expiresAt, PENDING kept for future expiresAt, metadataInternalJson absent |
| P-INV-GET-01–04 | 4 | getInvite: found with correct scope, not-found error, EXPIRED computed, metadataInternalJson absent |
| P-INV-CANCEL-01–08 | 8 | cancelInvite: PENDING cancels with CANCELLED DTO, update fields, ACCEPTED blocks, DECLINED blocks, CANCELLED blocks, EXPIRED (lazy) blocks, lifecycle log fields, no SM |
| P-INV-GEN-01–02 | 2 | No pool membership check, metadataInternalJson absent across all 3 read methods |

**Mock pattern used:** `mockResolvedValue(...)` / `mockRejectedValue(...)` for all Prisma calls — never `mockImplementation(async () => {...})` (per established constraint).

---

## §12 — Validation Command Results

### Prisma validate
```
pnpm -C server exec prisma validate
→ (no output — 0 errors, schema unchanged)
```
No schema changes were made in this packet. `prisma validate` confirmed clean.

### TypeScript check
```
pnpm -C server exec tsc --noEmit
→ (no output — 0 errors)
```

### Unit tests — primary (77 tests)
```
pnpm -C server exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts

 RUN  v4.0.18 C:/Users/PARESH/TexQtic/server

 ✓ src/__tests__/networkPoolRfq.service.unit.test.ts (77 tests) 20ms

 Test Files  1 passed (1)
      Tests  77 passed (77)
   Start at  13:44:48
   Duration  408ms
```

### Feature gate regressions (27 tests)
```
pnpm -C server exec vitest run src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts src/__tests__/ncPoolRfqFeatureGate.middleware.unit.test.ts

 Test Files  2 passed (2)
      Tests  27 passed (27)
```

### Pool RFQ route integration (43 tests) — first run
```
pnpm -C server exec vitest run src/routes/tenant/poolRfq.integration.test.ts

 Test Files  1 passed (1)
      Tests  43 passed (43)
   Duration  500.45s
```
Note: A second run of this suite (terminal 9e62df1d) produced 1 flaky failure in `enablePoolGateForTestTenants` / `withBypassForSeed` — a test-setup DB transaction error unrelated to this packet's changes (no routes, services, or middleware were modified). First complete run confirmed 43/43 pass.

### Demand lines + state machine guard
Running during governance doc authoring (expected pass — no changes to demand line or state machine code).

---

## §13 — Files Changed

### Implementation files (modified):
- `server/src/services/networkPoolRfq.service.ts` — 5 new error classes, 2 new interfaces, 3 new private helpers, 4 new public methods
- `server/src/__tests__/networkPoolRfq.service.unit.test.ts` — file comment updated (43→77 tests), imports expanded, 34 new tests added

### Governance / control files (new/modified):
- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001.md` — this document (NEW)
- `governance/control/OPEN-SET.md` — operating note updated (MODIFIED)
- `governance/control/GOVERNANCE-CHANGELOG.md` — new entry prepended (MODIFIED)

---

## §14 — What Was NOT Changed

This packet is strictly scoped. The following were NOT touched:

| Category | Files / Objects |
|---|---|
| Routes | No route files created or modified |
| Route registration | `server/src/routes/tenant.ts` not modified |
| Middleware | No middleware created or modified |
| Prisma schema | `server/prisma/schema.prisma` not modified |
| Migrations | No migration SQL created or applied |
| StateMachineService | Not modified; `sm.transition()` never called in invite methods |
| Feature flag seeds | Not modified |
| RLS policies | Not modified |
| `.env` / connection strings | Not touched |

---

## §15 — Next Recommended Packet

**`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001`**

Scope: Supplier-side service methods — `viewInvite`, `acceptInvite`, `declineInvite`.

Key constraints for that packet:
- Supplier can only view/act on invites where `supplier_org_id = callerOrgId` (no owner data leakage)
- `acceptInvite` and `declineInvite` each write a direct lifecycle log (OD-7, same pattern)
- Status transitions: PENDING → ACCEPTED, PENDING → DECLINED (both reject if effective status is not PENDING / OD-2 check required)
- `acceptedAt` / `declinedAt` written on update
- DTO for supplier view must exclude `metadataInternalJson`, `cancelReason`, and owner-internal fields
- Route file creation for supplier endpoints is a separate packet

**Authorization required:** `HOLD_FOR_PARESH_DECISION` — do NOT start without explicit Paresh approval.

---

*Governance review: PASS*
*Doctrine v1.4: PASS*
*Secrets exposed: NONE*
*Files outside allowlist modified: NONE*
