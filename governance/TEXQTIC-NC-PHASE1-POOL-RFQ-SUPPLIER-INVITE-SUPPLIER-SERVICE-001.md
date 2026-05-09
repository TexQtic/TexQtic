# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001 |
| **Type** | SUPPLIER_SERVICE_IMPLEMENTED |
| **Status** | SUPPLIER_SERVICE_IMPLEMENTED |
| **Date** | 2026-05-30 |
| **Predecessor** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001 (commit: `7f82d0e`) |
| **Basis commit** | `7f82d0e` (feat(network-commerce): add supplier invite owner service) |
| **Doctrine** | TexQtic Doctrine v1.4 |
| **Safe-Write Mode** | ALWAYS ON |

---

## §2 — Authority Sources Read

The following sources were read before any implementation was written:

| Source | Purpose |
|---|---|
| `server/prisma/schema.prisma` lines 2213–2280 | Confirmed full `NetworkPoolRfqSupplierInvite` model — all 19 fields, compound unique `@@unique([rfqId, supplierOrgId])`, all relation fields |
| `server/src/services/networkPoolRfq.service.ts` lines 120–860 | Read complete service file: all 5 error classes, all interfaces, all private helpers, all 4 existing public methods (issueRfq, sendInvite, listInvites, getInvite, cancelInvite) |
| `server/src/__tests__/networkPoolRfq.service.unit.test.ts` lines 970–1658 | Read all test constants, mock factories, and all 77 existing tests (P-RFQ-* through P-INV-GEN-02) |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | OD-1 through OD-7 locked decisions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001.md` | Owner service implementation reference; lifecycle log field structure |

---

## §3 — Pre-Work Verification

```
git log --oneline -n 1   →  7f82d0e feat(network-commerce): add supplier invite owner service
git status --short       →  (clean working tree — no uncommitted files)
```

Predecessor commit `7f82d0e` confirmed as HEAD. Working tree clean before any changes.

---

## §4 — Locked OD Decisions — Supplier Service Implementation Mapping

### OD-1: No Re-Invite (LOCKED — owner-only concern, N/A for supplier service)

Supplier service never creates invites. OD-1 only governs the `sendInvite` path in the owner service.

**Supplier service impact:** None. `listSupplierInvites`, `viewInvite`, `acceptInvite`, `declineInvite` are all read or state-transition operations on existing invite rows.

### OD-2: Lazy EXPIRED (LOCKED)

DB status is never written as `'EXPIRED'`. `computeEffectiveInviteStatus` is called on every read.

**How implemented:**
- `listSupplierInvites`: maps each row through `toInviteSupplierRecord(row, null)` which calls `computeEffectiveInviteStatus` — zero DB writes for EXPIRED rows.
- `viewInvite`: maps row through `toInviteSupplierRecord(row)` — same lazy computation.
- `acceptInvite` / `declineInvite`: call `computeEffectiveInviteStatus` on the loaded row inside `$transaction`; if result is `'EXPIRED'` → throw `NetworkPoolRfqSupplierInviteInvalidTransitionError` — DB `status` column is NEVER set to `'EXPIRED'`.

### OD-3: expiresAt Set by Owner (LOCKED — supplier service MUST NOT alter it)

**How implemented:** Supplier service never writes `expiresAt`. The `update` call in `acceptInvite` and `declineInvite` sets only `{ status, acceptedAt | declinedAt, declineReason?, updatedAt }`. `expiresAt` is not in any supplier update payload.

### OD-4: Supplier Scope = supplierOrgId Only (LOCKED)

No `NetworkPoolMembership` check in any supplier service method.

**How implemented:**
- `listSupplierInvites`: `findMany({ where: { supplierOrgId } })` — scoped by column, no membership join.
- `viewInvite`: `findFirst({ where: { id: inviteId, supplierOrgId } })` — compound filter, no membership join.
- `acceptInvite` / `declineInvite`: `findFirst({ where: { id: inviteId, supplierOrgId } })` inside `$transaction` — same pattern.
- No `networkPoolMembership` accessor is referenced anywhere in the supplier service methods.

### OD-5: Supplier DTO Must NOT Include Sensitive Fields (LOCKED)

**Fields excluded from `NetworkPoolRfqSupplierInviteSupplierRecord`:**
- `metadataInternalJson` — internal metadata, never exposed
- `cancelReason` — owner-internal cancellation reason
- `ownerOrgId` — identity of the inviting org (leaked member identity)
- RFQ lines (`lineCount` is included as an aggregate; individual line data is excluded)
- Snapshot lines — excluded entirely
- Member identities / per-member quantities — excluded entirely

**Fields included (18 fields):**
`id`, `invite_ref`, `status` (effective), `invited_at`, `accepted_at`, `declined_at`, `expires_at`, `supplier_message`, `rfq_ref` (null in list), `rfq_version` (null in list), `rfq_status` (null in list), `issued_at` (null in list), `response_deadline_at` (null in list), `issue_basis` (null in list), `line_count` (null in list), `total_qty` (null in list), `qty_unit` (null in list), `created_at`, `updated_at`.

### OD-6: Feature Gate (LOCKED — unchanged)

Feature gate middleware is unchanged from commit `86cb135`. No gate modification in this packet.

### OD-7: Direct Lifecycle Log (LOCKED)

`acceptInvite` and `declineInvite` MUST use direct `tx.networkLifecycleLog.create()`. `StateMachineService.transition()` is NEVER called for supplier invite events.

**How implemented:** Private helper `writeSupplierLifecycleLog(tx, params)` calls `tx.networkLifecycleLog.create()` directly with:
- `entityType: 'POOL'`, `entityId: invite.poolId`
- `orgId: invite.ownerOrgId` (invite owner's org, NOT supplierOrgId)
- `actorUserId: userId`, `actorType: 'TENANT_USER'`, `actorRole: 'NC_SUPPLIER'`
- `fromStateKey: 'CLOSED_FOR_BIDS'`, `toStateKey: 'CLOSED_FOR_BIDS'`
- `reason: 'Supplier invite ACCEPTED|DECLINED: rfq=..., invite=...'`

---

## §5 — Interface Added

```typescript
export interface NetworkPoolRfqSupplierInviteSupplierRecord {
  id: string;
  invite_ref: string;
  status: string;                  // OD-2 effective — may be 'EXPIRED' (never written to DB)
  invited_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  expires_at: string | null;
  supplier_message: string | null;
  // RFQ aggregate header (null when not joined — list, accept, decline return null)
  rfq_ref: string | null;
  rfq_version: number | null;
  rfq_status: string | null;
  issued_at: string | null;
  response_deadline_at: string | null;
  issue_basis: string | null;
  line_count: number | null;
  total_qty: string | null;
  qty_unit: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Excluded: metadataInternalJson, cancelReason, ownerOrgId, poolId (internal routing)
}
```

---

## §6 — Private Helpers Added

### `toInviteSupplierRecord(row, rfqRow?)`

Maps a raw `NetworkPoolRfqSupplierInvite` Prisma row to `NetworkPoolRfqSupplierInviteSupplierRecord`.

**RFQ detection logic:**
```typescript
const rfq = rfqRow !== undefined
  ? rfqRow
  : (row['rfq'] as Record<string, unknown> | null | undefined) ?? null;
