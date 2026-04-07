# TexQtic Bootstrap Slow-Load Investigation v1

## 1. Header

- Date: 2026-04-07
- Type: bounded runtime investigation record
- Scope: super-admin, enterprise tenant, and white-label tenant bootstrap / slow-load behavior only
- Result posture: all three shells are slow to bootstrap but do recover; no non-recovering shell failure was confirmed in this pass

## 2. Opening Scope

This unit was intentionally limited to:

- live production runtime observation first
- narrow repo-path tracing second
- one governance-analysis artifact only

This unit did not:

- change any product file
- attempt any frontend remediation
- broaden into auth redesign
- broaden into backend performance tuning
- broaden into database, RLS, or migration work

## 3. Executive Finding

The currently truthful cross-shell classification is:

- Super Admin: `SLOW_LOAD_BUT_RECOVERS`
- Enterprise tenant shell: `SLOW_LOAD_BUT_RECOVERS`
- White-Label tenant shell: `SLOW_LOAD_BUT_RECOVERS`

The slow-load class is real, but the dominant pattern is not a dead shell.

Observed shared shape:

- auth succeeds
- a shell or restore gate appears
- one or more follow-up reads take multiple additional seconds
- the page eventually rehydrates into a stable usable state

Most truthful cross-cutting interpretation:

- control-plane slow-load is dominated by slow tenant-list reads
- tenant slow-load is dominated by auth/bootstrap gating around `getCurrentUser()` plus post-shell data hydration
- some repo paths plausibly amplify the delay further through duplicate or over-broad fetch triggers

## 4. Live Runtime Evidence

### A. Super Admin / Staff Control Plane

Observed login and first-entry sequence:

- `POST /api/auth/admin/login` -> `200` in about `8161ms`
- control-plane shell chrome became visible at about `8559ms`
- meaningful tenant-registry data became visible at about `17478ms`
- `GET /api/control/tenants` -> `200` in about `8682ms`

Observed reload sequence:

- shell chrome became visible at about `164ms`
- meaningful tenant-registry data became visible at about `9472ms`
- `GET /api/control/tenants` -> `200` in about `8756ms`

Visible runtime truth:

- the Staff Control Plane shell itself can paint quickly on reload
- the inner `Tenant Registry` state remains data-thin while the tenant list is loading
- the control-plane tenant read is large enough to remain the dominant visible lag even after the shell is present

Truthful classification for this shell:

- `SHELL_LOADS_DATA_LAGS`
- `SERIAL_FETCH_BOTTLENECK`
- overall status remains `SLOW_LOAD_BUT_RECOVERS`

### B. Enterprise Tenant Shell

Observed login sequence:

- pre-auth organisation resolution `GET /api/public/tenants/by-email?email=owner%40acme.example.com` -> `200` in about `1878ms`
- tenant login `POST /api/auth/login` -> `200` in about `11940ms`
- first visible enterprise shell state showed:
  - `Enterprise Management`
  - `Wholesale Catalog`
  - `Loading catalog...`

Observed follow-up reads after shell entry:

- `GET /api/me` -> about `5272ms`
- `GET /api/tenant/cart` -> about `4843ms`
- `GET /api/ai/insights?tenantType=B2B&experience=market_trends` -> about `5963ms`
- `GET /api/tenant/catalog/items?limit=20` -> about `7408ms`

Observed reload sequence:

- visible restore gate: `Restoring workspace`
- shell with `Loading catalog...` appeared at about `5664ms`
- product-data-ready state appeared at about `12641ms`

Visible runtime truth:

- enterprise login has a pre-auth organisation lookup before the actual login request
- tenant restore does not immediately return to a painted shell; it first shows a blocking restore gate
- after shell entry, the current enterprise landing page still waits on slower catalog hydration
- additional cart and AI reads occur in the same recovery window

Truthful classification for this shell:

- `AUTH_OR_REALM_GATING_DELAY`
- `BOOTSTRAP_DELAY`
- `SHELL_LOADS_DATA_LAGS`
- overall status remains `SLOW_LOAD_BUT_RECOVERS`

### C. White-Label Tenant Shell

Observed login sequence:

- pre-auth organisation resolution `GET /api/public/tenants/by-email?email=owner%40whitelabel.example.com` -> `200` in about `1769ms` to `1892ms`
- tenant login `POST /api/auth/login` -> `200` in about `11359ms`
- first visible WL-admin shell state showed:
  - `Store Admin`
  - `White Label Co`
  - `Store Profile`
  - `Storefront Configuration`

Observed reload sequence:

- visible restore gate: `Restoring workspace`
- `GET /api/me` -> `200` in about `5299ms`
- shell and page content became visible together at about `5435ms`

Visible runtime truth:

- the WL path shares the same pre-auth organisation lookup behavior as Enterprise
- the WL path shares the same tenant restore gate behavior as Enterprise
- the current observed WL landing page is materially lighter than the enterprise catalog landing page
- WL still exhibits a bootstrap delay, but current runtime evidence shows a shorter post-shell hydration window than Enterprise

Truthful classification for this shell:

- `AUTH_OR_REALM_GATING_DELAY`
- `BOOTSTRAP_DELAY`
- overall status remains `SLOW_LOAD_BUT_RECOVERS`

## 5. Repo-Path Findings

The repo-path trace supports the live runtime shape above.

### A. Tenant login is front-loaded by organisation resolution

Confirmed in `components/Auth/AuthFlows.tsx`:

- tenant login resolves membership by email through `resolveTenantsByEmail(...)`
- that lookup is triggered on email blur before login submission
- when multiple memberships exist, org selection is explicitly required before login can proceed

