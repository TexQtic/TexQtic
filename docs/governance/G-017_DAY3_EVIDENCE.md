# G-017 — Day 3 Implementation Evidence
## Task ID: G-017-DAY3-ROUTES-INTEGRATION

**Status:** COMPLETE  
**Gate:** Gate E (Trade Domain Foundation)  
**Phase:** Day 3 — Routes + Audit Emission + Integration Tests

---

## 1. Scope + Allowlist Confirmation

### Files Created (Allowlisted)

| File | Status |
|---|---|
| `server/src/routes/tenant/trades.g017.ts` | ✅ CREATED |
| `server/src/routes/control/trades.g017.ts` | ✅ CREATED |
| `server/src/__tests__/trades.g017.integration.test.ts` | ✅ CREATED |
| `docs/governance/G-017_DAY3_EVIDENCE.md` | ✅ CREATED |
| `governance/wave-execution-log.md` | ✅ MODIFIED (append-only) |

### Files Modified (Allowlisted)

| File | Status |
|---|---|
| `server/src/routes/tenant.ts` | ✅ MODIFIED — plugin import + register |
| `server/src/routes/control.ts` | ✅ MODIFIED — plugin import + register |
| `server/src/utils/audit.ts` | ✅ MODIFIED — 4 trade audit factories appended |

### Files NOT Touched

| File | Status |
|---|---|
| `server/prisma/schema.prisma` | ❌ NOT TOUCHED — schema frozen |
| Any migration file | ❌ NOT TOUCHED — no DB changes in Day 3 |
| `server/src/services/trade.g017.service.ts` | 🔒 READ-ONLY — used, not modified |
| `server/src/services/stateMachine.service.ts` | 🔒 READ-ONLY |
| `server/src/services/escalation.service.ts` | 🔒 READ-ONLY |

---

## 2. Route Inventory

### Tenant Plane — `server/src/routes/tenant/trades.g017.ts`

Plugin registered at: `/api/tenant/trades`

| Method | Path | Handler | Status |
|---|---|---|---|
| POST | `/` | Create trade in DRAFT state | ✅ |
| POST | `/:id/transition` | Lifecycle transition with audit | ✅ |

**Constitutional Compliance:**
- `D-017-A`: `tenantId` ALWAYS from `dbContext.orgId` (JWT); body has `z.never()` guard
- `D-022-B`: freeze gate enforced by `TradeService.transitionTrade()`
- Audit written INSIDE same `withDbContext` callback as the trade mutation (atomic)

**Proxy pattern (`makeTxBoundPrisma`):**
- Wraps `Prisma.TransactionClient` as a `PrismaClient` proxy
- Intercepts `.$transaction(cb)` calls → redirects to `cb(tx)` within the open transaction
- Preserves RLS context while allowing `TradeService` (which calls `this.db.$transaction()`) to function correctly

**HTTP status codes (tenant POST /):**
- `201 CREATED` — trade created successfully
- `422 UNPROCESSABLE_ENTITY` — service returns ERROR
- `401/403` — auth/authz failure
- `400 BAD_REQUEST` — validation failure (Zod)

**HTTP status codes (tenant POST /:id/transition):**
- `200 OK` — APPLIED
- `202 ACCEPTED` — PENDING_APPROVAL
- `401/403/404` — auth/entity errors
- `422` — ERROR (generic)
- `423 LOCKED` — FROZEN_BY_ESCALATION

### Control Plane — `server/src/routes/control/trades.g017.ts`

Plugin registered at: `/api/control/trades`

| Method | Path | Handler | Status |
|---|---|---|---|
| GET | `/` | List trades cross-tenant (admin) | ✅ |
| POST | `/:id/transition` | Admin-driven lifecycle transition | ✅ |

**Auth:** Inherits global `adminAuthMiddleware` from `control.ts` parent.

**`withTradeAdminContext` helper:** Opens `withDbContext` then executes `SET LOCAL app.is_admin = 'true'` to bypass RLS for admin operations.

---

## 3. Audit Factory Inventory (appended to `server/src/utils/audit.ts`)

| Factory | Action | Realm | ActorType |
|---|---|---|---|
| `createTradeCreatedAudit` | `TRADE_CREATED` | parameterized | `USER` / `ADMIN` |
| `createTradeTransitionAppliedAudit` | `TRADE_TRANSITION_APPLIED` | parameterized | `USER` / `ADMIN` |
| `createTradeTransitionPendingAudit` | `TRADE_TRANSITION_PENDING` | parameterized | `USER` / `ADMIN` |
| `createTradeTransitionRejectedAudit` | `TRADE_TRANSITION_REJECTED` | parameterized | `USER` / `ADMIN` |

