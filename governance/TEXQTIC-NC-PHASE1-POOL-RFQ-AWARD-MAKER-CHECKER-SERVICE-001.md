# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SERVICE-001

**Packet:** TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SERVICE-001  
**Status:** `TEXQTIC_NC_PHASE1_POOL_RFQ_AWARD_MAKER_CHECKER_SERVICE_001_SERVICE_VERIFIED_COMPLETE`  
**Date:** 2026-07-01  
**Scope:** Service layer — award maker-checker for Pool RFQ quote acceptance. No routes, no frontend, no schema changes.

---

### Plan

Implement the G-021 award maker-checker service methods in `NetworkPoolRfqService`:
- `requestAward` (MAKER — TENANT_ADMIN calls SM with actorType=TENANT_ADMIN → PENDING_APPROVAL → creates `pendingApproval` row)
- `approveAward` (CHECKER — verifies approval record integrity, calls SM with actorType=CHECKER + makerUserId → APPLIED, runs full award transaction)
- `rejectAwardApproval` (CHECKER — marks approval REJECTED, inserts signature, no state changes)
- `getOwnerPendingAwardApprovals` (read-only — returns REQUESTED approvals filtered by poolId + rfqId)

Supporting additions:
- 6 new error classes for MC failure cases
- MC DTOs: `RequestAwardInput`, `ApproveAwardInput`, `RejectAwardApprovalInput`, `AwardApprovalRequest`, `AwardApproved`, `AwardRejected`
- `AWARD_APPROVAL_TTL_MS = 72h` constant
- 6 private helpers for frozen-payload hashing, DB-row mapping, and assertion logic
- 12 unit tests (MC-SVC-01 through MC-SVC-12) covering all paths

Governance contracts in scope: G-021 schema objects (already verified — SCHEMA-001), SM actor-type semantics confirmed in DESIGN-001.  
No routes, no frontend, no schema.prisma, no migrations, no .env, no feature flags.

---

### Findings / Root Cause

**Root cause context:** TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 established that the `POOL QUOTED→ACCEPTED` SM transition requires `actorType=CHECKER` with `makerUserId` set to bypass the PENDING_APPROVAL gate (SM Step 13). The existing `acceptQuote()` method correctly throws `NetworkPoolRfqTransitionDeniedError` when called with `TENANT_ADMIN` (SM returns `PENDING_APPROVAL`) — this is the correct SM behavior, intentionally unchanged.

**Design findings confirmed in this session:**
- SM QUOTED→ACCEPTED with `actorType='TENANT_ADMIN'` → returns `PENDING_APPROVAL` (expected; `requestAward` uses this signal)
- SM QUOTED→ACCEPTED with `actorType='CHECKER'` + `makerUserId` set → returns `APPLIED` (expected; `approveAward` uses this)
- `pendingApproval` model available as `this.db.pendingApproval` (camelCase Prisma client)
- `approvalSignature` model available as `this.db.approvalSignature`
- `entityType='POOL'`, `entityId=poolId` used for `pendingApproval` rows (matches SM entity scope)
- Prisma P2002 on `pendingApproval.create` maps to `NetworkPoolRfqAwardRequestAlreadyPendingError` (partial unique index enforces one active approval per entity/transition)
- `PAST_EXPIRES` in test must be an absolute historical date (`2000-01-01T00:00:00.000Z`) — not relative to `NOW` — since the expiry check uses real `new Date()` (not fake timers) in the service

---

### Files to Change

1. `server/src/services/networkPoolRfq.service.ts` — add import, 6 error classes, MC DTOs + TTL, private helpers, 4 public methods
2. `server/src/__tests__/networkPoolRfq.service.unit.test.ts` — extend imports, add 12 MC-SVC unit tests

---

### Changes Made

#### `server/src/services/networkPoolRfq.service.ts`

**Change 1 — Import:**  
Added `createHash, randomUUID` from `'crypto'` to the existing Node crypto import.

**Change 2 — 6 new error classes** (after `NetworkPoolRfqSupplierQuoteNotInSubmittedError`):

| Class | Trigger |
|---|---|
| `NetworkPoolRfqAwardRequestAlreadyPendingError` | Prisma P2002 on `pendingApproval.create` (partial unique index conflict) |
| `NetworkPoolRfqApprovalNotFoundError` | Approval row missing by `{id, orgId}`, or frozen-payload hash mismatch (non-leaking) |
| `NetworkPoolRfqApprovalAlreadyDecidedError(currentStatus)` | Approval already APPROVED/REJECTED/EXPIRED |
| `NetworkPoolRfqApprovalExpiredError` | `expiresAt <= new Date()` |
| `NetworkPoolRfqMakerCheckerSameActorError` | Checker userId === maker userId (DB trigger also enforces) |
| `NetworkPoolRfqQuoteNoLongerSubmittedError(currentStatus)` | Quote is not SUBMITTED at checker action time |

