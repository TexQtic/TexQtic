# TECS-DPP-PASSPORT-NETWORK-020H — App.tsx Traceability CTA Wiring

**Slice:** 020H  
**Status:** VERIFIED_COMPLETE  
**Date:** 2026-05-15  
**Commit:** d73d864  

---

## Objective

Wire the `onNavigateToTraceability` prop in `App.tsx` `case 'dpp'` so that the DPP Passport
empty-state CTA introduced in 020G navigates the user to the Traceability page using the
established state-based navigation pattern.

---

## Problem Statement

In 020G, `DPPPassport.tsx` added the optional prop `onNavigateToTraceability?: () => void` and
rendered the CTA button with `onClick={() => onNavigateToTraceability?.()}`. App.tsx was not
modified in 020G (out of scope), meaning the CTA rendered but click was a no-op.

020H completes the navigation by passing the prop at the App.tsx call site.

---

## Design Constraints

1. **State-based navigation only.** `navigateTenantManifestRoute` is a local function inside
   `App.tsx` — it cannot be imported or accessed externally. URL-based navigation is forbidden
   for inner tenant views.

2. **`'traceability'` is a valid `RuntimeLocalRouteKey`** — confirmed in
   `runtime/sessionRuntimeDescriptor.ts` line 126. `case 'traceability'` is already handled in
   the same switch as `case 'dpp'`.

3. **D-6 hotfix constraint:** No `.json` suffix routes may be added.

4. **`DPPPassport.tsx` must remain unchanged.** Only `App.tsx` and tests are modified.

---

## Files Changed

| File | Change |
|---|---|
| `App.tsx` | Added `onNavigateToTraceability={() => navigateTenantManifestRoute('traceability')}` to `<DPPPassport>` in `case 'dpp'` |
| `server/src/__tests__/tecs-dpp-passport-label-config.test.ts` | Added Group Q (Q01–Q06): verifies App.tsx wiring |
| `tests/e2e/dpp-passport-network.spec.ts` | Added DPP-E2E-42: source coverage for App.tsx wiring |

---

## Change Detail

### App.tsx — `case 'dpp'` (line 5095)

**Before (020G):**
```tsx
case 'dpp':
  return (
    <DPPPassport
      onBack={() => navigateTenantDefaultManifestRoute()}
    />
  );
```

**After (020H):**
```tsx
case 'dpp':
  return (
    <DPPPassport
      onBack={() => navigateTenantDefaultManifestRoute()}
      onNavigateToTraceability={() => navigateTenantManifestRoute('traceability')}
    />
  );
```

---

## Test Coverage

### Group Q (Unit — label-config test file)

| ID | Description |
|---|---|
| Q01 | App.tsx case dpp block passes `onNavigateToTraceability` prop |
| Q02 | App.tsx wires prop to `navigateTenantManifestRoute('traceability')` |
| Q03 | App.tsx case dpp block still contains `onBack` |
| Q04 | DPPPassport.tsx defines `onNavigateToTraceability` as optional prop |
| Q05 | DPPPassport.tsx CTA uses optional chaining |
| Q06 | D-6: no URL patterns in case dpp block |

**Result:** 6/6 pass

### DPP-E2E-42 (E2E spec)

Source-analysis test. Confirms:
- App.tsx `case 'dpp'` passes `onNavigateToTraceability`
- Wired to `navigateTenantManifestRoute('traceability')`
- State-based nav: no `href`, `window.location`, or `router.push`
- `DPPPassport.tsx` prop remains optional
- D-6 constraint holds

Annotated with `limitation`: full click-through requires authenticated tenant session with empty
DPP registry — not available in this environment. Pre-existing Playwright two-versions blocker
also present.

### Full Suite Run (label-config)

134 tests — 132 passed / 2 skipped / 0 failed ✅

---

## TypeScript Validation

- `pnpm tsc --noEmit` (frontend): **PASS** (no output)
- `pnpm tsc --noEmit` (server): **PASS** (exit 0)

---

## Limitations

1. **Full runtime click-through not verified** — requires authenticated tenant with empty DPP
   registry. Source analysis confirms wiring is correct.

2. **Pre-existing Playwright two-versions blocker** — not regressed by 020H. DPP-E2E-42 is
   syntactically valid and passes TypeScript check; execution blocked by pre-existing env issue.

---

## Slice Relationship

| Slice | Deliverable |
|---|---|
| 020G | `DPPPassport.tsx` empty-state CTA with optional prop (no-op click) |
| **020H** | App.tsx wires `onNavigateToTraceability` → CTA now navigates to Traceability |

---

## Follow-Up

None. 020H completes the DPP Passport → Traceability CTA navigation chain.
