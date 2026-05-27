# CONTROL-PLANE-IMPERSONATION-STATUS-PREHANDLER-HARDENING-008-VERIFY-CLOSE-001

**Task ID:** CONTROL-PLANE-IMPERSONATION-STATUS-PREHANDLER-HARDENING-008  
**Family:** FTR-CP-001 (OPEN, authorization-gated)  
**Final Enum:** `CONTROL_PLANE_IMPERSONATION_STATUS_PREHANDLER_VERIFIED_COMPLETE`  
**Date:** 2026-05-27  
**Branch:** main  
**Base Commit:** daf9c9e44e8e32c78ecd0187b923bc6db3bcb364

---

## R-001 Closure

**Gap confirmed (pre-fix):** `GET /api/control/impersonation/status/:impersonationId` lacked an explicit `{ preHandler: requireAdminRole('SUPER_ADMIN') }` option object. Any authenticated admin (SUPPORT, ANALYST, etc.) could read live impersonation session metadata. The inline `if (!request.isAdmin …)` guard only checked authentication — it did not enforce the SUPER_ADMIN role requirement.

**Fix applied:** One-line addition of `{ preHandler: requireAdminRole('SUPER_ADMIN') }` as the route options object. This is consistent with POST /start and POST /stop which already had explicit SUPER_ADMIN preHandlers.

**Verification (stash proof):** Running the test suite against the pre-fix codebase confirmed T-IMP-017 produced `200` for non-SUPER_ADMIN admins (bug present). After the fix all three T-IMP-017 assertions pass (SUPPORT → 403, ANALYST → 403, SUPER_ADMIN control case → 200).

---

## Files Changed

| File | Change |
|---|---|
| `server/src/routes/admin/impersonation.ts` | +1 line: `{ preHandler: requireAdminRole('SUPER_ADMIN') }` added to GET /status route |
| `server/src/__tests__/control-plane-impersonation-status-prehandler.test.ts` | NEW — T-IMP-017 focused authorization contract test (3 test cases) |
| `artifacts/control-plane/CONTROL-PLANE-IMPERSONATION-STATUS-PREHANDLER-HARDENING-008-VERIFY-CLOSE-001.md` | NEW — this verify-close artifact |

---

## Test Evidence

### Focused test (T-IMP-017) — PASS

```
> vitest run "control-plane-impersonation-status-prehandler"

 ✓ src/__tests__/control-plane-impersonation-status-prehandler.test.ts (3 tests) 299ms
   ✓ T-IMP-017: denies SUPPORT admin from reading impersonation session status (403)
   ✓ T-IMP-017 (variant): denies ANALYST admin from reading impersonation session status (403)
   ✓ SUPER_ADMIN control case: allows status lookup and invokes the service

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

### Pre-fix stash validation (bug confirmed)

```
 FAIL  src/__tests__/control-plane-impersonation-status-prehandler.test.ts
   AssertionError: expected 200 to be 403  (T-IMP-017 SUPPORT denial)
   AssertionError: expected 200 to be 403  (T-IMP-017 ANALYST denial)
```

### Prisma schema — VALID

```
The schema at prisma\schema.prisma is valid ✓
```

### TypeScript — Zero errors in changed files

```
tsc --noEmit | Where-Object { $_ -match "impersonation" } → (no output)
```

Pre-existing type errors in `src/routes/control.ts` (TenantSlugCarrier mismatch) are out of scope — present before and after this change, not caused by this fix.

### Pre-existing frontend test resolution errors (unchanged)

`../tests/control-plane-impersonation-app-integration.test.tsx` and `../tests/control-plane-impersonation-entry-verification.test.tsx` produce "Cannot find module" from the server vitest config. This is a pre-existing configuration issue (server vitest picks up root-level `.tsx` files it cannot resolve in Node environment). Verified identical before and after this change via git stash.

---

## Diff Verification

```
git diff --stat:
 server/src/routes/admin/impersonation.ts | 1 +
 1 file changed, 1 insertion(+)

git status --short:
 M server/src/routes/admin/impersonation.ts
?? server/src/__tests__/control-plane-impersonation-status-prehandler.test.ts
```

---

## Boundary Safety Confirmation

| Boundary | Confirmed |
|---|---|
| schema.prisma / migrations | NOT TOUCHED |
| DB / prod / runtime | NOT TOUCHED |
| Secrets / env | NOT TOUCHED |
| Frontend / components / CRM / CAE | NOT TOUCHED |
| Layer 0 governance files | NOT TOUCHED |
| FUTURE-TODO-REGISTER.md | NOT TOUCHED (§11 update is a separate closure-sync prompt) |
| LAUNCH-FAMILY-INDEX.md | NOT TOUCHED |
| FTR-CP-001 — NOT closed | Correct — family remains OPEN |
| FAM-10 — NOT advanced | Correct — out of scope |
| POST /start preHandler | NOT TOUCHED |
| POST /stop preHandler | NOT TOUCHED |
| impersonation.service.ts | NOT TOUCHED |
| server/src/index.ts | NOT TOUCHED |

---

## Commit

```
fix: require superadmin for impersonation status
```

---

## Recommended Next Prompt

`CONTROL-PLANE-IMPERSONATION-STATUS-PREHANDLER-HARDENING-008-CLOSURE-SYNC-001`  
Update FUTURE-TODO-REGISTER.md §7 description and add §11 row recording HARDENING-008 as VERIFIED_COMPLETE.