**Change 3 — MC DTOs + TTL constant** (after `RejectQuoteInput`):

- `RequestAwardInput`, `ApproveAwardInput`, `RejectAwardApprovalInput` (input interfaces)
- `AwardApprovalRequest` (DTO: id, status, expires_at, entity_type, entity_id, from_state_key, to_state_key, requested_by_user_id, request_reason, created_at)
- `AwardApproved` (approval + quote), `AwardRejected` (approval only)
- `AWARD_APPROVAL_TTL_MS = 72 * 60 * 60 * 1000` (72 hours)

**Change 4 — Private helpers + 4 public methods:**

*Private helpers:*
- `buildFrozenPayload({ orgId, poolId, rfqId, quoteId })` → `Record<string, string>`
- `hashFrozenPayload(payload: object)` → SHA-256 hex of alphabetically sorted `JSON.stringify`
- `buildMakerPrincipalFingerprint(actorType, userId)` → `"${actorType}:${userId}"`
- `toAwardApprovalRequest(row)` → `AwardApprovalRequest` DTO (no `frozenPayload`/`frozenPayloadHash` in output)
- `assertApprovalRequestedAndNotExpired(row)` → throws `AlreadyDecidedError` (status ≠ REQUESTED) or `ExpiredError` (expiresAt ≤ now)
- `assertMakerCheckerSeparated(row, checkerUserId)` → throws `MakerCheckerSameActorError` if same actor

*Public methods:*

**`requestAward(orgId, makerUserId, poolId, rfqId, quoteId, input)`:**  
1. Pre-loads QUOTED lifecycle state outside tx  
2. In tx: verify pool exists (include lifecycleState), verify RFQ status='QUOTED', verify quote status='SUBMITTED'  
3. If pool is CLOSED_FOR_BIDS → SM CLOSED_FOR_BIDS→QUOTED (APPLIED), update pool.lifecycleStateId  
4. Else if pool not QUOTED → throw `NetworkPoolRfqInvalidPoolStateError`  
5. SM QUOTED→ACCEPTED with `actorType='TENANT_ADMIN'` → expect `PENDING_APPROVAL` (else throw TransitionDeniedError)  
6. INSERT pendingApproval (entityType='POOL', entityId=poolId, frozenPayload, frozenPayloadHash, makerPrincipalFingerprint, expiresAt=now+72h)  
7. Catch P2002 → throw `NetworkPoolRfqAwardRequestAlreadyPendingError`  
8. Return `toAwardApprovalRequest(row)`

**`approveAward(orgId, checkerUserId, approvalId, input)`:**  
1. Pre-loads ACCEPTED lifecycle state outside tx  
2. In tx: load approval by `{id, orgId}`, `assertApprovalRequestedAndNotExpired`, verify frozenPayloadHash (tamper → `ApprovalNotFoundError`), `assertMakerCheckerSeparated`  
3. Extract poolId/rfqId/quoteId from storedPayload; reload quote, verify status=SUBMITTED (else `QuoteNoLongerSubmittedError`)  
4. SM QUOTED→ACCEPTED with `actorType='CHECKER'`, makerUserId, checkerUserId → expect `APPLIED`  
5. Update pool.lifecycleStateId → acceptedState.id  
6. UPDATE quote status=ACCEPTED, acceptedAt=now  
7. `updateMany`: mass-reject other SUBMITTED quotes for same RFQ (`id: { not: quoteId }`)  
8. UPDATE RFQ status=ACCEPTED (QD-8 direct update pattern)  
9. UPDATE pendingApproval status=APPROVED  
10. INSERT approvalSignature (decision=APPROVED)  
11. Return `{ approval: toAwardApprovalRequest(...), quote: toQuoteOwnerRecord(...) }`

**`rejectAwardApproval(orgId, checkerUserId, approvalId, input)`:**  
1. In tx: load approval by `{id, orgId, status: 'REQUESTED'}` → not found → `ApprovalNotFoundError`  
2. Verify expiresAt > now → else `ApprovalExpiredError`  
3. `assertMakerCheckerSeparated`  
4. No SM call, no pool/RFQ/quote state changes  
5. UPDATE pendingApproval status=REJECTED  
6. INSERT approvalSignature (decision=REJECTED)  
7. Return `{ approval: toAwardApprovalRequest(...) }`

**`getOwnerPendingAwardApprovals(orgId, poolId, rfqId)`:**  
1. `pendingApproval.findMany({ where: { orgId, entityType: 'POOL', entityId: poolId, status: 'REQUESTED' }, orderBy: { createdAt: 'desc' } })`  
2. Post-filter: `frozenPayload.rfqId === rfqId`  
3. Return mapped array via `toAwardApprovalRequest`

