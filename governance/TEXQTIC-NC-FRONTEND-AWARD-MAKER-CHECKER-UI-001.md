# TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001

> **STATUS: FRONTEND_IMPLEMENTED_PENDING_PROD_VERIFY**
> FE-9 MC extension: QuoteReviewPanel extended with G-021 maker-checker award flow. Award-request, approve, reject UI surfaces implemented with feature-disabled guard and amber amber banner behaviour preserved. Feature flag NOT activated. No backend/schema/migration/env changes. 42/42 frontend tests PASS. tsc EXIT 0.

## Packet Metadata

| Field | Value |
|-------|-------|
| Packet ID | TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001 |
| Feature Tag | FE-9 Extension (G-021) |
| Type | FRONTEND_IMPLEMENTATION |
| Status | FRONTEND_IMPLEMENTED_PENDING_PROD_VERIFY |
| Prerequisite | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-ROUTE-001 ROUTE_VERIFIED_COMPLETE (2026-07-01, commit 8d10fdf). 4 MC routes live on backend, gated at 503 FEATURE_DISABLED. |
| Commit | `[TEXQTIC] network-commerce: add award maker-checker frontend (G-021)` |
| Tests | 42/42 PASS (`network-commerce-quote-review-mc.test.tsx` + `network-commerce-quote-review.test.tsx`) |
| TypeScript | `pnpm exec tsc --noEmit` EXIT 0 — no errors |

---

## §1 — Objective

Extend the existing `QuoteReviewPanel` (FE-9) to support the G-021 maker-checker award flow.
This packet adds the MAKER path (Request Award Approval) and the CHECKER path (Approve / Reject
Award) as discrete UI surfaces within the existing panel, while preserving the feature-disabled
amber banner behaviour when `nc.procurement_pools.rfq.award.enabled` is absent/false.

No legacy `/accept` call is made from the new MC UI. The old `acceptQuoteForRfq` service method
is preserved for backward-compat but is not invoked by the updated component.

---

## §2 — Starting Repo State

| Property | Value |
|---|---|
| HEAD at packet start | `8d10fdf` — `feat(network-commerce): add award maker-checker routes` |
| origin/main | `8d10fdf` (aligned) |
| Working tree | Clean |
| nc.procurement_pools.rfq.award.enabled | ABSENT (fail-closed; middleware returns 503 FEATURE_DISABLED) |
| nc.procurement_pools.supplier_quotes.enabled | `false` (QD-6 hold) |

---

## §3 — Design References

- `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001.md` §10.2 (FE-9 Extension spec)
- G-021 maker-checker flow: MAKER = `requestAward`, CHECKER = `approveAward` / `rejectAwardApproval`
- SM Step 13: CHECKER + makerUserId set → bypasses PENDING_APPROVAL gate → APPLIED
- Feature gate: `nc.procurement_pools.rfq.award.enabled` absent/false → 503 FEATURE_DISABLED → amber banner

---

## §4 — Files Changed

| File | Change Type | Description |
|---|---|---|
| `services/networkCommerceService.ts` | Modified | Added `AwardApprovalRequest`, `AwardApproved`, `AwardRejected`, `RequestAwardInput`, `ApproveAwardInput`, `RejectAwardApprovalInput` interfaces; added `requestAwardApprovalForQuote()`, `approveAwardApproval()`, `rejectAwardApproval()`, `getPendingAwardApprovalsForRfq()` service methods |
| `components/Tenant/NetworkCommerce/QuoteReviewPanel.tsx` | Modified | Added `classifyMcError()` helper; added `pendingApprovals`, `currentUserId`, `approvingApprovalId`, `rejectApprovalDialog`, `requestAwardDialog` state; updated `loadData` to `Promise.allSettled` for approvals + currentUser; added `handleRequestAwardSubmit`, `handleApproveAward`, `handleRejectApprovalSubmit` callbacks; updated render to show MAKER controls (Request Award Approval), CHECKER controls (Approve Award / Reject Approval), and Winning Quote badge |
| `tests/frontend/network-commerce-quote-review.test.tsx` | Modified | Updated Accept Quote test to Request Award Approval test for SUBMITTED status; added `vi.mock('../../services/authService', ...)` |
| `tests/frontend/network-commerce-quote-review-mc.test.tsx` | Created | 25 MC-specific tests (MC-FE-01..MC-FE-17) covering gate-disabled, award-request, pending-approval display, checker eligibility, approve, reject, and all 6 error safe-message paths |

