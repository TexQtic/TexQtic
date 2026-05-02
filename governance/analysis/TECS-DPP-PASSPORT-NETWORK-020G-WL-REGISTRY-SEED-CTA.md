# TECS-DPP-PASSPORT-NETWORK-020G — WL Registry QA Seed + Empty-State UX CTA

**Status:** VERIFIED_COMPLETE_WITH_LIMITATIONS  
**Date closed:** 2026-05-15  
**Slice:** 020G  
**Preceded by:** 020F (WL Registry Empty-State Investigation — INVESTIGATION_COMPLETE)  
**Follows up on:** 020F secondary finding (CTA absent; seed script B2B-only)

---

## Objective

Two deliverables:
1. **Empty-State CTA** — add actionable "Go to Traceability" link in `DPPPassport.tsx` empty-state block so WL (and B2B) users have a direct navigation path when no passports are present.
2. **Seed WL Path** — parameterize `scripts/seed-dpp-fixture.ts` to support `--target wl` (WL tenant seeding) in addition to the existing B2B default.

---

## Constraints

- **App.tsx is FORBIDDEN to edit in 020G** (out of allowlist). The `DPPPassport` call site in `App.tsx` only passes `onBack`. Navigation prop must be optional.
- **B2B default must be preserved** — no `--target` arg must still produce B2B behavior identically.
- **Sentinel collision** — WL and B2B share the same Supabase DB; distinct QA sentinel IDs required.
- **D-6 hotfix rule** — no `.json` suffix routes; no Fastify route changes.
- **`qa-wl.json` absent** — `.auth/qa-wl-admin.json` used for WL auth (confirmed: keys `token` + `orgId`).

---

## Implementation

### 1. `components/Tenant/DPPPassport.tsx`

**Props interface change:**
```typescript
interface Props {
  onBack: () => void;
  title?: string;
  subtitle?: string;
  /** Optional: navigate to the tenant Traceability page from the empty registry state. */
  onNavigateToTraceability?: () => void;
}
```

**Destructuring:**
```typescript
export function DPPPassport({ onBack, title, subtitle, onNavigateToTraceability }: Readonly<Props>) {
```

**Empty-state block (was single `<div>`):**
```tsx
{!registryLoading && !registryError && registryLoaded && registry.length === 0 && (
  <div>
    <div data-testid="dpp-passport-registry-empty" className="text-sm text-slate-400 py-2">
      No product passports yet.
    </div>
    <p data-testid="dpp-passport-registry-empty-help" className="text-xs text-slate-400 mt-1">
      Traceability nodes become passport entries automatically after they are created.
    </p>
    <button
      data-testid="dpp-passport-registry-traceability-cta"
      type="button"
      onClick={() => onNavigateToTraceability?.()}
      className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
    >
      Go to Traceability &rarr;
    </button>
  </div>
)}
```

**CTA behavior:**
- Renders unconditionally in the empty state (no conditional on prop presence).
- `onNavigateToTraceability?.()` — optional chaining ensures safe no-op when prop is absent.
- App.tsx passes no `onNavigateToTraceability` → CTA renders but click is no-op. TS clean because prop is `?`.

**New test IDs introduced:**
- `dpp-passport-registry-empty-help` — NEW
- `dpp-passport-registry-traceability-cta` — NEW

**Retained test IDs:**
- `dpp-passport-registry-empty` — present, copy shortened to "No product passports yet."
- `dpp-passport-registry-loading`, `dpp-passport-registry-error`, `dpp-passport-registry-card` — unchanged

### 2. `scripts/seed-dpp-fixture.ts`

**New constants:**
```typescript
const QA_NODE_SENTINEL_BATCH_ID_WL = 'qa-dpp-fixture-wl-node-001';
const QA_CERT_SENTINEL_ID_WL = 'f0000000-0000-4000-a000-000000000002';

const _cliArgs = process.argv.slice(2);
const _targetIdx = _cliArgs.indexOf('--target');
const TARGET: 'b2b' | 'wl' =
  _targetIdx !== -1 && _cliArgs[_targetIdx + 1] === 'wl' ? 'wl' : 'b2b';
```

