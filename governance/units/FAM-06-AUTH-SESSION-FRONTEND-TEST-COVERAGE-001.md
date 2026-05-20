# FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001

## 1. Unit Header

| Field | Value |
|---|---|
| Unit ID | FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001 |
| Title | FAM-06 Frontend Auth Service / Session DB-Free Contract Test Coverage |
| Status | VERIFIED_COMPLETE |
| Type | test-coverage |
| Date | 2026-07-21 |
| Authorized by | Paresh Patel |
| Layer 0 posture at execution | HOLD_FOR_AUTHORIZATION + HOLD_FOR_COUNSEL_FEEDBACK |
| Runtime changes | NONE |

---

## 2. Objective

Close Gap G-06-002 identified in `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`:

> "missing dedicated frontend auth service/session suite for `services/authService.ts`
>  and `services/apiClient.ts` auth branches"

This unit:

1. Creates `tests/frontend/auth-service-session.test.ts` — DB-free, network-mocked
   contract tests covering `services/apiClient.ts` (storage contract, error shapes,
   Bearer header enforcement) and `services/authService.ts` (login, public entry helpers,
   realm-aware token handling, password/verification endpoints).
2. Records Finding J6 in the FAM-06 audit hub (Category J).
3. Closes G-06-002 in the Gap Register.
4. Updates the FAM-06 row in LAUNCH-FAMILY-INDEX.

---

## 3. Scope

In scope:
- creation of `tests/frontend/auth-service-session.test.ts` (DB-free, fetch-mocked tests)
- closure of G-06-002 in FAM-06 Gap Register
- J6 finding addition in FAM-06 audit hub
- FAM-06 row update in LAUNCH-FAMILY-INDEX.md

Out of scope:
- runtime implementation changes to `services/authService.ts` or `services/apiClient.ts`
- DB-backed auth behavior changes
- Fastify server-side changes
- migrations or schema changes
- G-06-003 (robots/crawl exclusion verification) — deferred to later SEO/auth unit

---

## 4. Allowlist

### Modify (Create)

- `tests/frontend/auth-service-session.test.ts` (create)
- `governance/units/FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001.md` (create)

### Modify (Update)

- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
  (J6 finding added, G-06-002 closed)
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
  (FAM-06 evidence row updated, FAM-06 action register updated)

### Read-only

- `services/authService.ts`
- `services/apiClient.ts`
- `vitest.frontend.config.ts`
- `tests/setupTests.ts`
- `tests/frontend/public-inquiry-page.test.tsx`
- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `governance/units/FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001.md`

---

## 5. Forbidden Actions Enforced

- no runtime file edits
- no Prisma commands
- no `.env` or secret exposure
- no DB connection required or used
- no staging of pre-existing runtime modified files

---

## 6. Approved Commands Used

- `git diff --name-only`
- `git status --short`
- `pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/auth-service-session.test.ts --reporter=verbose`

---

## 7. What This Unit Adds — DB-Free Frontend Contract Tests

`tests/frontend/auth-service-session.test.ts` covers surfaces not previously exercised
by any frontend test file:

### Part 1 — apiClient: pure localStorage functions (no fetch required)

| Describe Block | Tests | IDs |
|---|---|---|
| `setToken / getToken realm separation` | 9 | APCL-001..009 |
| `clearAuth removes all auth state` | 5 | APCL-010..014 |
| `realm storage contract` | 6 | APCL-015..020 |
| `isAuthenticated` | 4 | APCL-021..024 |
| `APIError class contract` | 5 | APCL-025..029 |
| `impersonation token override` | 3 | APCL-030..032 |

### Part 2 — apiClient: fetch-based behavior (Bearer header, error shapes)

| Describe Block | Tests | IDs |
|---|---|---|
| `auth route skips Bearer header` | 1 | APCL-033 |
| `non-auth route attaches Bearer header` | 2 | APCL-034..035 |
| `HTTP error shapes` | 4 | APCL-036..039 |

### Part 3 — authService: login

| Describe Block | Tests | IDs |
|---|---|---|
| `login endpoint by realm` | 2 | AUTH-001..002 |
| `login clears stale auth before post` | 1 | AUTH-003 |
| `login body shape by realm` | 2 | AUTH-004..005 |
| `login realm-hint header` | 2 | AUTH-006..007 |
| `login stores token after success` | 3 | AUTH-008..010 |
| `login payload normalization` | 1 | AUTH-011 |

### Part 4 — authService: public entry helpers

| Describe Block | Tests | IDs |
|---|---|---|
| `resolvePublicEntryDescriptor endpoint shape` | 4 | AUTH-012..015 |
| `resolveTenantBySlug` | 4 | AUTH-016..019 |
| `resolveTenantsByEmail` | 3 | AUTH-020..022 |

### Part 5 — authService: isAuthenticatedFor

| Describe Block | Tests | IDs |
|---|---|---|
| `isAuthenticatedFor` | 4 | AUTH-023..026 |

### Part 6 — authService: password / verification endpoints

| Describe Block | Tests | IDs |
|---|---|---|
| `forgotPassword endpoint and body` | 2 | AUTH-027..028 |
| `resetPassword endpoint and body` | 2 | AUTH-029..030 |
| `verifyEmail endpoint and body` | 1 | AUTH-031 |
| `resendVerification endpoint and body` | 2 | AUTH-032..033 |

