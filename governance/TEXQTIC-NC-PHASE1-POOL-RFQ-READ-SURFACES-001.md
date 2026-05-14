# TEXQTIC-NC-PHASE1-POOL-RFQ-READ-SURFACES-001

**Status:** VERIFIED_COMPLETE  
**Date:** 2026-07-02 (implemented) / 2026-07-02 (verified)  
**Authorized by:** Paresh Patel (explicit verbal authorization in session prompt)  
**Governed unit:** Packet 17 — NC Pool RFQ Read Surfaces  
**Domain:** Network Commerce / Collective Procurement Pools / RFQ  

---

## Scope

Two owner/admin RFQ read surfaces for Network Commerce Collective Procurement Pools:

| Route | Service Method | Response |
|---|---|---|
| `GET /api/tenant/network-commerce/pools/:poolId/rfq` | `listPoolRfqsForOwner(ownerOrgId, poolId)` | 200 `NetworkPoolRfqRecord[]` |
| `GET /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId` | `getPoolRfqForOwner(ownerOrgId, poolId, rfqId)` | 200 `NetworkPoolRfqRecord` / 404 `RFQ_NOT_FOUND` |

---

## Design Decisions

**D-017-A — orgId authority:**  
`ownerOrgId` is sourced **exclusively** from `request.dbContext.orgId`. Never from path params or request body.

**Non-leaking scoping:**  
- List route: wrong `org_id` + `poolId` combination returns `[]` (empty array, no 404).  
- Detail route: wrong `org_id`, wrong `poolId`, or wrong `rfqId` → same `NetworkPoolRfqRfqNotFoundError` → 404 `RFQ_NOT_FOUND`. No information about whether the pool or RFQ exists for another org.

**Role gate:**  
OWNER + ADMIN may access. MEMBER → 403 `FORBIDDEN`. Gate is explicit in route handler via `userRole` check.

**Feature gate:**  
Two-gate `ownerRfqPreHandler = [ncPoolFeatureGateMiddleware, ncPoolRfqFeatureGateMiddleware]`.  
No supplier-invite gate or award gate required.

**DTO safety:**  
`metadataInternalJson` is excluded from all response DTOs via the existing `toRfqRecord()` private mapper — no change to mapper required.

**Supplier read surface deferred:**  
`GET /:poolId/rfq/:rfqId/supplier-view` (or equivalent) is NOT in scope for Packet 17. Deferred pending explicit authorization.

---

## Files Changed

| File | Change |
|---|---|
| `server/src/services/networkPoolRfq.service.ts` | Added `listPoolRfqsForOwner()` + `getPoolRfqForOwner()` methods |
| `server/src/routes/tenant/poolRfq.ts` | Added `ownerRfqPreHandler` + `GET /:poolId/rfq` + `GET /:poolId/rfq/:rfqId` |
| `server/src/__tests__/networkPoolRfq.service.unit.test.ts` | Added P-RFQ-READ-01..04 unit tests |
| `server/src/routes/tenant/poolRfq.integration.test.ts` | Added PRQ-READ-01..07 integration tests |

---

## Test Coverage

### Unit Tests (P-RFQ-READ-01..04)

| Code | Description | Result |
|---|---|---|
| P-RFQ-READ-01 | `listPoolRfqsForOwner` returns `[]` when `findMany` returns empty | PASS |
| P-RFQ-READ-02 | `listPoolRfqsForOwner` maps rows to DTOs, excludes `metadataInternalJson` | PASS |
| P-RFQ-READ-03 | `getPoolRfqForOwner` returns mapped record; verifies `findFirst` where clause | PASS |
| P-RFQ-READ-04 | `getPoolRfqForOwner` throws `NetworkPoolRfqRfqNotFoundError` when `findFirst` returns null | PASS |

**167/167 unit tests PASS** (4 new + 163 regression).

### Integration Tests (PRQ-READ-01..07)

