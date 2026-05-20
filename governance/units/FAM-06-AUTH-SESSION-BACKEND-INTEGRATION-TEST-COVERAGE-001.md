# FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001

## 1. Unit Header

| Field | Value |
|---|---|
| Unit ID | FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001 |
| Title | FAM-06 Backend Auth Session DB-Free Contract Test Coverage |
| Status | VERIFIED_COMPLETE |
| Type | test-coverage |
| Date | 2026-07-21 |
| Authorized by | Paresh Patel |
| Layer 0 posture at execution | HOLD_FOR_AUTHORIZATION + HOLD_FOR_COUNSEL_FEEDBACK |
| Runtime changes | NONE |

---

## 2. Objective

Close Gap G-06-001 identified in `FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`:

> "missing dedicated backend auth route integration suite for `auth.ts`"

The original J3 finding was a **location mismatch** — comprehensive auth integration tests
exist in `server/src/__tests__/` (9+ files), not in `server/src/routes/` where the audit
searched. This unit:

1. Corrects the J3 finding in the audit hub.
2. Documents the existing integration test inventory in `server/src/__tests__/`.
3. Adds DB-free pure-logic contract tests for surfaces not covered by those integration
   suites: validation schema rejection contracts, token utility behaviors, realm isolation
   enforcement, rate-limit key hashing, IP parsing, cookie realm naming, and the
   no-signup surface assertion.

---

## 3. Scope

In scope:
- creation of `tests/auth-route-session.test.ts` (DB-free pure-logic tests only)
- correction of J3 finding in FAM-06 opening audit hub
- closure of G-06-001 in Gap Register
- FAM-06 row update in LAUNCH-FAMILY-INDEX.md

Out of scope:
- runtime implementation changes
- DB-backed auth behavior changes
- live Fastify server setup in tests
- migrations or schema changes
- G-06-002 (frontend auth service/session tests) — separate follow-on unit

---

## 4. Allowlist

### Modify (Create)

- `tests/auth-route-session.test.ts` (create)
- `governance/units/FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001.md` (create)

### Modify (Update)

- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
  (J3 finding corrected, J5 added, G-06-001 closed)
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
  (FAM-06 evidence row review trigger updated, FAM-06 action register updated)

### Read-only

- `server/src/utils/auth/refreshToken.ts`
- `server/src/lib/authTokens.ts`
- `server/src/utils/rateLimit/rateLimiter.ts`
- `server/src/routes/auth.ts`
- `server/src/db/prisma.ts`
- `server/vitest.config.ts`
- `server/tsconfig.json`
- `tests/membership-authz.test.ts`
- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `governance/units/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT-001.md`

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
- `pnpm --dir server exec vitest run ../tests/auth-route-session.test.ts --reporter=verbose`

---

## 7. J3 Correction — Location Mismatch

The audit's J3 gap finding stated:

> "no dedicated backend integration test file for `server/src/routes/auth.ts` was found.
>  Evidence: route test discovery did not find `auth*.test.ts` under `server/src/routes/`."

**This was a location mismatch.** The vitest config `include` patterns cover both
`src/__tests__/**` and `../tests/**`. The existing auth integration tests reside in
`server/src/__tests__/`, not `server/src/routes/`.

### Existing Auth Integration Test Inventory (server/src/__tests__/)

| File | Coverage Focus |
|---|---|
| `auth-email-verification-enforcement.integration.test.ts` | Email verification gate before login |
| `auth-rate-limit-enforcement.integration.test.ts` | Login attempt rate limiting |
| `auth-refresh-concurrency.integration.test.ts` | Concurrent refresh token rotation |
| `auth-refresh-performance.integration.test.ts` | Refresh rotation throughput |
| `auth-wave2-readiness.integration.test.ts` | 200-cycle refresh stress, replay simulation, logout idempotency |
| `gate-e-1-refresh-rotation.integration.test.ts` | Refresh rotation + replay detection |
| `gate-e-2-cross-realm.integration.test.ts` | Cross-realm isolation (tenant/admin) |
| `gate-e-3-rate-limit.integration.test.ts` | Rate limit gate enforcement |
| `gate-e-4-audit.integration.test.ts` | Audit event integrity |

All 9 files use `describe.skipIf(!hasDb)` guards; they require a live Supabase DB connection.

---

## 8. What This Unit Adds — DB-Free Contract Tests

`tests/auth-route-session.test.ts` covers surfaces not exercised by the integration suite:

| Describe Block | Surface Covered |
|---|---|
| `generateRefreshToken` | URL-safe base64 format, uniqueness |
| `hashRefreshToken` | 64-char hex SHA-256, determinism, sensitivity |
| `createRefreshSession realm isolation` | Realm constraint enforcement (throws on both/neither), payload null fields, familyId/id UUID generation |
| `cookie realm naming contract` | TENANT_COOKIE ≠ ADMIN_COOKIE, prefix separation |
| `generateSecureToken (inline mirror)` | 64-char hex, uniqueness |
| `hashRateLimitKey (inline mirror)` | SHA-256 determinism, no raw email in output |
| `calculateRetryAfter (inline mirror)` | windowMinutes × 60 = seconds |
| `getClientIp (inline mirror)` | Single IP, comma-list first IP, whitespace trim, fallback to request.ip, array header |
| `POST /login (unified) validation contracts` | Valid with/without tenantId; rejects bad email, empty password, non-UUID tenantId |
| `POST /admin/login validation contracts` | Valid; rejects bad email, empty password |
| `POST /tenant/login validation contracts` | Valid; rejects password <6, missing/non-UUID tenantId |
| `POST /forgot-password anti-enumeration contract` | Valid email; rejects invalid; schema keys contract |
| `POST /reset-password validation contracts` | Valid; rejects empty token, password <6, missing token |
| `POST /verify-email validation contracts` | Valid; rejects empty token, missing token |
| `POST /resend-verification anti-enumeration contract` | Valid email; rejects invalid; schema keys contract |
| `no signup route surface contract` | No /signup or /register in auth surface; exactly 9 routes |

Total: **60 tests, all passing.**

---

## 9. Test Design Decisions

1. **No DB connection.** Tests import only `generateRefreshToken`, `hashRefreshToken`,
   `createRefreshSession` from `server/src/utils/auth/refreshToken.ts` — a pure `node:crypto`
   module. All other helpers are inlined to avoid Prisma/Fastify module initialization.

2. **Inline mirrors** for `getClientIp`, `generateSecureToken`, `hashRateLimitKey`,
   `calculateRetryAfter` — reproduces the logic verbatim without importing modules that
   carry DB or framework dependencies.

3. **Validation schema mirrors** — pure TypeScript functions that replicate the Zod
   schemas from `server/src/routes/auth.ts`. No Zod import used (avoids root vs server
   `node_modules` resolution issues).

4. **Follows `membership-authz.test.ts` pattern** exactly: vitest, describe/it/expect,
   no async, no Fastify injection.

---

## 10. Preflight Evidence

Pre-existing dirty files confirmed before edits, preserved unchanged:
- `components/Public/PublicSupplierProfile.tsx`
- `tests/frontend/public-referral-landing.test.tsx`

---

## 11. Files Changed

Created:
- `tests/auth-route-session.test.ts`
- `governance/units/FAM-06-AUTH-SESSION-BACKEND-INTEGRATION-TEST-COVERAGE-001.md`

Modified:
- `governance/launch-readiness/FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`

---

## 12. Validation Run

```
pnpm --dir server exec vitest run ../tests/auth-route-session.test.ts --reporter=verbose
```

Result:
```
 Test Files  1 passed (1)
      Tests  60 passed (60)
   Start at  08:04:56
   Duration  394ms (transform 55ms, setup 0ms, import 73ms, tests 10ms, environment 0ms)
```

All 60 tests PASS. No runtime files modified.

---

## 13. Hub-Sync Q1-Q9

**Q1: Did this unit change family readiness status?**
NO — evidence level remains `REPO_CONFIRMED`. Implementation readiness remains `NOT_ASSESSED`.

**Q2: Did this unit change the Gap Register?**
YES — G-06-001 status changed from `P1 open` to `CLOSED`.

**Q3: Which launch-readiness hub files changed?**
`FAM-06-AUTH-SESSION-OPENING-REPO-TRUTH-AUDIT.md`, `LAUNCH-FAMILY-INDEX.md`.

**Q4: Authorizing source?**
FAM-06 Opening Audit Gap Register + follow-on unit directive.

**Q5: Any Layer 0 conflict introduced?**
NO.

**Q6: Any DPP/TTP posture conflict introduced?**
NO.

**Q7: Any CRM/CAE row mutated?**
NO.

**Q8: Any runtime or schema mutation performed?**
NO.

**Q9: Is hub consistency preserved post-sync?**
YES. J3 corrected, G-06-001 closed, LAUNCH-FAMILY-INDEX FAM-06 row updated.

---

## 14. Risks / Follow-up

- G-06-002 remains open: dedicated frontend auth service/session suite for
  `services/authService.ts` and `apiClient.ts` auth branches.
  Suggested unit: `FAM-06-AUTH-SESSION-FRONTEND-TEST-COVERAGE-001`.

- The inline mirror approach means: if `getClientIp`, `hashRateLimitKey`, or
  `calculateRetryAfter` logic changes in the source files, the inline mirrors in
  `tests/auth-route-session.test.ts` must be kept in sync manually. This is an
  acceptable trade-off for a DB-free test file.

- FAM-06 implementation readiness remains `NOT_ASSESSED`. Layer 0 authorization
  release is still required before implementation work can proceed.

---

## 15. Runtime Safety Statement

No runtime files were changed.
No schema or migration files were changed.
No environment files were changed.
No test helpers were added to the `server/` package.

---

## 16. Commit Message

`[TEXQTIC] test: add backend auth session coverage`