**Not changed:** `App.tsx`, `sessionRuntimeDescriptor.ts`, `PoolRfqSurface.tsx`, any backend files, `schema.prisma`, `.env`, `.env.local`.

---

## §5 — New Service Methods

### `requestAwardApprovalForQuote(poolId, rfqId, quoteId, input): Promise<AwardApprovalRequest>`
→ `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quotes/:quoteId/award-request`

### `approveAwardApproval(poolId, rfqId, approvalId, input): Promise<AwardApproved>`
→ `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/award-approvals/:approvalId/approve`

### `rejectAwardApproval(poolId, rfqId, approvalId, input): Promise<AwardRejected>`
→ `POST /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/award-approvals/:approvalId/reject`

### `getPendingAwardApprovalsForRfq(poolId, rfqId): Promise<AwardApprovalRequest[]>`
→ `GET /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/award-approvals`

---

## §6 — Component Render Logic Summary

```
loadData():
  getOwnerQuotesForRfq(poolId, rfqId)
  Promise.allSettled([
    getPendingAwardApprovalsForRfq(poolId, rfqId),
    getCurrentUser({ retry: false, dedupe: true })
  ])
  → setQuotes / setPendingApprovals ([] on failure) / setCurrentUserId (null on failure)

Per quote render (uiState === 'ready'):
  isSubmitted = quote.status.toUpperCase() === 'SUBMITTED'
  isAccepted  = quote.status.toUpperCase() === 'ACCEPTED'
  pendingApproval = pendingApprovals.find(a => a.entity_id === quote.id) ?? null
  isCheckerEligible = pendingApproval !== null && currentUserId !== null
                      && currentUserId !== pendingApproval.requested_by_user_id

  if isAccepted → "Winning Quote" badge (emerald)
  if isSubmitted:
    if pendingApproval → "Award Approval Pending" card
      if isCheckerEligible → Approve Award / Reject Approval buttons
    else → "Request Award Approval" button + "Reject Quote" button
```

---

## §7 — Feature Flag Safety

`nc.procurement_pools.rfq.award.enabled` is **NOT activated** by this packet.
All 4 new backend MC routes remain gate-closed (503 FEATURE_DISABLED when flag absent/false).
The amber "Award review is not yet active" banner in `QuoteReviewPanel` fires on 503 FEATURE_DISABLED, just as before FE-9.
No flag row is created, modified, or deleted.

---

## §8 — Test Evidence

| Suite | Tests | Result |
|---|---|---|
| `network-commerce-quote-review-mc.test.tsx` | 25 | ALL PASS |
| `network-commerce-quote-review.test.tsx` | 17 | ALL PASS |
| **Total** | **42** | **ALL PASS** |

TypeScript: `pnpm exec tsc --noEmit` → empty output (EXIT 0). No type errors.

---

## §9 — Safety Invariants Preserved

| Invariant | Status |
|---|---|
| `nc.procurement_pools.rfq.award.enabled` NOT activated | ✅ |
| Legacy `/accept` route not called from new MC UI | ✅ |
| `org_id` tenancy scoping preserved (all calls via `tenantGet`/`tenantPost`) | ✅ |
| Feature-disabled amber banner preserved on 503 | ✅ |
| No new npm dependencies added | ✅ |
| No backend/schema/migration/env changes | ✅ |
| QD-6 (supplier_quotes.enabled=false) unchanged | ✅ |
| DPP HOLD_FOR_PARESH_DECISION unchanged | ✅ |

---

## §10 — Next Steps

1. **Production Verification:** With `nc.procurement_pools.rfq.award.enabled=true` and `supplier_quotes.enabled=true`:
   - Verify MAKER path: Request Award Approval dialog opens, POST succeeds, pending approval card renders
   - Verify CHECKER path (different user): Approve/Reject buttons visible, approve updates badge to "Winning Quote"
   - Verify same-actor rule enforced (checker === maker returns safe error message)
2. **Gov Close:** Once prod verification passes, emit `TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001-PROD-VERIFY-GOV-CLOSE-001`.

*Last updated: 2026-07-01 — TEXQTIC-NC-FRONTEND-AWARD-MAKER-CHECKER-UI-001 FRONTEND_IMPLEMENTED_PENDING_PROD_VERIFY.*
