# HOTFIX FTR-SL-009 B2B Discovery Error Flash Cleanup

**Unit:** `HOTFIX-FTR-SL-009-B2B-DISCOVERY-ERROR-FLASH-CLEANUP-01`
**Date:** 2026-06-11
**Status:** FIXED_PENDING_DEPLOY_VERIFICATION
**Final enum:** `HOTFIX_FTR_SL_009_B2B_DISCOVERY_ERROR_FLASH_CLEANUP_FIXED_PENDING_DEPLOY_VERIFICATION`

---

## 1. Scope And Final Posture

This hotfix cleans up the remaining public `/b2b` launch UX regression reported after commit `61ee2c5a`: the page briefly displayed the final public error panel during normal loading, then correctly rendered public supplier cards.

The intended behavior is:

- Initial loading state is neutral.
- Slow pending requests remain neutral.
- Delayed successful requests after the timeout threshold do not show the final error panel.
- Final error panel appears only after a genuine failed request.
- Loaded supplier cards win over stale error state.
- `lt-b2b-001` continues to show `Demo / pilot supplier` when cards render.

---

## 2. Root Cause

`B2BDiscoveryPage` used a 15 second timeout as a final failure path. When the timeout fired while the directory request was still pending, it set `error` and `loading=false`.

The previous hotfix cleared stale error state after a successful response and prevented loaded items from being hidden after success, but it still allowed the final error panel to appear during the pending window before the successful response completed.

---

## 3. Implementation Summary

Changed frontend state handling only:

- Added a neutral `slowLoading` state.
- Timeout threshold now switches loading copy from `Loading public textile profiles...` to `Still loading public textile profiles...`.
- Timeout threshold no longer sets final error and no longer sets `loading=false`.
- Successful response clears `error`, clears `slowLoading`, stores items, and ends loading.
- Failed response clears `slowLoading`, sets final error, and ends loading.
- Error panel still requires non-loading final error plus zero loaded supplier items.

No backend route, projection, schema, RLS, Prisma, env, package, deployment setting, production data, inquiry, email, supplier profile GET, or browser `/supplier/:slug` behavior was changed.

---

## 4. Tests

Focused frontend regression coverage now includes:

- Slow pending request at the timeout threshold does not show final public error text.
- Neutral slow-loading copy is visible while the request remains pending.
- Delayed success after the timeout threshold renders both public supplier cards.
- `lt-b2b-001` keeps the `Demo / pilot supplier` label.
- Genuine failed request renders the final public error panel and no supplier cards.

---

## 5. Governance Outcome

Previous hotfix `HOTFIX-FTR-SL-009-PUBLIC-B2B-DIRECTORY-REGRESSION-01` was upgraded in `FUTURE-TODO-REGISTER.md` from pending deploy verification to verified, based on post-push production API and visual `/b2b` verification after commit `61ee2c5a`.

FTR-SL-009 remains:

```text
IMPLEMENTED_PENDING_AUTHORIZED_DATA_ENTRY
```

FTR-SL-010 remains registered as the separate catalog offering-preview posture tooling gap.

Neighbor-path smoke-test rule remains active.

---

## 6. Adjacent Findings

No new adjacent launch blockers were found in this cleanup. The observed issue was the same `/b2b` frontend loading/error state-machine surface and was fixed in scope.

Existing residuals remain unchanged:

- FTR-SL-009 awaits separately authorized supplier taxonomy data entry.
- FTR-SL-010 remains the catalog offering-preview publication posture tooling gap.
- FTR-SL-007 guardrail remains active for production supplier profile GET/browser routes.

---

## 7. Validation Evidence

Focused frontend regression test:

```text
pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/public-b2b-discovery-regression.test.tsx

Test Files  1 passed (1)
Tests  3 passed (3)
```

Additional validation and production verification are recorded in the final hotfix report.

---

## 8. Final Classification

`HOTFIX_FTR_SL_009_B2B_DISCOVERY_ERROR_FLASH_CLEANUP_FIXED_PENDING_DEPLOY_VERIFICATION`