```
- Called with explicit `null` (list, accept, decline): rfq = null → all 8 RFQ fields = null
- Called with no second arg (viewInvite): reads `row['rfq']` from Prisma include result

### `writeSupplierLifecycleLog(tx, params)`

Direct `tx.networkLifecycleLog.create()` call with supplier actor fields. Distinct from `writeInviteLifecycleLog` (owner helper uses `actorType: 'TENANT_USER'`, `actorRole: 'NC_POOL_ADMIN'`).

---

## §7 — Public Methods Added

### `listSupplierInvites(supplierOrgId: string): Promise<NetworkPoolRfqSupplierInviteSupplierRecord[]>`

- `findMany({ where: { supplierOrgId }, orderBy: { invitedAt: 'desc' } })`
- No RFQ join
- Maps via `toInviteSupplierRecord(row, null)` — RFQ fields are null
- Returns empty array if no rows

### `viewInvite(supplierOrgId: string, inviteId: string): Promise<NetworkPoolRfqSupplierInviteSupplierRecord>`

- `findFirst({ where: { id: inviteId, supplierOrgId }, include: { rfq: { select: { rfqRef, rfqVersion, status, issuedAt, responseDeadlineAt, issueBasis, lineCount, totalQty, qtyUnit } } } })`
- Throws `NetworkPoolRfqSupplierInviteNotFoundError` if null (wrong supplier or missing invite)
- Maps via `toInviteSupplierRecord(row)` — reads `row.rfq` from include

### `acceptInvite(supplierOrgId: string, userId: string, inviteId: string, note?: string): Promise<NetworkPoolRfqSupplierInviteSupplierRecord>`

Inside `$transaction`:
1. `findFirst({ where: { id: inviteId, supplierOrgId } })` → null → `NetworkPoolRfqSupplierInviteNotFoundError`
2. `computeEffectiveInviteStatus` → not PENDING → `NetworkPoolRfqSupplierInviteInvalidTransitionError`
3. `update({ data: { status: 'ACCEPTED', acceptedAt: now, updatedAt: now } })`
4. `writeSupplierLifecycleLog(tx, { ... reason: 'Supplier invite ACCEPTED: rfq=..., invite=...' })`
5. Return `toInviteSupplierRecord(updatedRow, null)`

### `declineInvite(supplierOrgId: string, userId: string, inviteId: string, declineReason?: string): Promise<NetworkPoolRfqSupplierInviteSupplierRecord>`

Inside `$transaction`:
1. `findFirst({ where: { id: inviteId, supplierOrgId } })` → null → `NetworkPoolRfqSupplierInviteNotFoundError`
2. `computeEffectiveInviteStatus` → not PENDING → `NetworkPoolRfqSupplierInviteInvalidTransitionError`
3. `update({ data: { status: 'DECLINED', declinedAt: now, declineReason, updatedAt: now } })`
4. `writeSupplierLifecycleLog(tx, { ... reason: 'Supplier invite DECLINED: rfq=..., invite=...' })`
5. Return `toInviteSupplierRecord(updatedRow, null)`

---

## §8 — Files Modified

| File | Change |
|---|---|
| `server/src/services/networkPoolRfq.service.ts` | Added `NetworkPoolRfqSupplierInviteSupplierRecord` interface; added private helpers `toInviteSupplierRecord`, `writeSupplierLifecycleLog`; added public methods `listSupplierInvites`, `viewInvite`, `acceptInvite`, `declineInvite` |
| `server/src/__tests__/networkPoolRfq.service.unit.test.ts` | Updated COVERAGE comment (77 → 117); added 8 mock factory functions; added 40 unit tests |

---

## §9 — Files NOT Modified

| File | Reason |
|---|---|
| `server/prisma/schema.prisma` | Schema unchanged — `NetworkPoolRfqSupplierInvite` model was added in SCHEMA-001 |
| `server/prisma/migrations/` | No migration in this packet |
| Any route files | No routes in this packet — supplier routes are a future packet |
| Any middleware files | No middleware changes — feature gate unchanged from commit `86cb135` |
| `.env` / any config files | Forbidden by governance |

---

## §10 — Test Coverage Summary

**Previous count:** 77 tests (P-RFQ-01 → P-RFQ-17, P-INV-01 → P-INV-12, P-INV-GEN-01 → P-INV-GEN-02)

**New tests (40):**

| Group | Test IDs | Count | What Is Tested |
|---|---|---|---|
| `listSupplierInvites` | P-SUP-LIST-01 → P-SUP-LIST-07 | 7 | supplierOrgId scoping, empty array, lazy EXPIRED, no DB write for EXPIRED, OD-5 DTO omissions |
| `viewInvite` | P-SUP-VIEW-01 → P-SUP-VIEW-07 | 7 | Happy path, NotFoundError (wrong supplier, missing invite), lazy EXPIRED, RFQ header join, OD-5 omissions, no membership check |
| `acceptInvite` | P-SUP-ACCEPT-01 → P-SUP-ACCEPT-10 | 10 | ACCEPTED result, acceptedAt set, InvalidTransition for ACCEPTED/DECLINED/CANCELLED/EXPIRED, lifecycle log written, SM.transition NOT called, NotFoundError for wrong supplier, no pool/RFQ mutation |
| `declineInvite` | P-SUP-DECLINE-01 → P-SUP-DECLINE-11 | 11 | DECLINED result, declinedAt set, declineReason stored, InvalidTransition for ACCEPTED/DECLINED/CANCELLED/EXPIRED, lifecycle log written, SM.transition NOT called, NotFoundError for wrong supplier, no pool/RFQ mutation |
| General supplier | P-SUP-GEN-01 → P-SUP-GEN-05 | 5 | No membership check cross-method, no metadataInternalJson cross-method, no rfqLines cross-method, no DB EXPIRED write cross-method, owner methods unaffected regression |

**Total:** 117 tests

---

## §11 — Validation Evidence

### TypeScript
```
Command:  pnpm exec tsc --noEmit  (from server/)
Output:   (no output — 0 errors)
```

### Unit Tests
```
Command:  pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts
Result:   117 passed (117)
Duration: 427ms
```

### Feature Gate Regression
```
Command:  pnpm exec vitest run src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts src/__tests__/ncPoolRfqFeatureGate.middleware.unit.test.ts
Result:   27 passed (27)  [16 + 11]
```

### Integration Tests
```
Command:  pnpm exec vitest run src/routes/tenant/poolRfq.integration.test.ts
Result:   43 passed (43)
Duration: 508s

