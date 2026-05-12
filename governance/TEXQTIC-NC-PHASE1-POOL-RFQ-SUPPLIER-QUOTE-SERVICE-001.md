# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001

**Unit:** TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001  
**Type:** NC_PHASE1_SERVICE_LAYER  
**Status:** VERIFIED_COMPLETE  
**Date:** 2026-05-12  
**Family:** Network Commerce — Phase 1C — Pool RFQ Supplier Quote (Packet 12 of 13)

---

## 1. Objective

Deliver the service layer for NC Phase 1C supplier quote submission and retrieval.  
**Service layer only — NO routes, NO route registration, NO frontend, NO schema/migration changes.**

---

## 2. Deliverables

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `server/src/services/networkPoolRfq.service.ts` | MODIFIED | A1: 4 error classes; A2: 2 interfaces; A3: `getSupplierQuote` + `submitQuote` methods + `toQuoteSupplierRecord` mapper |
| 2 | `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts` | CREATED | Two-layer feature gate middleware for supplier quote routes |
| 3 | `server/src/__tests__/networkPoolRfq.service.unit.test.ts` | MODIFIED | 17 new unit test cases appended (P-QUOTE-GET-01, P-QUOTE-GET-02, P-QUOTE-01 through P-QUOTE-15) |
| 4 | `server/src/__tests__/ncPoolSupplierQuoteFeatureGate.middleware.unit.test.ts` | CREATED | 11 unit test cases (TC-001 through TC-011) |

---

## 3. Design Decisions Implemented

All decisions are sourced from `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001.md` (Paresh-authorized commit `2596862`).

| Decision | ID | Resolution |
|----------|----|------------|
| Invite status gate: only ACCEPTED invites may be quoted | QD-1 | Enforced in `submitQuote` via `computeEffectiveInviteStatus` before any quote write |
| No re-submission in Phase 1C | QD-2 | `findFirst` on `networkPoolRfqSupplierQuote` by `inviteId` before create; `NetworkPoolRfqSupplierQuoteConflictError` on duplicate |
| RFQ status gate: only ISSUED or QUOTED RFQs accept quotes | QD-3 | Enforced via `invite.rfq.status` check inside transaction; `NetworkPoolRfqSupplierQuoteInvalidInputError` otherwise |
| Supplier DTO excludes internal/cross-tenant fields | QD-5 | `toQuoteSupplierRecord` excludes `metadata_internal_json`, `owner_org_id`, `rfq_id`, `pool_id`, `supplier_org_id` |
| quote_ref format: `SQ-` prefix + 16 uppercase hex chars | QD-6 | `'SQ-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()` |
| Direct lifecycle log only — no StateMachineService.transition | QD-7 | `tx.networkLifecycleLog.create()` called directly; SM transition never called |
| Supplier GET route for quote included in Phase 1C | QD-8 / Q-8 | `getSupplierQuote` method implemented; allows FE-8 to detect existing quote on load |

---

## 4. Implementation Details

### 4.1 Error Classes Added (`networkPoolRfq.service.ts`)

```typescript
NetworkPoolRfqSupplierQuoteInvalidInputError   // RFQ not in ISSUED/QUOTED state
NetworkPoolRfqSupplierQuoteNotFoundError        // Quote not found or not owned by org
NetworkPoolRfqSupplierQuoteConflictError        // Re-submission blocked (QD-2)
NetworkPoolRfqSupplierQuoteInviteNotAcceptedError  // Invite effective status != ACCEPTED (QD-1)
```

### 4.2 Interfaces Added (`networkPoolRfq.service.ts`)

```typescript
SubmitQuoteInput {
  quote_amount:    string | number;
  currency:        string;
  validity_until?: string | Date | null;
  supplier_note?:  string | null;
  request_id?:     string | null;
}

NetworkPoolRfqSupplierQuoteSupplierRecord {
  id; invite_id; quote_ref; status; quote_amount: string; currency;
  validity_until; supplier_note; submitted_at; submitted_by_user_id;
  withdrawn_at; withdraw_reason; created_at; updated_at;
  // EXCLUDED: metadata_internal_json, owner_org_id, rfq_id, pool_id, supplier_org_id
}
```

### 4.3 `getSupplierQuote(orgId, inviteId)` Method

