# TEXQTIC-NC-PENDING-APPROVALS-ENTITY-TYPE-CONSTRAINT-REMEDIATION-001

**Type:** Production Database Constraint Remediation  
**Packet ID:** TEXQTIC-NC-PENDING-APPROVALS-ENTITY-TYPE-CONSTRAINT-REMEDIATION-001  
**Status:** COMPLETE  
**Date:** 2026-05-13  
**Executed by:** Copilot (GitHub Copilot / Claude Sonnet 4.6)  
**Authorized by:** Paresh Patel (TexQtic Founder)

---

## 1. Context

This remediation was triggered by MC-5 (`TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001`) Phase D failure. A `500 INTERNAL_ERROR` was returned when the maker attempted to POST `/award-request` in production. Root cause investigation identified a `pending_approvals` CHECK constraint that did not allow `POOL` as a valid `entity_type`.

**MC-5 status:** MC-5 remains HALTED. This packet does NOT re-activate or resume MC-5. A separate explicit authorization from Paresh is required to restart MC-5 Phase D.

---

## 2. Root Cause

### Constraint at time of investigation (original — blocker)

```sql
pending_approvals_entity_type_check | c | CHECK ((entity_type = ANY (ARRAY['TRADE'::text, 'ESCROW'::text, 'CERTIFICATION'::text])))
```

`POOL` was absent from the constraint allowlist.

### Failure path

`networkPoolRfq.service.ts` → `requestAward()` → `$transaction` → `pendingApproval.create({ data: { entityType: 'POOL', ... } })` → Postgres check violation → Prisma `PrismaClientKnownRequestError` code `P2004` (not `P2002`) → bypasses all error mappers (both `mapAwardRouteError` and `mapMakerCheckerError` only catch `P2002` → `AwardRequestAlreadyPendingError`) → falls through to generic catch → `sendError(reply, 'INTERNAL_ERROR', 'Failed to request award approval', 500)`.

### State machine (non-causal)

`stateMachine.service.ts` does NOT write to `pending_approvals`. It returns `PENDING_APPROVAL` as a structured result when `requiresMakerChecker=true` and actor is not CHECKER. The SM never throws and is not the cause.

---

## 3. Repo Truth Finding

### `pending_approvals.create()` call sites (exhaustive)

| File | Line | entityType value |
|------|------|-----------------|
| `server/src/services/networkPoolRfq.service.ts` | ~2084 | `'POOL'` |
| `server/src/services/makerChecker.service.ts` | ~140 | `input.entityType` (caller-driven) |

**`makerChecker.service.ts` line 567 cast:**  
`entityType: approval.entityType as 'TRADE' | 'ESCROW' | 'CERTIFICATION'`  
— This explicit cast confirms the maker-checker service's full-approval execute path only handles the original three types today. No SYNDICATE or VCO_CHAIN pending approval creation paths exist anywhere in the codebase.

**SYNDICATE / VCO_CHAIN review:**  
- `stateMachine.service.ts` line ~517–543: `['POOL', 'SYNDICATE', 'VCO_CHAIN']` branch writes exclusively to `network_lifecycle_logs`, NOT to `pending_approvals`.
- `networkInvoice.service.ts` uses SYNDICATE as an invoice type classification — no `pendingApproval.create()` calls.
- No service file creates a `pending_approvals` row with `entityType = 'SYNDICATE'` or `entityType = 'VCO_CHAIN'`.

**Conclusion:** Minimal remediation is POOL-only. Adding SYNDICATE or VCO_CHAIN has no repo-proven basis in this packet.

---

## 4. Safety Preconditions (all confirmed before DDL)

| Check | Result | Timestamp |
|-------|--------|-----------|
| `nc.procurement_pools.rfq.award.enabled` | `false` | 2026-05-13 17:29:47 UTC |
| `nc.procurement_pools.supplier_quotes.enabled` | `false` | 2026-05-13 17:29:47 UTC |
| Quote `2ac70ff6-...` status | `SUBMITTED` | Step 3 verified |
| Quote `2ac70ff6-...` accepted_at | `NULL` | Step 3 verified |
| RFQ `55eb2858-...` status | `QUOTED` | Step 3 verified |
| Pool `74436ecd-...` lifecycle_state | `CLOSED_FOR_BIDS` | Step 3 verified |
| pending_approvals (entity_type=POOL, org qa-b2b) | count = 0 | Step 3 verified |
| approval_signatures (POOL-related, org qa-b2b) | count = 0 | Step 3 verified |
| git HEAD | `b5750d3` = origin/main | Step 2 verified |
| git tree | CLEAN | Step 2 verified |

