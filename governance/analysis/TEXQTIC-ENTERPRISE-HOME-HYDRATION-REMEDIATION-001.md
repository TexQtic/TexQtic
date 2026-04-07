# TEXQTIC — ENTERPRISE HOME HYDRATION REMEDIATION 001

## 1. Header

- Date: 2026-04-07
- Type: bounded remediation record
- Scope: Enterprise tenant home first-load hydration only
- Runtime result: `PARTIAL_IMPROVEMENT`
- Lane closed: `NO`

## 2. Exact cause fixed

Enterprise home hydration was still carrying secondary work too early in the first recovery window.

The two concrete causes fixed in this unit were:

- `App.tsx` requested `GET /api/ai/insights` for non-white-label `EXPERIENCE` and `SETTINGS` states even though the only rendered consumer of `aiInsight` is the aggregator discovery workspace. Enterprise home paid this read on first load without using the result in the visible B2B home frame.
- Enterprise home fetched `GET /api/tenant/catalog/items?limit=20` as a single first-load block before the initial B2B catalog grid could settle, while cart hydration also mounted in the same recovery window.

## 3. Files changed

- `App.tsx`
- `contexts/CartContext.tsx`

## 4. Product change applied

### A. AI hydration scope reduction

- Restricted `getPlatformInsights(...)` to the aggregator discovery entry surface only.
- Enterprise home no longer issues an unused AI request on first load.

### B. Enterprise catalog first-paint slimming

- Split Enterprise home catalog hydration into:
  - first-paint batch: `limit=8`
  - deferred tail batch: `limit=12` after the initial frame
- This preserves the home surface while reducing the weight of the first visible catalog frame.

### C. Enterprise cart sequencing

- Added a deferred initial cart refresh path in `CartProvider`.
- Applied that deferral only when the provider is mounted on the Enterprise home entry surface.
- Cart continuity remains intact, but the cart read no longer has to compete with the first frame immediately.

## 5. Local / targeted verification

### A. Type check

- Command: `pnpm exec tsc --noEmit`
- Result: passed

### B. File-scoped lint check

- Command: `pnpm exec eslint App.tsx contexts/CartContext.tsx --ext ts,tsx`
- Result: no new issues from this remediation
- Pre-existing App.tsx issues remained:
  - `HTMLElement` `no-undef`
  - React hook missing dependency warning for `tenantBootstrapCurrentUserOptions`

### C. Local runtime smoke

- Local Vite frontend booted at `http://127.0.0.1:4173/`
- Auth screen rendered successfully

## 6. Product commit

- Commit: `e5e76120e54a6f8c9fe599516f7b6fbaabc9480c`
- Message: `fix: slim enterprise home hydration`

## 7. Truthful production verification

### A. Deployment evidence

- Pre-remediation bundle on production: `index-D8yBsaym.js`
- Post-remediation bundle on production: `index-CMeLaQKQ.js`

### B. Baseline Enterprise home reload before deploy

Observed resource entries on production Enterprise home reload before this remediation deployed:

- `GET /api/me` in about `6313ms`
- `GET /api/tenant/cart` in about `6706ms`
- `GET /api/ai/insights?tenantType=B2B&experience=market_trends` in about `9473ms`
- `GET /api/tenant/catalog/items?limit=20` in about `7537ms`

Visible shell state before full catalog readiness:

- `Enterprise Management`
- `Wholesale Catalog`
- `Loading catalog...`

### C. Enterprise home reload after deploy

Observed resource entries on production Enterprise home reload after this remediation deployed:

- `GET /api/me` in about `6701ms`
- `GET /api/tenant/catalog/items?limit=8` in about `6838ms`
- `GET /api/tenant/cart` in about `6545ms`
- `GET /api/tenant/catalog/items?limit=12&cursor=68c9daa6-96ca-4f53-85c1-a8f221fe47db` in about `3919ms`

Observed UI continuity after deploy:

- Enterprise login/restore remained functional
- Enterprise home still rendered `Enterprise Management` and `Wholesale Catalog`
- The loading state cleared into the product grid successfully
- The cart trigger remained visible
- The cart drawer still opened and rendered `Your Cart` with the expected empty-cart state
- `Request Quote` actions remained visible on loaded catalog cards

## 8. Truthful interpretation

This remediation produced a real but bounded improvement.

Truthfully improved:

- Enterprise home no longer pays the unused AI insights request on first load.
- Enterprise home first visible catalog frame is lighter because the initial read is now `limit=8` instead of `limit=20`.
- Remaining catalog items are sequenced behind the first frame instead of being front-loaded in a single larger read.
- Cart hydration still occurs, but it is deferred behind the first paint path.

Truthfully not yet closed:

- Enterprise home still depends on `/api/me`, cart hydration, and catalog hydration in the same overall recovery window.
- The lane remains `SLOW_LOAD_BUT_RECOVERS`, not fully closed.

## 9. Final posture

- Runtime result: `PARTIAL_IMPROVEMENT`
- Bootstrap / slow-load lane closed: `NO`
- Additional bounded work would still be required to claim full closure for Enterprise home first-load performance.
