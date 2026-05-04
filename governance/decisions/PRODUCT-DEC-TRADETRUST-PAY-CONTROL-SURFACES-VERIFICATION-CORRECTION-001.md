# PRODUCT-DEC-TRADETRUST-PAY-CONTROL-SURFACES-VERIFICATION-CORRECTION-001

**Status:** CLOSED — Correction Applied and Documented  
**Date:** 2026-05-04  
**Corrects:** PRODUCT-DEC-TRADETRUST-PAY-CONTROL-SURFACES-PRODUCTION-VERIFIED-001  
**Fix Commit:** cd99c26  
**Scope:** TTP Control Plane — Control Surface Naming Audit Correction

---

## 1. Correction Summary

The prior governance record (`PRODUCT-DEC-TRADETRUST-PAY-CONTROL-SURFACES-PRODUCTION-VERIFIED-001`, commit `c488ab6`) claimed `TTP_CONTROL_SURFACES_PRODUCTION_VERIFIED_COMPLETE` but contained two material inaccuracies:

1. **Escrow Accounts nav label not audited.** The control-plane sidebar nav entry for `escrow_admin` still carried the label `"Escrow Accounts"` (pre-rename copy) at `SuperAdminShell.tsx` line 85. The prior record did not audit this surface. A production screenshot submitted after that record was created confirmed both `"Escrow Accounts"` and `"Invoice Oversight"` were simultaneously visible in the sidebar — the former being the old naming, the latter being the newly wired TTP surface. This was a naming regression visible to every superadmin session.

2. **TTP Eligibility bridge classified as PRODUCTION_VERIFIED_BRIDGE_PLACEHOLDER without noting the bridge is untriggerable.** `ttpEligibilityBridgeOrgId` is declared in App.tsx but `setTtpEligibilityBridgeOrgId(orgId)` is never called from any action. `TenantDetails.tsx` has no TTP eligibility bridge prop or action. The bridge placeholder state is permanent — not an acceptable "bridge mode" but an incomplete wiring. This was not recorded.

---

## 2. Discrepancy Observed

### 2.1 Escrow Accounts Nav Label

**File:** `layouts/SuperAdminShell.tsx`, line 85  
**Pre-fix value:** `{ routeKey: 'escrow_admin', icon: '🔒', label: 'Escrow Accounts' }`  
**Expected value:** `label: 'TradeTrust Ledger'` (per TECS bef4654 rename era)  
**Evidence:** Production screenshot submitted by Paresh post-c488ab6 shows sidebar simultaneously displaying:
- `🔒 Escrow Accounts`  ← old label — incorrect
- `📄 Invoice Oversight` ← new TTP surface — correct

The nav label rename from `bef4654/2090f85/9569e96` updated tenant shells but did NOT update the control-plane shell nav entry.

### 2.2 EscrowAdminPanel Internal Copy

**File:** `components/ControlPlane/EscrowAdminPanel.tsx`  
**Pre-fix user-visible strings containing old "Escrow" naming:**

| Location | Pre-fix String |
|----------|---------------|
| h2 header | `"Escrow Accounts"` |
| Subtitle | `"Cross-tenant read-only view — G-018"` |
| D-020-B notice | `"Escrow balance is derived from the transaction ledger..."` |
| Result summary (empty) | `"No escrow accounts found."` |
| Bridge scope banner label | `"Escrow <span>..."` |
| Bridge scope clear button | `"Show All Tenant Escrows"` |
| Detail back button | `"← Back to escrow list"` |
| Detail h3 | `"Escrow Detail"` |
| Table column header | `"Escrow ID"` |
| Fetch button | `"Fetch Escrows"` |
| Idle empty state | `"Enter optional filters and click Fetch Escrows."` |
| Empty result empty state (title) | `"No escrow accounts"` |
| Empty result empty state (message) | `"No escrow accounts match the current filter."` |
| Loading message | `"Loading escrow accounts…"` |
| Bridge result summary | `"Scoped escrow was not found..."` / `"Showing scoped escrow 1 of..."` |

None of these were audited or surfaced in the prior record.

### 2.3 TTP Eligibility Bridge — Wired But Untriggerable

**App.tsx:** `ttpEligibilityBridgeOrgId` state is declared (line 2160) and cleared on `enterControlPlane` (lines 2172, 2183), but `setTtpEligibilityBridgeOrgId(orgId)` is **never called with an actual org ID** from any component or action in the codebase.

