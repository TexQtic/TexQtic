# TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-001

**PROMPT_ID:** TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-001  
**STATUS:** VERIFIED_COMPLETE  
**DATE:** 2026-06-09  
**PROD_VERIFIED:** 2026-06-09 — TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-PROD-VERIFY-GOV-CLOSE-001  
**SCOPE:** Frontend UI/UX polish — Network Commerce Demand Lines surface (FE-4)  
**MODE:** Frontend-only. No backend, schema, migration, env, feature flags, or production data changes.

---

## Objective

Upgrade `DemandLineSurface.tsx` from raw/unstyled form (non-Tailwind class names) to polished
TexQtic platform-grade surface matching the QuoteReviewPanel / SupplierInviteOwnerSurface
visual standard. Fix data-flow bug discovered during rewrite.

---

## Files Changed

| File | Change Type |
| --- | --- |
| `components/Tenant/NetworkCommerce/DemandLineSurface.tsx` | Modified — full Tailwind rewrite + controlled-component data-flow fix |
| `tests/frontend/network-commerce-demand-lines.test.tsx` | Created — 27 frontend tests |

**No other files were created or modified.**

---

## Changes Applied

### 1. DemandLineSurface.tsx — Tailwind Rewrite

Replaced all non-Tailwind class names (`btn btn-primary`, `form-group`, `nc-demand-line-surface`,
etc.) with Tailwind utility classes matching the TexQtic platform visual standard.

Applied class patterns (matching QuoteReviewPanel / SupplierInviteOwnerSurface):

- Page container: `min-h-screen bg-slate-50 px-6 py-8`
- Card: `rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm`
- Header eyebrow: `text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400`
- Primary button: `rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50`
- Secondary button: `rounded-xl border border-slate-300 text-slate-900 hover:bg-slate-50`
- Form input: `rounded-xl border border-slate-300 focus:border-sky-400`
- Status badge: `rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest`
- Feature-disabled banner: `rounded-2xl border border-amber-200 bg-amber-50`
- Error card: `rounded-2xl border border-rose-200 bg-rose-50`

Status badge colors:
- DRAFT → amber
- ACTIVE → sky
- LOCKED_FOR_RFQ → indigo
- CANCELLED → slate

### 2. DemandLineSurface.tsx — Controlled-Component Data-Flow Fix

**Root cause:** Old `DemandLineForm` had internal `useState(initialState)`. User inputs updated
internal state, but parent submit handlers (`handleCreateSubmit`, `handleUpdateSubmit`) read from
parent-level `formState` closure — which was never updated by user input. Result: submitting
always sent `DEFAULT_FORM_STATE` values regardless of what the user typed.

**Fix:** Made `DemandLineForm` a fully controlled component:
- Props: `formData: DemandLineFormState`, `onFieldChange: (field, value) => void`
- Parent owns `formState` via `useState(DEFAULT_FORM_STATE)`
- Parent provides `handleFormFieldChange` callback: `(field, value) => setFormState(prev => ({ ...prev, [field]: value }))`
- `DemandLineForm` internal `useState` removed
- `handleChange` generic removed; replaced with per-field inline `onChange` handlers
- `handleFormCancel` uses functional setState (removes stale closure risk)
- `handleCreateSubmit` / `handleUpdateSubmit` dependency arrays simplified

### 3. Additional Polish

- `formatDate(value)` helper using `Intl.DateTimeFormat` with `dateStyle: 'medium'`
- `demandLineStatusBadge(status)` returns Tailwind color class string
- Empty state card: "No demand lines yet" + "Add First Demand Line" inline button
- `DemandLineItem` uses `<dl>` grid layout for field display
- Form organized into 4 `<fieldset>` sections: Identification, Commodity & Product, Quantity, Delivery
- Inline dismissible error banner for post-submit failures
- Feature-disabled banner: "Demand Lines Disabled"
- Error card: "Unable to Load Demand Lines"

### 4. Lint Fixes Applied

- Removed `ChangeEvent` import (replaced `handleChange` with per-field inline handlers)
- Removed `React.FormEvent` namespace reference (imported `FormEvent` from react directly)
- Removed nested ternary in submit button label (extracted `submitLabel` variable)
- All prior `handleChange` calls removed

---

## Business Logic Preserved

All business logic is unchanged:
- Same API calls via `services/networkCommerceService.ts`
- Same payload construction (camelCase → snake_case mapping)
- Same state machine: `'loading' | 'empty' | 'error' | 'feature-disabled' | 'ready' | 'creating' | 'updating' | 'cancelling'`
- Same feature-disabled / 503 detection path
- Same `isEditable` / `isCancellable` predicates (DRAFT | ACTIVE only)
- Same `canLockForRfq` authorization logic (403 → hidden)
- Same `onBack` prop interface

---

## Tests Created

**File:** `tests/frontend/network-commerce-demand-lines.test.tsx`  
**Count:** 27 tests across 9 suites  

| Suite | Tests |
| --- | --- |
| Loading state | 1 |
| Feature-disabled state | 2 |
| Error state | 1 |
| Empty state | 3 |
| Ready state with demand lines | 9 |
| Create form | 5 |
| Cancel demand line | 1 |
| Edit demand line | 2 |
| Inline error banner | 1 |
| **Total** | **27** |

---

## Validation Results

| Check | Result |
| --- | --- |
| `pnpm run typecheck` | EXIT 0 — no errors |
| `pnpm run test:frontend` (demand-lines) | 27/27 PASS |
| `pnpm run test:frontend` (all) | 91/91 PASS |
| Lint — `DemandLineSurface.tsx` | CLEAN (no errors, no warnings) |
| Lint — `network-commerce-demand-lines.test.tsx` | CLEAN (no errors, no warnings) |

Pre-existing lint errors in other files (188 errors, not this session's changes) unaffected.

---

## Safety Invariants

| Invariant | Status |
| --- | --- |
| No backend files changed | ✅ CONFIRMED |
| No `schema.prisma` changes | ✅ CONFIRMED |
| No migration files | ✅ CONFIRMED |
| No `.env` / environment changes | ✅ CONFIRMED |
| No feature flags activated | ✅ CONFIRMED |
| No production data mutated | ✅ CONFIRMED |
| `org_id` tenancy preserved | ✅ CONFIRMED (no tenancy logic changed) |
| `supplier_quotes.enabled=false` (QD-6 hold) | ✅ UNCHANGED |
| `rfq.award.enabled` row ABSENT | ✅ UNCHANGED |
| DPP HOLD_FOR_PARESH_DECISION | ✅ UNCHANGED |

---

## Commit

```
feat(network-commerce): polish demand lines frontend
```

Commit covers:
- `components/Tenant/NetworkCommerce/DemandLineSurface.tsx`
- `tests/frontend/network-commerce-demand-lines.test.tsx`
- `governance/TEXQTIC-NC-FRONTEND-DEMAND-LINES-UIUX-POLISH-001.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/GOVERNANCE-CHANGELOG.md`
