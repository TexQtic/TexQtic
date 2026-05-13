# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001

**Packet:** TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001  
**Status:** `TEXQTIC_NC_PHASE1_POOL_RFQ_AWARD_MAKER_CHECKER_ROUTE_001_ROUTE_VERIFIED_COMPLETE`  
**Date:** 2026-07-01  
**Scope:** HTTP route layer — award maker-checker for Pool RFQ quote acceptance. No frontend, no schema changes.

---

### Plan

Add 4 new Fastify routes to `server/src/routes/tenant/poolRfq.ts` exposing the G-021 maker-checker service methods:
- `POST /:poolId/rfq/:rfqId/quotes/:quoteId/award-request` (MAKER → 201)
- `POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/approve` (CHECKER → 200)
- `POST /:poolId/rfq/:rfqId/award-approvals/:approvalId/reject` (CHECKER → 200)
- `GET /:poolId/rfq/:rfqId/award-approvals` (READ → 200)

All routes behind `ownerAwardPreHandler` (existing 3-gate preHandler chain: feature gate → org auth → pool ownership).  
16 unit tests (MC-ROUTE-01 through MC-ROUTE-16) covering feature-gate disabled, happy paths, all 6 error mappings, DTO shape, and legacy compat.

No frontend, no schema.prisma, no migrations, no .env, no feature flags activated.

---

### Findings / Root Cause

**Context:** SERVICE-001 (commit `ef3133f`) added the 4 service methods. This packet adds the HTTP surface.

**Findings from implementation:**
- MC service methods `requestAward`, `approveAward`, `rejectAwardApproval` declare `makerUserId: string` / `checkerUserId: string` (non-nullable), unlike the legacy `acceptQuote` which accepts `string | null`. A userId null-guard is required on all 3 mutating routes before calling the service.
- 4 of 6 MC error classes take 0-arg constructors: `AwardRequestAlreadyPendingError`, `ApprovalNotFoundError`, `ApprovalExpiredError`, `MakerCheckerSameActorError`. Two take 1 arg (currentStatus): `ApprovalAlreadyDecidedError`, `QuoteNoLongerSubmittedError`.
- TypeScript required an `approvalParamSchema` (poolId, rfqId, approvalId) for the approve/reject routes, as those routes address an `approvalId` rather than a `quoteId`.
- In Vitest 4.x, class constructor mocks must use `function()` syntax (not arrow functions) to allow `this`-based construction: `vi.fn().mockImplementation(function() { return mockSvc as any; })`.

---

### Files Changed

1. `server/src/routes/tenant/poolRfq.ts` — added 6 MC error imports, `approvalParamSchema`, 3 MC body schemas, `mapMakerCheckerError`, 4 new routes
2. `server/src/__tests__/networkPoolRfq.routes.unit.test.ts` — created; 16 unit tests MC-ROUTE-01 through MC-ROUTE-16

---

### Changes Made

#### `server/src/routes/tenant/poolRfq.ts`

**1 — 6 MC error class imports** (added to existing import from `networkPoolRfq.service.js`):
```
NetworkPoolRfqAwardRequestAlreadyPendingError,
NetworkPoolRfqApprovalNotFoundError,
NetworkPoolRfqApprovalAlreadyDecidedError,
NetworkPoolRfqApprovalExpiredError,
NetworkPoolRfqMakerCheckerSameActorError,
NetworkPoolRfqQuoteNoLongerSubmittedError,
```

**2 — `approvalParamSchema`** (after `rfqQuoteParamSchema`):
```typescript
const approvalParamSchema = z.object({
  poolId:     uuidSchema,
  rfqId:      uuidSchema,
  approvalId: uuidSchema,
});
```

**3 — 3 MC body schemas** (after `rejectQuoteBodySchema`):
- `requestAwardBodySchema`: `request_reason` (string, max 5000, required), `request_id?` (nullable, max 255). `.strict()`
- `approveAwardBodySchema`: `approve_reason` (string, max 5000, required), `request_id?` (nullable, max 255). `.strict()`
- `rejectAwardApprovalBodySchema`: `reject_reason` (string, max 5000, required), `request_id?` (nullable, max 255). `.strict()`

**4 — `mapMakerCheckerError`** (after `mapAwardRouteError`):

| Error Class | Code | HTTP |
|---|---|---|
| `NetworkPoolRfqAwardRequestAlreadyPendingError` | `AWARD_REQUEST_ALREADY_PENDING` | 409 |
| `NetworkPoolRfqApprovalNotFoundError` | `APPROVAL_NOT_FOUND` | 404 |
| `NetworkPoolRfqApprovalAlreadyDecidedError` | `APPROVAL_ALREADY_DECIDED` | 409 |
| `NetworkPoolRfqApprovalExpiredError` | `APPROVAL_EXPIRED` | 409 |
| `NetworkPoolRfqMakerCheckerSameActorError` | `MAKER_CHECKER_SAME_ACTOR` | 409 |
| `NetworkPoolRfqQuoteNoLongerSubmittedError` | `QUOTE_NO_LONGER_SUBMITTED` | 409 |