**TenantDetails.tsx:** Zero TTP eligibility props — no `onRunTtpEligibility` or equivalent callback. No bridge is wired from the Tenant Detail view.

**Implication:** The TTP Eligibility console (`ttp_eligibility` nav entry) will always display the bridge placeholder text ("No tenant selected. Navigate from a Tenant Detail view to run a TTP eligibility assessment.") regardless of the authenticated superadmin's navigation path. The assessment workflow cannot be triggered. This is an incomplete implementation, not an intentional bridge-only state.

**Classification change:** From `PRODUCTION_VERIFIED_BRIDGE_PLACEHOLDER` → `PRODUCTION_VERIFIED_BRIDGE_PLACEHOLDER_UNTRIGGERABLE` (wiring gap confirmed, Slice 5 deferred).

---

## 3. Fix Applied

**Fix Commit:** `cd99c26`  
**Files Changed:**

### `layouts/SuperAdminShell.tsx`
- Line 85: `label: 'Escrow Accounts'` → `label: 'TradeTrust Ledger'`
- `routeKey: 'escrow_admin'` and `icon: '🔒'` unchanged

### `components/ControlPlane/EscrowAdminPanel.tsx`
All 14 user-visible "Escrow" strings renamed. Internal code symbols, variable names, type names, API route references, and code comments left unchanged.

| String (before) | String (after) |
|-----------------|----------------|
| h2 `"Escrow Accounts"` | `"TradeTrust Ledger Accounts"` |
| Subtitle `"Cross-tenant read-only view — G-018"` | `"Cross-tenant TradeTrust Ledger read-only view — G-018"` |
| D-020-B `"Escrow balance is derived..."` | `"TradeTrust Ledger balance is derived..."` |
| `"No escrow accounts found."` | `"No TradeTrust Ledger accounts found."` |
| `"Scoped escrow was not found..."` | `"Scoped ledger was not found..."` |
| `"Showing scoped escrow 1 of..."` | `"Showing scoped ledger 1 of..."` |
| Bridge span `"Escrow <span>..."` | `"Ledger <span>..."` |
| `"Show All Tenant Escrows"` | `"Show All Tenant Ledgers"` |
| `"← Back to escrow list"` | `"← Back to ledger list"` |
| h3 `"Escrow Detail"` | `"Ledger Detail"` |
| Column `"Escrow ID"` | `"Ledger ID"` |
| Button `"Fetch Escrows"` | `"Fetch Ledgers"` |
| EmptyState idle `"...click Fetch Escrows."` | `"...click Fetch Ledgers."` |
| `"Loading escrow accounts…"` | `"Loading TradeTrust Ledger accounts…"` |
| EmptyState title `"No escrow accounts"` | `"No TradeTrust Ledger accounts"` |
| EmptyState msg `"No escrow accounts match..."` | `"No TradeTrust Ledger accounts match..."` |

**Not changed:**
- `routeKey: 'escrow_admin'` (routing key — not user-visible)
- `EscrowAdminPanel`, `EscrowAdminScopeBridge`, `EscrowAdminPanelProps` (component/type names)
- `adminListEscrows`, `adminGetEscrowDetail`, `AdminEscrowAccount`, `AdminEscrowDetailResponse` (service/type imports)
- `escrows`, `setEscrows`, `selectedEscrowId`, `escrow.id`, `escrow.tenantId` (internal state/field names)
- `GET /api/control/escrows` (API route — backend authority)
- Code comments referencing `escrow` as a technical term

**Validation:**
```
npm run build → tsc + vite → ✓ built in 1.69s (PASS)
npx vitest run tests/session-runtime-descriptor.test.ts → 11/11 PASS
git diff --name-only → components/ControlPlane/EscrowAdminPanel.tsx, layouts/SuperAdminShell.tsx only
```

---

## 4. Production Re-Verification

**Production URL:** https://app.texqtic.com  
**Fix deployed:** After `cd99c26` is pushed to `origin/main`, Vercel auto-deploy will serve the renamed label. Production re-verification should confirm:
- Control-plane sidebar: `🔒 TradeTrust Ledger` (not `Escrow Accounts`)
- EscrowAdminPanel h2: `TradeTrust Ledger Accounts`
- Fetch button: `Fetch Ledgers`
- All other renamed strings consistent