All factories use base type `TradeAuditBase = { realm, tenantId, actorType, actorId, tradeId }`.

---

## 4. Integration Test Coverage

File: `server/src/__tests__/trades.g017.integration.test.ts`

### Tenant Plane Tests

| ID | Description | Assertion |
|---|---|---|
| T-001 | POST / returns 201 on CREATED | statusCode=201, body.data.tradeId |
| T-002 | POST / writes TRADE_CREATED audit | writeAuditLog called once, action=TRADE_CREATED |
| T-003 | POST / rejects tenantId in body (D-017-A) | statusCode=400 (Zod `z.never()`) |
| T-004 | POST / returns 400 for invalid currency | statusCode=400 |
| T-005 | POST / returns 422 on service ERROR | statusCode=422, body.error.code=DB_ERROR |
| T-006 | POST /:id/transition returns 200 on APPLIED | statusCode=200, body.data.status=APPLIED |
| T-007 | POST /:id/transition emits APPLIED audit | writeAuditLog, action=TRADE_TRANSITION_APPLIED, fromStateKey/toStateKey |
| T-008 | POST /:id/transition returns 202 on PENDING_APPROVAL | statusCode=202, body.data.requiredActors |
| T-008b | POST /:id/transition emits PENDING audit | writeAuditLog, action=TRADE_TRANSITION_PENDING, requiredActors |
| T-009 | POST /:id/transition returns 423 on FROZEN | statusCode=423 |
| T-009b | POST /:id/transition emits REJECTED audit on ERROR | writeAuditLog, action=TRADE_TRANSITION_REJECTED |
| T-010 | Transition rejects tenantId in body | statusCode=400 |

### Control Plane Tests

| ID | Description | Assertion |
|---|---|---|
| C-001 | GET /trades returns 200 with trade list | statusCode=200, body.data.trades array, count |
| C-002 | POST /:id/transition returns 200 on APPLIED | statusCode=200, body.data.status=APPLIED |
| C-002b | POST /:id/transition writes audit with realm=ADMIN | writeAuditLog, action=TRADE_TRANSITION_APPLIED, realm=ADMIN, actorType=ADMIN |
| C-003 | POST /:id/transition returns 404 on NOT_FOUND | statusCode=404 |
| C-004 | POST /:id/transition returns 423 on FROZEN | statusCode=423 |

---

## 5. Verification Evidence

### Pre-implementation git preflight

```
git diff --name-only  (shows only Day 3 allowlisted files)
git status --short    (clean working tree before changes)
```

### TypeScript Compilation

```
pnpm -C server exec tsc --noEmit
TSC exit: 0
```

### Integration Test Run

```
pnpm -C server exec vitest run src/__tests__/trades.g017.integration.test.ts

 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  17:23:51
   Duration  756ms
```

---

## 6. Mock Pattern (Key Engineering Note)

Integration tests use Vitest `vi.hoisted()` + factory mock pattern to avoid hoisting issues with `vi.mock()`:

```typescript
// vi.hoisted() ensures variables are initialized before vi.mock() factories run
const { FAKE_TX, _svc } = vi.hoisted(() => ({
  FAKE_TX: { $executeRaw: vi.fn().mockResolvedValue(undefined), ... },
  _svc:    { createTrade: vi.fn(), transitionTrade: vi.fn() },
}));

// Factory mock: TradeService constructor returns _svc
vi.mock('../services/trade.g017.service.js', () => ({
  TradeService: vi.fn(function () { return _svc; }),  // function keyword required — Vitest v4 calls new impl()
}));

// beforeEach: reset _svc methods — the factory closure picks up new references
_svc.createTrade     = vi.fn();
_svc.transitionTrade = vi.fn();
```

**Vitest v4 gotcha:** `vi.fn().mockImplementation(() => ({}))` (arrow function) throws `TypeError: () => ({}) is not a constructor` when the mock is called with `new`. All constructor mocks must use the `function` keyword.

---

## 7. Governance Review

| Category | Status |
|---|---|
| db-naming-rules.md | N/A — no schema changes |
| schema-budget.md | N/A — no new tables |
| rls-policy.md | N/A — RLS unchanged |
| openapi.tenant.json | ⚠️ Routes documented in evidence; OpenAPI update deferred |
| openapi.control-plane.json | ⚠️ Same |
| event-names.md | N/A — no new events |
| ARCHITECTURE-GOVERNANCE.md | ✅ Routes follow control/tenant plane boundary |