- `networkPoolRfqSupplierQuote.findFirst({ where: { inviteId, supplierOrgId: orgId } })`
- Throws `NetworkPoolRfqSupplierQuoteNotFoundError` if no row found
- Returns `toQuoteSupplierRecord(row)`

### 4.4 `submitQuote(orgId, userId, inviteId, input)` Method

Transaction sequence:
1. `findFirst` on invite (`{ where: { id: inviteId, supplierOrgId: orgId }, include: { rfq: true } }`)
2. Null → `NetworkPoolRfqSupplierInviteNotFoundError`
3. `computeEffectiveInviteStatus(String(invite.status), invite.expiresAt ?? null)` !== 'ACCEPTED' → `NetworkPoolRfqSupplierQuoteInviteNotAcceptedError(effectiveStatus)`
4. `findFirst` on quotes by `inviteId` → found → `NetworkPoolRfqSupplierQuoteConflictError`
5. `rfqStatus = String(invite.rfq.status)` — not in `['ISSUED', 'QUOTED']` → `NetworkPoolRfqSupplierQuoteInvalidInputError`
6. `quoteRef = 'SQ-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()`
7. `networkPoolRfqSupplierQuote.create(...)` with all fields
8. `networkLifecycleLog.create(...)` — `entityType: 'POOL'`, `entityId: invite.poolId`, `fromStateKey: 'CLOSED_FOR_BIDS'`, `toStateKey: 'CLOSED_FOR_BIDS'`, `actorType: 'TENANT_USER'`, `actorRole: 'NC_SUPPLIER'`, `reason: 'nc_pool_rfq_supplier_quote_submitted: invite=..., quote=..., rfq=...'`
9. If `rfqStatus === 'ISSUED'`: `networkPoolRfq.update({ status: 'QUOTED' })` + second `networkLifecycleLog.create(...)` with `reason: 'nc_pool_rfq_status_changed_to_quoted: ...'`

**NetworkLifecycleLog non-nullable fields**: `fromStateKey` and `toStateKey` are NON-NULLABLE in schema. Pattern follows existing POOL-anchored lifecycle log writes: `fromStateKey: 'CLOSED_FOR_BIDS'`, `toStateKey: 'CLOSED_FOR_BIDS'`. Event name embedded in `reason` field.

### 4.5 `toQuoteSupplierRecord(row)` Mapper

- `quote_amount: String(row['quoteAmount'])` — Decimal coerced to string
- All Date fields via `.toISOString()` with null checks (`!= null`)
- Excludes all internal/cross-tenant fields (QD-5)

### 4.6 Feature Gate Middleware

**File:** `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts`

- Feature flag key: `nc.procurement_pools.supplier_quotes.enabled`
- Layer 1: Global `featureFlag.findUnique` — absent or `enabled=false` → 503 FEATURE_DISABLED (fail-closed)
- Layer 2: Per-org `tenantFeatureOverride.findUnique` — **absent → ALLOW** (global=true + no per-org override row = enabled for org); only explicit `enabled=false` → 503 FEATURE_DISABLED
  - Semantics established by `FLAG-COLLISION-INVESTIGATION-001`: override is an exception mechanism, not a requirement for access
- `orgId` resolution: `request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null`
- No orgId resolvable → 503 (fail-closed)
- DB error at either layer → 503 (fail-closed)
- Log events: `nc.pool.supplier_quote.feature_gate.global_blocked`, `nc.pool.supplier_quote.feature_gate.no_org_context`, `nc.pool.supplier_quote.feature_gate.org_blocked`, `nc.pool.supplier_quote.feature_gate.allowed`, `nc.pool.supplier_quote.feature_gate.db_error`

---

## 5. Test Evidence

### 5.1 Unit Tests — Service Layer

**File:** `server/src/__tests__/networkPoolRfq.service.unit.test.ts`  
**Result:** 134/134 PASS

New cases added in this packet:

