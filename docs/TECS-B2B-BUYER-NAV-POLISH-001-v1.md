# TECS-B2B-BUYER-NAV-POLISH-001 — B2B Buyer Shell Active-State Clarity and Trust Polish

**Status:** IMPLEMENTED  
**Date:** 2026-05-28  
**File:** `layouts/Shells.tsx`  
**Commit scope:** `[IMPLEMENTATION] polish B2B buyer shell active-state clarity`

---

## 1. Purpose

Close three improvement candidates surfaced during deep production verification of `TECS-B2B-BUYER-NAV-BOUNDARY-FIX-001`:

- **IC-001** — Desktop B2B sidebar has no active-state visual treatment
- **IC-003** — B2B mobile menu items have no active-state highlighting
- **NB-001** — Header identity area hardcoded as "Alex Rivera / Administrator" — fabricated identity

---

## 2. Scope

**In scope:** Visual treatment of B2B shell navigation active state; removal of hardcoded identity fabrication.  
**Out of scope:** Route redesign, B2BShell architecture changes, auth plumbing, BV-004 re-evaluation, governance closure.  
**Allowed files:** `layouts/Shells.tsx`, `docs/TECS-B2B-BUYER-NAV-POLISH-001-v1.md`

---

## 3. Source Artifacts Reviewed

- `layouts/Shells.tsx` — full component read (lines 1–430+)
- `runtime/sessionRuntimeDescriptor.ts` — type definitions (lines 1–250)
- `App.tsx` — shell dispatch, tenantShellContract, auth state inspection
- `tests/runtime-verification-tenant-enterprise.test.ts` — B2BShell test assertions verified
- `tests/b2c-shell-authenticated-affordance-separation.test.tsx` — MobileShellMenu indirect coverage

---

## 4. Repo-Truth Revalidation Results

### 4.1 `RuntimeShellNavigationItem.active` — **CONFIRMED REPO TRUTH**

`RuntimeShellNavigationItem` in `sessionRuntimeDescriptor.ts` carries `active: boolean`.  
`RuntimeShellNavigationSurface` carries `activeRouteKey: RuntimeLocalRouteKey | null`.  
`buildAggregatorNavigationItems` (existing code) already reads `item.active` and passes it to `MobileShellMenuItem`.

### 4.2 `MobileShellMenuItem.active` interface field — **CONFIRMED REPO TRUTH**

Interface declared in `Shells.tsx` at lines ~31–37 already includes `active?: boolean`.  
The field existed but was not used in the `MobileShellMenu` button render.

### 4.3 B2B desktop sidebar — no active-state CSS — **CONFIRMED REPO TRUTH**

All sidebar buttons used hardcoded static `className`. The `catalog` button hardcoded `text-white` while all others used `hover:text-white`. No route-based visual distinction existed.

### 4.4 B2B mobile menu — no `active` on any item — **CONFIRMED REPO TRUTH**

`mobileMenuItems` array in `B2BShell` built items without any `active` property. `MobileShellMenu` render ignored `item.active` uniformly.

### 4.5 Header identity — hardcoded fabrication — **CONFIRMED REPO TRUTH**

Header JSX contained literal strings `"Alex Rivera"` and `"Administrator"`. These were unconnected to any auth session, tenant session, or runtime data.

### 4.6 Identity data available without new props — **CONFIRMED REPO TRUTH**

`tenant.name` (tenant org name, e.g. "QA Buyer") is already in `B2BShell` props.  
`shellLabel` (defaults to `"B2B Workspace"`, overridable) is already a `B2BShellProps` field.  
No new props required for NB-001 fix.

---

## 5. IC-001 — Desktop B2B Sidebar Active-State

### Diagnosis

All sidebar nav `<button>` elements used a flat, uniform `className`. The active route was not visually distinct from inactive routes. `catalog` had a privileged `text-white` hardcode making it appear always-active regardless of real navigation state.

### Fix — **IMPLEMENTED IN THIS UNIT**

Added `const activeRouteKey = navigation.surface?.activeRouteKey ?? null;` at the top of `B2BShell`.

Replaced all sidebar button classNames with a conditional ternary:

- **Active route:** `text-blue-300 bg-slate-700/60 font-medium`  
- **Inactive route:** `text-slate-300 hover:text-white hover:bg-slate-700/50`  
- **Common:** `w-full flex items-center gap-3 p-2 rounded text-left transition`

All 12 desktop sidebar buttons (catalog, buyer_catalog, orders, dpp, escrow, escalations, settlement, certifications, traceability, audit_logs, trades, team) now derive state from `navigation.surface?.activeRouteKey`.

### Consistency note

Active blue treatment (`text-blue-300`) is consistent with `AggregatorDesktopNavSection` which uses `text-blue-400` on dark backgrounds for active items.

---

## 6. IC-003 — B2B Mobile Menu Active-State

### Diagnosis

`mobileMenuItems` array was built without `active` property on any item. `MobileShellMenu` render applied `itemClassName` uniformly regardless of `item.active`. All items appeared identical regardless of current route.

### Fix — **IMPLEMENTED IN THIS UNIT** (two parts)

**Part 1 — `MobileShellMenu` render:** Added `activeItemClassName` derived from `tone`:

- Dark tone active: `text-white bg-white/15`
- Light tone active: `text-indigo-600 bg-indigo-50`

Button render changed from `${itemClassName}` to `${item.active ? activeItemClassName : itemClassName}`.

This change is **backward-compatible**: if `item.active` is not set or is `false`, existing `itemClassName` applies — no visual change for shells that do not set `active`.

**Part 2 — B2B `mobileMenuItems`:** Added `active: activeRouteKey === 'routeKey'` to each item using the same `activeRouteKey` constant from IC-001.

### Beneficiary note

`AggregatorShell` already passes `active` from `buildAggregatorNavigationItems` to `mobileMenuItems`. The `MobileShellMenu` render fix activates this for aggregator mobile nav as a natural side-effect (backwards-compatible; zero test regressions).

---

## 7. NB-001 — Header Identity Decision and Fix

### Decision: Option A — Bounded fix using in-scope props

**Reason:** `tenant.name` and `shellLabel` are already in `B2BShell` scope. No new props, no App.tsx change, no auth plumbing required.

- `tenant.name` → the tenant organization name (e.g., "QA Buyer") — truthful, contextually meaningful in a B2B workspace header
- `shellLabel` → workspace label (defaults to `"B2B Workspace"`) — descriptive, never fabricated

### Fix — **IMPLEMENTED IN THIS UNIT**

```tsx
// Before (fabricated)
<div className="text-xs font-bold text-slate-900">Alex Rivera</div>
<div className="text-[10px] text-slate-500 uppercase">Administrator</div>

// After (live data)
<div className="text-xs font-bold text-slate-900">{tenant.name}</div>
<div className="text-[10px] text-slate-500 uppercase">{shellLabel}</div>
```

### Deferred (OUT OF SCOPE)

Per governance archive (`DEF-004`), the B2B avatar/actor identity surface was previously deferred to PW5-U tranche. This fix resolves the fabrication concern using bounded in-scope data. Full actor display name/avatar from auth session remains deferred to PW5-U as before.

---

## 8. Exact Files Changed

| File | Change type |
|---|---|
| `layouts/Shells.tsx` | Modified — 5 surgical replacements |
| `docs/TECS-B2B-BUYER-NAV-POLISH-001-v1.md` | Created — this document |

### Change summary for `layouts/Shells.tsx`

1. **`MobileShellMenu`** — Added `activeItemClassName` constant (2 lines); changed button `className` ternary to use it
2. **`B2BShell`** — Added `const activeRouteKey` declaration (1 line)
3. **`B2BShell` mobileMenuItems** — Added `active: activeRouteKey === 'key'` to each of the 11 action items
4. **`B2BShell` desktop sidebar** — Replaced all 12 button classNames with active/inactive ternaries
5. **`B2BShell` header identity** — Replaced hardcoded `"Alex Rivera"` / `"Administrator"` with `{tenant.name}` / `{shellLabel}`

---

## 9. Why Minimal Correct Polish

