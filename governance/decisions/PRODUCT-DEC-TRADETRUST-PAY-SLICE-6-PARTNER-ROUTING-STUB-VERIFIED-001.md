# PRODUCT-DEC-TRADETRUST-PAY-SLICE-6-PARTNER-ROUTING-STUB-VERIFIED-001

**Decision Date:** 2026-05-04
**Slice:** TradeTrust Pay — Slice 6: Partner Routing Stub
**Status:** SLICE_6_PARTNER_ROUTING_STUB_IMPLEMENTATION_VERIFIED_COMPLETE
**Implementation Commit:** `8884816`
**Design Authority:** `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md`

---

## 1. Verification Summary

`IMPLEMENTATION_VERIFIED` — all unit, typecheck, and build gates pass.

Production runtime verification is deferred pending a deploy cycle. Route smoke tests (`GET /api/control/ttp/routing-stubs/:vpcId` — unauthenticated → 401) must be confirmed post-deploy before this record is upgraded to `PRODUCTION_VERIFIED`.

---

## 2. Implementation Commit

| Item | Value |
|---|---|
| Commit hash | `8884816` |
| Branch | `main` |
| Commit message | `feat(tradetrust-pay): add partner routing stub` |
| Files changed | 7 (5 created, 2 modified) |
| Insertions | 1,252 |

---

## 3. Files Changed

| File | Change | Description |
|---|---|---|
| `server/src/services/partnerRouting.service.ts` | CREATED | `PartnerRoutingService` — create-on-read stub builder |
| `server/src/__tests__/partner-routing.service.unit.test.ts` | CREATED | 20 unit tests for PartnerRoutingService |
| `server/src/routes/control/ttp-routing-stubs.ts` | CREATED | `GET /api/control/ttp/routing-stubs/:vpcId` Fastify plugin |
| `server/src/routes/control.ts` | MODIFIED | Import + register `controlTtpRoutingStubRoutes` under `/ttp` prefix |
| `services/partnerRoutingService.ts` | CREATED | Frontend API client — `adminGetPartnerRoutingStub()` |
| `components/ControlPlane/PartnerRoutingStubPanel.tsx` | CREATED | Read-only admin panel UI for routing stub display |
| `components/ControlPlane/VpcConsole.tsx` | MODIFIED | "View Routing Stub" button for ACTIVE and ROUTING_READY VPCs |

---

## 4. Functionality Established

### Backend

- **`PartnerRoutingService.getOrCreateRoutingStub(vpcId, adminId)`**
  - Loads VPC from `verified_payable_certificates`
  - Resolves lifecycle state from `lifecycleState`
  - Gates: VOIDED → `RoutingStubVpcVoidedError`; EXPIRED → `RoutingStubVpcExpiredError`; other terminal → `RoutingStubVpcTerminalError`; must be ACTIVE or ROUTING_READY
  - Checks for existing PENDING stub in `partner_routing_stubs` — returns it if found (idempotent)
  - If no existing stub: loads invoice, seller org, buyer org, GST, eligibility, trade; builds safe payload; persists new stub row
  - Returns `AdminRoutingStubRecord` — never exposes `response_json`, `raw_bureau_json`, `raw_verification_json`

- **`GET /api/control/ttp/routing-stubs/:vpcId`**
  - Auth: `requireAdminRole('SUPER_ADMIN')` — no tenant access
  - Validates `vpcId` as UUID via Zod
  - Two-step DB context: read-only snapshot of `seller_org_id`, then write context for stub creation
  - Error mapping: `RoutingStubVpcNotFoundError` → 404; Voided/Expired → 400; Terminal → 409

- **Route registration:** `controlTtpRoutingStubRoutes` registered under `/ttp` prefix in `control.ts`

### Frontend

- **`adminGetPartnerRoutingStub(vpcId)`** — calls `GET /api/control/ttp/routing-stubs/:vpcId` via `adminGet`
- **`PartnerRoutingStubPanel`** — modal panel with Load button; displays all safe stub payload fields in sections (VPC, Invoice, Seller, Buyer, Trade, TTP Eligibility, Metadata); no Send/Transmit/Fund button
- **`VpcConsole`** — "View Routing Stub" button rendered for ACTIVE and ROUTING_READY VPCs; opens `PartnerRoutingStubPanel` modal for the selected VPC

---

## 5. Routing Stub Boundary

| Boundary | Status |
|---|---|
| Stub `transmission_status` always `PENDING` | ✅ ENFORCED — never set to TRANSMITTED |
| `transmitted_at` never set on create | ✅ ENFORCED — field absent from create payload |
| No external partner API calls | ✅ ENFORCED — TC-010 passes with fetch spy |
| No escrow_transactions mutation | ✅ ENFORCED — TC-011: model absent from mock |
| No escrow_accounts mutation | ✅ ENFORCED — TC-012: model absent from mock |
| No VPC state change | ✅ ENFORCED — TC-014: no `.update` call on VPC |
| Idempotent: existing PENDING stub returned as-is | ✅ ENFORCED — TC-015, TC-016 |
| `raw_bureau_json` excluded from select | ✅ ENFORCED — TC-007 verifies select shape |
| `raw_verification_json` excluded from select | ✅ ENFORCED — TC-008 verifies select shape |
| No bank/payment credentials in payload | ✅ ENFORCED — TC-009 |
| Disclaimer present: "no partner transmission… not a payment guarantee" | ✅ ENFORCED — TC-018 |
| No tenant-facing routing endpoint | ✅ ENFORCED — route only in control routes, SUPER_ADMIN only |
| No "Send/Transmit/Fund" button in UI | ✅ ENFORCED — PartnerRoutingStubPanel has no action buttons |

---

## 6. Verification Evidence

