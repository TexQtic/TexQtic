# FAM-07G — New-User Activation FC-03 Hardening and Test Coverage

**Unit ID:** FAM-07G-NEW-USER-ACTIVATION-FC03-HARDENING-AND-TEST-COVERAGE-001
**Family:** FAM-07 — Auth: Existing-User Invite Activation Bypass Fix
**Date:** 2026-05-29
**Head at close:** see §14
**Status:** IMPLEMENTATION_COMPLETE

---

## §1. Objective

Apply the FC-03 source fix to `App.tsx` and add full backend + frontend test coverage for the new-user activation path. The FC-03 risk was identified in FAM-07F (audit artifact at `artifacts/control-plane/FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001.md`).

---

## §2. Problem Statement (FC-03)

In the ONBOARDING case `onComplete` handler in `App.tsx`, the original order was:

```
activateTenant(...)  →  setToken(raw.token, 'TENANT')  →  [bootstrap steps]  →  setPendingInviteToken(null)
```

**Risk:** If any post-activation bootstrap step throws (`getCurrentUser`, `buildTenantSnapshot`, `applyTenantBootstrapState`), execution stops before `setPendingInviteToken(null)`. This leaves:
- `pendingInviteToken` non-null in React state
- The TENANT JWT written to localStorage
- The invite row in the DB with `acceptedAt` set (consumed, cannot be reused)

On retry the user is permanently stuck: `activateTenant` returns 404 `INVALID_INVITE` because the invite is already consumed.

**Classification:** `FRONTEND_ONLY_HARDENING_REQUIRED`

---

## §3. Fix Applied

**File:** `App.tsx`

**Location:** ONBOARDING case `onComplete` handler, immediately after `activateTenant` returns.

**Change:**
1. Added `setPendingInviteToken(null)` with FC-03 comment immediately after `const raw = await activateTenant({...}) as any;`
2. Removed the `setPendingInviteToken(null)` that was previously placed in the success-only position (just before `setAppState`)
3. Preserved the existing comment `// Store JWT so all subsequent tenant API calls are authenticated` before `setToken`

**New order:**
```
activateTenant(...)  →  setPendingInviteToken(null)  →  setToken(raw.token, 'TENANT')  →  [bootstrap steps]  →  setAppState(...)
```

The invite token is now cleared as the first action after backend activation succeeds, before any post-activation step that could throw.

**D3 authenticated path (lines ~4438–4480):** NOT changed. That path has its own `setPendingInviteToken(null)` placement which was already correct.

---

## §4. Backend Tests Added (T-MISS-01 through T-MISS-04)

**File:** `server/src/__tests__/tenant-activate.integration.test.ts`

Added as describe block `FAM-07G — POST /api/tenant/activate: response shape and write verification`.

| ID | Coverage | Assertion |
|----|----------|-----------|
| T-MISS-01 | Full 200 happy path response shape | `statusCode === 200`, `body.data` matches `{ token, user, tenant: { id, slug }, membership }` |
| T-MISS-02 | EMAIL_MISMATCH → 403 | Payload email differs from invite email; asserts `403` + `error.code === 'EMAIL_MISMATCH'`; `prisma.user.findUnique` not called |
| T-MISS-03 | Transaction write verification | `txMock.user.create`, `txMock.membership.create`, `txMock.invite.update` (with `acceptedAt`), `writeAuditLogMock` (action `user.activated`) all called |
| T-MISS-04 | Org status hardening | `txMock.organizations.update` called with `data: { status: 'PENDING_VERIFICATION' }` |

**Mock pattern used:** Identical to T-GAP-06 `beforeEach` — `withDbContextMock` set to call `cb(txMock)` for both the main activation transaction and the subsequent `resolveTenantSessionIdentity` call (which internally issues a second `withDbContext` invocation). `txMock.organizations.findUnique` provides the org identity object for the session resolve.

---

## §5. Frontend Tests Added (F-MISS-01 through F-MISS-03)

**File:** `tests/frontend/onboarding-activation.test.tsx`

Added as two new describe blocks. Also updated the import to include `activateTenant` alongside the existing `acceptAuthenticatedInvite` import.

| ID | Coverage | Assertion |
|----|----------|-----------|
| F-MISS-01 (ACT-013) | `activateTenant` calls `POST /api/tenant/activate` | `apiClient.post` called with `/api/tenant/activate` and correct payload shape |
| F-MISS-02 (ACT-014) | `activateTenant` returns API response | Return value equals mocked API response |
| F-MISS-03 (ACT-015) | FC-03 stale-state guard — token cleared before bootstrap | Simulates `onComplete` handler with `activateTenant` + post-activation throw; asserts `clearInviteToken(null)` called and `pendingToken === null` even when handler throws |

