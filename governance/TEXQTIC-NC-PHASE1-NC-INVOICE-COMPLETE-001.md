# TEXQTIC-NC-PHASE1-NC-INVOICE-COMPLETE-001
## NC Invoice Read Routes — Packet 19

**Status:** VERIFIED_COMPLETE
**Date:** 2026-07-03
**Authorized by:** Paresh Patel (verbal authorization, preceding session)
**Predecessor:** TEXQTIC-NC-PHASE1-POOL-ORDER-001 (VERIFIED_COMPLETE 2026-07-02, commit a4c788c)

---

## Objective

Complete the Network Commerce invoice backend read-surface after Packet 18 Pool Order
was VERIFIED_COMPLETE. Scope: read surfaces only. No schema changes, no migrations,
no frontend, no invoice CREATE route.

---

## Scope

| Item | Included | Excluded |
|---|---|---|
| `listNetworkInvoicesForPool` service method | ✅ | |
| `GET /:poolId/invoices` (list route) | ✅ | |
| `GET /:poolId/invoices/:invoiceId` (detail route) | ✅ | |
| Unit tests P-NI-10..12 | ✅ | |
| Integration tests NILIST-01..06, NIGET-01..06 | ✅ | 12/12 PASS — hasDb=true, live Supabase |
| Invoice CREATE route | | ❌ internal lifecycle only |
| Schema / migration | | ❌ no changes |
| Frontend | | ❌ none |
| Feature flag creation/activation | | ❌ none |
| Settlement / payment / escrow | | ❌ Packet 20 |

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `server/src/services/networkInvoice.service.ts` | Modified | Added `listNetworkInvoicesForPool(orgId, poolId)` method |
| `server/src/routes/tenant/networkInvoices.ts` | **Created** | Fastify plugin with 2 GET routes |
| `server/src/routes/tenant.ts` | Modified | Added import + `fastify.register(tenantNetworkInvoiceRoutes, ...)` |
| `server/src/__tests__/network-invoice.service.unit.test.ts` | Modified | Added P-NI-10..12 tests; `findMany` in `makeDb` |
| `server/src/routes/tenant/networkInvoices.integration.test.ts` | **Created** | 12 integration tests (NILIST/NIGET) |

---

## Route Contract

All routes are pool-scoped. Both routes sit behind `ncPoolFeatureGateMiddleware` (global flag
`nc.procurement_pools.enabled` + optional per-tenant override).

### GET `/api/tenant/network-commerce/pools/:poolId/invoices`

- **Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`
- **Gate:** `ncPoolFeatureGateMiddleware`
- **Validation:** `poolId` must be a UUID (422 if invalid)
- **Pool ownership:** `prisma.networkPool.findFirst({ where: { id: poolId, orgId } })` — 404 `POOL_NOT_FOUND` if absent (non-leaking)
- **Response 200:** `{ success: true, data: { invoices: NetworkInvoiceRecord[], count: number } }`

### GET `/api/tenant/network-commerce/pools/:poolId/invoices/:invoiceId`

- **Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware`
- **Gate:** `ncPoolFeatureGateMiddleware`
- **Validation:** `poolId` + `invoiceId` must be UUIDs (422 if invalid)
- **Service call:** `NetworkInvoiceService.getNetworkInvoiceById(orgId, invoiceId)` — 404 if null (non-leaking)
- **Pool scoping:** `record.network_entity_id !== poolId` → 404 (non-leaking)
- **Response 200:** `{ success: true, data: { invoice: NetworkInvoiceRecord } }`

---

## Service Change: `listNetworkInvoicesForPool`

```ts
async listNetworkInvoicesForPool(
  orgId: string,
  poolId: string,
): Promise<NetworkInvoiceRecord[]> {
  const rows = await (this.db as any).network_invoices.findMany({
    where: {
      org_id:               orgId,
      network_entity_type:  'POOL',
      network_entity_id:    poolId,
    },
    orderBy: { created_at: 'desc' },
  });
  return rows.map((r: Record<string, unknown>) => this.toRecord(r));
}
```

D-017-A compliant: `orgId` sourced from `dbContext.orgId` in the route handler.
Uses `(this.db as any).network_invoices.findMany(...)` — consistent with existing service pattern.

---

## Tenant.ts Registration

```ts
import tenantNetworkInvoiceRoutes from './tenant/networkInvoices.js';
// ...
await fastify.register(tenantNetworkInvoiceRoutes, { prefix: '/tenant/network-commerce/pools' });
```

Registered immediately after `tenantPoolRfqSupplierQuotesRoutes`.

---

## Validation Results

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ EXIT 0 — zero errors; `Prisma.Decimal` from `@prisma/client` resolves cleanly |
| Unit tests (network-invoice.service.unit.test.ts) | ✅ 19/19 PASS (P-NI-01..12 + F-NI-01..07) |
| Integration tests | ✅ 12/12 PASS (NILIST-01..06, NIGET-01..06) — hasDb=true, executed against live Supabase (12:10:36 UTC 2026-07-03, duration 63.67s) |

---

## Governance Invariants (UNCHANGED)

| Invariant | Status |
|---|---|
| `nc.procurement_pools.rfq.award.enabled` | `false` — UNCHANGED |
| DPP Passport Network launch gate | `HOLD_FOR_PARESH_DECISION` — UNCHANGED |
| G-022 | `HOLD_FOR_PARESH_DECISION` — UNCHANGED |
| QA fixture Pool=74436ecd (ACCEPTED) | NOT TOUCHED |
| Settlement / escrow / Packet 20 | NOT_STARTED — UNCHANGED |

---

## Verification Checklist (for Paresh)

- [x] `pnpm exec tsc --noEmit` → EXIT 0
- [x] `pnpm -C server exec vitest run src/__tests__/network-invoice.service.unit.test.ts` → 19/19 PASS
- [x] `pnpm -C server exec vitest run src/routes/tenant/networkInvoices.integration.test.ts` → 12/12 PASS (hasDb=true — live Supabase, 12:10:36 UTC 2026-07-03)
- [x] Packet 18 regression: 64/64 PASS (pools.integration.test.ts)
- [x] Packet 17 regression: 117/117 PASS (poolRfq + poolRfqInvites)

---

## Blocker Remediation Record (TEXQTIC-NC-PHASE1-NC-INVOICE-COMPLETE-RUNTIME-BLOCKER-REMEDIATION-001)

Initial integration run (pre-fix) produced 7 failures. Three root causes identified and fixed:

| Fix | Root Cause | Change |
|---|---|---|
| Fix 1 | `sendValidationError` is hardcoded 400; tests NILIST-03 + NIGET-03 expected 422 | Replaced 2 calls with `sendError(reply, 'VALIDATION_ERROR', 'Validation failed', 422, ...)` in `networkInvoices.ts`; removed unused `sendValidationError` import |
| Fix 2 | Prisma accessor used DB table name `network_invoices` instead of camelCase model name `networkInvoice` | All 4 accessor calls → `networkInvoice`; all `where`/`data`/`orderBy` field names → camelCase throughout `networkInvoice.service.ts` |
| Fix 3 | Unit test mock key `network_invoices` + `makeRow()` snake_case keys did not match fixed service | `makeDb` default key → `networkInvoice`; `makeRow()` all fields → camelCase; `findArgs.where` assertions → camelCase |

Post-fix results: 12/12 integration PASS, 19/19 unit PASS, tsc EXIT 0.

---

*Packet 20 (TEXQTIC-NC-PHASE1-POOL-SETTLE-001) requires explicit Paresh authorization before implementation begins.*