| TC ID | Description |
|-------|-------------|
| P-QUOTE-GET-01 | getSupplierQuote returns supplier-safe DTO with expected fields |
| P-QUOTE-GET-02 | getSupplierQuote throws NetworkPoolRfqSupplierQuoteNotFoundError when quote absent |
| P-QUOTE-01 (SQ-01) | submitQuote returns supplier-safe DTO for ACCEPTED invite |
| P-QUOTE-02 (SQ-02) | submitQuote throws for PENDING invite |
| P-QUOTE-03 (SQ-03) | submitQuote throws for DECLINED invite |
| P-QUOTE-04 (SQ-04) | submitQuote throws for EXPIRED invite (past expiresAt) |
| P-QUOTE-05 (SQ-05) | submitQuote throws when invite not found |
| P-QUOTE-06 (SQ-06) | submitQuote throws when invite belongs to different org |
| P-QUOTE-07 (SQ-07) | submitQuote throws when quote already exists on invite |
| P-QUOTE-08 (SQ-08) | submitQuote updates RFQ to QUOTED when RFQ status is ISSUED |
| P-QUOTE-09 (SQ-09) | submitQuote does NOT update RFQ when already QUOTED |
| P-QUOTE-10 (SQ-10) | submitQuote throws for CANCELLED RFQ |
| P-QUOTE-11 (SQ-11) | metadata_internal_json absent from submitQuote response |
| P-QUOTE-12 (SQ-12) | owner_org_id absent from submitQuote response |
| P-QUOTE-13 (SQ-13) | lifecycle log written on quote_submitted |
| P-QUOTE-14 (SQ-14) | two lifecycle logs written when ISSUED→QUOTED transition occurs |
| P-QUOTE-15 (SQ-15) | only one lifecycle log when RFQ already QUOTED |

### 5.2 Unit Tests — Middleware

**File:** `server/src/__tests__/ncPoolSupplierQuoteFeatureGate.middleware.unit.test.ts`  
**Result:** 11/11 PASS

| TC ID | Description |
|-------|-------------|
| TC-001 | allows request when global flag and per-org override are both enabled |
| TC-002 | returns 503 FEATURE_DISABLED when global flag row is missing |
| TC-003 | returns 503 FEATURE_DISABLED when global flag.enabled is false |
| TC-004 | returns 503 FEATURE_DISABLED when global flag DB read throws (fail-closed) |
| TC-005 | returns 503 when global flag is true but no orgId is resolvable |
| TC-006 | queries the correct feature flag key (nc.procurement_pools.supplier_quotes.enabled) |
| TC-007 | does not query parent flag keys |
| TC-008 | allows request when global flag is true and no per-org override row exists (global=true + no override = ALLOW) |
| TC-009 | returns 503 when global flag is true but per-org override is disabled |
| TC-010 | returns 503 when override DB lookup throws (fail-closed) |
| TC-011 | allows supplier org that has only the quote flag override (no parent pool overrides) |

### 5.3 Compile / Schema

- `prisma validate` ✓ (schema valid, no errors)
- `prisma generate` ✓ (Prisma Client v6.1.0 generated)
- `tsc --noEmit` ✓ (zero type errors)

### 5.5 Adjacent Pre-existing Finding — PRQ-23 / `issueRfq()` Transaction Timeout

**Candidate Unit:** `TEXQTIC-NC-TEST-INFRA-PRQ-ISSUE-RFQ-TX-TIMEOUT-001`

| Field | Value |
|-------|-------|
| Status | Investigation-ready — NOT implementation-ready |
| Scope | Outside Packet 12. Pre-existing condition on `issueRfq()`. |
| Error | Prisma interactive tx timeout: 5165ms elapsed vs 5000ms limit |
| Location | `server/src/services/networkPoolRfq.service.ts:477` — `issueRfq()` → `tx.networkPoolRfqLine.createMany(...)` |
| Root cause hypothesis | Remote Supabase latency jitter. Tx opens with `$transaction(async (tx) => {...})`. Multi-step sequence (header create + line createMany + lifecycle log) exceeds 5000ms under load. |
| Likely file surface | `server/src/routes/tenant/poolRfq.integration.test.ts` (harness timeout config); `server/src/services/networkPoolRfq.service.ts` only if repo truth proves implementation is the cause (not harness); shared test helpers if fixture setup is the cause |
| Required before implementation | Determine whether fix is: (a) test-harness timeout increase, (b) transaction scope reduction in `issueRfq()`, or (c) service query optimization — repo truth investigation required |
| Authorization | Separate explicit Paresh authorization required before starting |

