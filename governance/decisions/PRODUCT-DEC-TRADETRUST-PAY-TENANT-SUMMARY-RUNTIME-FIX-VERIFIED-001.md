# PRODUCT-DEC-TRADETRUST-PAY-TENANT-SUMMARY-RUNTIME-FIX-VERIFIED-001

**Status:** VERIFIED AND CLOSED
**Date:** 2026-05-04
**Domain:** TradeTrust Pay (TTP) — Tenant Plane
**Unit:** Unit 5

---

## 1. Decision Summary

The `GET /api/tenant/trades/:tradeId/ttp-summary` endpoint was producing HTTP 500 (empty body) in production. The root cause was confirmed as a connection pool deadlock. The fix has been implemented, unit-tested (24/24 pass), committed, deployed, and verified via E2E tests against production.

---

## 2. Root Cause

**Mechanism:** Connection pool deadlock caused by nested Prisma client usage.

The route handler called `withDbContext(prisma, ...)` which opens a `prisma.$transaction()`. Inside that transaction callback, `TtpSummaryService.getTradeTtpSummary()` called `this.rootDb.trade.findUnique()` — where `this.rootDb` was the same outer `prisma` client.

With Supabase serverless pooler configured at `connection_limit=1`, this meant the inner call attempted to acquire a second connection from the pool while the outer transaction already held the only available connection. This resulted in a deadlock. Vercel's 10-second function timeout fired, returning an empty HTTP 500 body.

---

## 3. Fix Applied

**Commit:** `c6af1a6` — `[TEXQTIC] backend: fix ttp-summary connection pool deadlock (Unit 5)`
**Predecessor commit:** `e2a20de` — `fix(tradetrust-pay): repair tenant ttp-summary runtime (Unit 5)`

**Files modified:**
- `server/src/routes/tenant/ttp-summary.ts`
- `server/src/services/ttpSummary.service.ts`

**Route change (`ttp-summary.ts`):**
The trade record is now pre-fetched via `(prisma as any).trade.findUnique()` OUTSIDE `withDbContext`, before the `$transaction` opens. The pre-fetched record is passed as `preloadedTrade` to the service.

**Service change (`ttpSummaryService.ts`):**
`getTradeTtpSummary()` accepts an optional `preloadedTrade` parameter. When provided, the internal DB lookup for the trade is skipped entirely. No second connection is needed inside the transaction.

---

## 4. Buyer Summary Access Decision

**Decision:** Buyer tenants CAN access `ttp-summary` for trades in which they are a party.

**Rationale:** The service performs a party-membership check — it validates that `actorOrgId` matches either `trade.sellerOrgId` or `trade.buyerOrgId`. Buyers satisfy this check for their trades. This is the correct B2B behavior: both parties to a trade should be able to inspect the TTP summary for that trade.

**Access matrix:**

| Actor | Condition | Access |
|---|---|---|
| Seller | `actorOrgId === trade.sellerOrgId` | ✅ Allowed — `actor_role=SELLER` |
| Buyer | `actorOrgId === trade.buyerOrgId` | ✅ Allowed — `actor_role=BUYER` |
| Third party | Neither condition | ❌ Denied — 403 |

---

## 5. Verification Evidence

### Unit Tests
- File: `server/src/__tests__/ttp-summary.service.unit.test.ts`
- Result: **24/24 PASS** (TC-001 through TC-024)
- TypeScript: clean (no errors)

### E2E Production Tests

**E2E-01 — Seller access (primary fix verification)**
```
GET /api/tenant/trades/ee000000-0000-0000-0000-000000000010/ttp-summary
Authorization: Bearer <seller-token>

HTTP 200
{
  "success": true,
  "data": {
    "trade_id": "ee000000-0000-0000-0000-000000000010",
    "trade_reference": "QA-TRADE-TTP-001",
    "currency": "INR",
    "trade_lifecycle_state": "DRAFT",
    "seller_org_id": "ee000000-0000-0000-0000-000000000001",
    "buyer_org_id": "ee000000-0000-0000-0000-000000000002",
    "actor_role": "SELLER",
    ...
  }
}
```
Result: **PASS** ✅

**E2E-04 — Buyer access (buyer summary access verification)**
```
GET /api/tenant/trades/ee000000-0000-0000-0000-000000000010/ttp-summary
Authorization: Bearer <buyer-token>

HTTP 200
{
  "success": true,
  "data": {
    "trade_id": "ee000000-0000-0000-0000-000000000010",
    "trade_reference": "QA-TRADE-TTP-001",
    "currency": "INR",
    "trade_lifecycle_state": "DRAFT",
    "seller_org_id": "ee000000-0000-0000-0000-000000000001",
    "buyer_org_id": "ee000000-0000-0000-0000-000000000002",
    "actor_role": "BUYER",
    ...
  }
}
```
Result: **PASS** ✅

### Feature Flag State
- `ttp_enabled` set to `true` for E2E testing window only.
- Restored to `false` (`UPDATE 1`) immediately after E2E-04 completed. ✅

---

## 6. Activation Readiness Status

| Criterion | Status |
|---|---|
| HTTP 500 root cause identified | ✅ Connection pool deadlock confirmed |
| Fix implemented and committed | ✅ Commit `c6af1a6` |
| Unit tests pass (24/24) | ✅ |
| TypeScript clean | ✅ |
| Production health check HTTP 200 | ✅ |
| E2E-01 seller HTTP 200 | ✅ |
| E2E-04 buyer HTTP 200 | ✅ |
| `ttp_enabled` restored to false | ✅ |
| Buyer access decision documented | ✅ |

**Recommendation:** The `ttp-summary` endpoint is production-ready from a runtime correctness standpoint. The TTP feature can be activated (set `ttp_enabled=true`) when product/business sign-off is obtained. No further backend work is required for this endpoint.

**Note:** Activation of `ttp_enabled=true` in production should be a deliberate product decision — not a side effect of testing. This record documents that the technical gate is clear.

---

## 7. QA Sentinel References

| Role | UUID |
|---|---|
| QA Seller Tenant | `ee000000-0000-0000-0000-000000000001` |
| QA Buyer Tenant | `ee000000-0000-0000-0000-000000000002` |
| QA Trade | `ee000000-0000-0000-0000-000000000010` |
| QA Seller User | `ee000000-0000-0000-0000-000000000101` |
| QA Buyer User | `ee000000-0000-0000-0000-000000000102` |