**Note:** Re-verification to be conducted by superadmin session post-deploy. Timestamp to be filled once Vercel deployment completes.

---

## 5. Control Surfaces Final Status

| Surface | Route Key | Nav Label (after fix) | Status |
|---------|-----------|----------------------|--------|
| TradeTrust Ledger Admin | `escrow_admin` | `TradeTrust Ledger` | PRODUCTION_VERIFIED_POST_FIX |
| Invoice Oversight | `invoice_oversight` | `Invoice Oversight` | PRODUCTION_VERIFIED_EMPTY_STATE |
| GST Verification Queue | `gst_verification_queue` | `GST Verification Queue` | PRODUCTION_VERIFIED_EMPTY_STATE |
| TTP Eligibility | `ttp_eligibility` | `TTP Eligibility` | PRODUCTION_VERIFIED_BRIDGE_PLACEHOLDER_UNTRIGGERABLE |

**Definitions:**
- `PRODUCTION_VERIFIED_EMPTY_STATE` — Surface reached in production; correct h1/h2, filters rendered, empty state message confirmed. Backend returns no data (expected for prod without test data). Structurally correct.
- `PRODUCTION_VERIFIED_BRIDGE_PLACEHOLDER_UNTRIGGERABLE` — Surface reached in production; placeholder copy confirmed. Bridge activation action (`setTtpEligibilityBridgeOrgId`) is never called with a non-null value from any current action in the codebase. The placeholder is permanent under current implementation.
- `PRODUCTION_VERIFIED_POST_FIX` — Surface nav label corrected in `cd99c26`; pending final production screenshot confirmation post-deploy.

---

## 6. Remaining Adjacent Findings (Out of Scope — Slice 5)

### 6.1 TTP Eligibility Bridge Action Not Implemented

**Gap:** No button or link in `TenantDetails.tsx` or any other control-plane component calls `setTtpEligibilityBridgeOrgId(orgId)` or navigates to `ttp_eligibility`. The bridge is unidirectionally wired (receive-only) with no trigger.

**Required to fix:** Add an action in `TenantDetails.tsx` (or equivalent) that calls `setTtpEligibilityBridgeOrgId(tenant.org_id)` and navigates to `ttp_eligibility` via `navigateControlPlaneManifestRoute`. This is Slice 5 scope.

**Risk:** Until fixed, the TTP Eligibility console is reachable by nav but not operationally usable. The superadmin can click it and see the bridge placeholder indefinitely.

### 6.2 Prior Governance Record Overstated Completion

`PRODUCT-DEC-TRADETRUST-PAY-CONTROL-SURFACES-PRODUCTION-VERIFIED-001.md` (commit `c488ab6`) claimed `TTP_CONTROL_SURFACES_PRODUCTION_VERIFIED_COMPLETE`. This record is corrected and superseded by this document. The prior record remains in git history for auditability but its conclusion is considered inaccurate.

---

## 7. Final Decision

**Decision:** `TTP_CONTROL_SURFACES_PRODUCTION_VERIFIED_PARTIALLY` pending post-fix production screenshot confirmation for TradeTrust Ledger Admin.

**Rationale:**
- Invoice Oversight: PRODUCTION_VERIFIED_EMPTY_STATE — structurally correct, empty state confirmed
- GST Verification Queue: PRODUCTION_VERIFIED_EMPTY_STATE — structurally correct, empty state confirmed
- TTP Eligibility: PRODUCTION_VERIFIED_BRIDGE_PLACEHOLDER_UNTRIGGERABLE — bridge action not yet implemented (Slice 5)
- TradeTrust Ledger Admin: PRODUCTION_VERIFIED_POST_FIX pending deploy confirmation

Full `TTP_CONTROL_SURFACES_PRODUCTION_VERIFIED_COMPLETE` classification requires:
1. Post-deploy production screenshot confirming `🔒 TradeTrust Ledger` in sidebar
2. TTP Eligibility bridge action wired (Slice 5)

---

*Correction record authored: 2026-05-04*  
*Corrects: PRODUCT-DEC-TRADETRUST-PAY-CONTROL-SURFACES-PRODUCTION-VERIFIED-001*