#### `server/src/__tests__/networkPoolRfq.service.unit.test.ts`

**Change 1 — Imports extended:** Added 6 new MC error classes to import block.

**Change 2 — 12 MC-SVC tests added** (after P-OWNER-17):

New constants: `MAKER_USER_ID`, `CHECKER_USER_ID`, `APPROVAL_ID`, `FUTURE_EXPIRES`, `PAST_EXPIRES` (absolute: `2000-01-01T00:00:00.000Z`).

New fixtures: `makeFrozenPayload()`, `computeExpectedHash(payload)` (SHA-256 of alphabetically sorted JSON), `makeApprovalRow(overrides?)`.

New mock factories: `makeTxForRequestAward`, `makeDbForRequestAward`, `makeTxForApproveAward`, `makeDbForApproveAward`, `makeTxForRejectAwardApproval`, `makeDbForRejectAwardApproval`.

| Test | Assertion |
|---|---|
| MC-SVC-01 | `requestAward` happy path → returns `AwardApprovalRequest`, `pendingApproval.create` called |
| MC-SVC-02 | `requestAward` P2002 → throws `NetworkPoolRfqAwardRequestAlreadyPendingError` |
| MC-SVC-03 | `requestAward` does NOT call `networkPoolRfqSupplierQuote.update` |
| MC-SVC-04 | `approveAward` happy path → `AwardApproved.approval.status='APPROVED'`, SM called with CHECKER actorType + makerUserId + checkerUserId |
| MC-SVC-05 | `approveAward` → `updateMany` mass-rejects other SUBMITTED quotes |
| MC-SVC-06 | `approveAward` checker === maker → throws `NetworkPoolRfqMakerCheckerSameActorError` |
| MC-SVC-07 | `approveAward` expired → throws `NetworkPoolRfqApprovalExpiredError` |
| MC-SVC-08 | `approveAward` already APPROVED → throws `NetworkPoolRfqApprovalAlreadyDecidedError` |
| MC-SVC-09 | `approveAward` quote no longer SUBMITTED → throws `NetworkPoolRfqQuoteNoLongerSubmittedError` |
| MC-SVC-10 | `rejectAwardApproval` → status=REJECTED, signature inserted, SM NOT called, no pool/RFQ/quote change |
| MC-SVC-11 | `getOwnerPendingAwardApprovals` → filters by rfqId in frozenPayload, excludes frozenPayloadHash from DTO |
| MC-SVC-12 | `approveAward` frozenPayloadHash mismatch → throws `NetworkPoolRfqApprovalNotFoundError`, SM NOT called |

---

### Validation Run

```
pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts
```

**Result:** `Tests  163 passed (163)` (117 original P-* + 12 new MC-SVC-* + 34 existing non-P tests) — PASS

**Note:** One bug found and fixed during test run: `PAST_EXPIRES` was initially defined as `new Date(NOW.getTime() - 1000)` (relative to test-suite `NOW = 2026-06-01`). Since the expiry assertion uses real `new Date()` (no fake timers injected in MC tests), the value resolved to a future date in 2025/real-time context. Fixed to absolute `new Date('2000-01-01T00:00:00.000Z')`.

```
pnpm -C server exec tsc --noEmit
```

**Result:** No output (exit 0) — PASS

---

### Risks / Follow-up

1. **Routes not yet implemented.** `requestAward`, `approveAward`, `rejectAwardApproval`, `getOwnerPendingAwardApprovals` have no HTTP routes. The next packet (`TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001`) must add these routes with proper auth middleware.

2. **Feature flag.** `nc.procurement_pools.rfq.award.enabled` is absent in production DB. Award routes must be feature-gated once implemented. QD-6 (`supplier_quotes.enabled=false`) remains unchanged.

3. **DB triggers are the authority for maker-checker separation and signature immutability.** The application-layer assertions (`assertMakerCheckerSeparated`) are defense-in-depth; the DB trigger `trg_check_maker_checker_separation` is the canonical enforcement. Both layers are in effect.

4. **`approveAward` frozen-payload hash tamper detection** throws `NetworkPoolRfqApprovalNotFoundError` (not `ApprovalTamperedError`) — deliberate non-leaking design. Any payload integrity failure surfaces identically to "not found."

5. **`rejectAwardApproval` does NOT call SM.** This is intentional: rejection returns pool/RFQ to their pre-request state without state machine involvement. The `pendingApproval` row status=REJECTED and the signature record are the audit trail.

6. **`acceptQuote()` is preserved unchanged.** Its existing behavior (throws `TransitionDeniedError` when SM returns PENDING_APPROVAL) is correct. It is not a regression — it is the "unguarded" path that predates MC design. New MC methods are the correct call path for award operations.

---

### Commit Message

```
feat(network-commerce): add award maker checker service
```