**Functions parameterized:**
- `loadAuth(target: 'b2b' | 'wl' = 'b2b')` — uses `qa-wl-admin.json` for WL
- `loadExistingFixture(target: 'b2b' | 'wl' = 'b2b')` — reads `dpp-qa-wl-fixture.json` for WL
- `writeFixture(meta, target: 'b2b' | 'wl' = 'b2b')` — writes `dpp-qa-wl-fixture.json` for WL
- `ensureApprovedCert(qaOrgId, target: 'b2b' | 'wl' = 'b2b')` — uses `QA_CERT_SENTINEL_ID_WL` for WL
- `ensureTraceabilityNode(qaOrgId, target: 'b2b' | 'wl' = 'b2b')` — uses `QA_NODE_SENTINEL_BATCH_ID_WL` for WL

**`main()` wiring:**
```typescript
console.log(`[seed-dpp-fixture] Auth target: ${TARGET}`);
const auth = loadAuth(TARGET);
const existing = loadExistingFixture(TARGET);
// ... target passed to all functions
writeFixture({ ... }, TARGET);
```

**Usage:**
```
node --import tsx scripts/seed-dpp-fixture.ts               # B2B (default — unchanged)
node --import tsx scripts/seed-dpp-fixture.ts --target b2b  # B2B explicit
node --import tsx scripts/seed-dpp-fixture.ts --target wl   # WL tenant
```

---

## Test Coverage

### Unit tests — Group P in `server/src/__tests__/tecs-dpp-passport-label-config.test.ts`
15 tests (P01–P15):
- P01–P08: DPPPassport.tsx CTA source coverage, optional prop, App.tsx call site not broken
- P09–P14: seed-dpp-fixture.ts WL parameterization (TARGET constant, WL auth file, WL output file, distinct sentinels)
- P15: D-6 constraint — no `.json` route introduced

### Unit tests — Group 7 in `server/src/__tests__/tecs-dpp-passport-registry.test.ts`
6 tests (PR-G01–PR-G06):
- CTA test IDs, empty-state guard containment, optional prop, optional chaining

### E2E — DPP-E2E-41 in `tests/e2e/dpp-passport-network.spec.ts`
Source-analysis coverage (no browser session required). Verifies CTA test IDs, optional prop, seed WL parameterization, D-6 constraint. Annotated with `limitation` per established pattern (authenticated WL browser session not available in environment).

**Test runs:**
- `tecs-dpp-passport-label-config`: 128 tests — **126 passed / 2 skipped / 0 failed** ✅
- `tecs-dpp-passport-registry`: 27 tests — **26 passed / 1 skipped / 0 failed** ✅
- `dpp-passport-network.spec.ts` (E2E runner): pre-existing environment blocker (Playwright two-versions error on line 103 — present before 020G, not regressed). TypeScript check of spec file is clean.

---

## Limitations

1. **App.tsx not wired** — `onNavigateToTraceability` prop not passed in App.tsx `case 'dpp'`. CTA renders but click is no-op. Deferred to **020H** (wiring + runtime verification).
2. **WL seed runtime test** — `--target wl` path requires live Supabase QA WL org and authenticated WL admin session. Source coverage only in this slice.
3. **E2E runner** — pre-existing Playwright two-versions error prevents direct test runner execution. Not introduced by 020G.

---

## Files Changed

| File | Change |
|---|---|
| `components/Tenant/DPPPassport.tsx` | Added `onNavigateToTraceability` optional prop + CTA button + help text in empty-state block |
| `scripts/seed-dpp-fixture.ts` | Added `--target wl` CLI parameterization, WL sentinel IDs, WL auth/fixture file routing |
| `server/src/__tests__/tecs-dpp-passport-label-config.test.ts` | Added Group P (P01–P15) |
| `server/src/__tests__/tecs-dpp-passport-registry.test.ts` | Added Group 7 (PR-G01–PR-G06) |
| `tests/e2e/dpp-passport-network.spec.ts` | Added DPP-E2E-41 |
| `governance/analysis/TECS-DPP-PASSPORT-NETWORK-020G-WL-REGISTRY-SEED-CTA.md` | This file |

---

## Next Slice

**020H** — Wire `onNavigateToTraceability` in App.tsx `case 'dpp'` to `navigateTenantManifestRoute('traceability')`. NOT AUTHORIZED until Paresh opens.
