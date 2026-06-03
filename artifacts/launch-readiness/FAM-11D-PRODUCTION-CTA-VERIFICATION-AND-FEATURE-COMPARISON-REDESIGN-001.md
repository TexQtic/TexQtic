# FAM-11D — Pricing CTA Verification & Feature Comparison Redesign
**Artifact ID:** FAM-11D-PRODUCTION-CTA-VERIFICATION-AND-FEATURE-COMPARISON-REDESIGN-001  
**Date:** 2026-06-03  
**Commit:** `b2d62ae5`  
**File modified:** `components/Public/PublicPricingPage.tsx` only  
**Enum:** `FAM_11D_CTA_AND_FEATURE_COMPARISON_REDESIGN_COMPLETE`

---

## 1. Objective

Fix the faulty "Get started free" CTA on the public Pricing page (was routing to login instead of the request-access flow), and redesign the Feature availability section for better usability.

---

## 2. Bugs Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| FREE tier card CTA routes to login | `ctaIsSignIn: true` in `TIER_CARDS` config | Replaced with `ctaIsRequestAccess: true` |
| Bottom "Get started free" CTA routes to login | `onClick={onSignIn}` in bottom CTA | Changed to `onClick={onRequestAccess}` |
| `onRequestAccess` not wired in component | Component destructured `{ nav, onSignIn }` only | Added `onRequestAccess` to destructured params |

**`onRequestAccess` handler (App.tsx, unchanged):**  
`openSupplierRequestAccess = () => globalThis.window?.location.assign('https://texqtic.com/request-access')`

---

## 3. Feature Comparison Redesign

### Before
- Single "Show feature comparison" toggle → full 5-column horizontal `<table>`
- Horizontal scroll required on mobile
- All 17 rows visible at once — visually dense and overwhelming

### After
- 6 category accordions (Core workspace, Network Commerce, AI, Compliance, Platform, Support)
- Each category independently expand/collapse
- "Expand all / Collapse all" toggle button
- Tier legend bar: `FREE | STARTER | PRO | ENT` short labels + availability badge key
- Per-row layout: `grid-cols-[1fr_repeat(4,_auto)]` — no horizontal overflow
- Mobile-safe; no `<table>` element

### Data source (unchanged)
`config/entitlementDisplay.ts` → `ENTITLEMENT_DISPLAY_ROWS` (17 rows, 6 categories)

---

## 4. Governance Compliance

| Constraint | Status |
|---|---|
| No TTP anywhere | ✅ Absent from display rows; not added |
| No ₹/INR amounts | ✅ None present |
| No payment/checkout language | ✅ Upgrade CTAs use `UPGRADE_CTA_MAILTO` only |
| No App.tsx changes | ✅ App.tsx already had correct `onRequestAccess` wiring |
| No backend/schema/migration changes | ✅ Frontend-only change |
| `onSignIn` kept in `PublicPricingPageProps` interface | ✅ Backward-compatible; no login CTA rendered on page |
| No new SPA route or AppState | ✅ Request Access is external URL navigation |

---

## 5. Validation

| Check | Result |
|---|---|
| `pnpm tsc --noEmit` | ✅ Zero errors |
| `git diff --name-only` | ✅ `components/Public/PublicPricingPage.tsx` only |
| Staged set before commit | ✅ Only allowlisted file |

---

## 6. Production Verification (post-deploy)

URL: `https://app.texqtic.com/pricing`

- [ ] "Get started free" button (FREE tier card) navigates to `https://texqtic.com/request-access`
- [ ] Bottom "Get started free" button navigates to `https://texqtic.com/request-access`
- [ ] No login modal appears on any Pricing page CTA
- [ ] Category accordions render and expand/collapse correctly
- [ ] "Expand all" expands all 6 categories; "Collapse all" collapses them
- [ ] No horizontal scroll on mobile viewport
- [ ] No TTP, no ₹/INR, no payment language visible

---

## 7. FAM-11 Family Status

| Unit | Status | Commit |
|---|---|---|
| FAM-11A | COMPLETE | `5588400c` |
| FAM-11B | COMPLETE | `3aaaec7f` |
| FAM-11B2 | COMPLETE | `b1967dec` |
| FAM-11C | COMPLETE | `cd2b2730` + `127965a9` |
| FAM-11D (prev session) | COMPLETE | `b8be0246` + `88eebc73` |
| **FAM-11D CTA + redesign** | **COMPLETE** | **`b2d62ae5`** |