- No new props introduced — `activeRouteKey`, `tenant.name`, `shellLabel` were all in existing scope
- No helper functions created for routing logic — inline ternaries used directly
- No route redesign — surface data already provided active-state; only the CSS was missing
- No App.tsx changes — NB-001 resolved using already-present shell props
- `MobileShellMenu` change is backward-compatible — existing shells without `item.active` are unaffected
- Zero new dependencies introduced

---

## 10. Static Verification Performed

| Check | Command | Result |
|---|---|---|
| TypeScript type check | `npx tsc --noEmit` | ✅ PASS — zero errors |
| Existing test suite | `tests/runtime-verification-tenant-enterprise.test.ts` + `tests/b2c-shell-authenticated-affordance-separation.test.tsx` | ✅ PASS — 57/57 tests |

**Specific test assertions verified safe:**
- `data-mobile-item-count="11"` — count unchanged (no items added/removed)
- `toContain('Catalog')`, `'Traceability'`, `'Audit Log'`, `'Trades'`, `'Team Access'` — all labels preserved
- `toContain('sticky top-0 h-screen overflow-y-auto')` — sidebar scroll class unchanged
- `toContain('data-mobile-nav="b2b"')` — mobile nav data attribute unchanged
- No test asserted on hardcoded "Alex Rivera" or "Administrator" strings

---

## 11. Required Post-Deploy Production Verification

**Actor:** `qa.buyer@texqtic.com` / Password123!

### Desktop (≥1024px viewport)

1. Log in → navigate to Catalog → **VERIFY:** "📦 Catalog" sidebar button shows `text-blue-300 bg-slate-700/60` highlight; all other items show `text-slate-300` (no highlight)
2. Navigate to Browse Suppliers → **VERIFY:** "🏪 Browse Suppliers" is highlighted; "📦 Catalog" returns to inactive style
3. Navigate back to Catalog → **VERIFY:** active state returns to Catalog
4. Header right side → **VERIFY:** shows "QA Buyer" (tenant name) and "B2B Workspace" (shellLabel); "Alex Rivera" must not appear anywhere

### Mobile (<1024px viewport)

1. Tap hamburger menu → **VERIFY:** currently active route item renders in `text-indigo-600 bg-indigo-50`; all other items render in `text-slate-700`
2. Navigate between routes → **VERIFY:** active highlight follows navigation state in mobile menu

---

## 12. Neighbor-Path Smoke Checks Required — **NEIGHBOR-PATH SMOKE CHECK REQUIRED**

| Path | Check |
|---|---|
| Verification-blocked B2B workspace | Mobile menu should be empty (isVerificationBlocked guard) — verify unchanged |
| Aggregator shell mobile menu | Active item should now show `text-white bg-white/15` (tone="dark") — net improvement, verify no regression |
| B2C shell mobile menu | Items have no `active` property set — verify `itemClassName` still applies uniformly |
| White-label shell mobile menu | Items have no `active` property set — verify unchanged |

---

## 13. Explicit Out-of-Scope Items

| Item | Status |
|---|---|
| Full actor display name from auth session (user's personal name) | **OUT OF SCOPE** — DEF-004, deferred to PW5-U tranche |
| B2B avatar image / initials | **OUT OF SCOPE** — DEF-004, deferred to PW5-U tranche |
| BV-004 re-evaluation | **OUT OF SCOPE** — by-design per prior verification verdict |
| Governance closure / TECS lifecycle update | **OUT OF SCOPE** — not in this prompt |
| Backend / API / schema changes | **OUT OF SCOPE** — frontend-only change |
| AggregatorShell desktop nav active state | **OUT OF SCOPE** — already works via `AggregatorDesktopNavSection` |

---

## 14. Recommended Next Move

1. **Deploy to production** (Vercel auto-deploy on push to main)
2. **Run post-deploy production verification** (§11) using `qa.buyer@texqtic.com`
3. **Run neighbor-path smoke checks** (§12)
4. **Record TECS lifecycle closure** — IC-001, IC-003, NB-001 moved to CLOSED after production verification passes
5. **DEF-004 (PW5-U)** — Full actor identity (display name, avatar) surface from auth session — plan separately

---

*Generated: TECS-B2B-BUYER-NAV-POLISH-001 | layouts/Shells.tsx | Governance: SAFE-WRITE-ON*
