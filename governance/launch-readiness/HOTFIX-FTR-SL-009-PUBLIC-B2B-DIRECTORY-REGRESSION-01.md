# HOTFIX FTR-SL-009 Public B2B Directory Regression

**Unit:** `HOTFIX-FTR-SL-009-PUBLIC-B2B-DIRECTORY-REGRESSION-01`
**Date:** 2026-06-11
**Status:** FIXED_VERIFIED
**Final enum:** `HOTFIX_FTR_SL_009_PUBLIC_B2B_DIRECTORY_REGRESSION_FIXED_VERIFIED`

---

## 1. Scope And Final Posture

This hotfix addressed the production-visible `/b2b` regression where the public page showed:

```text
We could not load public profiles right now. You can still sign in or request access to continue.
```

The backend public directory API was not the failing path. Safe production API verification showed `GET /api/public/b2b/suppliers` returned HTTP 200 with both expected public supplier slugs:

```text
shraddha-industries
lt-b2b-001
```

The browser page simultaneously showed public directory filter options populated from supplier data, which confirmed that data had loaded into the frontend but was masked by stale error rendering.

---

## 2. Root Cause

`components/Public/B2BDiscovery.tsx` set a timeout fallback error while the directory request was pending. If the request succeeded after that timeout/transient error state, the component set `items` and `loading=false` but did not clear `error`.

The page rendered the error panel whenever `!loading && error`, even when supplier items existed. That allowed stale error state to hide valid public supplier cards.

---

## 3. Implementation Summary

Changed frontend behavior only:

- Clear `error` on successful `getPublicB2BSuppliers()` resolution.
- Render the public error panel only when loading is complete, an error exists, and there are zero supplier items.
- Add a regression test that triggers the timeout fallback, then resolves the directory request successfully, and confirms both public suppliers plus the demo/pilot label render.

No backend route, projection, schema, RLS, Prisma, env, package, production data, inquiry, email, profile GET, or browser `/supplier/:slug` behavior was changed.

---

## 4. Governance Outcome

FTR-SL-009 remains:

```text
IMPLEMENTED_PENDING_AUTHORIZED_DATA_ENTRY
```

FTR-SL-010 remains registered as the separate catalog offering-preview posture tooling gap.

A neighbor-path smoke-test rule was added to `FUTURE-TODO-REGISTER.md`: future shared backend route/bootstrap/control-plane route changes and public B2B discovery loading/error changes must smoke-test `GET /api/public/b2b/suppliers` and the `/b2b` public results grid, without calling production profile GET unless the FTR-SL-007 write side effect is explicitly accepted.

---

## 5. Validation Evidence

Focused frontend regression test:

```text
pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/public-b2b-discovery-regression.test.tsx

Test Files  1 passed (1)
Tests  1 passed (1)
```

Public B2B projection test:

```text
pnpm -C server exec vitest run src/__tests__/public-b2b-projection.unit.test.ts

Test Files  1 passed (1)
Tests  13 passed (13)
```

Control route neighbor test:

```text
pnpm -C server exec vitest run src/__tests__/control-supplier-publish-reinvite.integration.test.ts

Test Files  1 passed (1)
Tests  25 passed (25)
```

Server typecheck:

```text
pnpm -C server run typecheck

tsc --noEmit
```

Frontend typecheck:

```text
pnpm exec tsc --noEmit
```

Focused frontend lint:

```text
pnpm exec eslint components/Public/B2BDiscovery.tsx tests/frontend/public-b2b-discovery-regression.test.tsx
```

OpenAPI parse:

```text
openapi.control-plane.json parse: OK
```

---

## 6. Production Verification Sync

Safe production API and browser verification after commit `61ee2c5a` confirmed `GET /api/public/b2b/suppliers` returned HTTP 200 with `total=2` and slugs `shraddha-industries,lt-b2b-001`; the shared browser `/b2b` grid showed both `Shraddha Industries` and `Launch Test Supplier B2B 001`, including the `Demo / pilot supplier` label.

No production supplier profile GET, browser `/supplier/:slug`, inquiry, email, supplier data entry, SQL, Prisma migration/seed, schema/RLS/env/package, legal/payment/Zoho/CRM/CAE/TTP/D2C action was performed for this verification.

## 7. Final Classification

`HOTFIX_FTR_SL_009_PUBLIC_B2B_DIRECTORY_REGRESSION_FIXED_VERIFIED`