Meaning:

- tenant realm login is not a single request path
- it can incur an extra public lookup before the credential-bearing login call

### B. Tenant login and tenant restore both block on `getCurrentUser()` before shell continuity

Confirmed in `App.tsx`:

- `handleAuthSuccess(...)` calls `getCurrentUser()` for tenant logins before deciding whether to transition into `EXPERIENCE` or `WL_ADMIN`
- the tenant restore effect sets `tenantRestorePending(true)` and shows the `Restoring workspace` gate while it waits for `getCurrentUser()`
- only after that user/tenant read resolves does the app apply tenant identity and move into the tenant shell

Meaning:

- the tenant shell cannot truthfully complete bootstrap until `/api/me` returns
- this directly matches the observed Enterprise and WL restore gate behavior

### C. Catalog loading is app-state broad, not view-specific

Confirmed in `App.tsx`:

- the catalog fetch effect runs whenever app state is `EXPERIENCE`, `TEAM_MGMT`, `SETTINGS`, or `WL_ADMIN`
- it is not restricted to a catalog-specific enterprise or WL products panel before issuing `getCatalogItems(...)`

Meaning:

- enterprise catalog hydration on the default landing page is expected
- WL admin can also trigger catalog reads simply by entering `WL_ADMIN`, even when the visible panel is not `PRODUCTS`
- this is a credible hidden load amplifier for WL bootstrap and panel transitions

### D. Cart loading is globally mounted across tenant shells

Confirmed in `App.tsx` and `contexts/CartContext.tsx`:

- tenant shells are wrapped in `CartProvider`
- `CartProvider` calls `refreshCart()` on mount whenever `isAuthenticated()` returns true
- `refreshCart()` issues `GET /api/tenant/cart`

Meaning:

- cart loading participates in the same tenant recovery window after shell entry
- it is not necessarily the first-paint blocker, but it adds read pressure during tenant bootstrap

### E. Enterprise AI insight loading is an additional non-WL post-shell read

Confirmed in `App.tsx` and `services/aiService.ts`:

- non-white-label tenant experience/settings states trigger `getPlatformInsights(...)`
- the current implementation routes this to `GET /api/ai/insights`

Meaning:

- enterprise landing and recovery carry an additional AI read that WL does not carry in the same way
- this supports the observed enterprise-vs-WL difference in post-shell recovery weight

### F. Default control-plane entry has a duplicate tenant-read risk

Confirmed in `App.tsx`, `components/ControlPlane/TenantRegistry.tsx`, and `services/controlPlaneService.ts`:

- the app-level control-plane effect calls `getTenants()` when the app enters `CONTROL_PLANE`
- the default control-plane `TENANTS` view renders `TenantRegistry`
- `TenantRegistry` independently calls `getTenants()` on mount
- `getTenants()` is a direct `GET /api/control/tenants` read with no client-side deduping layer visible in this path

Meaning:

- the default control-plane entry path has a credible duplicate-read amplifier on the exact route already observed as slow in production
- this code-path finding is consistent with the repeated control-plane tenant-list delay seen on first entry and reload

## 6. Classification Summary

### Super Admin

- Primary live class: `SERIAL_FETCH_BOTTLENECK`
- Secondary live class: `SHELL_LOADS_DATA_LAGS`
- Overall classification: `SLOW_LOAD_BUT_RECOVERS`
- Dominant runtime driver: slow `GET /api/control/tenants` continuity

### Enterprise

- Primary live class: `BOOTSTRAP_DELAY`
- Secondary live class: `AUTH_OR_REALM_GATING_DELAY`
- Tertiary live class: `SHELL_LOADS_DATA_LAGS`
- Overall classification: `SLOW_LOAD_BUT_RECOVERS`
- Dominant runtime driver: pre-auth org lookup plus blocking `/api/me` bootstrap, followed by slower catalog hydration

### White-Label

- Primary live class: `BOOTSTRAP_DELAY`
- Secondary live class: `AUTH_OR_REALM_GATING_DELAY`
- Overall classification: `SLOW_LOAD_BUT_RECOVERS`
- Dominant runtime driver: blocking `/api/me` restore/bootstrap continuity

## 7. Most Important Narrow Conclusions

- The current slow-load problem is truthful and user-visible across all three shells.
- The current slow-load problem is not, in this pass, a permanent blank-screen or non-recovering shell defect.
- Super Admin is most strongly constrained by tenant-list retrieval cost.
- Enterprise is the heaviest tenant-side bootstrap path because it combines pre-auth org resolution, blocking tenant bootstrap, and heavier post-shell reads.
- White-Label shares the same auth/bootstrap gate as Enterprise but the currently observed page surface is lighter after shell entry.
- Repo tracing found two credible load amplifiers that were not necessary to prove from runtime alone:
  - default control-plane duplicate tenant reads
  - catalog reads firing across broader app states than the visible view strictly requires

## 8. Recommended Next Unit Boundary

If a remediation unit is opened later, the narrowest truthful next cut should separate the problem into three bounded lanes:

- control-plane tenant-list latency and duplicate-read containment
- tenant bootstrap gating around `/api/me`
- over-broad tenant-shell fetch triggers after shell entry

That separation is preferable to a single broad “make startup faster” patch because the live evidence shows materially different bottlenecks across the three shells.

## 9. Footer

- Product files changed: none
- Governance artifact created: `governance/analysis/TEXQTIC-BOOTSTRAP-SLOW-LOAD-INVESTIGATION-v1.md`
- Commit posture for this bounded pass: `NO_COMMIT_REQUIRED`