### TypeScript

```
pnpm exec tsc --noEmit  (server/)
→ No errors
```

### Unit Tests — Slice 6 (New)

```
pnpm exec vitest run src/__tests__/partner-routing.service.unit.test.ts
→ 20 passed (20)
```

| TC | Description | Result |
|---|---|---|
| TC-001 | Returns routing stub for ACTIVE VPC | ✅ PASS |
| TC-002 | Returns routing stub for ROUTING_READY VPC | ✅ PASS |
| TC-003 | Blocks missing VPC (RoutingStubVpcNotFoundError) | ✅ PASS |
| TC-004 | Blocks VOIDED VPC (RoutingStubVpcVoidedError) | ✅ PASS |
| TC-005 | Blocks EXPIRED VPC (RoutingStubVpcExpiredError) | ✅ PASS |
| TC-006 | Builds payload with VPC, invoice, buyer/seller, GST, eligibility fields | ✅ PASS |
| TC-007 | Does not include raw_bureau_json (select verified) | ✅ PASS |
| TC-008 | Does not include raw_verification_json (GST portal) | ✅ PASS |
| TC-009 | Does not include bank/payment credentials | ✅ PASS |
| TC-010 | Does not call external APIs (fetch spy confirms zero calls) | ✅ PASS |
| TC-011 | Does not mutate escrow_transactions | ✅ PASS |
| TC-012 | Does not mutate escrow_accounts | ✅ PASS |
| TC-013 | transmission_status stays PENDING; transmitted_at not set | ✅ PASS |
| TC-014 | Does not change VPC state (no vpc.update call) | ✅ PASS |
| TC-015 | Returns existing PENDING stub without creating new (idempotent) | ✅ PASS |
| TC-016 | Reuses existing stub — does not double-create | ✅ PASS |
| TC-017 | Handles missing trade reference safely → trade_reference null | ✅ PASS |
| TC-018 | Disclaimer contains "no partner transmission" and "not a payment guarantee" | ✅ PASS |
| TC-019 | Includes TTP risk tier, eligibility outcome, max invoice amount | ✅ PASS |
| TC-020 | Admin-safe projection without response_json or raw fields | ✅ PASS |

### Regression — Slice 5 (vpc.service)

```
pnpm exec vitest run src/__tests__/vpc.service.unit.test.ts
→ 31 passed (31)
```

### Frontend Build

```
npm run build (root)
→ ✓ 163 modules transformed
→ ✓ built in 1.69s
→ No TypeScript errors
```

---

## 7. Runtime / Production Verification Decision

**Status:** `DEFERRED_PENDING_DEPLOY`

Commit `8884816` is on `main` (not yet pushed to `origin/main` at time of this record).
Post-push Vercel will auto-deploy. Route smoke test required:

```
GET /api/control/ttp/routing-stubs/00000000-0000-0000-0000-000000000000
(unauthenticated)
→ Expected: 401 {"code":"UNAUTHORIZED","message":"Invalid or expired admin token"}
```

When confirmed: upgrade status to `PRODUCTION_VERIFIED`.

---

## 8. No-Go Boundaries Preserved

| Boundary | Status |
|---|---|
| No `schema.prisma` changes | ✅ PRESERVED |
| No Prisma migration files | ✅ PRESERVED |
| No `prisma db push` / `migrate dev` | ✅ PRESERVED |
| No partner transmission | ✅ PRESERVED |
| No TReDS/SCF/NBFC/factoring/bank API calls | ✅ PRESERVED |
| No env vars or credentials in code | ✅ PRESERVED |
| No PSP/payment behavior | ✅ PRESERVED |
| No escrow_transactions / escrow_accounts writes | ✅ PRESERVED |
| No live GST / CIBIL bureau API | ✅ PRESERVED |
| No `ttp_enabled` activation | ✅ PRESERVED |
| No tenant-facing routing endpoints | ✅ PRESERVED |
| No VPC state change in stub creation | ✅ PRESERVED |
| No settlement execution | ✅ PRESERVED |
| No `.env` modification | ✅ PRESERVED |

---

## 9. Adjacent Findings

- **TC-010 fix:** Node 22 LTS has `globalThis.fetch` built-in. The initial test asserted `globalThis.fetch` is `undefined`, which failed. Corrected to `vi.spyOn(globalThis, 'fetch')` — confirms service never invokes it.
- **Unused constant:** `PARTNER_TYPES_FOR_STUB` array was declared but not used in service (was a design placeholder). Removed to keep typecheck clean.
- **`_adminId` parameter:** `getOrCreateRoutingStub` accepts `adminId` for future audit trail use but does not write it to the stub in Slice 6. Prefixed with `_` to satisfy TypeScript `noUnusedLocals`.
- **Write context approach:** Route uses a two-step pattern — first a read snapshot for `seller_org_id`, then write context with `seller_org_id` as the RLS `org_id` for the stub creation. This mirrors the Slice 5 pattern for admin write operations.

---

## 10. Next Unit

`TexQtic TradeTrust Pay — Slice 7 — TradeTrust Score Advisory Layer / Activation Readiness Review`

Out of scope for Slice 6. No Slice 7 code has been written.

---

## 11. Final Close Decision

`SLICE_6_PARTNER_ROUTING_STUB_IMPLEMENTATION_VERIFIED_COMPLETE`

All implementation gates pass. 20/20 unit tests pass. 31/31 regression tests pass. TypeScript clean. Frontend build clean. All no-go boundaries preserved. Stub stays PENDING. No partner transmission. No money movement. No VPC state mutation. Idempotent create-on-read confirmed.

Slice 6 TTP Partner Routing Stub is implementation-verified and governance-complete.
Production verification status: DEFERRED_PENDING_DEPLOY.