**5 — 4 new routes** (inside `poolRfqRoutes` plugin, after existing `/reject` route):

All routes use `ownerAwardPreHandler`. The 3 mutating routes include:
```typescript
const userId = request.userId;
if (!userId) return sendError(reply, 'UNAUTHORIZED', 'User identity required for maker-checker actions', 401);
```

Route → service call → response code:
- `POST /quotes/:quoteId/award-request` → `svc.requestAward(orgId, userId, poolId, rfqId, quoteId, body)` → 201
- `POST /award-approvals/:approvalId/approve` → `svc.approveAward(orgId, userId, approvalId, body)` → 200
- `POST /award-approvals/:approvalId/reject` → `svc.rejectAwardApproval(orgId, userId, approvalId, body)` → 200
- `GET /award-approvals` → `svc.getOwnerPendingAwardApprovals(orgId, poolId, rfqId)` → 200

Old `/accept` route: **preserved unchanged** (still calls `svc.acceptQuote(...)`).

---

#### `server/src/__tests__/networkPoolRfq.routes.unit.test.ts`

New file — 16 unit tests:

| Test ID | Description | Expected |
|---|---|---|
| MC-ROUTE-01 | feature gate disabled → award-request | 503 FEATURE_DISABLED |
| MC-ROUTE-02 | feature gate disabled → approve | 503 FEATURE_DISABLED |
| MC-ROUTE-03 | feature gate disabled → reject | 503 FEATURE_DISABLED |
| MC-ROUTE-04 | feature gate disabled → list | 503 FEATURE_DISABLED |
| MC-ROUTE-05 | award-request happy path | 201 AwardApprovalRequest |
| MC-ROUTE-06 | approve happy path | 200 AwardApproved |
| MC-ROUTE-07 | reject happy path | 200 AwardRejected |
| MC-ROUTE-08 | list happy path | 200 array |
| MC-ROUTE-09 | AwardRequestAlreadyPendingError | 409 AWARD_REQUEST_ALREADY_PENDING |
| MC-ROUTE-10 | ApprovalNotFoundError | 404 APPROVAL_NOT_FOUND |
| MC-ROUTE-11 | ApprovalAlreadyDecidedError + ApprovalExpiredError | 409 APPROVAL_ALREADY_DECIDED / APPROVAL_EXPIRED |
| MC-ROUTE-12 | MakerCheckerSameActorError | 409 MAKER_CHECKER_SAME_ACTOR |
| MC-ROUTE-13 | QuoteNoLongerSubmittedError | 409 QUOTE_NO_LONGER_SUBMITTED |
| MC-ROUTE-14 | Old /accept route still exists | calls acceptQuote |
| MC-ROUTE-15 | Old /accept does NOT call requestAward | legacy isolation |
| MC-ROUTE-16 | List response exposes only AwardApprovalRequest DTO fields | DTO shape |

---

### Validation Run

```
pnpm -C server vitest run networkPoolRfq.routes.unit.test.ts
→ 16/16 PASS

pnpm -C server vitest run (regression)
→ 163/163 PASS

pnpm -C server exec tsc --noEmit
→ EXIT 0
```

---

### Risks / Follow-up

1. **Feature flag activation required before E2E testing.** `nc.procurement_pools.rfq.award.enabled` is absent in production. All 4 MC routes fail closed (503 FEATURE_DISABLED). Activation requires explicit Paresh decision.
2. **FE-10 (Award Frontend) is still HOLD_FOR_PARESH_DECISION.** No frontend surfaces these routes yet.
3. **G-022 Escalation** design is a deferred candidate; requires explicit Paresh authorization before opening.
4. **QD-6 hold** on `supplier_quotes.enabled=false` is unchanged — quote submission path still gated.

---

### Commit

`8d10fdf` — `feat(network-commerce): add award maker checker routes`

**Files committed:**
- `server/src/routes/tenant/poolRfq.ts` (+321 lines)
- `server/src/__tests__/networkPoolRfq.routes.unit.test.ts` (+542 lines)

---

### Governance Confirmations

- ✅ No schema.prisma, migration, or DB changes
- ✅ No .env or feature flag activation
- ✅ No frontend changes
- ✅ Old `/accept` route preserved unchanged
- ✅ `nc.procurement_pools.rfq.award.enabled` ABSENT (fail-closed)
- ✅ `nc.procurement_pools.supplier_quotes.enabled=false` (QD-6 hold unchanged)
- ✅ DPP HOLD_FOR_PARESH_DECISION unchanged
- ✅ `tsc --noEmit` EXIT 0
- ✅ 163/163 service regression PASS
- ✅ 16/16 route unit tests PASS