---

## 5. DDL Applied

```sql
BEGIN;
ALTER TABLE public.pending_approvals
  DROP CONSTRAINT pending_approvals_entity_type_check;
ALTER TABLE public.pending_approvals
  ADD CONSTRAINT pending_approvals_entity_type_check
  CHECK (entity_type = ANY (ARRAY['TRADE'::text, 'ESCROW'::text, 'CERTIFICATION'::text, 'POOL'::text]));
COMMIT;
```

**Terminal output:**
```
BEGIN
ALTER TABLE
ALTER TABLE
COMMIT
```

No errors. No data rows touched. No other constraints altered.

---

## 6. Post-DDL Verification

### 6.1 Final constraint definition

```
pending_approvals_entity_type_check | c | CHECK ((entity_type = ANY (ARRAY['TRADE'::text, 'ESCROW'::text, 'CERTIFICATION'::text, 'POOL'::text])))
```

### 6.2 Production state unchanged (post-DDL)

| Entity | Field | Value | Expected |
|--------|-------|-------|----------|
| Feature flag `rfq.award.enabled` | enabled | `false` | ✅ |
| Feature flag `supplier_quotes.enabled` | enabled | `false` | ✅ |
| Quote `2ac70ff6-...` | status | `SUBMITTED` | ✅ |
| Quote `2ac70ff6-...` | accepted_at | `NULL` | ✅ |
| RFQ `55eb2858-...` | status | `QUOTED` | ✅ |
| Pool `74436ecd-...` | lifecycle_state | `CLOSED_FOR_BIDS` | ✅ |
| pending_approvals (POOL, qa-b2b) | count | `0` | ✅ |
| approval_signatures (POOL, qa-b2b) | count | `0` | ✅ |

### 6.3 API smoke (503 FEATURE_DISABLED)

**Request:** POST `/api/tenant/network-commerce/pools/74436ecd-.../rfq/55eb2858-.../quotes/2ac70ff6-.../award-request`  
**Token:** `texqtic_tenant_token` (qa.b2b@texqtic.com maker, org qa-b2b)  
**Response:**
```json
{
  "status": 503,
  "body": {
    "success": false,
    "error": {
      "code": "FEATURE_DISABLED",
      "message": "Network Commerce procurement pool RFQ award is disabled."
    }
  }
}
```

503 confirms: flags are fail-closed, feature gate middleware fires before any DB path is reached.

---

## 7. Adjacent Finding — Future Audit Recommended

The SM `EntityType` in `stateMachine.types.ts` (line 17) includes `POOL | SYNDICATE | VCO_CHAIN`, but `makerChecker.service.ts` line 567 still casts `entityType as 'TRADE' | 'ESCROW' | 'CERTIFICATION'` in the execute-approval path. This cast will need to be widened when SYNDICATE or VCO_CHAIN approval flows are implemented. This is an **out-of-scope observation only** — no change made.

---

## 8. MC-5 Hold Posture

MC-5 (`TEXQTIC-NC-PROD-AWARD-MAKER-CHECKER-CONTROLLED-QA-ACTIVATION-001`) remains **HALTED**.

The `pending_approvals_entity_type_check` constraint blocker is now resolved. However, the following must be confirmed before resuming MC-5:

1. Explicit Paresh authorization to re-activate MC-5 Phase D.
2. Fresh pre-flight state read (quote, RFQ, pool, pending_approvals).
3. Flag activation sequence (both flags → `true`) only at the moment of Phase D retry.
4. Phase D retry in a new separate authorized packet.

---

## 9. Files Changed

| File | Type | Change |
|------|------|--------|
| `governance/TEXQTIC-NC-PENDING-APPROVALS-ENTITY-TYPE-CONSTRAINT-REMEDIATION-001.md` | create | This document |
| `governance/control/OPEN-SET.md` | update | Updated last-updated line |
| `governance/control/NEXT-ACTION.md` | update | Updated posture to reflect constraint remediation complete |

**No source code, schema.prisma, migrations, .env, or Prisma client changes made.**

---

## 10. Commit

```
docs(network-commerce): remediate pending approval pool entity constraint
```

Staged files: governance files only.