| Code | Description |
|---|---|
| Code | Description | Result |
|---|---|---|
| PRQ-READ-01 | GET /:poolId/rfq → 200 with issued RFQ in result array | PASS (5935ms) |
| PRQ-READ-02 | GET /:poolId/rfq → 200 empty array when no RFQs | PASS (5222ms) |
| PRQ-READ-03 | GET /:poolId/rfq/:rfqId → 200 single RFQ record | PASS (5659ms) |
| PRQ-READ-04 | GET /:poolId/rfq/:rfqId → 404 RFQ_NOT_FOUND nonexistent rfqId | PASS (5611ms) |
| PRQ-READ-05 | GET /:poolId/rfq/:rfqId → 404 RFQ_NOT_FOUND wrong org (non-leaking) | PASS (5490ms) |
| PRQ-READ-06 | GET /:poolId/rfq → 503 FEATURE_DISABLED when rfq flag off | PASS (3731ms) |
| PRQ-READ-07 | GET /:poolId/rfq → 403 FORBIDDEN for MEMBER role | PASS (3065ms) |

**67/67 integration tests PASS** (7 new PRQ-READ + 60 regression). All 7 tests EXECUTED against live Supabase DB — not skipped (`hasDb=true`). Duration: 407.49s.

Verification points confirmed:
- `metadataInternalJson` not exposed (PRQ-READ-01, PRQ-READ-03 assertions)
- Non-leaking 404: wrong org returns same `RFQ_NOT_FOUND` as wrong rfqId (PRQ-READ-05 vs PRQ-READ-04)
- MEMBER role → 403 `FORBIDDEN` (PRQ-READ-07)
- RFQ flag disabled → 503 `FEATURE_DISABLED` (PRQ-READ-06)
- No direct live route probe performed (test harness used `withBypassForSeed` for fixture creation)

---

## Validation

- `tsc --noEmit` EXIT 0 — no TypeScript errors.
- `pnpm exec vitest run src/__tests__/networkPoolRfq.service.unit.test.ts` — 167/167 PASS.
- `git diff --name-only` — 7 files modified (4 source files + 3 governance files); 1 new governance artifact untracked (`governance/TEXQTIC-NC-PHASE1-POOL-RFQ-READ-SURFACES-001.md`).
- `pnpm exec vitest run src/routes/tenant/poolRfq.integration.test.ts` — 67/67 PASS. PRQ-READ-01..07 all PASS. Duration: 407.49s. `hasDb=true` (DATABASE_URL present). commit c08f053.

---

## Holds Unchanged

- `nc.procurement_pools.rfq.award.enabled` — `false`, unchanged. Middleware fails closed (`false !== true` → 503 `FEATURE_DISABLED`). Activation: HOLD_FOR_PARESH_DECISION.
- `nc.procurement_pools.supplier_quotes.enabled` — `false`, unchanged. QD-6 hold maintained.
- DPP Passport Network — HOLD_FOR_PARESH_DECISION. Unchanged.
- G-022 Escalation — HOLD_FOR_PARESH_DECISION. Unchanged.

---

## Proposed Commit

```
feat(network-commerce): add pool rfq read surfaces (Packet 17)

GET /:poolId/rfq  — listPoolRfqsForOwner, 2-gate, OWNER/ADMIN, non-leaking []
GET /:poolId/rfq/:rfqId — getPoolRfqForOwner, 2-gate, OWNER/ADMIN, 404 non-leaking

D-017-A: orgId from dbContext.orgId only. metadataInternalJson excluded.
4 unit tests P-RFQ-READ-01..04. 7 integration tests PRQ-READ-01..07.
167/167 unit PASS. tsc --noEmit EXIT 0.

TEXQTIC-NC-PHASE1-POOL-RFQ-READ-SURFACES-001
```

---

*VERIFIED_COMPLETE — 2026-07-02. Paresh Patel runtime verification passed. commit c08f053. Governance close commit: docs(network-commerce): verify pool rfq read surfaces.*