**F-MISS-03 limitation (documented):** App.tsx does not have a full integration test harness; rendering the full SPA component is not currently feasible. ACT-015 verifies the behavioral contract of the FC-03 fix by simulating the handler sequence inline. The simulation mirrors the exact post-fix order in App.tsx (`activateTenant` → `clearInviteToken(null)` → bootstrap step throws). This is the narrowest reliable regression guard available given current test infrastructure.

---

## §6. Date Correction in FAM-07F Artifact

**File:** `artifacts/control-plane/FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001.md`

Footer corrected: `2026-06-01` → `2026-05-29` (actual date of FAM-07F audit work).

---

## §7. Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `App.tsx` | Source fix | FC-03: moved `setPendingInviteToken(null)` before `setToken` |
| `server/src/__tests__/tenant-activate.integration.test.ts` | Tests added | T-MISS-01 through T-MISS-04 (new describe block at file end) |
| `tests/frontend/onboarding-activation.test.tsx` | Tests added | F-MISS-01 through F-MISS-03 (ACT-013 through ACT-015); import updated |
| `artifacts/control-plane/FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001.md` | Date fix | Footer date corrected: `2026-06-01` → `2026-05-29` |

---

## §8. Validation Run

**TypeScript:** `pnpm exec tsc --noEmit` — PASS (no output / zero errors)

**Backend tests:** `pnpm -C server exec vitest run tenant-activate.integration.test`
```
✓ src/__tests__/tenant-activate.integration.test.ts (21 tests) 699ms
Test Files  1 passed (1)
     Tests  21 passed (21)
```
*(17 pre-existing + 4 new T-MISS tests)*

**Frontend tests:** `pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/onboarding-activation.test.tsx`
```
✓ tests/frontend/onboarding-activation.test.tsx (15 tests) 497ms
Test Files  1 passed (1)
     Tests  15 passed (15)
```
*(12 pre-existing + 3 new F-MISS tests)*

---

## §9. Governance Review

| Contract | Status | Note |
|----------|--------|-------|
| `openapi.tenant.json` | N/A | No route changes; only handler ordering fixed |
| `db-naming-rules.md` | N/A | No schema changes |
| `rls-policy.md` | N/A | No RLS changes |
| `event-names.md` | N/A | No event changes |
| `ARCHITECTURE-GOVERNANCE.md` | N/A | No boundary changes |

---

## §10. Risks / Follow-up

1. **App.tsx integration test gap (F-MISS-03 limitation):** Full App.tsx SPA rendering is not covered. ACT-015 covers the behavioral contract via inline simulation. A future test harness for App.tsx would allow promoting this to a full integration test.

2. **FAM-07 family scope:** FAM-07 remains `PARTIALLY_IMPLEMENTED`. The FC-03 fix and new-user test coverage are complete. FTR-LEGAL-003 and HD-001 remain unresolved; FAM-07 must NOT be promoted to `VERIFIED_COMPLETE` on the basis of this unit alone.

3. **D3 authenticated path:** Not changed. Its `setPendingInviteToken(null)` placement was verified as correct in FAM-07F audit.

---

## §11. Allowlist Boundary Confirmation

Files modified in this unit:
- `App.tsx` ✅
- `server/src/__tests__/tenant-activate.integration.test.ts` ✅
- `tests/frontend/onboarding-activation.test.tsx` ✅
- `artifacts/control-plane/FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001.md` ✅ (date correction explicitly authorized in prompt §7)

No files outside the allowlist were modified.
`git diff --name-only` output confirmed exactly these 4 files before commit.

---

## §12. Hub Impact

`NO_HUB_UPDATE_REQUIRED`

FAM-07G hardens and tests the new-user activation path. FAM-07 remains `PARTIALLY_IMPLEMENTED` and FTR-AUTH-001 remains `PARTIAL` until the full auth-path close or an explicit hub-sync authorization. LAUNCH-FAMILY-INDEX.md and OPEN-SET.md are NOT updated as part of this bounded unit.

---

## §13. Commit

```
[TEXQTIC] fix: harden new-user invite activation state (FAM-07G)
```

---

## §14. Final Enum

`FAM_07G_NEW_USER_ACTIVATION_FC03_HARDENING_COMPLETE_NO_HUB_UPDATE`

---

*Implementation performed at HEAD committed below — 2026-05-29*