### Part 7 — no-secret-leak and failure handling

| Describe Block | Tests | IDs |
|---|---|---|
| `no-secret-leak and failure handling` | 2 | AUTH-034..035 |

**Total: 74 tests. All passing.**

---

## 8. Test Design Decisions

1. **No DB connection.** Tests import directly from `services/apiClient.ts` and
   `services/authService.ts`. Both are pure browser modules with no Prisma or Fastify
   dependencies. jsdom provides `localStorage` and `AbortController`.

2. **Fetch mocked per test.** `global.fetch = vi.fn()` is set in the top-level
   `beforeEach` to a safe rejection default ("fetch not mocked in this test"), ensuring
   tests that forget to mock fetch fail loudly rather than silently passing. Individual
   tests override it with specific resolved/rejected values.

3. **No `vi.mock` of `apiClient` module.** The full module chain
   (`authService` → `apiClient` → `fetch`) is exercised end-to-end. This validates
   real request construction (body, headers, URL), not just mocked call signatures.

4. **`POST` (no retry) for error shape tests.** `get()` uses `withRetry` which has
   300ms + 900ms inter-attempt delays. Using `post()` for HTTP error shape tests
   (APCL-036..039) avoids real timer waits. GET tests needing error shapes use
   `get(url, undefined, { retry: false })`.

5. **Storage key mirrors are inline.** `TENANT_TOKEN_KEY`, `ADMIN_TOKEN_KEY`,
   `AUTH_REALM_KEY` are not re-exported by `apiClient.ts`. The test file mirrors the
   values as compile-time constants and validates the actual localStorage state.
   If the keys are renamed in `apiClient.ts`, these mirrors will break the tests
   immediately and visibly.

6. **`makeDescriptor` factory** builds minimal valid `PublicEntryResolutionDescriptor`
   objects for entry-resolver tests with sensible defaults and per-test overrides.

7. **Follows existing frontend test pattern** (`tests/frontend/public-inquiry-page.test.tsx`):
   vitest + jsdom + `@testing-library/jest-dom/vitest`, no Playwright.

---

## 9. Preflight Evidence

Pre-existing dirty files confirmed before edits, preserved unchanged:
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## 10. Files Changed

Created:
- `tests/frontend/auth-service-session.test.ts`
- `governance/units/FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001.md`

Modified:
- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`

---

## 11. Validation Run

```
pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/auth-service-session.test.ts --reporter=verbose
```

Result:
```
 Test Files  1 passed (1)
      Tests  74 passed (74)
   Start at  08:29:58
   Duration  4.74s (transform 161ms, setup 388ms, collect 136ms, tests 46ms, environment 3.01s, prepare 692ms)
```

All 74 tests PASS. No runtime files modified.

---

## 12. Hub-Sync Q1-Q10

**Q1: Did this unit change family readiness status?**
NO — evidence level remains `REPO_CONFIRMED`. Implementation readiness remains `NOT_ASSESSED`.

**Q2: Did this unit change the Gap Register?**
YES — G-06-002 status changed from `P1 open` to `CLOSED`.

**Q3: Which launch-readiness hub files changed?**
`FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`, `LAUNCH-FAMILY-INDEX.md`.

**Q4: Authorizing source?**
FAM-06 Opening Audit Gap Register (G-06-002) + follow-on unit directive from
`FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001` Section 14.

**Q5: Any Layer 0 conflict introduced?**
NO.

**Q6: Any DPP/TTP posture conflict introduced?**
NO.

**Q7: Any CRM/CAE row mutated?**
NO.

**Q8: Any runtime or schema mutation performed?**
NO.

**Q9: Is hub consistency preserved post-sync?**
YES. J6 added, G-06-002 closed, LAUNCH-FAMILY-INDEX FAM-06 row updated.

**Q10: Any inline mirror maintenance concern?**
The storage key mirrors (`TENANT_TOKEN_KEY`, `ADMIN_TOKEN_KEY`, `AUTH_REALM_KEY`) in
the test file are the only ongoing maintenance concern: if renamed in `apiClient.ts`,
tests will break immediately and visibly. This is the intended behavior (break loudly,
not silently pass).

---

## 13. Risks / Follow-up

- G-06-002 is now CLOSED. G-06-003 remains open (robots/crawl exclusion for
  authenticated routes — deferred to SEO/auth hardening unit).
- `logout()` is not tested: it calls `clearAuth()` then assigns `window.location.href = '/'`.
  `clearAuth` is fully tested. The `window.location` navigation side-effect is a jsdom
  limitation that makes direct testing fragile; this surface is documented as
  deferred scope.
- `getCurrentUser` (deduplicated GET /api/me) is not tested directly; Bearer header
  behavior for GET /api/me is covered by APCL-034/035.
- Next recommended unit: `FAM-06-AUTH-SESSION-IMPLEMENTATION-READINESS-VERIFY-CLOSE-001` —
  both backend and frontend coverage are now sufficient to assess implementation readiness
  and promote FAM-06 status beyond `NOT_ASSESSED`.

---

## 14. Runtime Safety Statement

No runtime files were changed.
No schema or migration files were changed.
No environment files were changed.
No test helpers were added to the `server/` package.

---

## 15. Commit Message

`[TEXQTIC] test: add frontend auth session coverage`
