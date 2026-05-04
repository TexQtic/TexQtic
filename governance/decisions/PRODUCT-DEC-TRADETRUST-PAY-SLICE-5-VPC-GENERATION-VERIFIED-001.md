# PRODUCT-DEC-TRADETRUST-PAY-SLICE-5-VPC-GENERATION-VERIFIED-001

**Decision Date:** 2026-05-04 (recorded on commit 079d449)
**Slice:** TradeTrust Pay — Slice 5: VPC Generation
**Status:** VERIFIED

---

## What Was Implemented

### Backend

**`server/src/services/vpc.service.ts`**
- `VpcService` class with 4 methods: `generateVpc`, `adminGetVpc`, `adminListVpcs`, `adminTransitionVpc`
- 12 generation gates enforced in sequence:
  1. Invoice must exist
  2. Invoice lifecycle state must be `VERIFIED`
  3–4. (reserved)
  5. Seller org GST must be `APPROVED`
  6. Seller org must have at least one TTP eligibility assessment
  7. Latest assessment `eligibility_outcome` must be `ELIGIBLE`
  8. Assessment `valid_until` must not be expired (null = no expiry)
  9. Seller org `risk_tier` must be in `TTP_VPC_ELIGIBLE_TIERS` (tiers 1, 2, 3 only — tier 0 blocked)
  10. Invoice `gross_amount` must not exceed tier cap (`max_invoice_amount ?? TIER_DEFAULT_CAP_INR[tier]`)
  11. Invoice must have a `due_date`
  12. No existing non-terminal VPC for the same invoice
- Lifecycle state machine: `ALLOWED_VPC_TRANSITIONS` map (ACTIVE → ROUTING_READY/VOIDED/EXPIRED; ROUTING_READY → VOIDED/EXPIRED)
- `VpcInvoiceNotFoundError`, `VpcInvoiceIneligibleStateError`, `VpcGstNotApprovedError`, `VpcEligibilityMissingError`, `VpcEligibilityOutcomeError`, `VpcEligibilityExpiredError`, `VpcRiskTierBlockedError`, `VpcAmountExceedsCapError`, `VpcDueDateMissingError`, `VpcDuplicateError`, `VpcNotFoundError`, `VpcTransitionNotAllowedError`, `VpcTerminalStateError`

**`server/src/routes/control/vpc.ts`**
- Fastify plugin, 4 admin-only endpoints:
  - `POST /api/control/vpc/generate/:invoiceId` (SUPER_ADMIN)
  - `GET /api/control/vpc` — list with filters
  - `GET /api/control/vpc/:vpcId` — single VPC detail
  - `PATCH /api/control/vpc/:vpcId/transition` (SUPER_ADMIN)
- Full error → HTTP status mapping for all gate errors
- Dual-context DB pattern (read: `SET LOCAL app.is_admin = 'true'`; write: `prisma.$transaction + set_config`)

**`server/src/routes/control.ts`**
- Registered `controlVpcRoutes` under prefix `/vpc`

### Frontend

**`services/vpcService.ts`** — API client using `adminGet/adminPost/adminPatch`

**`components/ControlPlane/VpcStatusBadge.tsx`** — State → color badge (ACTIVE/ROUTING_READY/TRANSMITTED/VOIDED/EXPIRED)

**`components/ControlPlane/VpcConsole.tsx`** — Full admin console: filters, table, GenerateDialog, TransitionDialog, governance notice

**`runtime/sessionRuntimeDescriptor.ts`** — Added `vpc_console` to RouteKey union, defineRuntimeRoute, and CONTROL_PLANE_SHELL_ROUTE_KEYS

**`App.tsx`** — Added import + `case 'vpc_console': return <VpcConsole />;`

### Tests

**`server/src/__tests__/vpc.service.unit.test.ts`** — 31 test cases (TC-001 to TC-031)
- All 12 generation gates tested (happy + each gate rejection)
- adminGetVpc (found + not found)
- adminListVpcs (no filters + state_key post-query filter)
- adminTransitionVpc (valid transitions + terminal block + invalid transition)

---

## Verification Evidence

- **Server typecheck:** `pnpm exec tsc --noEmit` → 0 errors
- **Unit tests:** `pnpm exec vitest run src/__tests__/vpc.service.unit.test.ts` → 31/31 passed
- **Frontend build:** `npm run build` → `tsc && vite build` → built in ~1.6s, no type errors

---

## No-Go Boundaries Respected

- No schema.prisma or migration changes
- No `partner_routing_stubs` writes (always `partner_routing_eligible: false`)
- No escrow/payment behavior
- No live GST/CIBIL API calls
- No `ttp_enabled` activation
- No tenant-facing VPC generation endpoints
- No guarantee/payment wording in stored fields or UI copy
- `org_id` isolation preserved: VPC `org_id` = seller's `org_id` = invoice `org_id`

---

## Commit Reference

`079d449` — `[TEXQTIC] tradetrust-pay: add Slice 5 VPC generation`
9 files changed, 1947 insertions, 1 deletion
