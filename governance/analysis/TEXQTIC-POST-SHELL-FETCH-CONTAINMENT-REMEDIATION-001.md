# TexQtic Post-Shell Fetch Containment Remediation 001

## 1. Header

- Date: 2026-04-07
- Type: bounded remediation record
- Scope: over-broad post-shell catalog/cart trigger containment after tenant bootstrap only

## 2. Opening Scope

This unit was intentionally limited to the post-shell fetch amplifiers already identified in [governance/analysis/TEXQTIC-BOOTSTRAP-SLOW-LOAD-INVESTIGATION-v1.md](c:\Users\PARESH\TexQtic\governance\analysis\TEXQTIC-BOOTSTRAP-SLOW-LOAD-INVESTIGATION-v1.md).

Allowed focus:

- App-owned catalog fetch trigger conditions in `App.tsx`
- whether `WL_ADMIN` and non-product tenant views were still triggering App-owned catalog work
- whether `WL_ADMIN` was mounting cart context early enough to trigger unnecessary `GET /api/tenant/cart`
- this remediation record only for truthful closeout

This unit did not:

- reopen `/api/me` multiplicity containment
- redesign catalog architecture broadly
- redesign cart architecture broadly
- change control-plane fetch behavior
- change backend, schema, migrations, RLS, or environment configuration

## 3. Confirmed Defect Baseline

Current runtime truth entering this unit was already:

- provisional tenant bootstrap happens before canonical `/api/me`
- repeated `/api/me` reads are contained on the exercised Enterprise and White Label restore paths
- tenant shell continuity now enters immediately on those exercised restore paths
- the remaining lane still truthfully fits `SLOW_LOAD_BUT_RECOVERS`

Repo trace and live runtime reconfirmed the next credible amplifier:

- `App.tsx` fetched App-owned catalog data whenever app state was `EXPERIENCE`, `TEAM_MGMT`, `SETTINGS`, or `WL_ADMIN`
- that meant non-product views could still trigger `GET /api/tenant/catalog/items` simply because the shell family had mounted
- `WL_ADMIN` was wrapped in `CartProvider`, and `CartProvider` eagerly called `refreshCart()` on mount whenever authenticated
- live production WL admin restore on a non-product page previously showed all of the following on the same recovery path:
  - one canonical `/api/me`
  - `GET /api/tenant/cart`
  - `GET /api/tenant/catalog/items?limit=20`

## 4. Root Cause

The bounded root cause was over-broad frontend trigger ownership after shell entry:

- the App-owned catalog effect was keyed too broadly on shell state instead of on views that actually render App-owned `products`
- `WL_ADMIN` mounted cart context even though current WL admin surfaces do not consume `useCart()`

This meant non-product WL admin pages and non-home tenant views could still pay catalog/cart work that was not required for the visible page.

## 5. Files Changed

Product file changed:

- `App.tsx`

No service wrapper, backend, schema, migration, env, or contract file changed in this unit.

Governance file created after truthful production verification:

- `governance/analysis/TEXQTIC-POST-SHELL-FETCH-CONTAINMENT-REMEDIATION-001.md`

## 6. Fix Summary

The bounded fix in `App.tsx` now:

- derives whether App-owned catalog loading is actually needed for the current visible surface
- limits App-owned catalog fetches to:
  - Enterprise `EXPERIENCE` home
  - non-white-label B2C `EXPERIENCE` home
  - `WL_ADMIN` `PRODUCTS`
- stops App-owned catalog reads from firing on `TEAM_MGMT`, `SETTINGS`, non-home `EXPERIENCE` views, and non-product WL admin views
- removes `CartProvider` from the `WL_ADMIN` branch so current WL admin surfaces no longer trigger `GET /api/tenant/cart` just by mounting the shell

Important boundary note:

- this unit does not remove catalog loading from pages that genuinely render catalog data
- this unit does not change Enterprise/B2C cart behavior outside the bounded WL admin mount case
- this unit does not claim the whole bootstrap / slow-load lane is now closed

## 7. Local / Targeted Verification

Completed:

- editor diagnostics for `App.tsx` showed no new unit-specific errors attributable to this containment change
- `pnpm exec tsc --noEmit` -> `EXIT 0`

Targeted lint result:

- `pnpm exec eslint App.tsx --ext ts,tsx` -> blocked by pre-existing `App.tsx` findings outside this unit:
  - `App.tsx:1152:39` `HTMLElement` `no-undef`
  - `App.tsx:1621:6` `react-hooks/exhaustive-deps` warning for the previously existing `tenantBootstrapCurrentUserOptions` dependency chain

Truthful local verification posture:

- local compile/type posture = `PASS`
- targeted lint posture = `PRE_EXISTING_APP_FINDINGS_ONLY`

## 8. Product Commit / Deploy Evidence

- product commit: `accfb93`
- product commit message: `fix: contain post shell fetch triggers`
- push result: `70a4db5..accfb93  main -> main`

Production bundle verification:

- pre-fix browser bundle: `index-8r_JUxbF.js`
- deployed bundle observed after push: `index-D8yBsaym.js`

## 9. Production Verification

Truthful production verification was completed against `https://app.texqtic.com/` using the exercised Enterprise and White Label tenant sessions.

### A. White Label tenant

Tenant used:

- `White Label Co`

#### WL admin restore continuity

Observed after reload on the deployed bundle with a valid tenant JWT present:

- shell continuity still entered immediately into `WL_ADMIN`
- `tenantRestore:stub_applied` recorded at `2026-04-07T12:35:52.404Z`
- canonical `/api/me` still executed once and completed in about `6933.0 ms`

#### WL admin non-product fetch containment

Visible surface exercised after deploy:

- `Store Profile` / non-product WL admin page

Observed resource list on that page after reload:

- `GET /api/me` only
- no `GET /api/tenant/cart`
- no `GET /api/tenant/catalog/items?limit=20`

This is a truthful improvement versus the pre-fix live baseline, where the exercised WL admin non-product page incurred both cart and catalog reads during the same restore window.

#### WL admin product view correctness

Visible surface exercised after deploy:

- `WL_ADMIN` -> `Products`

Observed resource list after entering `Products`:

- `GET /api/tenant/catalog/items?limit=20` completed in about `4277.6 ms`
- product inventory rendered correctly on the page

Meaning:

- the containment did not suppress the WL admin product surface that genuinely needs catalog data

### B. Enterprise tenant

Tenant used:

- `Acme Corporation`

#### Enterprise login / restore continuity

Observed after deploy:

- tenant login still completed successfully into the Enterprise shell
- default Enterprise restore still entered the visible shell correctly on reload
- reload trace showed:
  - `tenantRestore:stub_applied` at `2026-04-07T12:38:35.680Z`
  - one canonical `/api/me` completing in about `5436.9 ms`
- default Enterprise home still truthfully loaded the data it needs:
  - `/api/tenant/cart` about `3930.1 ms`
  - `/api/tenant/catalog/items?limit=20` about `4013.1 ms`

#### Enterprise non-product fetch containment

Visible surface exercised after deploy:

- Enterprise `Orders`

Observed after clearing timings on the catalog home and navigating to `Orders`:

- `GET /api/tenant/orders` completed in about `4733.2 ms`
- no `GET /api/tenant/catalog/items`
- no new `GET /api/tenant/cart`
- no new `GET /api/ai/insights`

Meaning:

- the non-product `EXPERIENCE` transition no longer retriggers App-owned catalog work just because `appState` remains `EXPERIENCE`

## 10. Runtime Result

Truthful runtime result for this bounded unit:

- `PARTIAL_IMPROVEMENT`

Why it is not `PASSED`:

- the bounded over-broad trigger identified in this unit was reduced truthfully
- but the broader bootstrap / slow-load lane is not yet closed
- Enterprise home still legitimately carries catalog/cart/AI recovery weight
- cart loading across non-WL tenant shells remains a separate potential amplifier outside the narrowest safe fix applied here

## 11. Lane Status

This lane is not yet truthfully closed.

What is now proven:

- WL admin non-product pages no longer trigger unnecessary cart and App-owned catalog work on the exercised restore path
- Enterprise non-product `EXPERIENCE` navigation no longer retriggers App-owned catalog work on the exercised path
- required product surfaces still function correctly where catalog data is genuinely needed

What remains outside this bounded close:

- legitimate Enterprise home catalog/cart/AI hydration still contributes to the overall slow-load classification
- non-WL cart timing remains a separate bounded question if this lane needs another step