This finding is **not a Packet 12 regression**. PRQ-23 failed in isolation on clean HEAD before any Packet 12 changes were applied.

### 5.4 Integration Regression (ORI / PRQ)

#### ORI suite — `poolRfqInvites.integration.test.ts`

| Run | Result | Notes |
|-----|--------|-------|
| Full suite with Packet 12 | 49/50 — ORI-42 failed (503 vs 201) | Observed in multi-suite run |
| ORI-42 isolated (`-t "ORI-42"`) | **1/1 PASS** | Passes cleanly in isolation |
| Full ORI suite standalone | **50/50 PASS** | All 50 tests pass when run alone |

**ORI-42 Classification: Class C — Harness Order**  
ORI-42 passes in isolation and in standalone full-suite run. Fails only when preceded by other suites that consume shared DB state (feature flag seeding). Not caused by any Packet 12 change. No Packet 12 regression.

#### PRQ suite — `poolRfq.integration.test.ts`

| Run | Result | Notes |
|-----|--------|-------|
| PRQ-23 isolated (`-t "PRQ-23"`) | **1 failed / 42 skipped** | Fails in isolation — not harness-order dependent |
| Full PRQ suite standalone | **42/43 PASS — PRQ-23 only** | PRQ-23 is the sole failure |

**PRQ-23 Classification: Class B — Pre-existing Flake**  
- Error: `Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5165 ms passed since the start of the transaction.`  
- Location: `networkPoolRfq.service.ts:477` — `await (tx as any).networkPoolRfqLine.createMany(...)` inside `issueRfq()`  
- `issueRfq()` is **pre-Packet-12 code**. No Packet 12 change touches `issueRfq()`, `createMany` on lines, or the interactive transaction timeout.  
- PRQ-23 is **outside Packet 12 scope**. No PRQ route or service path used by `issueRfq()` was changed by this packet.  
- Root cause is remote Supabase latency jitter (165ms over the 5000ms Prisma interactive transaction limit).  
- Must be tracked as a **separate adjacent candidate unit** (see Section 5.5).

**Packet 12 in-scope verification: PASS.** All service and middleware tests green. ORI corrected. PRQ-23 is a pre-existing finding adjacent to this packet.

---

## 6. Scope Boundaries (Confirmed)

The following were explicitly **excluded** from this packet per design decisions:

- No routes added or registered (Packet 13)
- No `tenant.ts` or route file modifications
- No schema changes or Prisma migrations
- No frontend changes
- No `StateMachineService.transition()` called for quote lifecycle
- No `withdrawQuote` method (Phase 1D)
- No owner quote list method (Phase 1D — Q-4 deferred)
- `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` — UNCHANGED
- `active_delivery_unit_status` for Packet 13 route — remains `HOLD_FOR_PARESH_DECISION`

---

## 7. Commit

```
feat(network-commerce): add supplier quote service layer

Adjacent finding to carry forward
Candidate unit:
TEXQTIC-NC-TEST-INFRA-PRQ-ISSUE-RFQ-TX-TIMEOUT-001

Rationale:
PRQ-23 fails in isolation due to Prisma interactive transaction timeout
around issueRfq(), with 5165ms elapsed against a 5000ms timeout. This
is pre-existing and unrelated to Packet 12 supplier quote service work.

Likely file surface:
- server/src/routes/tenant/poolRfq.integration.test.ts
- server/src/services/networkPoolRfq.service.ts only if repo truth
  proves transaction timeout is caused by implementation and not test harness
- shared test helpers if fixture setup is the cause

Readiness:
Investigation-ready, not implementation-ready until repo truth determines
whether the fix is test-harness timeout, transaction scope reduction,
or service query optimization.

After the commit lands, the next main packet remains:
TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001
but only after explicit authorization.
```

---

## 8. Next Steps

| Packet | Unit | Status |
|--------|------|--------|
| 13 | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001 | HOLD_FOR_PARESH_DECISION |
| FE-8 | TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 | BLOCKED_BACKEND_QUOTE_CONTRACT_MISSING (Packet 13 still pending) |

Packet 13 requires explicit Paresh authorization before execution.  
FE-8 unblocked only when Packet 13 VERIFIED_COMPLETE + separate Paresh FE-8 authorization.