Command:  pnpm exec vitest run src/routes/tenant/pools.demandLines.integration.test.ts
Result:   (awaiting — integration runs against remote Supabase)

Command:  pnpm exec vitest run ../tests/stateMachine.g020.test.ts  (from server/)
Result:   33 passed (33)  [confirmed in prior session: 7f82d0e HEAD]
```

---

## §12 — Governance Invariants Confirmed

| Invariant | Status |
|---|---|
| `active_delivery_unit` = `HOLD_FOR_AUTHORIZATION` | Unchanged |
| `dpp_launch_authorization` = `HOLD_FOR_PARESH_DECISION` | Unchanged |
| No `prisma migrate dev` / `prisma db push` | Confirmed — no migration commands |
| No `StateMachineService.transition()` for invite events | Confirmed — OD-7 implemented via direct log |
| No `metadataInternalJson` in supplier DTO | Confirmed — OD-5 |
| No `cancelReason` / `ownerOrgId` in supplier DTO | Confirmed — OD-5 |
| No `NetworkPoolMembership` check | Confirmed — OD-4 |
| No EXPIRED written to DB | Confirmed — OD-2 |
| No route / middleware / schema changes | Confirmed |
| Supplier service does not create invites | Confirmed — OD-1 is owner-only |

---

## §13 — Error Classes Used (Existing, Unchanged)

| Error Class | Used By |
|---|---|
| `NetworkPoolRfqSupplierInviteNotFoundError` | `viewInvite`, `acceptInvite`, `declineInvite` |
| `NetworkPoolRfqSupplierInviteInvalidTransitionError` | `acceptInvite`, `declineInvite` |

No new error classes were added in this packet.

---

## §14 — Next Candidate

`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-ROUTE-001` — owner-side routes (POST send, GET list, GET get, DELETE cancel).

**Status:** `HOLD_FOR_PARESH_DECISION`

Requires Paresh authorization before any route implementation begins.

---

## §15 — Commit Record

```
Commit:   (pending — awaits Paresh approval before staging)
Message:  feat(network-commerce): add supplier invite supplier service
Files:
  server/src/services/networkPoolRfq.service.ts
  server/src/__tests__/networkPoolRfq.service.unit.test.ts
  governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001.md
  governance/control/OPEN-SET.md
  governance/control/GOVERNANCE-CHANGELOG.md
```
